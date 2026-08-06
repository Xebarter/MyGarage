import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../config.dart';
import '../../models/service_request.dart';
import '../../providers/auth_controller.dart';
import '../../providers/dispatch_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import 'garage_completion_sheet.dart';

/// Live job navigation: map with customer destination, your GPS trail, route & stages.
class ActiveTripScreen extends StatefulWidget {
  const ActiveTripScreen({super.key, required this.requestId});

  final String requestId;

  @override
  State<ActiveTripScreen> createState() => _ActiveTripScreenState();
}

class _ActiveTripScreenState extends State<ActiveTripScreen> {
  GoogleMapController? _mapController;
  bool _busy = false;
  bool _loading = true;
  String? _loadError;
  List<LatLng> _route = [];
  final List<LatLng> _breadcrumb = [];
  int? _etaMinutes;
  double? _distanceKm;
  String? _lastRouteKey;
  ServiceRequest? _loadedJob;
  bool _followYou = true;
  String? _lastFollowKey;
  double? _lastBreadcrumbLat;
  double? _lastBreadcrumbLng;
  BitmapDescriptor? _youIcon;
  BitmapDescriptor? _customerIcon;

  @override
  void initState() {
    super.initState();
    unawaited(_prepareMarkers());
    WidgetsBinding.instance.addPostFrameCallback((_) => _bootstrap());
  }

