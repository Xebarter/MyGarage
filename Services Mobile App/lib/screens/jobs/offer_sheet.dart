import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../../models/service_request.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ui.dart';

class OfferSheet extends StatefulWidget {
  const OfferSheet({super.key, required this.offer});

  final DispatchOffer offer;

  @override
  State<OfferSheet> createState() => _OfferSheetState();
}

class _OfferSheetState extends State<OfferSheet> {
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

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceHigh,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(24, 12, 24, 20 + MediaQuery.of(context).padding.bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(99),
              ),
            ),
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Text(
                'Incoming offer',
                style: AppTheme.host(fontSize: 13, color: AppColors.textMuted, fontWeight: FontWeight.w600),
              ),
              const Spacer(),
              StatusPill(
                label: '${_remaining.inSeconds}s',
                color: _remaining.inSeconds < 20 ? AppColors.danger : AppColors.warning,
              ),
            ],
          ),
          const SizedBox(height: 14),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 5,
              backgroundColor: AppColors.borderSoft,
              color: progress < 0.25 ? AppColors.danger : AppColors.primary,
            ),
          ),
          const SizedBox(height: 22),
          Text(
            req?.service ?? 'Service request',
            style: AppTheme.host(fontSize: 26, fontWeight: FontWeight.w600, letterSpacing: -0.4),
          ).animate().fadeIn(duration: 280.ms).slideY(begin: 0.06),
          if ((req?.location ?? '').isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              req!.location,
              style: AppTheme.host(fontSize: 15, color: AppColors.textSecondary, height: 1.45),
            ),
          ],
          if ((req?.buyerContactName ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              req!.buyerContactName,
              style: AppTheme.host(fontSize: 14, color: AppColors.textMuted),
            ),
          ],
          const SizedBox(height: 28),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop('accept'),
            child: const Text('Accept job'),
          ),
          const SizedBox(height: 10),
          TextButton(
            onPressed: () => Navigator.of(context).pop('decline'),
            child: const Text('Decline'),
          ),
        ],
      ),
    ).animate().slideY(begin: 0.08, duration: 320.ms, curve: Curves.easeOutCubic).fadeIn();
  }
}
