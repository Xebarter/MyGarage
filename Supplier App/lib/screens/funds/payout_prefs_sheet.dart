import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../models/funds.dart';
import '../../theme/app_theme.dart';

class PayoutPrefsSheet extends StatefulWidget {
  const PayoutPrefsSheet({super.key, required this.initial});

  final PayoutPreference initial;

  @override
  State<PayoutPrefsSheet> createState() => _PayoutPrefsSheetState();
}

class _PayoutPrefsSheetState extends State<PayoutPrefsSheet> {
  static const _frequencies = {'weekly', 'monthly'};

  late String _method;
  late String _network;
  late String _frequency;
  late bool _auto;
  late final TextEditingController _name;
  late final TextEditingController _number;
  late final TextEditingController _minimum;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    final i = widget.initial;
    _method = i.payoutMethod == 'bank_account' ? 'bank_account' : 'mobile_money';
    _network = i.network.isEmpty ? 'MTN' : i.network;
    _frequency = _frequencies.contains(i.frequency) ? i.frequency : 'weekly';
    _auto = i.autoDisburseEnabled;
    _name = TextEditingController(text: i.payoutAccountName);
    _number = TextEditingController(text: i.payoutAccountNumber);
    _minimum = TextEditingController(
      text: i.minimumPayoutAmount > 0 ? i.minimumPayoutAmount.toStringAsFixed(0) : '',
    );
  }

  @override
  void dispose() {
    _name.dispose();
    _number.dispose();
    _minimum.dispose();
    super.dispose();
  }

  bool get _isMobile => _method == 'mobile_money';

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(
      PayoutPreference(
        payoutMethod: _method,
        payoutAccountName: _name.text.trim(),
        payoutAccountNumber: _number.text.trim(),
        network: _isMobile ? _network : '',
        frequency: _frequency,
        minimumPayoutAmount: double.tryParse(_minimum.text.trim()) ?? 0,
        autoDisburseEnabled: _auto,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final insets = MediaQuery.of(context);
    final bottom = insets.viewInsets.bottom + insets.padding.bottom;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surfaceHigh,
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xxl)),
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 32,
            offset: Offset(0, -8),
          ),
        ],
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(20, 12, 20, 16 + bottom),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.borderStrong,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 46,
                    height: 46,
                    decoration: BoxDecoration(
                      color: AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                    ),
                    child: const Icon(
                      Icons.account_balance_wallet_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Payout details',
                          style: AppTheme.host(
                            fontSize: 22,
                            fontWeight: FontWeight.w700,
                            letterSpacing: -0.45,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Where MyGarage sends your earnings.',
                          style: AppTheme.host(
                            fontSize: 13.5,
                            color: AppColors.textMuted,
                            height: 1.35,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 22),
              const _SectionLabel('Destination'),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: _MethodCard(
                      icon: Icons.phone_iphone_rounded,
                      title: 'Mobile money',
                      subtitle: 'MTN or Airtel',
                      selected: _isMobile,
                      onTap: () => setState(() => _method = 'mobile_money'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _MethodCard(
                      icon: Icons.account_balance_rounded,
                      title: 'Bank',
                      subtitle: 'Local account',
                      selected: !_isMobile,
                      onTap: () => setState(() => _method = 'bank_account'),
                    ),
                  ),
                ],
              ),
              if (_isMobile) ...[
                const SizedBox(height: 16),
                Text(
                  'Network',
                  style: AppTheme.host(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _SelectChip(
                        label: 'MTN',
                        selected: _network == 'MTN',
                        onTap: () => setState(() => _network = 'MTN'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _SelectChip(
                        label: 'Airtel',
                        selected: _network == 'Airtel',
                        onTap: () => setState(() => _network = 'Airtel'),
                      ),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 16),
              TextFormField(
                controller: _name,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Account name',
                  hintText: 'Name on the account',
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter the account name' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _number,
                keyboardType: _isMobile ? TextInputType.phone : TextInputType.text,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(
                  labelText: _isMobile ? 'Phone number' : 'Account number',
                  hintText: _isMobile ? '07XX XXX XXX' : 'Bank account number',
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? (_isMobile ? 'Enter a phone number' : 'Enter an account number') : null,
              ),
              const SizedBox(height: 22),
              const _SectionLabel('Schedule'),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _Segment(
                        label: 'Weekly',
                        selected: _frequency == 'weekly',
                        onTap: () => setState(() => _frequency = 'weekly'),
                      ),
                    ),
                    Expanded(
                      child: _Segment(
                        label: 'Monthly',
                        selected: _frequency == 'monthly',
                        onTap: () => setState(() => _frequency = 'monthly'),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _frequency == 'weekly'
                    ? 'Paid once a week when you meet the minimum.'
                    : 'Paid once a month when you meet the minimum.',
                style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted, height: 1.35),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _minimum,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Minimum payout',
                  prefixText: 'UGX  ',
                  hintText: '0',
                ),
              ),
              const SizedBox(height: 14),
              _ToggleCard(
                icon: Icons.bolt_rounded,
                title: 'Auto disburse',
                subtitle: 'Send payouts automatically on schedule',
                value: _auto,
                onChanged: (v) => setState(() => _auto = v),
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: _save,
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text('Save payout details'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return Text(
      label.toUpperCase(),
      style: AppTheme.host(
        fontSize: 11.5,
        fontWeight: FontWeight.w700,
        color: AppColors.textMuted,
        letterSpacing: 1.05,
      ),
    );
  }
}

class _MethodCard extends StatelessWidget {
  const _MethodCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primarySoft : AppColors.background,
      borderRadius: BorderRadius.circular(AppRadii.lg),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.lg),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.lg),
            border: Border.all(
              color: selected ? AppColors.primary.withValues(alpha: 0.35) : AppColors.border,
              width: selected ? 1.5 : 1,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: selected ? AppColors.primary.withValues(alpha: 0.14) : AppColors.surface,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  size: 18,
                  color: selected ? AppColors.primary : AppColors.textMuted,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: AppTheme.host(
                  fontSize: 14.5,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SelectChip extends StatelessWidget {
  const _SelectChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.primary : AppColors.background,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: selected ? AppColors.primary : AppColors.border),
          ),
          child: Text(
            label,
            style: AppTheme.host(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: selected ? AppColors.onPrimary : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }
}

class _Segment extends StatelessWidget {
  const _Segment({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected ? AppColors.surfaceHigh : Colors.transparent,
      borderRadius: BorderRadius.circular(AppRadii.sm),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadii.sm),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOutCubic,
          alignment: Alignment.center,
          padding: const EdgeInsets.symmetric(vertical: 11),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadii.sm),
            color: selected ? AppColors.surface : Colors.transparent,
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: AppColors.ink.withValues(alpha: 0.06),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: AppTheme.host(
              fontSize: 14,
              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
              color: selected ? AppColors.primary : AppColors.textMuted,
            ),
          ),
        ),
      ),
    );
  }
}

class _ToggleCard extends StatelessWidget {
  const _ToggleCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: value ? AppColors.primary.withValues(alpha: 0.06) : AppColors.background,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: () => onChanged(!value),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: value ? AppColors.primary.withValues(alpha: 0.28) : AppColors.border,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: value ? AppColors.primary.withValues(alpha: 0.12) : AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 20, color: value ? AppColors.primary : AppColors.textMuted),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: AppTheme.host(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted, height: 1.3),
                    ),
                  ],
                ),
              ),
              Switch.adaptive(
                value: value,
                activeTrackColor: AppColors.primary.withValues(alpha: 0.45),
                activeThumbColor: AppColors.primary,
                onChanged: onChanged,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
