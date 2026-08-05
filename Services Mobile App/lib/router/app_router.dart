import 'package:go_router/go_router.dart';

import '../providers/auth_controller.dart';
import '../screens/auth/sign_in_screen.dart';
import '../screens/funds/funds_screen.dart';
import '../screens/jobs/jobs_screen.dart';
import '../screens/pending/pending_verification_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/services/my_services_screen.dart';
import '../screens/shell/main_shell.dart';
import '../screens/trip/active_trip_screen.dart';

GoRouter createRouter(AuthController auth) {
  return GoRouter(
    initialLocation: '/jobs',
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
          if (loggingIn || pending) return '/jobs';
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
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return MainShell(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/jobs',
                builder: (context, state) => const JobsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/services',
                builder: (context, state) => const MyServicesScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/funds',
                builder: (context, state) => const FundsScreen(),
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
        path: '/trip/:requestId',
        builder: (context, state) {
          final id = state.pathParameters['requestId']!;
          return ActiveTripScreen(requestId: id);
        },
      ),
    ],
  );
}
