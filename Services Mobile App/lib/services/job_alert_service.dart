import 'dart:async';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:vibration/vibration.dart';

import '../models/service_request.dart';

/// Loud looping alarm + vibration for incoming job offers.
/// On Android, also posts a full-screen high-priority notification so the
/// offer can surface over the lock screen and other apps.
class JobAlertService with WidgetsBindingObserver {
  JobAlertService._();

  static final JobAlertService instance = JobAlertService._();

  static const _channelId = 'job_offers_alarm';
  static const _notificationId = 71001;
  static const _assetPath = 'sounds/job_offer_alarm.wav';

  final AudioPlayer _player = AudioPlayer();
  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool _initialized = false;
  bool _ringing = false;
  String? _activeOfferId;
  DispatchOffer? _activeOffer;
  Timer? _vibPulse;

  bool get isRinging => _ringing;
  DispatchOffer? get activeOffer => _activeOffer;

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addObserver(this);

    await _player.setReleaseMode(ReleaseMode.loop);
    await _player.setVolume(1.0);
    await _player.setAudioContext(
      AudioContext(
        iOS: AudioContextIOS(
          category: AVAudioSessionCategory.playback,
          options: const {
            AVAudioSessionOptions.duckOthers,
            AVAudioSessionOptions.defaultToSpeaker,
          },
        ),
        android: const AudioContextAndroid(
          isSpeakerphoneOn: true,
          stayAwake: true,
          contentType: AndroidContentType.sonification,
          usageType: AndroidUsageType.alarm,
          audioFocus: AndroidAudioFocus.gainTransientMayDuck,
        ),
      ),
    );

    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosInit = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    await _notifications.initialize(
      settings: const InitializationSettings(android: androidInit, iOS: iosInit),
    );

    if (Platform.isAndroid) {
      final android = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await android?.createNotificationChannel(
        const AndroidNotificationChannel(
          _channelId,
          'Incoming jobs',
          description: 'Loud full-screen alerts when a job offer arrives',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
          showBadge: true,
        ),
      );
    }
  }

  /// Request notification / overlay permissions once the provider is online.
  Future<void> ensurePermissions() async {
    await init();
    try {
      await Permission.notification.request();
      if (Platform.isAndroid) {
        // Lets the offer window draw while the user is in another app (user may
        // need to enable “Display over other apps” once).
        final overlay = await Permission.systemAlertWindow.status;
        if (!overlay.isGranted) {
          await Permission.systemAlertWindow.request();
        }
      }
    } catch (e) {
      debugPrint('JobAlertService permissions: $e');
    }
  }

  Future<void> startForOffer(DispatchOffer offer) async {
    await init();
    if (_ringing && _activeOfferId == offer.assignmentId) return;

    _activeOfferId = offer.assignmentId;
    _activeOffer = offer;
    _ringing = true;

    unawaited(ensurePermissions());
    unawaited(_startSound());
    unawaited(_startVibration());
    unawaited(_showFullScreenNotification(offer));
  }

  Future<void> stop() async {
    _ringing = false;
    _activeOfferId = null;
    _activeOffer = null;
    _vibPulse?.cancel();
    _vibPulse = null;

    try {
      if (await Vibration.hasVibrator() == true) {
        await Vibration.cancel();
      }
    } catch (_) {}

    try {
      await _player.stop();
    } catch (_) {}

    try {
      await _notifications.cancel(id: _notificationId);
    } catch (_) {}
  }

  Future<void> _startSound() async {
    try {
      await _player.stop();
      await _player.setVolume(1.0);
      await _player.play(AssetSource(_assetPath));
    } catch (e) {
      debugPrint('JobAlertService sound failed: $e');
    }
  }

  Future<void> _startVibration() async {
    try {
      final hasVibrator = await Vibration.hasVibrator() == true;
      if (!hasVibrator) return;

      final hasAmp = await Vibration.hasAmplitudeControl() == true;
      // Strong, rhythmic taxi-style pattern that loops.
      final pattern = <int>[0, 700, 280, 700, 280, 1100, 420];
      if (hasAmp) {
        await Vibration.vibrate(
          pattern: pattern,
          intensities: [0, 255, 0, 255, 0, 255, 0],
          repeat: 0,
        );
      } else {
        await Vibration.vibrate(pattern: pattern, repeat: 0);
      }

      // Some OEMs drop long vibration repeats; pulse as a fallback.
      _vibPulse?.cancel();
      _vibPulse = Timer.periodic(const Duration(seconds: 3), (_) async {
        if (!_ringing) return;
        try {
          await Vibration.vibrate(duration: 650, amplitude: 255);
        } catch (_) {}
      });
    } catch (e) {
      debugPrint('JobAlertService vibration failed: $e');
    }
  }

  Future<void> _showFullScreenNotification(DispatchOffer offer) async {
    if (kIsWeb) return;
    final title = offer.request?.service ?? 'New job offer';
    final body = (offer.request?.location ?? '').isNotEmpty
        ? offer.request!.location
        : 'Open MyGarage to accept or decline';

    final androidDetails = const AndroidNotificationDetails(
      _channelId,
      'Incoming jobs',
      channelDescription: 'Loud full-screen alerts when a job offer arrives',
      importance: Importance.max,
      priority: Priority.max,
      category: AndroidNotificationCategory.call,
      fullScreenIntent: true,
      visibility: NotificationVisibility.public,
      ongoing: true,
      autoCancel: false,
      playSound: false, // our WAV + vibration handle the siren
      enableVibration: false,
      ticker: 'Incoming MyGarage job',
      timeoutAfter: 90 * 1000,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      interruptionLevel: InterruptionLevel.timeSensitive,
    );

    try {
      await _notifications.show(
        id: _notificationId,
        title: title,
        body: body,
        notificationDetails: NotificationDetails(android: androidDetails, iOS: iosDetails),
        payload: offer.assignmentId,
      );
    } catch (e) {
      debugPrint('JobAlertService notification failed: $e');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Keep the alarm going if the process is still alive in the background.
    if (!_ringing) return;
    if (state == AppLifecycleState.resumed) {
      unawaited(_startSound());
    }
  }

  Future<void> dispose() async {
    WidgetsBinding.instance.removeObserver(this);
    await stop();
    await _player.dispose();
  }
}
