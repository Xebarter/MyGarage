import 'package:flutter/material.dart';

import '../../models/funds.dart';
import '../../theme/app_theme.dart';

class PayoutPrefsSheet extends StatefulWidget {
  const PayoutPrefsSheet({super.key, required this.initial});

  final PayoutPreference initial;

  @override
  State<PayoutPrefsSheet> createState() => _PayoutPrefsSheetState();
}

class _PayoutPrefsSheetState extends State<PayoutPrefsSheet> {
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
    _method = i.payoutMethod;
    _network = i.network.isEmpty ? 'MTN' : i.network;
    _frequency = i.frequency;
    _auto = i.autoDisburseEnabled;
    _name = TextEditingController(text: i.payoutAccountName);
    _number = TextEditingController(text: i.payoutAccountNumber);
    _minimum = TextEditingController(text: i.minimumPayoutAmount.toStringAsFixed(0));
  }

  @override
  void dispose() {
    _name.dispose();
    _number.dispose();
    _minimum.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(
      PayoutPreference(
        payoutMethod: _method,
        payoutAccountName: _name.text.trim(),
        payoutAccountNumber: _number.text.trim(),
        network: _method == 'mobile_money' ? _network : '',
        frequency: _frequency,
        minimumPayoutAmount: double.tryParse(_minimum.text.trim()) ?? 0,
        autoDisburseEnabled: _auto,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.fromLTRB(
        24,
        12,
        24,
        20 + MediaQuery.of(context).viewInsets.bottom + MediaQuery.of(context).padding.bottom,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text('Payout', style: AppTheme.host(fontSize: 22, fontWeight: FontWeight.w600)),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _method,
                decoration: const InputDecoration(labelText: 'Method'),
                items: const [
                  DropdownMenuItem(value: 'mobile_money', child: Text('Mobile money')),
                  DropdownMenuItem(value: 'bank_account', child: Text('Bank account')),
                ],
                onChanged: (v) => setState(() => _method = v ?? _method),
              ),
              if (_method == 'mobile_money')
                DropdownButtonFormField<String>(
                  value: _network,
                  decoration: const InputDecoration(labelText: 'Network'),
                  items: const [
                    DropdownMenuItem(value: 'MTN', child: Text('MTN')),
                    DropdownMenuItem(value: 'Airtel', child: Text('Airtel')),
                  ],
                  onChanged: (v) => setState(() => _network = v ?? _network),
                ),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Account name'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              TextFormField(
                controller: _number,
                decoration: InputDecoration(
                  labelText: _method == 'mobile_money' ? 'Phone number' : 'Account number',
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              DropdownButtonFormField<String>(
                value: _frequency,
                decoration: const InputDecoration(labelText: 'Frequency'),
                items: const [
                  DropdownMenuItem(value: 'weekly', child: Text('Weekly')),
                  DropdownMenuItem(value: 'daily', child: Text('Daily')),
                  DropdownMenuItem(value: 'monthly', child: Text('Monthly')),
                  DropdownMenuItem(value: 'instant', child: Text('Instant')),
                ],
                onChanged: (v) => setState(() => _frequency = v ?? _frequency),
              ),
              TextFormField(
                controller: _minimum,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Minimum payout'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Auto disburse', style: AppTheme.host(fontSize: 15)),
                value: _auto,
                onChanged: (v) => setState(() => _auto = v),
              ),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _save, child: const Text('Save')),
            ],
          ),
        ),
      ),
    );
  }
}
