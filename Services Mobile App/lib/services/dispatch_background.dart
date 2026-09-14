import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../auth/session_backup.dart';
import '../config.dart';
import '../models/service_request.dart';
import 'job_alert_service.dart';

const _kApi = 'dispatch_bg_api';
const _kVendor = 'dispatch_bg_vendor';
const _kToken = 'dispatch_bg_token';
const _kDutyNotificationId = 71002;

/// Keeps polling for job offers after the UI is closed (Android foreground service).
class DispatchBackground {
  DispatchBackground._();

  static Future<void> persistSession({
    required String vendorId,
    required String apiUrl,
    String? accessToken,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kVendor, vendorId);
    await prefs.setString(_kApi, apiUrl);
    if (accessToken != null && accessToken.isNotEmpty) {
      await prefs.setString(_kToken, accessToken);
    }
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kVendor);
    await prefs.remove(_kApi);
    await prefs.remove(_kToken);
  }

  static Future<void> start() async {
    final service = FlutterBackgroundService();
    final running = await service.isRunning();
    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: dispatchBackgroundEntrypoint,
        autoStart: false,
        autoStartOnBoot: true,
        isForegroundMode: true,
        notificationChannelId: 'job_offers_alarm_v2',
        initialNotificationTitle: 'MyGarage Services',
        initialNotificationContent: 'Waiting for jobs',
        foregroundServiceNotificationId: _kDutyNotificationId,
        foregroundServiceTypes: const [
          AndroidForegroundType.dataSync,
          AndroidForegroundType.location,
        ],
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: dispatchBackgroundEntrypoint,
      ),
    );
    if (!running) {
      await service.startService();
    }
  }

  static Future<void> stop() async {
    final service = FlutterBackgroundService();
    service.invoke('stop');
    await clearSession();
  }
}

@pragma('vm:entry-point')
Future<void> dispatchBackgroundEntrypoint(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();
  WidgetsFlutterBinding.ensureInitialized();
  await JobAlertService.instance.init();

  service.on('stop').listen((_) {
    service.stopSelf();
  });

  Timer? timer;
  timer = Timer.periodic(const Duration(seconds: 15), (_) {
    unawaited(_pollFromBackground());
  });
  service.on('stop').listen((_) {
    timer?.cancel();
  });
  await _pollFromBackground();
}

Future<void> _pollFromBackground() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    var vendorId = prefs.getString(_kVendor);
    final apiUrl = prefs.getString(_kApi) ?? AppConfig.apiUrl;
    var token = prefs.getString(_kToken);
    if (token == null || token.isEmpty) {
      token = await SessionBackup.readAccessToken();
    }
    if (vendorId == null || vendorId.isEmpty) {
      vendorId = await SessionBackup.readUserId();
    }
    if (vendorId == null || vendorId.isEmpty) return;

    final uri = Uri.parse(apiUrl).replace(
      path: '/api/services/dispatch/me',
      queryParameters: {'vendorId': vendorId},
    );
    final headers = <String, String>{'Accept': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    final res = await http.get(uri, headers: headers).timeout(const Duration(seconds: 20));
    if (res.statusCode < 200 || res.statusCode >= 300) return;
    final json = jsonDecode(res.body);
    if (json is! Map) return;
    final offerJson = json['offer'];
    if (offerJson is! Map) return;
    final offer = DispatchOffer.fromJson(Map<String, dynamic>.from(offerJson));
    if (offer.assignmentId.isEmpty) return;
    await JobAlertService.instance.startForOffer(offer, inAppSound: false);
  } catch (_) {
    // Background polling is best-effort.
  }
}
