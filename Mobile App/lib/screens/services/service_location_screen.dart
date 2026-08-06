import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class ServiceLocationScreen extends StatefulWidget {
  const ServiceLocationScreen({
    super.key,
    required this.categoryId,
    required this.serviceName,
  });

  final String categoryId;
  final String serviceName;

  @override
  State<ServiceLocationScreen> createState() => _ServiceLocationScreenState();
}

class _ServiceLocationScreenState extends State<ServiceLocationScreen> {
  final _address = TextEditingController();
  final _notes = TextEditingController();
  final _api = BuyerApi(ApiClient());
  double? _lat;
  double? _lng;
  bool _busy = false;
  String? _status;

  @override
  void dispose() {
    _address.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _useCurrentLocation() async {
    setState(() {
      _status = 'Getting location…';
      _busy = true;
    });
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Location permission is required.');
      }
      final pos = await Geolocator.getCurrentPosition();
      setState(() {
        _lat = pos.latitude;
        _lng = pos.longitude;
        if (_address.text.trim().isEmpty) {
          _address.text =
              '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
        }
        _status = 'Location ready';
      });
    } catch (e) {
      setState(() => _status = userFacingError(e, fallback: 'Could not get location.'));
    } finally {
      setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    final ok = await ensureSignedIn(context);
    if (!ok || !mounted) return;

    final auth = context.read<AuthController>();
    final customerId = auth.customerId;
    if (customerId == null || customerId.isEmpty) {
      await auth.refreshProfile();
    }
    final cid = auth.customerId;
    if (cid == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not load buyer profile.')),
      );
      return;
    }

    if (_address.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter or detect a location.')),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      final request = await _api.createServiceRequest({
        'customerId': cid,
        'service': widget.serviceName,
        'categoryId': widget.categoryId,
        'location': _address.text.trim(),
        'notes': _notes.text.trim(),
        'destinationLat': _lat,
        'destinationLng': _lng,
      });
      if (!mounted) return;
      context.go('/service/requesting?requestId=${Uri.encodeComponent(request.id)}');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not request service.'))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Your location')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text(widget.serviceName, style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          TextField(
            controller: _address,
            decoration: const InputDecoration(
              labelText: 'Address / location',
              hintText: 'Where should the provider come?',
            ),
            maxLines: 2,
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _busy ? null : _useCurrentLocation,
            icon: const Icon(Icons.my_location),
            label: const Text('Use current location'),
          ),
          if (_status != null) ...[
            const SizedBox(height: 8),
            Text(_status!, style: AppTheme.host(fontSize: 13, color: AppColors.textMuted)),
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _notes,
            decoration: const InputDecoration(labelText: 'Notes (optional)'),
            maxLines: 3,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _busy ? null : _submit,
            child: _busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Text('Request service'),
          ),
        ],
      ),
    );
  }
}
