import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class GarageScreen extends StatefulWidget {
  const GarageScreen({super.key});

  @override
  State<GarageScreen> createState() => _GarageScreenState();
}

class _GarageScreenState extends State<GarageScreen> {
  final _api = BuyerApi(ApiClient());
  List<Vehicle> _vehicles = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final ok = await ensureSignedIn(context);
    if (!ok || !mounted) return;
    final customerId = context.read<AuthController>().customerId;
    if (customerId == null) {
      setState(() {
        _loading = false;
        _error = 'Profile not ready yet.';
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await _api.listVehicles(customerId: customerId);
      if (!mounted) return;
      setState(() {
        _vehicles = list;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = userFacingError(e, fallback: 'Could not load vehicles.');
      });
    }
  }

  Future<void> _addVehicle() async {
    final make = TextEditingController();
    final model = TextEditingController();
    final year = TextEditingController(text: '${DateTime.now().year}');
    final plate = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add vehicle'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: make, decoration: const InputDecoration(labelText: 'Make')),
              TextField(controller: model, decoration: const InputDecoration(labelText: 'Model')),
              TextField(
                controller: year,
                decoration: const InputDecoration(labelText: 'Year'),
                keyboardType: TextInputType.number,
              ),
              TextField(controller: plate, decoration: const InputDecoration(labelText: 'Plate')),
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
    final customerId = context.read<AuthController>().customerId;
    if (customerId == null) return;
    try {
      await _api.createVehicle({
        'customerId': customerId,
        'make': make.text.trim(),
        'model': model.text.trim(),
        'year': int.tryParse(year.text.trim()) ?? DateTime.now().year,
        'plate': plate.text.trim(),
      });
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not add vehicle.'))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My garage'),
        actions: [IconButton(onPressed: _addVehicle, icon: const Icon(Icons.add))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: AppTheme.host(color: AppColors.danger)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: _vehicles.isEmpty
                      ? ListView(
                          children: [
                            const SizedBox(height: 100),
                            const Center(child: Text('No vehicles yet')),
                            Center(
                              child: TextButton(onPressed: _addVehicle, child: const Text('Add vehicle')),
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _vehicles.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 8),
                          itemBuilder: (context, i) {
                            final v = _vehicles[i];
                            return Card(
                              child: ListTile(
                                leading: const Icon(Icons.directions_car),
                                title: Text(v.label),
                                subtitle: Text(v.plate ?? 'No plate'),
                              ),
                            );
                          },
                        ),
                ),
    );
  }
}
