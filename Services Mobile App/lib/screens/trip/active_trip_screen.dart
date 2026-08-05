import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../models/service_request.dart';
import '../../providers/auth_controller.dart';
import '../../providers/dispatch_controller.dart';
import '../../theme/app_theme.dart';
import 'garage_completion_sheet.dart';

class ActiveTripScreen extends StatefulWidget {
  const ActiveTripScreen({super.key, required this.requestId});

  final String requestId;

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  GoogleMapController? _mapController;
  bool _busy = false;
  ServiceRequest? _job;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final dispatch = context.read<DispatchController>();
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId != null) dispatch.start(vendorId);
    final job = await dispatch.loadJob(widget.requestId);
    if (mounted) setState(() => _job = job ?? dispatch.activeJob);
  }

  Future<void> _advance() async {
    final job = _job ?? context.read<DispatchController>().activeJob;
    if (job == null) return;

    if (job.nextStage == 'completed') {
      final payload = await showModalBottomSheet<GarageCompletionPayload>(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => const GarageCompletionSheet(),
      );
      if (payload == null || !mounted) return;
      await _runStage(
        'completed',
        vehicleStatus: payload.vehicleStatus,
        notes: payload.notes,
        nextServiceDate: payload.nextServiceDate,
      );
      return;
    }

    await _runStage(job.nextStage);
  }

  Future<void> _runStage(
    String stage, {
    String? vehicleStatus,
    String? notes,
    String? nextServiceDate,
  }) async {
    setState(() => _busy = true);
    try {
      await context.read<DispatchController>().advanceStage(
            stage: stage,
            vehicleStatus: vehicleStatus,
            notes: notes,
            nextServiceDate: nextServiceDate,
          );
      if (!mounted) return;
      setState(() => _job = context.read<DispatchController>().activeJob);
      if (stage == 'completed') {
        Navigator.of(context).maybePop();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _callBuyer(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final dispatch = context.watch<DispatchController>();
    final job = _job ??
        (dispatch.activeJob?.id == widget.requestId
            ? dispatch.activeJob
            : null);

    if (job == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Trip')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final dest = (job.destinationLat != null && job.destinationLng != null)
        ? LatLng(job.destinationLat!, job.destinationLng!)
        : null;
    final provider = (job.providerLat != null && job.providerLng != null)
        ? LatLng(job.providerLat!, job.providerLng!)
        : null;
    final center = dest ?? provider ?? const LatLng(0.3476, 32.5825);

    final markers = <Marker>{
      if (dest != null)
        Marker(markerId: const MarkerId('dest'), position: dest, infoWindow: const InfoWindow(title: 'Customer')),
      if (provider != null)
        Marker(
          markerId: const MarkerId('provider'),
          position: provider,
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: 'You'),
        ),
    };

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip'),
        actions: [
          if (job.buyerContactPhone.isNotEmpty)
            IconButton(
              onPressed: () => _callBuyer(job.buyerContactPhone),
              icon: const Icon(Icons.phone_outlined),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 5,
            child: GoogleMap(
              initialCameraPosition: CameraPosition(target: center, zoom: 14),
              markers: markers,
              myLocationEnabled: true,
              myLocationButtonEnabled: true,
              compassEnabled: false,
              mapToolbarEnabled: false,
              onMapCreated: (c) {
                _mapController = c;
                if (dest != null && provider != null) {
                  final south = dest.latitude < provider.latitude ? dest.latitude : provider.latitude;
                  final west = dest.longitude < provider.longitude ? dest.longitude : provider.longitude;
                  final north = dest.latitude > provider.latitude ? dest.latitude : provider.latitude;
                  final east = dest.longitude > provider.longitude ? dest.longitude : provider.longitude;
                  if ((north - south).abs() < 0.0001 && (east - west).abs() < 0.0001) {
                    _mapController?.animateCamera(CameraUpdate.newLatLngZoom(dest, 15));
                  } else {
                    _mapController?.animateCamera(
                      CameraUpdate.newLatLngBounds(
                        LatLngBounds(
                          southwest: LatLng(south, west),
                          northeast: LatLng(north, east),
                        ),
                        72,
                      ),
                    );
                  }
                }
              },
            ),
          ),
          Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: AppColors.surfaceHigh.withOpacity(0.96),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(top: BorderSide(color: AppColors.border.withOpacity(0.8))),
              boxShadow: AppTheme.softShadow,
            ),
            padding: const EdgeInsets.fromLTRB(24, 22, 24, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  job.service,
                  style: AppTheme.host(fontSize: 20, fontWeight: FontWeight.w600, letterSpacing: -0.2),
                ),
                const SizedBox(height: 6),
                Text(
                  job.location,
                  style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                ),
                const SizedBox(height: 18),
                _QuietStages(job: job),
                const SizedBox(height: 22),
                if (job.status != 'completed' && job.status != 'cancelled')
                  ElevatedButton(
                    onPressed: _busy ? null : _advance,
                    child: _busy
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Text(job.stageLabel),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuietStages extends StatelessWidget {
  const _QuietStages({required this.job});

  final ServiceRequest job;

  @override
  Widget build(BuildContext context) {
    final steps = [
      ('Accepted', job.acceptedAt != null || job.status != 'pending'),
      ('Arrived', job.arrivedAt != null),
      ('Started', job.startedAt != null),
      ('Done', job.completedAt != null || job.status == 'completed'),
    ];

    return Row(
      children: [
        for (var i = 0; i < steps.length; i++) ...[
          Text(
            steps[i].$1,
            style: AppTheme.host(
              fontSize: 12,
              fontWeight: steps[i].$2 ? FontWeight.w600 : FontWeight.w500,
              color: steps[i].$2 ? AppColors.textPrimary : AppColors.textMuted,
            ),
          ),
          if (i < steps.length - 1)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Text('·', style: AppTheme.host(color: AppColors.textMuted)),
            ),
        ],
      ],
    );
  }
}
