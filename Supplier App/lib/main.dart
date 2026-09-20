import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'auth/session_backup.dart';
import 'config.dart';
import 'providers/auth_controller.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  await runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();
    SystemChrome.setSystemUIOverlayStyle(AppTheme.systemUi);
    FlutterError.onError = (details) {
      FlutterError.presentError(details);
      debugPrint('FlutterError: ${details.exceptionAsString()}');
    };

    try {
      await dotenv.load(fileName: '.env');
    } catch (_) {}

    try {
      if (AppConfig.isSupabaseConfigured) {
        await Supabase.initialize(
          url: AppConfig.supabaseUrl,
          anonKey: AppConfig.supabaseAnonKey,
          authOptions: const FlutterAuthClientOptions(
            authFlowType: AuthFlowType.pkce,
          ),
        );
        await SessionBackup.captureFromSupabaseIfPresent();
      }
    } catch (e, st) {
      debugPrint('Supabase.initialize failed: $e\n$st');
    }

    runApp(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthController()),
        ],
        child: const MyGarageSupplierApp(),
      ),
    );
  }, (error, stack) {
    debugPrint('Uncaught startup error: $error\n$stack');
  });
}
