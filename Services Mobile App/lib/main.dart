import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'auth/session_backup.dart';
import 'config.dart';
import 'maps/ensure_maps_js.dart';
import 'providers/auth_controller.dart';
import 'providers/dispatch_controller.dart';
import 'services/job_alert_service.dart';
import 'services/push_service.dart';

Future<void> main() async {
  await runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();
    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      debugPrint('FlutterError: ${details.exceptionAsString()}');
    };

    try {
      await dotenv.load(fileName: '.env');
    } catch (_) {
      // Allow running without .env when values are injected via --dart-define later.
    }

    try {
      await ensureGoogleMapsJs(AppConfig.googleMapsApiKey);
    } catch (e, st) {
      debugPrint('Google Maps JS init failed: $e\n$st');
    }

    try {
      await JobAlertService.instance.init();
    } catch (e, st) {
      debugPrint('JobAlertService.init failed: $e\n$st');
    }

    try {
      await PushService.init();
    } catch (e, st) {
      debugPrint('PushService.init failed: $e\n$st');
    }

    try {
      if (AppConfig.isSupabaseConfigured) {
        await Supabase.initialize(
          url: AppConfig.supabaseUrl,
          anonKey: AppConfig.supabaseAnonKey,
          authOptions: const FlutterAuthClientOptions(
            authFlowType: AuthFlowType.pkce,
          ),
        );
        // Snapshot the restored session before GoTrue's async recover/refresh can
        // emit signedOut and wipe storage.
        await SessionBackup.captureFromSupabaseIfPresent();
      }
    } catch (e, st) {
      debugPrint('Supabase.initialize failed: $e\n$st');
    }

    runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthController()),
          ChangeNotifierProvider(create: (_) => DispatchController()),
        ],
        child: const MyGarageServicesApp(),
      ),
    );
  }, (error, stack) {
    debugPrint('Uncaught startup error: $error\n$stack');
  });
}
