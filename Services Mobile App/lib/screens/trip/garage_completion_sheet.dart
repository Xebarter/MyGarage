import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../models/service_request.dart';
import '../../providers/dispatch_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class GarageCompletionPayload {
  GarageCompletionPayload({
    required this.vehicleStatus,
    required this.notes,
    required this.attachVehicleId,
    this.nextServiceDate,
    this.findings = '',
    this.recommendations = '',
    this.partsUsed = '',
    this.odometerKm,
    this.photoUrls = const [],
    this.laborHours,
  });

  final String vehicleStatus;
  final String notes;
  final String attachVehicleId;
  final String? nextServiceDate;
  final String findings;
  final String recommendations;
  final String partsUsed;
  final int? odometerKm;
  final List<String> photoUrls;
  final double? laborHours;
}

class GarageCompletionSheet extends StatefulWidget {
  const GarageCompletionSheet({
    super.key,
    required this.requestId,
    this.currentVehicleId,
  });

  final String requestId;
  final String? currentVehicleId;

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
  final _findings = TextEditingController();
  final _recommendations = TextEditingController();
  final _parts = TextEditingController();
  final _odometer = TextEditingController();
  final _labor = TextEditingController();
  final _make = TextEditingController();
  final _model = TextEditingController();
  final _year = TextEditingController(text: '${DateTime.now().year}');
  final _plate = TextEditingController();
  DateTime? _nextService;
  List<CustomerVehicle> _vehicles = [];
  String? _vehicleId;
  final List<String> _photos = [];
  bool _loading = true;
  bool _savingVehicle = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadVehicles());
  }

  @override
  void dispose() {
    _notes.dispose();
    _findings.dispose();
    _recommendations.dispose();
    _parts.dispose();
    _odometer.dispose();
    _labor.dispose();
    _make.dispose();
    _model.dispose();
    _year.dispose();
    _plate.dispose();
    super.dispose();
  }

  Future<void> _loadVehicles() async {
    try {
      final result = await context.read<DispatchController>().customerVehicles(widget.requestId);
      if (!mounted) return;
      setState(() {
        _vehicles = result.vehicles;
        _vehicleId = widget.currentVehicleId ?? result.linked?.id ?? (result.vehicles.isEmpty ? null : result.vehicles.first.id);
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _addVehicle() async {
    if (_make.text.trim().isEmpty || _model.text.trim().isEmpty) return;
    setState(() => _savingVehicle = true);
    try {
      final created = await context.read<DispatchController>().addCustomerVehicle(
            requestId: widget.requestId,
            make: _make.text.trim(),
            model: _model.text.trim(),
            year: int.tryParse(_year.text.trim()) ?? DateTime.now().year,
            licensePlate: _plate.text.trim().isEmpty ? null : _plate.text.trim(),
          );
      if (!mounted) return;
      setState(() {
        _vehicles = [created, ..._vehicles];
        _vehicleId = created.id;
        _make.clear();
        _model.clear();
        _plate.clear();
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not add vehicle.'))),
      );
    } finally {
      if (mounted) setState(() => _savingVehicle = false);
    }
  }

  Future<void> _pickPhoto() async {
    final picked = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 75, maxWidth: 1600);
    if (picked == null || !mounted) return;
    final dispatch = context.read<DispatchController>();
    setState(() => _uploading = true);
    try {
      final bytes = await picked.readAsBytes();
      final url = await dispatch.uploadServicePhoto(bytes, picked.name);
      if (!mounted || url.isEmpty) return;
      setState(() => _photos.add(url));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Photo upload failed.'))),
      );
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  bool get _canComplete => _notes.text.trim().isNotEmpty && (_vehicleId?.isNotEmpty ?? false);

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
              'Work notes and a vehicle are required so this visit appears in the buyer’s My Garage.',
              style: AppTheme.host(fontSize: 14, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            if (_loading)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 12),
                child: Center(child: CircularProgressIndicator()),
              )
            else ...[
              if (_vehicles.isNotEmpty)
                DropdownButtonFormField<String>(
                  value: _vehicles.any((v) => v.id == _vehicleId) ? _vehicleId : null,
                  decoration: const InputDecoration(labelText: 'Buyer vehicle'),
                  items: [
                    for (final v in _vehicles)
                      DropdownMenuItem(value: v.id, child: Text('${v.label}${v.licensePlate == null ? '' : ' · ${v.licensePlate}'}')),
                  ],
                  onChanged: (v) => setState(() => _vehicleId = v),
                )
              else
                Text('No vehicles in this buyer’s garage yet. Add one below.', style: AppTheme.host(fontSize: 13, color: AppColors.textMuted)),
              const SizedBox(height: 8),
              TextField(controller: _make, decoration: const InputDecoration(labelText: 'Add make')),
              TextField(controller: _model, decoration: const InputDecoration(labelText: 'Add model')),
              TextField(controller: _year, decoration: const InputDecoration(labelText: 'Year'), keyboardType: TextInputType.number),
              TextField(controller: _plate, decoration: const InputDecoration(labelText: 'Plate')),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton(
                  onPressed: _savingVehicle ? null : _addVehicle,
                  child: Text(_savingVehicle ? 'Adding…' : 'Add vehicle for this buyer'),
                ),
              ),
            ],
            TextFormField(
              controller: _notes,
              maxLines: 3,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(labelText: 'Work notes (required)'),
            ),
            TextFormField(
              controller: _findings,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Findings'),
            ),
            TextFormField(
              controller: _parts,
              decoration: const InputDecoration(labelText: 'Parts used'),
            ),
            TextFormField(
              controller: _recommendations,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Recommendations'),
            ),
            TextFormField(
              controller: _odometer,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Odometer (km)'),
            ),
            TextFormField(
              controller: _labor,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: 'Labor hours'),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _status,
              decoration: const InputDecoration(labelText: 'Vehicle status'),
              items: [
                for (final s in _statuses) DropdownMenuItem(value: s.$1, child: Text(s.$2)),
              ],
              onChanged: (v) => setState(() => _status = v ?? _status),
            ),
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
            OutlinedButton.icon(
              onPressed: _uploading || _photos.length >= 8 ? null : _pickPhoto,
              icon: _uploading
                  ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.photo_camera_outlined),
              label: Text(_photos.isEmpty ? 'Add photo' : '${_photos.length} photo${_photos.length == 1 ? '' : 's'}'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: !_canComplete
                  ? null
                  : () {
                      Navigator.of(context).pop(
                        GarageCompletionPayload(
                          vehicleStatus: _status,
                          notes: _notes.text.trim(),
                          attachVehicleId: _vehicleId!,
                          nextServiceDate: _nextService?.toIso8601String(),
                          findings: _findings.text.trim(),
                          recommendations: _recommendations.text.trim(),
                          partsUsed: _parts.text.trim(),
                          odometerKm: int.tryParse(_odometer.text.trim()),
                          photoUrls: List<String>.from(_photos),
                          laborHours: double.tryParse(_labor.text.trim()),
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
