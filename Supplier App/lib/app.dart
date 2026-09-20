import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'providers/auth_controller.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

class AppNavigation {
  AppNavigation._();
  static GoRouter? router;
}

class MyGarageSupplierApp extends StatefulWidget {
  const MyGarageSupplierApp({super.key});

  @override
  State<MyGarageSupplierApp> createState() => _MyGarageSupplierAppState();
}

class _MyGarageSupplierAppState extends State<MyGarageSupplierApp> with WidgetsBindingObserver {
  GoRouter? _router;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    if (identical(AppNavigation.router, _router)) {
      AppNavigation.router = null;
    }
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;
    context.read<AuthController>().onAppResumed();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_router == null) {
      final auth = context.read<AuthController>();
      _router = createRouter(auth);
      AppNavigation.router = _router;
      auth.onSignedOut = () => _router?.go('/sign-in');
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MyGarage Supplier',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: _router!,
      builder: (context, child) {
        ErrorWidget.builder = (details) {
          if (kDebugMode) {
            return ErrorWidget(details.exception);
          }
          return const ColoredBox(
            color: AppColors.background,
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Something went wrong.\nPlease close and reopen the app.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.textSecondary, fontSize: 15, height: 1.4),
                ),
              ),
            ),
          );
        };

        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: AppTheme.systemUi,
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
