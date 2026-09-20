import 'package:go_router/go_router.dart';

import '../providers/auth_controller.dart';
import '../screens/auth/sign_in_screen.dart';
import '../screens/dashboard/dashboard_screen.dart';
import '../screens/funds/funds_screen.dart';
import '../screens/orders/order_detail_screen.dart';
import '../screens/orders/orders_screen.dart';
import '../screens/pending/pending_verification_screen.dart';
import '../screens/products/product_editor_screen.dart';
import '../screens/products/products_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/promotions/promotions_screen.dart';
import '../screens/shell/main_shell.dart';

GoRouter createRouter(AuthController auth) {
  return GoRouter(
    initialLocation: '/orders',
    refreshListenable: auth,
    redirect: (context, state) {
      final loc = state.matchedLocation;
      final loggingIn = loc == '/sign-in';
      final pending = loc == '/pending';

      switch (auth.status) {
        case AuthStatus.unknown:
          return null;
        case AuthStatus.unauthenticated:
          return loggingIn ? null : '/sign-in';
        case AuthStatus.pendingVerification:
          if (loggingIn) return '/pending';
          return pending ? null : '/pending';
        case AuthStatus.authenticated:
          if (loggingIn || pending) return '/orders';
          return null;
      }
    },
    routes: [
      GoRoute(
        path: '/sign-in',
        builder: (context, state) => const SignInScreen(),
      ),
      GoRoute(
        path: '/pending',
        builder: (context, state) => const PendingVerificationScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const MenuShell(child: DashboardScreen()),
      ),
      GoRoute(
        path: '/funds',
        builder: (context, state) => const MenuShell(child: FundsScreen()),
      ),
      GoRoute(
        path: '/promotions',
        builder: (context, state) => const MenuShell(child: PromotionsScreen()),
      ),
      GoRoute(
        path: '/products/edit/:id',
        builder: (context, state) => ProductEditorScreen(
          productId: state.pathParameters['id'],
        ),
      ),
      GoRoute(
        path: '/products/new',
        builder: (context, state) => const ProductEditorScreen(),
      ),
      GoRoute(
        path: '/orders/:id',
        builder: (context, state) => OrderDetailScreen(
          orderId: state.pathParameters['id'] ?? '',
        ),
      ),
      StatefulShellRoute(
        builder: (context, state, navigationShell) {
          return MainShell(
            footerIndex: navigationShell.currentIndex,
            onFooterSelected: (index) {
              navigationShell.goBranch(
                index,
                initialLocation: index == navigationShell.currentIndex,
              );
            },
            body: navigationShell,
          );
        },
        navigatorContainerBuilder: (context, navigationShell, children) {
          return TabSwipeView(
            currentIndex: navigationShell.currentIndex,
            onIndexChanged: navigationShell.goBranch,
            children: children,
          );
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/orders',
                builder: (context, state) => const OrdersScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/products',
                builder: (context, state) => const ProductsScreen(),
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
    ],
  );
}
