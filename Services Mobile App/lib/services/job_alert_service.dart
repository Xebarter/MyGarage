import 'dart:async';

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

/// Looping in-app chime + vibration for incoming job offers while foreground.
/// On Android/iOS, also posts a high-priority heads-up notification with
/// Accept / Decline actions (and channel sound for background reliability).
class JobAlertService with WidgetsBindingObserver {
  JobAlertService._();

  static final JobAlertService instance = JobAlertService._();

  /// Bumped so devices recreate the channel (old silent channels are sticky).
  static const _channelId = 'job_offers_alarm_v2';
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
  /// True after a real background pause while an offer was ringing (not user mute).
  bool _pausedForBackground = false;
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
          // defaultToSpeaker is only valid with playAndRecord.
          category: AVAudioSessionCategory.playback,
          options: const {AVAudioSessionOptions.duckOthers},
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

    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      final android = _notifications.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      await android?.createNotificationChannel(
        const AndroidNotificationChannel(
          _channelId,
          'Incoming jobs',
          description: 'Alerts when a job offer arrives',
          importance: Importance.max,
          playSound: true,
          enableVibration: true,
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
    // Body tap — reopen the intercept.
    onRequestPresentDialog?.call();
  }

  Future<void> _dispatchAction(String action) async {
    final handler = onNotificationAction;
    if (handler != null) {
      await handler(action);
    }
  }

  /// Request notification permission when the provider is online.
  Future<void> ensurePermissions() async {
    await init();
    try {
      await Permission.notification.request();
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
        _pausedForBackground = false;
        unawaited(_startSound());
        unawaited(_startVibration());
      }
      return;
    }

    _activeOfferId = offer.assignmentId;
    _activeOffer = offer;
    _silenced = false;
    _pausedForBackground = false;
    _ringing = true;

    unawaited(ensurePermissions());
    unawaited(_startSound());
    unawaited(_startVibration());
    unawaited(_showOfferNotification(offer));
  }

  /// Mute audio + vibration (power button / volume down) but keep the offer active.
  Future<void> silence() async {
    if (!_ringing && !_silenced && _activeOffer == null) return;
    _silenced = true;
    _ringing = false;
    _pausedForBackground = false;
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

  /// Pause in-app loop while backgrounded (notification sound covers heads-up).
  /// Unlike [silence], this is not a user mute — sound resumes on [resumed].
  Future<void> _pauseForBackground() async {
    if (!_ringing || _silenced || _activeOffer == null) return;
    _pausedForBackground = true;
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

  Future<void> _resumeAfterBackground() async {
    if (_silenced || _activeOffer == null) return;
    if (!_pausedForBackground && _ringing) return;
    _pausedForBackground = false;
    _ringing = true;
    unawaited(_startSound());
    unawaited(_startVibration());
  }

  /// Full teardown after accept / decline / offer cleared.
  Future<void> stop() async {
    _ringing = false;
    _silenced = false;
    _pausedForBackground = false;
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
    if (_silenced || !_ringing) return;
    try {
      await _player.stop();
      await _player.setReleaseMode(ReleaseMode.loop);
      await _player.setVolume(0.75);
      await _player.setSource(AssetSource(_assetPath));
      await _player.resume();
      final state = _player.state;
      if (state != PlayerState.playing && state != PlayerState.completed) {
        // Some platforms only start via [play].
        await _player.play(AssetSource(_assetPath));
      }
      debugPrint('JobAlertService sound state=${_player.state}');
    } catch (e, st) {
      debugPrint('JobAlertService sound failed: $e\n$st');
      try {
        await _player.play(AssetSource(_assetPath));
      } catch (e2) {
        debugPrint('JobAlertService sound retry failed: $e2');
      }
    }
  }

  Future<void> _startVibration() async {
    if (_silenced || !_ringing) return;
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

  Future<void> _showOfferNotification(DispatchOffer offer) async {
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
      category: AndroidNotificationCategory.message,
      fullScreenIntent: false,
      visibility: NotificationVisibility.public,
      ongoing: true,
      autoCancel: false,
      playSound: true,
      enableVibration: true,
      ticker: 'Incoming MyGarage job',
      timeoutAfter: 90 * 1000,
      actions: <AndroidNotificationAction>[
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
      presentSound: true,
      interruptionLevel: InterruptionLevel.timeSensitive,
      categoryIdentifier: 'job_offer',
    );

    try {
      await _notifications.show(
        id: _notificationId,
        title: title,
        body: body,
        notificationDetails: NotificationDetails(
          android: androidDetails,
          iOS: iosDetails,
        ),
        payload: offer.assignmentId,
      );
    } catch (e) {
      debugPrint('JobAlertService notification failed: $e');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Do NOT silence on [inactive] — dialogs / system sheets fire it and
    // previously killed the ring as soon as the offer UI appeared.
    if (state == AppLifecycleState.paused) {
      // Real background: stop in-app loop; heads-up notification sound remains.
      unawaited(_pauseForBackground());
      return;
    }
    if (state == AppLifecycleState.resumed) {
      if (_pausedForBackground && !_silenced && _activeOffer != null) {
        unawaited(_resumeAfterBackground());
      }
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
