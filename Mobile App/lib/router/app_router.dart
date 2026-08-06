import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/auth_controller.dart';
import '../screens/auth/login_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/checkout/checkout_screen.dart';
import '../screens/garage/garage_screen.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/services/service_category_screen.dart';
import '../screens/services/service_location_screen.dart';
import '../screens/services/service_requesting_screen.dart';
import '../screens/services/service_track_screen.dart';
import '../screens/services/services_screen.dart';
import '../screens/shell/main_shell.dart';
import '../screens/shop/product_detail_screen.dart';
import '../screens/shop/shop_screen.dart';

GoRouter createRouter(AuthController auth) {
  return GoRouter(
    initialLocation: '/services',
    refreshListenable: auth,
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/services',
                builder: (context, state) => const ServicesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/shop',
                builder: (context, state) => const ShopScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/cart',
                builder: (context, state) => const CartScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/product/:id',
        builder: (context, state) => ProductDetailScreen(productId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/service/:categoryId',
        builder: (context, state) =>
            ServiceCategoryScreen(categoryId: state.pathParameters['categoryId']!),
      ),
      GoRoute(
        path: '/service/:categoryId/location',
        builder: (context, state) {
          final service = state.uri.queryParameters['service'] ?? '';
          return ServiceLocationScreen(
            categoryId: state.pathParameters['categoryId']!,
            serviceName: service,
          );
        },
      ),
      GoRoute(
        path: '/service/requesting',
        builder: (context, state) {
          final requestId = state.uri.queryParameters['requestId'] ?? '';
          return ServiceRequestingScreen(requestId: requestId);
        },
      ),
      GoRoute(
        path: '/service/track/:requestId',
        builder: (context, state) =>
            ServiceTrackScreen(requestId: state.pathParameters['requestId']!),
      ),
      GoRoute(
        path: '/checkout',
        builder: (context, state) => const CheckoutScreen(),
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const OrdersScreen(),
      ),
      GoRoute(
        path: '/garage',
        builder: (context, state) => const GarageScreen(),
      ),
    ],
  );
}

/// Helper to require auth before sensitive actions.
Future<bool> ensureSignedIn(BuildContext context) async {
  final auth = context.read<AuthController>();
  if (auth.status == AuthStatus.authenticated && auth.user != null) return true;
  await context.push('/login');
  return auth.status == AuthStatus.authenticated && auth.user != null;
}
