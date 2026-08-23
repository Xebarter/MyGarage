import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import 'providers/auth_controller.dart';
import 'providers/dispatch_controller.dart';
import 'router/app_router.dart';
import 'theme/app_theme.dart';
import 'widgets/incoming_offer_host.dart';

/// Global go_router for navigation from outside the shell tree
/// (e.g. after Accept on the job-offer intercept).
class AppNavigation {
  AppNavigation._();
  static GoRouter? router;

  static void openTrip(String requestId) {
    final path = '/trip/$requestId';
    final r = router;
    if (r != null) {
      r.go(path);
    }
  }
}

class MyGarageServicesApp extends StatefulWidget {
  const MyGarageServicesApp({super.key});

  @override
  State<MyGarageServicesApp> createState() => _MyGarageServicesAppState();
}

class _MyGarageServicesAppState extends State<MyGarageServicesApp> with WidgetsBindingObserver {
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
    final auth = context.read<AuthController>();
    final dispatch = context.read<DispatchController>();
    auth.onAppResumed().then((_) {
      final id = auth.vendorId;
      if (id != null) {
        dispatch.start(id);
        return dispatch.onAppResumed();
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_router == null) {
      _router = createRouter(context.read<AuthController>());
      AppNavigation.router = _router;
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MyGarage Services',
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

        return IncomingOfferHost(
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
