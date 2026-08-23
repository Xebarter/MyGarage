import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/cart_controller.dart';
import '../theme/app_theme.dart';

/// Main app footer (Services / Shop / Cart / Profile).
class AppBottomNav extends StatelessWidget {
  const AppBottomNav({
    super.key,
    required this.location,
  });

  /// Current route path (e.g. `/product/123`).
  final String location;

  static const tabPaths = ['/services', '/shop', '/cart', '/profile'];

  /// Which tab is “active” for a given location.
  static int selectedIndexFor(String path) {
    final p = path.split('?').first;
    if (p.startsWith('/cart') || p.startsWith('/checkout')) return 2;
    if (p.startsWith('/profile') ||
        p.startsWith('/orders') ||
        p.startsWith('/garage') ||
        p.startsWith('/addresses') ||
        p.startsWith('/wishlist') ||
        p.startsWith('/support')) {
      return 3;
    }
    if (p.startsWith('/shop') || p.startsWith('/product')) return 1;
    if (p.startsWith('/service') || p.startsWith('/services')) return 0;
    return 0;
  }

  static void goToTab(BuildContext context, int index) {
    if (index < 0 || index >= tabPaths.length) return;
    context.go(tabPaths[index]);
  }

  @override
  Widget build(BuildContext context) {
    final cartCount = context.watch<CartController>().itemCount;
    final selected = selectedIndexFor(location);

    return Material(
      elevation: 0,
      color: AppColors.surface,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: const Border(top: BorderSide(color: AppColors.borderSoft)),
          boxShadow: AppTheme.navShadow,
        ),
        child: SafeArea(
          top: false,
          child: NavigationBar(
            selectedIndex: selected,
            onDestinationSelected: (i) => goToTab(context, i),
            backgroundColor: Colors.transparent,
            elevation: 0,
            height: 64,
            indicatorColor: AppColors.primarySoft,
            destinations: [
              const NavigationDestination(
                icon: Icon(Icons.build_outlined),
                selectedIcon: Icon(Icons.build),
                label: 'Services',
              ),
              const NavigationDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront),
                label: 'Shop',
              ),
              NavigationDestination(
                icon: Badge(
                  isLabelVisible: cartCount > 0,
                  label: Text('$cartCount'),
                  child: const Icon(Icons.shopping_cart_outlined),
                ),
                selectedIcon: Badge(
                  isLabelVisible: cartCount > 0,
                  label: Text('$cartCount'),
                  child: const Icon(Icons.shopping_cart),
                ),
                label: 'Cart',
              ),
              const NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Wraps any page with the persistent app footer (except login, which stays outside).
class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;

    return Scaffold(
      body: child,
      bottomNavigationBar: AppBottomNav(location: location),
    );
  }
}
