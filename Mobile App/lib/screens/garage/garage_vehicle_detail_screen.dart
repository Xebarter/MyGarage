import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';
import 'vehicle_spec_fields.dart';

class GarageVehicleDetailScreen extends StatefulWidget {
  const GarageVehicleDetailScreen({super.key, required this.vehicleId});

  final String vehicleId;

  @override
  State<GarageVehicleDetailScreen> createState() => _GarageVehicleDetailScreenState();
}

class _GarageVehicleDetailScreenState extends State<GarageVehicleDetailScreen> {
  final _api = BuyerApi(ApiClient());
  Vehicle? _vehicle;
  List<VehicleServiceLog> _history = [];
  List<VehicleDocument> _docs = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final customerId = context.read<AuthController>().customerId;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final result = await _api.getVehicleServiceHistory(widget.vehicleId);
      final docs = customerId == null
          ? <VehicleDocument>[]
          : await _api.listVehicleDocuments(customerId: customerId, vehicleId: widget.vehicleId);
      if (!mounted) return;
      setState(() {
        _vehicle = result.vehicle;
        _history = result.history;
        _docs = docs;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = userFacingError(e, fallback: 'Could not load this vehicle.');
      });
    }
  }

  Future<void> _addPhoto() async {
    final v = _vehicle;
    final customerId = context.read<AuthController>().customerId;
    if (v == null || customerId == null) return;
    final picked = await ImagePicker().pickImage(source: ImageSource.gallery, imageQuality: 80, maxWidth: 1600);
    if (picked == null || !mounted) return;
    try {
      final bytes = await picked.readAsBytes();
      final url = await _api.uploadVehicleImage(bytes, picked.name);
      if (url.isEmpty) return;
      await _api.updateVehicle(v.id, {'customerId': customerId, 'imageUrl': url});
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not upload photo.'))),
      );
    }
  }

  Future<void> _edit() async {
    final v = _vehicle;
    final customerId = context.read<AuthController>().customerId;
    if (v == null || customerId == null) return;
    final make = TextEditingController(text: v.make);
    final model = TextEditingController(text: v.model);
    final year = TextEditingController(text: '${v.year}');
    final plate = TextEditingController(text: v.licensePlate ?? '');
    final nickname = TextEditingController(text: v.nickname ?? '');
    final vin = TextEditingController(text: v.vin ?? '');
    final color = TextEditingController(text: v.color ?? '');
    final mileage = TextEditingController(text: v.mileageKm?.toString() ?? '');
    final trim = TextEditingController(text: v.trim ?? '');
    final engine = TextEditingController(text: v.engine ?? '');
    final tyreSize = TextEditingController(text: v.tyreSize ?? '');
    final spec = VehicleSpecSelection(driveType: v.driveType ?? '', bodyType: v.bodyType ?? '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit vehicle'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: make, decoration: const InputDecoration(labelText: 'Make')),
              TextField(controller: model, decoration: const InputDecoration(labelText: 'Model')),
              TextField(controller: year, decoration: const InputDecoration(labelText: 'Year'), keyboardType: TextInputType.number),
              TextField(controller: plate, decoration: const InputDecoration(labelText: 'License plate')),
              TextField(controller: nickname, decoration: const InputDecoration(labelText: 'Nickname')),
              TextField(controller: vin, decoration: const InputDecoration(labelText: 'VIN')),
              TextField(controller: color, decoration: const InputDecoration(labelText: 'Color')),
              TextField(controller: mileage, decoration: const InputDecoration(labelText: 'Mileage (km)'), keyboardType: TextInputType.number),
              VehicleConciergeFormFields(
                trim: trim,
                engine: engine,
                tyreSize: tyreSize,
                selection: spec,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await _api.updateVehicle(v.id, {
        'customerId': customerId,
        'make': make.text.trim(),
        'model': model.text.trim(),
        'year': int.tryParse(year.text.trim()) ?? v.year,
        'licensePlate': plate.text.trim(),
        'nickname': nickname.text.trim(),
        'vin': vin.text.trim(),
        'color': color.text.trim(),
        'mileageKm': int.tryParse(mileage.text.trim()),
        'trim': trim.text.trim(),
        'engine': engine.text.trim(),
        'driveType': spec.driveType,
        'bodyType': spec.bodyType,
        'tyreSize': tyreSize.text.trim(),
      });
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not save vehicle.'))),
      );
    }
  }

  Future<void> _delete() async {
    final v = _vehicle;
    if (v == null) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Remove vehicle?'),
        content: const Text('This removes the vehicle from your garage.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Remove')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await _api.deleteVehicle(v.id);
      if (!mounted) return;
      context.go('/garage');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not remove vehicle.'))),
      );
    }
  }

  Future<void> _addDocument() async {
    final customerId = context.read<AuthController>().customerId;
    if (customerId == null) return;
    final name = TextEditingController();
    final url = TextEditingController();
    var type = 'insurance';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('Add document'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
              DropdownButtonFormField<String>(
                value: type,
                items: const [
                  DropdownMenuItem(value: 'logbook', child: Text('Logbook')),
                  DropdownMenuItem(value: 'insurance', child: Text('Insurance')),
                  DropdownMenuItem(value: 'inspection', child: Text('Inspection')),
                  DropdownMenuItem(value: 'other', child: Text('Other')),
                ],
                onChanged: (v) => setLocal(() => type = v ?? type),
              ),
              TextField(controller: url, decoration: const InputDecoration(labelText: 'File URL (optional)')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Save')),
          ],
        ),
      ),
    );
    if (ok != true || !mounted || name.text.trim().isEmpty) return;
    try {
      await _api.createVehicleDocument({
        'customerId': customerId,
        'vehicleId': widget.vehicleId,
        'documentType': type,
        'name': name.text.trim(),
        'fileUrl': url.text.trim().isEmpty ? null : url.text.trim(),
      });
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not add document.'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final v = _vehicle;
    return Scaffold(
      appBar: AppBar(
        title: AppBarTitle(v?.label ?? 'Vehicle'),
        actions: [
          IconButton(
            tooltip: 'Concierge',
            onPressed: () => context.push('/concierge?vehicleId=${Uri.encodeComponent(widget.vehicleId)}'),
            icon: const Icon(Icons.auto_awesome),
          ),
          IconButton(onPressed: _addPhoto, icon: const Icon(Icons.photo_camera_outlined)),
          IconButton(onPressed: _edit, icon: const Icon(Icons.edit_outlined)),
          IconButton(onPressed: _delete, icon: const Icon(Icons.delete_outline)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : v == null
                  ? const Center(child: Text('Vehicle not found'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          if (v.imageUrl != null && v.imageUrl!.isNotEmpty)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: Image.network(v.imageUrl!, height: 160, width: double.infinity, fit: BoxFit.cover),
                            ),
                          const SizedBox(height: 12),
                          Text('${v.year} ${v.make} ${v.model}', style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700)),
                          Text(v.licensePlate ?? 'No plate', style: AppTheme.host(color: AppColors.textMuted)),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: [
                              Chip(label: Text(v.statusLabel)),
                              if (v.nextServiceDate != null && v.nextServiceDate!.isNotEmpty)
                                Chip(label: Text('Next ${v.nextServiceDate!.split('T').first}')),
                            ],
                          ),
                          if (v.vin != null && v.vin!.isNotEmpty) Text('VIN ${v.vin}'),
                          if (v.mileageKm != null) Text('${v.mileageKm} km'),
                          if (v.trim != null && v.trim!.isNotEmpty) Text('Trim ${v.trim}'),
                          if (v.engine != null && v.engine!.isNotEmpty) Text('Engine ${v.engine}'),
                          if (v.driveType != null && v.driveType!.isNotEmpty) Text('Drivetrain ${v.driveType}'),
                          if (v.bodyType != null && v.bodyType!.isNotEmpty) Text('Body ${v.bodyType}'),
                          if (v.tyreSize != null && v.tyreSize!.isNotEmpty) Text('Tyres ${v.tyreSize}'),
                          const SizedBox(height: 20),
                          Text('Service log', style: AppTheme.host(fontSize: 16, fontWeight: FontWeight.w700)),
                          const SizedBox(height: 8),
                          if (_history.isEmpty)
                            const Text('No visits yet. Book a service with this vehicle so provider notes appear here.')
                          else
                            ..._history.map(
                              (entry) => Card(
                                margin: const EdgeInsets.only(bottom: 10),
                                child: Padding(
                                  padding: const EdgeInsets.all(12),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(entry.serviceName, style: AppTheme.host(fontWeight: FontWeight.w700)),
                                      Text(
                                        '${entry.providerName} · ${entry.serviceDate.split('T').first}',
                                        style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                                      ),
                                      if (entry.notes.isNotEmpty) ...[
                                        const SizedBox(height: 8),
                                        Text(entry.notes),
                                      ],
                                      if (entry.findings.isNotEmpty) Text('Findings: ${entry.findings}'),
                                      if (entry.partsUsed.isNotEmpty) Text('Parts: ${entry.partsUsed}'),
                                      if (entry.recommendations.isNotEmpty) Text('Recommendations: ${entry.recommendations}'),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: Text('Documents', style: AppTheme.host(fontSize: 16, fontWeight: FontWeight.w700)),
                              ),
                              TextButton(onPressed: _addDocument, child: const Text('Add')),
                            ],
                          ),
                          if (_docs.isEmpty)
                            const Text('No documents yet.')
                          else
                            ..._docs.map(
                              (doc) => ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: const Icon(Icons.description_outlined),
                                title: Text(doc.name),
                                subtitle: Text(doc.documentType),
                              ),
                            ),
                        ],
                      ),
                    ),
    );
  }
}
