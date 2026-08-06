import 'dart:async';
import 'dart:io';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:vibration/vibration.dart';

import '../models/service_request.dart';

/// Callback for Accept/Decline from the notification tray.
typedef JobAlertActionHandler = Future<void> Function(String action);

/// Professional looping chime + vibration for incoming job offers.
/// On Android, posts a high-priority notification with Accept / Decline actions
/// and full-screen intent so the offer can surface over the lock screen.
class JobAlertService with WidgetsBindingObserver {
  JobAlertService._();

  static final JobAlertService instance = JobAlertService._();

  static const _channelId = 'job_offers_alarm';
  static const _notificationId = 71001;
  static const _assetPath = 'sounds/job_offer_alarm.wav';
  static const _methodChannelName = 'ug.mygarage.services/job_alert';
  static const actionAccept = 'job_accept';
  static const actionDecline = 'job_decline';

  final AudioPlayer _player = AudioPlayer();
  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();
  final MethodChannel _native = const MethodChannel(_methodChannelName);

  bool _initialized = false;
  bool _ringing = false;
  bool _silenced = false;
  String? _activeOfferId;
  DispatchOffer? _activeOffer;
  Timer? _vibPulse;

  /// Wired by [IncomingOfferHost] so notification actions can respond.
  JobAlertActionHandler? onNotificationAction;

  /// Request that the intercept dialog presents again for the active offer.
  VoidCallback? onRequestPresentDialog;

  bool get isRinging => _ringing && !_silenced;
  bool get hasActiveOffer => _activeOffer != null;
  DispatchOffer? get activeOffer => _activeOffer;

  bool _volumeHandler(KeyEvent event) {
    if (event is KeyDownEvent &&
        (event.logicalKey == LogicalKeyboardKey.audioVolumeDown ||
            event.logicalKey == LogicalKeyboardKey.audioVolumeMute)) {
      if (_ringing && !_silenced) {
        unawaited(silence());
      }
    }
    return false;
  }

  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;
    WidgetsBinding.instance.addObserver(this);
    HardwareKeyboard.instance.addHandler(_volumeHandler);

