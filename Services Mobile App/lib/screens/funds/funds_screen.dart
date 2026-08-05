import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/funds_api.dart';
import '../../models/funds.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/format.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/ui.dart';
import 'payout_prefs_sheet.dart';

class FundsScreen extends StatefulWidget {
  const FundsScreen({super.key});

  @override
  State<FundsScreen> createState() => _FundsScreenState();
}

class _FundsScreenState extends State<FundsScreen> {
  final _api = FundsApi(ApiClient());
  FundsData? _data;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await _api.getFunds(vendorId);
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        // Keep prior data if we have it (smooth after idle resume).
        if (_data != null) {
          _loading = false;
          _error = null;
        } else {
          _error = userFacingError(e, fallback: 'Could not load funds right now.');
          _loading = false;
        }
      });
    }
  }

  Future<void> _editPayout() async {
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId == null) return;
    final current = _data?.preference ?? PayoutPreference();
    final updated = await showModalBottomSheet<PayoutPreference>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PayoutPrefsSheet(initial: current),
    );
    if (updated == null || !mounted) return;
    try {
      await _api.savePayoutPreference(vendorId, updated);
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not save payout details.'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final summary = _data?.summary;
    final payments = _data?.paymentHistory.take(8).toList() ?? [];
    final prefs = _data?.preference;

    return PageScaffold(
      title: 'Funds',
      body: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: _load,
        child: _loading
            ? ListView(children: const [SizedBox(height: 120), Center(child: CircularProgressIndicator())])
            : _error != null && _data == null
                ? ListView(
                    children: [
                      EmptyState(
                        title: 'Could not load funds',
                        subtitle: _error,
                        icon: Icons.payments_outlined,
                        action: OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ),
                    ],
                  )
                : ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                    children: [
                      GlassCard(
                        highlight: true,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Available balance',
                              style: AppTheme.host(fontSize: 13, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              formatUgx(summary?.availableBalance ?? 0),
                              style: AppTheme.host(
                                fontSize: 36,
                                fontWeight: FontWeight.w600,
                                letterSpacing: -0.8,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              'Net ${formatUgx(summary?.netEarnings ?? 0)}  ·  Paid ${formatUgx(summary?.paidOut ?? 0)}',
                              style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.04),
                      const SectionLabel('PAYOUT'),
                      GlassCard(
                        onTap: _editPayout,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        child: QuietRow(
                          title: prefs == null ? 'Set up payouts' : prefs.payoutAccountName,
                          subtitle: prefs == null
                              ? 'Where you want to receive money'
                              : '${prefs.payoutMethod.replaceAll('_', ' ')} · ${prefs.network.isEmpty ? prefs.payoutAccountNumber : prefs.network}',
                          trailing: const Icon(Icons.chevron_right_rounded, color: AppColors.textMuted),
                        ),
                      ),
                      const SectionLabel('COLLECTIONS'),
                      if (payments.isEmpty)
                        Text(
                          'No collections yet',
                          style: AppTheme.host(fontSize: 14, color: AppColors.textMuted),
                        )
                      else
                        GlassCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                          child: Column(
                            children: [
                              for (var i = 0; i < payments.length; i++) ...[
                                QuietRow(
                                  title: formatUgx(payments[i].amount),
                                  subtitle:
                                      '${payments[i].checkoutType} · ${payments[i].status} · ${formatDateTime(payments[i].createdAt)}',
                                ),
                                if (i < payments.length - 1) const Divider(height: 1),
                              ],
                            ],
                          ),
                        ).animate().fadeIn(delay: 80.ms, duration: 400.ms),
                    ],
                  ),
      ),
    );
  }
}
