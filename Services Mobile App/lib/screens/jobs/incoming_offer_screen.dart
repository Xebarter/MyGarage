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
              Color(0xFF0A1020),
              Color(0xFF121A2E),
              Color(0xFF0B1220),
            ],
            stops: [0.0, 0.55, 1.0],
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
                    color: const Color(0xFF93C5FD),
                    letterSpacing: 1.6,
                  ),
                ),
                const Spacer(),
                StatusPill(
                  label: '${_remaining.inSeconds}s left',
                  color: urgent ? AppColors.danger : const Color(0xFFFBBF24),
                ),
              ],
            ),
            const SizedBox(height: 18),
            ClipRRect(
              borderRadius: BorderRadius.circular(99),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 5,
                backgroundColor: Colors.white.withValues(alpha: 0.08),
                color: urgent ? AppColors.danger : const Color(0xFF60A5FA),
              ),
            ),
            const Spacer(flex: 2),
            Center(
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF2563EB).withValues(alpha: 0.16),
                  border: Border.all(color: const Color(0xFF60A5FA).withValues(alpha: 0.55), width: 2),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withValues(alpha: 0.25),
                      blurRadius: 28,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(Icons.work_rounded, size: 44, color: Color(0xFF93C5FD)),
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
                letterSpacing: -0.55,
                color: Colors.white,
              ),
            ).animate().fadeIn(duration: 280.ms).slideY(begin: 0.06),
            if ((req?.location ?? '').isNotEmpty) ...[
              const SizedBox(height: 14),
              Text(
                req!.location,
                textAlign: TextAlign.center,
                style: AppTheme.host(fontSize: 16, color: const Color(0xFF94A3B8), height: 1.45),
              ),
            ],
            if ((req?.buyerContactName ?? '').isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                req!.buyerContactName,
                textAlign: TextAlign.center,
                style: AppTheme.host(fontSize: 14, color: const Color(0xFF64748B)),
              ),
            ],
            const Spacer(flex: 3),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                minimumSize: const Size.fromHeight(56),
                backgroundColor: const Color(0xFF2563EB),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: () => Navigator.of(context).pop('accept'),
              child: Text(
                'Accept job',
                style: AppTheme.host(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
                foregroundColor: Colors.white70,
                side: BorderSide(color: Colors.white.withValues(alpha: 0.18)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
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
