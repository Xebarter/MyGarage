import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

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

class _IncomingOfferHostState extends State<IncomingOfferHost> {
  DispatchController? _dispatch;
  AuthController? _auth;
  String? _presentedOfferId;
  bool _dialogOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _auth = context.read<AuthController>();
      _dispatch = context.read<DispatchController>();
      _auth!.addListener(_onAuthChanged);
      _dispatch!.addListener(_onDispatchChanged);
      _onAuthChanged();
      _onDispatchChanged();
    });
  }

  @override
  void dispose() {
    _auth?.removeListener(_onAuthChanged);
    _dispatch?.removeListener(_onDispatchChanged);
    super.dispose();
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
    if (offer.assignmentId == _presentedOfferId || _dialogOpen) return;
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
      barrierColor: Colors.black.withValues(alpha: 0.72),
      transitionDuration: const Duration(milliseconds: 320),
      pageBuilder: (context, animation, secondary) {
        return SafeArea(
          child: IncomingOfferScreen(offer: offer),
        );
      },
      transitionBuilder: (context, animation, secondary, child) {
        final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
        return FadeTransition(
          opacity: curved,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.96, end: 1).animate(curved),
            child: child,
          ),
        );
      },
    );

    _dialogOpen = false;
    if (!mounted) return;

    if (action == null) {
      if (_dispatch?.offer == null) {
        await JobAlertService.instance.stop();
      }
      return;
    }

    try {
      await context.read<DispatchController>().respondToOffer(action);
      await JobAlertService.instance.stop();
      if (!mounted) return;
      if (action == 'accept') {
        final job = context.read<DispatchController>().activeJob;
        if (job != null) context.push('/trip/${job.id}');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not respond to this offer.'))),
      );
      final still = context.read<DispatchController>().offer;
      if (still != null) {
        _presentedOfferId = null;
        _onDispatchChanged();
      }
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