    await _player.setReleaseMode(ReleaseMode.loop);
    await _player.setVolume(0.75);
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
      onDidReceiveNotificationResponse: _onNotificationResponse,
      onDidReceiveBackgroundNotificationResponse: notificationTapBackground,
    );

    if (Platform.isAndroid) {
      final android = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await android?.createNotificationChannel(
        const AndroidNotificationChannel(
          _channelId,
          'Incoming jobs',
          description: 'Alerts when a job offer arrives',
          importance: Importance.max,
          playSound: false,
          enableVibration: false,
          showBadge: true,
        ),
      );
    }

    _native.setMethodCallHandler(_onNativeCall);

    // Catch launch from a notification action while the process was dead.
    final launch = await _notifications.getNotificationAppLaunchDetails();
    final response = launch?.notificationResponse;
    if (launch?.didNotificationLaunchApp == true && response != null) {
      // Defer slightly so providers are mounted.
      Future<void>.delayed(const Duration(milliseconds: 400), () {
        _onNotificationResponse(response);
      });
    }
  }

  Future<dynamic> _onNativeCall(MethodCall call) async {
    switch (call.method) {
      case 'screenOff':
        await silence();
        return null;
      default:
        return null;
    }
  }

  void _onNotificationResponse(NotificationResponse response) {
    final actionId = response.actionId;
    if (actionId == actionAccept) {
      unawaited(_dispatchAction('accept'));
      return;
    }
    if (actionId == actionDecline) {
      unawaited(_dispatchAction('decline'));
      return;
    }
    // Body/FSI tap — reopen the intercept.
    onRequestPresentDialog?.call();
  }

  Future<void> _dispatchAction(String action) async {
    final handler = onNotificationAction;
    if (handler != null) {
      await handler(action);
    }
  }

  /// Request notification / overlay permissions once the provider is online.
  Future<void> ensurePermissions() async {
    await init();
    try {
      await Permission.notification.request();
      if (Platform.isAndroid) {
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
    if (_activeOfferId == offer.assignmentId && (_ringing || _silenced)) {
      // Same offer — ensure notification stays, but do not re-blast audio if silenced.
      if (!_silenced && !_ringing) {
        _ringing = true;
        unawaited(_startSound());
        unawaited(_startVibration());
      }
      return;
    }

    _activeOfferId = offer.assignmentId;
    _activeOffer = offer;
    _silenced = false;
    _ringing = true;

    unawaited(ensurePermissions());
    unawaited(_startSound());
    unawaited(_startVibration());
    unawaited(_showFullScreenNotification(offer));
  }

  /// Mute audio + vibration (power button / volume down) but keep the offer active.
  Future<void> silence() async {
    if (!_ringing && !_silenced && _activeOffer == null) return;
    _silenced = true;
    _ringing = false;
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
  }

  /// Full teardown after accept / decline / offer cleared.
  Future<void> stop() async {
    _ringing = false;
    _silenced = false;
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
    if (_silenced) return;
    try {
      await _player.stop();
      await _player.setVolume(0.75);
      await _player.play(AssetSource(_assetPath));
    } catch (e) {
      debugPrint('JobAlertService sound failed: $e');
    }
  }

  Future<void> _startVibration() async {
    if (_silenced) return;
    try {
      final hasVibrator = await Vibration.hasVibrator() == true;
      if (!hasVibrator) return;

      final hasAmp = await Vibration.hasAmplitudeControl() == true;
      final pattern = <int>[0, 500, 320, 500, 320, 800, 400];
      if (hasAmp) {
        await Vibration.vibrate(
          pattern: pattern,
          intensities: [0, 200, 0, 200, 0, 180, 0],
          repeat: 0,
        );
      } else {
        await Vibration.vibrate(pattern: pattern, repeat: 0);
      }

      _vibPulse?.cancel();
      _vibPulse = Timer.periodic(const Duration(seconds: 3), (_) async {
        if (!_ringing || _silenced) return;
        try {
          await Vibration.vibrate(duration: 500, amplitude: 200);
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
        : 'Accept or decline this job';

    final androidDetails = const AndroidNotificationDetails(
      _channelId,
      'Incoming jobs',
      channelDescription: 'Alerts when a job offer arrives',
      importance: Importance.max,
      priority: Priority.max,
      category: AndroidNotificationCategory.call,
      fullScreenIntent: true,
      visibility: NotificationVisibility.public,
      ongoing: true,
      autoCancel: false,
      playSound: false,
      enableVibration: false,
      ticker: 'Incoming MyGarage job',
      timeoutAfter: 90 * 1000,
      actions: const <AndroidNotificationAction>[
        AndroidNotificationAction(
          actionAccept,
          'Accept',
          showsUserInterface: true,
          cancelNotification: true,
        ),
        AndroidNotificationAction(
          actionDecline,
          'Decline',
          showsUserInterface: true,
          cancelNotification: true,
        ),
      ],
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: false,
      interruptionLevel: InterruptionLevel.timeSensitive,
      categoryIdentifier: 'job_offer',
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
    // Screen lock / background ≈ power button: silence like a phone call.
    if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
      if (_ringing && !_silenced) {
        unawaited(silence());
      }
    }
    // Do not restart sound on resume after user silenced.
    if (state == AppLifecycleState.resumed) {
      onRequestPresentDialog?.call();
    }
  }

  Future<void> dispose() async {
    WidgetsBinding.instance.removeObserver(this);
    HardwareKeyboard.instance.removeHandler(_volumeHandler);
    await stop();
    await _player.dispose();
  }
}

@pragma('vm:entry-point')
void notificationTapBackground(NotificationResponse response) {
  // Background isolate — primary handling happens when app wakes and
  // getNotificationAppLaunchDetails / foreground handler runs.
}
