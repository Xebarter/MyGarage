import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../auth/auth_return_to.dart';
import '../models/models.dart';
import '../providers/auth_controller.dart';
import '../providers/cart_controller.dart';
import '../screens/auth/login_screen.dart';
import '../screens/cart/cart_screen.dart';
import '../screens/checkout/checkout_screen.dart';
import '../screens/concierge/concierge_screen.dart';
import '../screens/garage/garage_screen.dart';
import '../screens/garage/garage_vehicle_detail_screen.dart';
import '../screens/orders/order_detail_screen.dart';
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

String myGarageDeepLinkKey(Uri uri) {
  if (uri.scheme == 'mygarage') {
    final host = uri.host;
    final path = uri.path.replaceAll(RegExp(r'^/+|/+$'), '');
    if (host.isEmpty) return path;
    if (path.isEmpty) return host;
    return '$host/$path';
  }

  final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
  if (segments.length >= 2 &&
      segments[0] == 'checkout' &&
      (segments[1] == 'complete' || segments[1] == 'failed')) {
    return 'checkout/${segments[1]}';
  }
  if (segments.length == 1 &&
      (segments[0] == 'complete' || segments[0] == 'failed') &&
      uri.host == 'checkout') {
    return 'checkout/${segments[0]}';
  }
  return '';
}

String? authReturnLocation(Uri uri, AuthController auth) {
  final host = uri.host.toLowerCase();
  final isAuthCallback = host == 'login-callback' ||
      (uri.scheme == 'mygarage' && (host == 'auth' || host == 'login-callback'));
  if (!isAuthCallback) return null;

  final fromQuery = uri.queryParameters['next'];
  final next = AuthReturnTo.isSafePath(fromQuery)
      ? fromQuery
      : AuthReturnTo.consumeSync();
  if (auth.status == AuthStatus.authenticated) {
    return next ?? '/services';
  }
  if (AuthReturnTo.isSafePath(next)) {
    return '/login?next=${Uri.encodeComponent(next!)}';
  }
  return '/login';
}

String? paymentReturnLocation(
  Uri uri,
  AuthController auth,
  CartController cart,
) {
  final key = myGarageDeepLinkKey(uri);
  if (key != 'checkout/complete' && key != 'checkout/failed') return null;

  final kind = uri.queryParameters['kind'] ?? '';
  final requestId = uri.queryParameters['requestId'] ?? '';

  if (key == 'checkout/complete') {
    cart.confirmHeldCheckout();
    if (kind == 'subscription') return '/profile/membership';
    if (kind == 'service') {
      if (requestId.isNotEmpty) return '/service/track/$requestId';
      return '/profile/billing';
    }
    return auth.status == AuthStatus.authenticated ? '/orders' : '/login';
  }

  cart.restoreHeldCheckout();
  if (kind == 'subscription') return '/profile/membership';
  if (kind == 'service') {
    if (requestId.isNotEmpty) return '/service/track/$requestId';
    return '/profile/billing';
  }
  return '/checkout';
}

GoRouter createRouter(AuthController auth, CartController cart) {
  return GoRouter(
    initialLocation: '/services',
    refreshListenable: auth,
    redirect: (context, state) {
      final authLocation = authReturnLocation(state.uri, auth);
      if (authLocation != null) return authLocation;
      final paymentLocation = paymentReturnLocation(state.uri, auth, cart);
      if (paymentLocation != null) return paymentLocation;
      if (state.matchedLocation == '/checkout/complete' ||
          state.matchedLocation == '/checkout/failed') {
        return paymentReturnLocation(
              state.uri.replace(path: state.matchedLocation),
              auth,
              cart,
            ) ??
            '/services';
      }
      if (state.matchedLocation == '/login' &&
          auth.status == AuthStatus.authenticated &&
          !context.canPop()) {
        final fromQuery = state.uri.queryParameters['next'];
        final stored = AuthReturnTo.consumeSync();
        final next = AuthReturnTo.isSafePath(fromQuery) ? fromQuery : stored;
        return next ?? '/services';
      }
      return null;
    },
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
          // Static paths before `/service/:categoryId` so "requesting" / "track"
          // are not swallowed as category ids.
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
            path: '/checkout/complete',
            redirect: (context, state) =>
                paymentReturnLocation(state.uri, auth, cart) ?? '/orders',
          ),
          GoRoute(
            path: '/checkout/failed',
            redirect: (context, state) =>
                paymentReturnLocation(state.uri, auth, cart) ?? '/checkout',
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
            path: '/orders/:id',
            builder: (context, state) => OrderDetailScreen(
              orderId: state.pathParameters['id'] ?? '',
            ),
          ),
          GoRoute(
            path: '/concierge',
            builder: (context, state) => ConciergeScreen(
              vehicleId: state.uri.queryParameters['vehicleId'],
            ),
          ),
          GoRoute(
            path: '/garage',
            builder: (context, state) => const GarageScreen(),
          ),
          GoRoute(
            path: '/garage/:id',
            builder: (context, state) => GarageVehicleDetailScreen(
              vehicleId: state.pathParameters['id'] ?? '',
            ),
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
  final uri = GoRouterState.of(context).uri;
  final here = uri.hasQuery ? '${uri.path}?${uri.query}' : uri.path;
  await AuthReturnTo.save(here);
  if (!context.mounted) return false;
  await context.push('/login?next=${Uri.encodeComponent(here)}');
  return auth.status == AuthStatus.authenticated && auth.user != null;
}
