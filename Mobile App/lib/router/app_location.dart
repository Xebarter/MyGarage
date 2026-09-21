import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Visible app path (the StatefulShell branch's [GoRouterState] stays on its
/// own route even when another tab is showing).
String currentAppPath(BuildContext context) {
  return GoRouter.of(context).routerDelegate.currentConfiguration.uri.path;
}

/// True only when the Services tab is actually on screen.
bool isServicesTabActive(BuildContext context) {
  if (currentAppPath(context) != '/services') return false;
  final shell = StatefulNavigationShell.maybeOf(context);
  return shell != null && shell.currentIndex == 0;
}
