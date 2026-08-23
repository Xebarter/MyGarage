import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'config.dart';
import 'providers/auth_controller.dart';
import 'providers/cart_controller.dart';
import 'providers/shop_catalog_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _loadEnv();

  if (kDebugMode) {
    debugPrint('[MyGarage] API_URL=${AppConfig.apiUrl}');
  }

  if (AppConfig.isSupabaseConfigured) {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  final shopCatalog = ShopCatalogController();
  // Kick off disk + network before user opens Shop — don't await.
  // ignore: discarded_futures
  shopCatalog.start();

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthController()),
        ChangeNotifierProvider(create: (_) => CartController()..load()),
        ChangeNotifierProvider.value(value: shopCatalog),
      ],
      child: const MyGarageBuyerApp(),
    ),
  );
}

/// Always leave dotenv initialized so later `dotenv.env` access never throws.
Future<void> _loadEnv() async {
  try {
    await dotenv.load(fileName: 'assets/app.env', isOptional: true);
  } catch (e) {
    if (kDebugMode) {
      debugPrint('[MyGarage] env load failed: $e');
    }
  }
  if (!dotenv.isInitialized) {
    // Empty map — native defaults / --dart-define still apply via AppConfig.
    dotenv.testLoad(fileInput: '');
  }
}
