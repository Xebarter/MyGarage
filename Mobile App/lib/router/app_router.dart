import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/auth_controller.dart';
import '../screens/auth/login_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/checkout/checkout_screen.dart';
import '../screens/garage/garage_screen.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/profile/profile_section_screen.dart';
import '../screens/profile/profile_satellites.dart';
import '../screens/services/service_category_screen.dart';
import '../screens/services/service_location_screen.dart';
import '../screens/services/service_requesting_screen.dart';
import '../screens/services/service_track_screen.dart';
import '../screens/services/services_screen.dart';
import '../screens/shell/main_shell.dart';
import '../screens/shop/category_products_screen.dart';
import '../screens/shop/product_detail_screen.dart';
import '../screens/shop/shop_screen.dart';
import '../widgets/app_bottom_nav.dart';

GoRouter createRouter(AuthController auth) {
  return GoRouter(
    initialLocation: '/services',
    refreshListenable: auth,
    routes: [
      // Login has no footer so auth UI stays full-height.
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),

      // All main app pages share the static bottom footer.
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          StatefulShellRoute(
            builder: (context, state, navigationShell) {
              // Branch layout/swipe is handled by [navigatorContainerBuilder].
              return navigationShell;
            },
            navigatorContainerBuilder:
                (context, navigationShell, children) {
              return MainShell(
                navigationShell: navigationShell,
                children: children,
              );
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
            path: '/product/:id',
            builder: (context, state) {
              final extra = state.extra;
              final Product? initial =
                  extra is Product ? extra : null;
              return ProductDetailScreen(
                productId: state.pathParameters['id']!,
                initialProduct: initial,
              );
            },
          ),
          GoRoute(
            path: '/shop/category/:categoryName',
            builder: (context, state) => CategoryProductsScreen(
              categoryName:
                  Uri.decodeComponent(state.pathParameters['categoryName']!),
            ),
          ),
          GoRoute(
            path: '/service/:categoryId',
            builder: (context, state) => ServiceCategoryScreen(
              categoryId: state.pathParameters['categoryId']!,
            ),
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
            builder: (context, state) => ServiceTrackScreen(
              requestId: state.pathParameters['requestId']!,
            ),
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
          GoRoute(
            path: '/profile/:section',
            builder: (context, state) => ProfileSectionScreen(
              section: state.pathParameters['section'] ?? 'account',
            ),
          ),
          GoRoute(
            path: '/addresses',
            builder: (context, state) => const AddressesScreen(),
          ),
          GoRoute(
            path: '/wishlist',
            builder: (context, state) => const WishlistScreen(),
          ),
          GoRoute(
            path: '/support',
            builder: (context, state) => const SupportScreen(),
          ),
        ],
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
