import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'providers/auth_controller.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

class MyGarageBuyerApp extends StatefulWidget {
  const MyGarageBuyerApp({super.key});

  @override
  State<MyGarageBuyerApp> createState() => _MyGarageBuyerAppState();
}

class _MyGarageBuyerAppState extends State<MyGarageBuyerApp> with WidgetsBindingObserver {
  GoRouter? _router;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<AuthController>().onAppResumed();
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _router ??= createRouter(context.read<AuthController>());
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MyGarage',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: _router!,
      builder: (context, child) {
        ErrorWidget.builder = (details) {
          if (kDebugMode) return ErrorWidget(details.exception);
          return const ColoredBox(
            color: AppColors.background,
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  'Something went wrong.\nPlease close and reopen the app.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 15,
                    height: 1.4,
                  ),
                ),
              ),
            ),
          );
        };
        return child ?? const SizedBox.shrink();
      },
    );
  }
}
