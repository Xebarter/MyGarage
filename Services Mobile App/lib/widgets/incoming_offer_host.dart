import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../app.dart';
import '../models/service_request.dart';
import '../providers/auth_controller.dart';
import '../providers/dispatch_controller.dart';
import '../screens/jobs/incoming_offer_screen.dart';
import '../services/job_alert_service.dart';
import '../utils/user_facing_error.dart';

/// Listens for a new job offer app-wide and presents a full-screen intercept
/// (works even when the provider is on another tab).
class IncomingOfferHost extends StatefulWidget {
  const IncomingOfferHost({super.key, required this.child});

  final Widget child;

  @override
  State<IncomingOfferHost> createState() => _IncomingOfferHostState();
}

class _IncomingOfferHostState extends State<IncomingOfferHost>
    with WidgetsBindingObserver {
  DispatchController? _dispatch;
  AuthController? _auth;
  String? _presentedOfferId;
  bool _dialogOpen = false;
  bool _responding = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _auth = context.read<AuthController>();
      _dispatch = context.read<DispatchController>();
      _auth!.addListener(_onAuthChanged);
      _dispatch!.addListener(_onDispatchChanged);

      final alerts = JobAlertService.instance;
      alerts.onNotificationAction = _respondFromExternal;
      alerts.onRequestPresentDialog = _forcePresentIfNeeded;

      _onAuthChanged();
      _onDispatchChanged();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _auth?.removeListener(_onAuthChanged);
    _dispatch?.removeListener(_onDispatchChanged);
    final alerts = JobAlertService.instance;
    alerts.onNotificationAction = null;
    alerts.onRequestPresentDialog = null;
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _forcePresentIfNeeded();
    }
  }

  void _onAuthChanged() {
    final auth = _auth;
    final dispatch = _dispatch;
    if (auth == null || dispatch == null) return;
    if (auth.status == AuthStatus.authenticated && auth.vendorId != null) {
      dispatch.start(auth.vendorId!);
    } else if (auth.status == AuthStatus.unauthenticated) {
      dispatch.stop();
    }
  }

  void _forcePresentIfNeeded() {
    final offer = _dispatch?.offer;
    if (offer == null || !mounted) return;
    if (_dialogOpen) return;
    _presentedOfferId = null;
    _onDispatchChanged();
  }

  /// Public path for Jobs-tab “Review offer” CTA.
  void requestPresentOffer() => _forcePresentIfNeeded();

  void _onDispatchChanged() {
    final offer = _dispatch?.offer;
    if (offer == null) {
      if (_dialogOpen && mounted) {
        final nav = Navigator.of(context, rootNavigator: true);
        if (nav.canPop()) nav.pop();
      }
      _presentedOfferId = null;
      return;
    }
    if (_dialogOpen) return;
    if (offer.assignmentId == _presentedOfferId) return;
    _presentedOfferId = offer.assignmentId;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (_dispatch?.offer?.assignmentId != offer.assignmentId) return;
      unawaited(_presentOffer(offer));
    });
  }

  Future<void> _presentOffer(DispatchOffer offer) async {
    if (_dialogOpen || !mounted) return;
    _dialogOpen = true;

    final action = await showGeneralDialog<String>(
      context: context,
      useRootNavigator: true,
      barrierDismissible: false,
      barrierLabel: 'Incoming job offer',
      barrierColor: const Color(0xFF0B1220),
      transitionDuration: const Duration(milliseconds: 280),
      pageBuilder: (context, animation, secondary) {
        return SafeArea(
          child: IncomingOfferScreen(
            offer: offer,
            onVolumeSilence: () => JobAlertService.instance.silence(),
          ),
        );
      },
      transitionBuilder: (context, animation, secondary, child) {
        final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
        return FadeTransition(opacity: curved, child: child);
      },
    );

    _dialogOpen = false;
    if (!mounted) return;

    if (action == null) {
      // Dialog closed without choice (e.g. offer cleared server-side).
      if (_dispatch?.offer == null) {
        await JobAlertService.instance.stop();
      } else if (_dispatch?.offer?.assignmentId == offer.assignmentId) {
        // Allow re-present next frame if still valid.
        _presentedOfferId = null;
      }
      return;
    }

    await _completeResponse(action);
  }

  Future<void> _respondFromExternal(String action) async {
    if (!mounted) return;
    // Close dialog if open so we don't double-respond.
    if (_dialogOpen) {
      final nav = Navigator.of(context, rootNavigator: true);
      if (nav.canPop()) nav.pop(action);
      return;
    }
    await _completeResponse(action);
  }

  Future<void> _completeResponse(String action) async {
    if (_responding) return;
    _responding = true;
    try {
      // Capture id before respond clears the offer.
      final knownId = _dispatch?.offer?.requestId.isNotEmpty == true
          ? _dispatch!.offer!.requestId
          : _dispatch?.offer?.request?.id;

      final tripId = await context.read<DispatchController>().respondToOffer(action);
      await JobAlertService.instance.stop();
      if (!mounted) return;

      if (action == 'accept') {
        final id = (tripId != null && tripId.isNotEmpty)
            ? tripId
            : knownId;
        final job = context.read<DispatchController>().activeJob;
        final dest = (id != null && id.isNotEmpty) ? id : job?.id;
        if (dest != null && dest.isNotEmpty) {
          // After the dialog is fully torn down, navigate on the next frame so
          // GoRouter/root navigator are free (builder context + general dialog).
          await Future<void>.delayed(const Duration(milliseconds: 16));
          if (!mounted) return;
          _openTrip(dest);
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Job accepted. Open it from Active trip on Jobs.')),
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(userFacingError(e, fallback: 'Could not respond to this offer.')),
        ),
      );
      final still = context.read<DispatchController>().offer;
      if (still != null) {
        _presentedOfferId = null;
        _onDispatchChanged();
      }
    } finally {
      _responding = false;
    }
  }

  void _openTrip(String requestId) {
    AppNavigation.openTrip(requestId);
    if (AppNavigation.router != null) return;
    if (!mounted) return;
    try {
      GoRouter.of(context).go('/trip/$requestId');
    } catch (_) {
      try {
        context.go('/trip/$requestId');
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    // Expose present helper via InheritedWidget-like static access from jobs tab.
    return _IncomingOfferScope(
      presentOffer: _forcePresentIfNeeded,
      child: widget.child,
    );
  }
}

class _IncomingOfferScope extends InheritedWidget {
  const _IncomingOfferScope({
    required this.presentOffer,
    required super.child,
  });

  final VoidCallback presentOffer;

  static _IncomingOfferScope? maybeOf(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<_IncomingOfferScope>();
  }

  @override
  bool updateShouldNotify(_IncomingOfferScope oldWidget) => false;
}

/// Call from Jobs (or elsewhere) to re-open the accept/decline intercept.
void presentIncomingOfferDialog(BuildContext context) {
  _IncomingOfferScope.maybeOf(context)?.presentOffer();
  // Fallback if InheritedWidget was not found (edge mount order).
  JobAlertService.instance.onRequestPresentDialog?.call();
}
