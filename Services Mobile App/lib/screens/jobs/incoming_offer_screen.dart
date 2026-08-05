import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../models/service_request.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ui.dart';

/// Full-screen intercept for an incoming job (rideshare-style).
class IncomingOfferScreen extends StatefulWidget {
  const IncomingOfferScreen({super.key, required this.offer});

  final DispatchOffer offer;

  @override
  State<IncomingOfferScreen> createState() => _IncomingOfferScreenState();
}

class _IncomingOfferScreenState extends State<IncomingOfferScreen> {
  static const _window = Duration(seconds: 90);
  late Duration _remaining;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    final assigned = widget.offer.assignedAt ?? DateTime.now();
    final elapsed = DateTime.now().difference(assigned);
    _remaining = _window - elapsed;
    if (_remaining.isNegative) _remaining = Duration.zero;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _remaining -= const Duration(seconds: 1);
        if (_remaining.isNegative) _remaining = Duration.zero;
      });
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final req = widget.offer.request;
    final progress = (_remaining.inSeconds / _window.inSeconds).clamp(0.0, 1.0);
    final urgent = _remaining.inSeconds < 20;

    return Material(
      color: AppColors.background,
      child: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF0B1220),
              Color(0xFF111827),
              Color(0xFF0F172A),
            ],
          ),
        ),
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 12),
            Row(
              children: [
                Text(
                  'INCOMING JOB',
                  style: AppTheme.host(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.primary,
                    letterSpacing: 1.4,
                  ),
                ),
                const Spacer(),
                StatusPill(
                  label: '${_remaining.inSeconds}s left',
                  color: urgent ? AppColors.danger : AppColors.warning,
                ),
              ],
            ),
            const SizedBox(height: 18),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 6,
                backgroundColor: AppColors.borderSoft,
                color: urgent ? AppColors.danger : AppColors.primary,
              ),
            ),
            const Spacer(flex: 2),
            Center(
              child: Container(
                width: 96,
                height: 96,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: AppColors.primary.withValues(alpha: 0.14),
                  border: Border.all(color: AppColors.primary.withValues(alpha: 0.45), width: 2),
                ),
                child: const Icon(Icons.work_rounded, size: 44, color: AppColors.primary),
              )
                  .animate(onPlay: (c) => c.repeat(reverse: true))
                  .scale(
                    begin: const Offset(0.94, 0.94),
                    end: const Offset(1.06, 1.06),
                    duration: 700.ms,
                    curve: Curves.easeInOut,
                  ),
            ),
            const SizedBox(height: 28),
            Text(
              req?.service ?? 'Service request',
              textAlign: TextAlign.center,
              style: AppTheme.host(
                fontSize: 30,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
                color: Colors.white,
              ),
            ).animate().fadeIn(duration: 280.ms).slideY(begin: 0.06),
            if ((req?.location ?? '').isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                req!.location,
                textAlign: TextAlign.center,
                style: AppTheme.host(fontSize: 16, color: AppColors.textSecondary, height: 1.45),
              ),
            ],
            if ((req?.buyerContactName ?? '').isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                req!.buyerContactName,
                textAlign: TextAlign.center,
                style: AppTheme.host(fontSize: 14, color: AppColors.textMuted),
              ),
            ],
            const Spacer(flex: 3),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(56),
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
              onPressed: () => Navigator.of(context).pop('accept'),
              child: const Text('Accept job'),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: Colors.white70,
                side: BorderSide(color: Colors.white.withValues(alpha: 0.22)),
              ),
              onPressed: () => Navigator.of(context).pop('decline'),
              child: const Text('Decline'),
            ),
            SizedBox(height: MediaQuery.of(context).padding.bottom + 8),
          ],
        ),
      ),
    );
  }
}
