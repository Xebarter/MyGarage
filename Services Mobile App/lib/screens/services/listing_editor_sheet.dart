import 'package:flutter/material.dart';

import '../../models/service_listing.dart';
import '../../theme/app_theme.dart';

class ListingEditorSheet extends StatefulWidget {
  const ListingEditorSheet({super.key, this.initial});

  final ServiceListing? initial;

  @override
  State<ListingEditorSheet> createState() => _ListingEditorSheetState();
}

class _ListingEditorSheetState extends State<ListingEditorSheet> {
  late String _categoryId;
  late final TextEditingController _name;
  late final TextEditingController _price;
  late final TextEditingController _eta;
  late final TextEditingController _description;
  late String _status;
  late bool _mobile;
  late bool _emergency;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    final i = widget.initial;
    _categoryId = i?.categoryId ?? kServiceCategories.first.id;
    _name = TextEditingController(text: i?.serviceName ?? '');
    _price = TextEditingController(text: i == null ? '' : i.priceUgx.toStringAsFixed(0));
    _eta = TextEditingController(text: i?.etaMinutes?.toString() ?? '');
    _description = TextEditingController(text: i?.description ?? '');
    _status = i?.status ?? 'active';
    _mobile = i?.mobileAvailable ?? true;
    _emergency = i?.emergency ?? false;
  }

  @override
  void dispose() {
    _name.dispose();
    _price.dispose();
    _eta.dispose();
    _description.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) return;
    Navigator.of(context).pop(
      ServiceListing(
        id: widget.initial?.id ?? '',
        vendorId: widget.initial?.vendorId ?? '',
        categoryId: _categoryId,
        serviceName: _name.text.trim(),
        priceUgx: double.tryParse(_price.text.trim()) ?? 0,
        status: _status,
        etaMinutes: int.tryParse(_eta.text.trim()),
        description: _description.text.trim(),
        mobileAvailable: _mobile,
        emergency: _emergency,
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
              Text(
                widget.initial == null ? 'Add service' : 'Edit service',
                style: AppTheme.host(fontSize: 22, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 20),
              DropdownButtonFormField<String>(
                value: _categoryId,
                decoration: const InputDecoration(labelText: 'Category'),
                items: [
                  for (final c in kServiceCategories)
                    DropdownMenuItem(value: c.id, child: Text(c.title)),
                ],
                onChanged: (v) => setState(() => _categoryId = v ?? _categoryId),
              ),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Service name'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              TextFormField(
                controller: _price,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Price (UGX)'),
                validator: (v) {
                  final n = double.tryParse(v?.trim() ?? '');
                  if (n == null || n < 0) return 'Enter a valid price';
                  return null;
                },
              ),
              TextFormField(
                controller: _eta,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'ETA (minutes)'),
              ),
              TextFormField(
                controller: _description,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Notes'),
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Active', style: AppTheme.host(fontSize: 15)),
                value: _status == 'active',
                onChanged: (v) => setState(() => _status = v ? 'active' : 'paused'),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Mobile available', style: AppTheme.host(fontSize: 15)),
                value: _mobile,
                onChanged: (v) => setState(() => _mobile = v),
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text('Emergency', style: AppTheme.host(fontSize: 15)),
                value: _emergency,
                onChanged: (v) => setState(() => _emergency = v),
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
