import 'package:flutter/material.dart';

import '../../theme/app_theme.dart';

class GarageCompletionPayload {
  GarageCompletionPayload({
    required this.vehicleStatus,
    required this.notes,
    this.nextServiceDate,
  });

  final String vehicleStatus;
  final String notes;
  final String? nextServiceDate;
}

class GarageCompletionSheet extends StatefulWidget {
  const GarageCompletionSheet({super.key});

  @override
  State<GarageCompletionSheet> createState() => _GarageCompletionSheetState();
}

class _GarageCompletionSheetState extends State<GarageCompletionSheet> {
  static const _statuses = [
    ('no_active_issues', 'No active issues'),
    ('ready_for_pickup', 'Ready for pickup'),
    ('awaiting_parts', 'Awaiting parts'),
    ('in_service', 'Still in service'),
  ];

  String _status = 'no_active_issues';
  final _notes = TextEditingController();
  DateTime? _nextService;

  @override
  void dispose() {
    _notes.dispose();
    super.dispose();
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
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
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
            Text('Complete job', style: AppTheme.host(fontSize: 22, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Text(
              'Update the vehicle status for the buyer.',
              style: AppTheme.host(fontSize: 14, color: AppColors.textMuted),
            ),
            const SizedBox(height: 20),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Vehicle status'),
              items: [
                for (final s in _statuses) DropdownMenuItem(value: s.$1, child: Text(s.$2)),
              ],
              onChanged: (v) => setState(() => _status = v ?? _status),
            ),
            TextFormField(
              controller: _notes,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Notes'),
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () async {
                final picked = await showDatePicker(
                  context: context,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 365 * 2)),
                  initialDate: _nextService ?? DateTime.now().add(const Duration(days: 90)),
                );
                if (picked != null) setState(() => _nextService = picked);
              },
              child: Text(
                _nextService == null
                    ? 'Add next service date'
                    : 'Next service: ${_nextService!.toIso8601String().split('T').first}',
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pop(
                  GarageCompletionPayload(
                    vehicleStatus: _status,
                    notes: _notes.text.trim(),
                    nextServiceDate: _nextService?.toIso8601String(),
                  ),
                );
              },
              child: const Text('Complete'),
            ),
          ],
        ),
      ),
    );
  }
}
