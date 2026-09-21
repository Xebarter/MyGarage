import 'dart:async';
import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import '../api/api_client.dart';
import '../models/service_request.dart';
import 'job_alert_service.dart';

@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    await JobAlertService.instance.init();
    final data = message.data;
    if (data['type'] == 'job_offer' || data['assignmentId'] != null) {
      await JobAlertService.instance.startForOffer(
        DispatchOffer.fromPush(data),
        inAppSound: false,
      );
    }
  } catch (_) {}
}

class PushService {
  PushService._();

  static bool _ready = false;
  static String? _token;

  static FirebaseOptions? get _androidOptions {
    final apiKey = (dotenv.env['FIREBASE_API_KEY'] ?? dotenv.env['NEXT_PUBLIC_FIREBASE_API_KEY'])?.trim();
    final appId = dotenv.env['FIREBASE_ANDROID_APP_ID']?.trim();
    final senderId =
        (dotenv.env['FIREBASE_MESSAGING_SENDER_ID'] ?? dotenv.env['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'])
            ?.trim();
    final projectId =
        (dotenv.env['FIREBASE_PROJECT_ID'] ?? dotenv.env['NEXT_PUBLIC_FIREBASE_PROJECT_ID'])?.trim();
    final storageBucket =
        (dotenv.env['FIREBASE_STORAGE_BUCKET'] ?? dotenv.env['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'])?.trim();
    if (apiKey == null ||
        apiKey.isEmpty ||
        appId == null ||
        appId.isEmpty ||
        senderId == null ||
        senderId.isEmpty ||
        projectId == null ||
        projectId.isEmpty) {
      return null;
    }
    return FirebaseOptions(
      apiKey: apiKey,
      appId: appId,
      messagingSenderId: senderId,
      projectId: projectId,
      storageBucket: storageBucket,
    );
  }

  static Future<void> init() async {
    if (kIsWeb || _ready) return;
    final options = _androidOptions;
    if (options == null) return;
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(options: options);
      }
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
      await FirebaseMessaging.instance.requestPermission(alert: true, badge: true, sound: true);
      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );
      FirebaseMessaging.onMessage.listen(_onForegroundMessage);
      FirebaseMessaging.onMessageOpenedApp.listen(_onOpened);
      final initial = await FirebaseMessaging.instance.getInitialMessage();
      if (initial != null) {
        _onOpened(initial);
      }
      _ready = true;
    } catch (e) {
      debugPrint('PushService init failed: $e');
    }
  }

  static void _onForegroundMessage(RemoteMessage message) {
    final data = message.data;
    if (data['type'] == 'job_offer' || data['assignmentId'] != null) {
      unawaited(
        JobAlertService.instance.startForOffer(DispatchOffer.fromPush(data)),
      );
    }
  }

  static void _onOpened(RemoteMessage message) {
    JobAlertService.instance.onRequestPresentDialog?.call();
  }

  static Future<void> register(ApiClient client) async {
    await init();
    if (!_ready) return;
    try {
      if (Platform.isIOS) {
        await FirebaseMessaging.instance.getAPNSToken();
      }
      final token = await FirebaseMessaging.instance.getToken();
      if (token == null || token.isEmpty) return;
      _token = token;
      await client.post(
        '/api/vendor/push-token',
        auth: true,
        body: {
          'token': token,
          'platform': Platform.isIOS ? 'ios' : 'android',
        },
        parser: (_) => true,
      );
      FirebaseMessaging.instance.onTokenRefresh.listen((next) {
        _token = next;
        unawaited(
          client.post(
            '/api/vendor/push-token',
            auth: true,
            body: {
              'token': next,
              'platform': Platform.isIOS ? 'ios' : 'android',
            },
            parser: (_) => true,
          ),
        );
      });
    } catch (e) {
      debugPrint('PushService register failed: $e');
    }
  }

  static Future<void> unregister(ApiClient client) async {
    final token = _token;
    try {
      await client.delete(
        '/api/vendor/push-token',
        query: token == null || token.isEmpty ? null : {'token': token},
        auth: true,
        parser: (_) => true,
      );
    } catch (_) {}
    _token = null;
  }
}
