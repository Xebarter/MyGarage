import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'providers/auth_controller.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';

class MyGarageServicesApp extends StatefulWidget {
  const MyGarageServicesApp({super.key});

  @override
  State<MyGarageServicesApp> createState() => _MyGarageServicesAppState();
}

class _MyGarageServicesAppState extends State<MyGarageServicesApp> {
  GoRouter? _router;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _router ??= createRouter(context.read<AuthController>());
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MyGarage Services',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: _router!,
    );
  }
}