  Future<void> _prepareMarkers() async {
    try {
      _youIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure);
      _customerIcon = BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed);
    } catch (_) {}
  }

  Future<void> _bootstrap() async {
    final dispatch = context.read<DispatchController>();
    final vendorId = context.read<AuthController>().vendorId;
    if (vendorId != null) dispatch.start(vendorId);

    try {
      final job = await dispatch.loadJob(widget.requestId);
      // Start streaming location as soon as the trip opens.
      if (job != null && job.isActive) {
        dispatch.ensureLiveTrackingForJob(job);
      }
      if (!mounted) return;
      setState(() {
        _loadedJob = job;
        _loading = false;
        _loadError = job == null ? 'Could not load this trip.' : null;
      });
      final lat = dispatch.liveProviderLat ?? job?.providerLat;
      final lng = dispatch.liveProviderLng ?? job?.providerLng;
      if (lat != null && lng != null) {
        _recordBreadcrumb(LatLng(lat, lng));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = userFacingError(e, fallback: 'Could not load this trip.');
      });
    }
  }

  void _recordBreadcrumb(LatLng p) {
    if (_lastBreadcrumbLat != null && _lastBreadcrumbLng != null) {
      final dLat = (p.latitude - _lastBreadcrumbLat!).abs();
      final dLng = (p.longitude - _lastBreadcrumbLng!).abs();
      // ~8–10 m threshold roughly
      if (dLat < 0.00008 && dLng < 0.00008) return;
    }
    _lastBreadcrumbLat = p.latitude;
    _lastBreadcrumbLng = p.longitude;
    _breadcrumb.add(p);
    if (_breadcrumb.length > 200) {
      _breadcrumb.removeRange(0, _breadcrumb.length - 200);
    }
  }

  void _maybeFollow(LatLng provider) {
    if (!_followYou || _mapController == null) return;
    final key =
        '${provider.latitude.toStringAsFixed(4)},${provider.longitude.toStringAsFixed(4)}';
    if (key == _lastFollowKey) return;
    _lastFollowKey = key;
    _mapController!.animateCamera(CameraUpdate.newLatLng(provider));
  }

  Future<void> _fetchRoute(LatLng from, LatLng to) async {
    final key =
        '${from.latitude.toStringAsFixed(4)},${from.longitude.toStringAsFixed(4)}|'
        '${to.latitude.toStringAsFixed(4)},${to.longitude.toStringAsFixed(4)}';
    if (key == _lastRouteKey) return;
    _lastRouteKey = key;

    try {
      final uri = Uri.parse('${AppConfig.apiUrl}/api/maps/directions').replace(
        queryParameters: {
          'originLat': '${from.latitude}',
          'originLng': '${from.longitude}',
          'destLat': '${to.latitude}',
          'destLng': '${to.longitude}',
        },
      );
      final res = await http.get(uri);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        if (!mounted) return;
        setState(() => _route = [from, to]);
        return;
      }
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final path = (json['path'] as List<dynamic>? ?? [])
          .whereType<Map>()
          .map((p) {
            final lat = (p['lat'] as num?)?.toDouble();
            final lng = (p['lng'] as num?)?.toDouble();
            if (lat == null || lng == null) return null;
            return LatLng(lat, lng);
          })
          .whereType<LatLng>()
          .toList();
      if (!mounted) return;
      setState(() {
        _route = path.length > 1 ? path : [from, to];
        _etaMinutes = (json['etaMinutes'] as num?)?.toInt();
        final meters = (json['distanceMeters'] as num?)?.toDouble();
        _distanceKm = meters != null ? meters / 1000 : null;
      });
      if (!_followYou) _fitCamera(from, to);
    } catch (_) {
      if (!mounted) return;
      setState(() => _route = [from, to]);
    }
  }

  void _fitCamera(LatLng a, LatLng b) {
    final c = _mapController;
    if (c == null) return;
    final south = math.min(a.latitude, b.latitude);
    final west = math.min(a.longitude, b.longitude);
    final north = math.max(a.latitude, b.latitude);
    final east = math.max(a.longitude, b.longitude);
    if ((north - south).abs() < 0.0001 && (east - west).abs() < 0.0001) {
      c.animateCamera(CameraUpdate.newLatLngZoom(a, 15));
      return;
    }
    c.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(southwest: LatLng(south, west), northeast: LatLng(north, east)),
        80,
      ),
    );
  }

  Future<void> _advance(ServiceRequest job) async {
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
      if (stage == 'completed') {
        Navigator.of(context).maybePop();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not update trip.'))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _callBuyer(String phone) async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  ServiceRequest? _resolveJob(DispatchController dispatch) {
    if (dispatch.activeJob?.id == widget.requestId) return dispatch.activeJob;
    if (_loadedJob?.id == widget.requestId) return _loadedJob;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final dispatch = context.watch<DispatchController>();
    final job = _resolveJob(dispatch);

    if (_loading && job == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Active trip')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (job == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const Text('Active trip')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _loadError ?? 'Trip not found',
                  textAlign: TextAlign.center,
                  style: AppTheme.host(fontSize: 15, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 16),
                OutlinedButton(onPressed: _bootstrap, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      );
    }

    final dest = (job.destinationLat != null && job.destinationLng != null)
        ? LatLng(job.destinationLat!, job.destinationLng!)
        : null;
    final providerLat = dispatch.liveProviderLat ?? job.providerLat;
    final providerLng = dispatch.liveProviderLng ?? job.providerLng;
    final provider =
        (providerLat != null && providerLng != null) ? LatLng(providerLat, providerLng) : null;
    final center = provider ?? dest ?? const LatLng(0.3476, 32.5825);

    if (provider != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _recordBreadcrumb(provider);
        if (dest != null) unawaited(_fetchRoute(provider, dest));
        _maybeFollow(provider);
      });
    }

    final markers = <Marker>{
      if (dest != null)
        Marker(
          markerId: const MarkerId('dest'),
          position: dest,
          icon: _customerIcon ?? BitmapDescriptor.defaultMarker,
          infoWindow: InfoWindow(
            title: 'Customer',
            snippet: job.buyerContactName.isNotEmpty ? job.buyerContactName : job.location,
          ),
        ),
      if (provider != null)
        Marker(
          markerId: const MarkerId('provider'),
          position: provider,
          icon: _youIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: const InfoWindow(title: 'You'),
          zIndexInt: 2,
        ),
    };

    final polylines = <Polyline>{
      if (_breadcrumb.length > 1)
        Polyline(
          polylineId: const PolylineId('trail'),
          points: List<LatLng>.from(_breadcrumb),
          color: const Color(0xFF64748B),
          width: 4,
          patterns: [PatternItem.dash(16), PatternItem.gap(10)],
        ),
      if (_route.length > 1)
        Polyline(
          polylineId: const PolylineId('route'),
          points: _route,
          color: AppColors.primary,
          width: 5,
        ),
    };

    final metaLine = [
      if (_etaMinutes != null) '$_etaMinutes min',
      if (_distanceKm != null) '${_distanceKm!.toStringAsFixed(1)} km',
      statusLabelSafe(job),
    ].join(' · ');

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          Positioned.fill(
            child: GoogleMap(
              initialCameraPosition: CameraPosition(target: center, zoom: 14.5),
              markers: markers,
              polylines: polylines,
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
              compassEnabled: false,
              mapToolbarEnabled: false,
              zoomControlsEnabled: false,
              onCameraMoveStarted: () {
                // User panned — pause follow until they re-enable it.
              },
              onMapCreated: (c) {
                _mapController = c;
                if (dest != null && provider != null) {
                  _fitCamera(dest, provider);
                } else if (provider != null) {
                  c.animateCamera(CameraUpdate.newLatLngZoom(provider, 15));
                }
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(
                children: [
                  Material(
                    color: AppColors.surface,
                    shape: const CircleBorder(),
                    elevation: 2,
                    child: IconButton(
                      onPressed: () => Navigator.of(context).maybePop(),
                      icon: const Icon(Icons.arrow_back_rounded),
                    ),
                  ),
                  const Spacer(),
                  Material(
                    color: AppColors.surface,
                    shape: const CircleBorder(),
                    elevation: 2,
                    child: IconButton(
                      tooltip: _followYou ? 'Following your location' : 'Follow your location',
                      onPressed: () {
                        setState(() => _followYou = !_followYou);
                        if (_followYou && provider != null) {
                          _lastFollowKey = null;
                          _maybeFollow(provider);
                        }
                      },
                      icon: Icon(
                        _followYou ? Icons.my_location_rounded : Icons.location_searching_rounded,
                        color: _followYou ? AppColors.primary : AppColors.textSecondary,
                      ),
                    ),
                  ),
                  if (job.buyerContactPhone.isNotEmpty) ...[
                    const SizedBox(width: 8),
                    Material(
                      color: AppColors.primary,
                      shape: const CircleBorder(),
                      elevation: 2,
                      child: IconButton(
                        onPressed: () => _callBuyer(job.buyerContactPhone),
                        icon: const Icon(Icons.phone_rounded, color: Colors.white),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: SafeArea(
              top: false,
              child: Container(
                width: double.infinity,
                margin: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 18),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadii.xxl),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppTheme.softShadow,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Center(
                      child: Container(
                        width: 36,
                        height: 4,
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: AppColors.borderStrong,
                          borderRadius: BorderRadius.circular(99),
                        ),
                      ),
                    ),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            job.service,
                            style: AppTheme.host(
                              fontSize: 18,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ),
                        StatusChip(label: statusLabelSafe(job)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      job.location,
                      style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.35),
                    ),
                    if (metaLine.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Text(
                        metaLine,
                        style: AppTheme.host(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                    if (job.buyerContactName.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        job.buyerContactName,
                        style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
                      ),
                    ],
                    const SizedBox(height: 16),
                    _QuietStages(job: job),
                    const SizedBox(height: 18),
                    if (job.status != 'completed' && job.status != 'cancelled')
                      ElevatedButton(
                        onPressed: _busy ? null : () => _advance(job),
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
            ),
          ),
        ],
      ),
    );
  }
}

class StatusChip extends StatelessWidget {
  const StatusChip({super.key, required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: AppColors.primarySoft,
        borderRadius: BorderRadius.circular(AppRadii.pill),
      ),
      child: Text(
        label,
        style: AppTheme.host(fontSize: 11.5, fontWeight: FontWeight.w700, color: AppColors.primary),
      ),
    );
  }
}

String statusLabelSafe(ServiceRequest job) {
  final s = job.status.toLowerCase();
  if (s == 'in_progress') return 'In progress';
  if (s == 'matched') return 'En route';
  if (s == 'completed') return 'Completed';
  if (s == 'cancelled' || s == 'canceled') return 'Cancelled';
  return s.isEmpty ? 'Active' : '${s[0].toUpperCase()}${s.substring(1)}';
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
          Expanded(
            child: Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 240),
                  height: 4,
                  decoration: BoxDecoration(
                    color: steps[i].$2 ? AppColors.primary : AppColors.borderSoft,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  steps[i].$1,
                  textAlign: TextAlign.center,
                  style: AppTheme.host(
                    fontSize: 11.5,
                    fontWeight: steps[i].$2 ? FontWeight.w700 : FontWeight.w500,
                    color: steps[i].$2 ? AppColors.primary : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          if (i < steps.length - 1) const SizedBox(width: 6),
        ],
      ],
    );
  }
}
