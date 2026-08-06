import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../config.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class ServiceTrackScreen extends StatefulWidget {
  const ServiceTrackScreen({super.key, required this.requestId});

  final String requestId;

  @override
  State<ServiceTrackScreen> createState() => _ServiceTrackScreenState();
}

class _ServiceTrackScreenState extends State<ServiceTrackScreen> {
  final _api = BuyerApi(ApiClient());
  Timer? _poll;
  GoogleMapController? _mapController;

  BuyerServiceRequest? _request;
  ServiceProviderContact? _providerContact;
  String? _error;
  bool _loading = true;

  List<LatLng> _route = [];
  int? _etaMinutes;
  double? _distanceKm;
  String? _lastRouteKey;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _load();
      _poll = Timer.periodic(const Duration(seconds: 5), (_) => _load(silent: true));
    });
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _load({bool silent = false}) async {
    final auth = context.read<AuthController>();
    final customerId = auth.customerId;
    if (customerId == null || customerId.isEmpty) {
      if (!silent) {
        setState(() {
          _loading = false;
          _error = 'Sign in to track this request.';
        });
      }
      return;
    }

    try {
      final result = await _api.getServiceRequestDetail(
        requestId: widget.requestId,
        customerId: customerId,
      );
      if (!mounted) return;
      setState(() {
        _request = result.request;
        _providerContact = result.provider;
        _loading = false;
        _error = null;
      });
      final destLat = result.request.destinationLat;
      final destLng = result.request.destinationLng;
      final pLat = result.request.providerLat;
      final pLng = result.request.providerLng;
      if (destLat != null && destLng != null && pLat != null && pLng != null) {
        unawaited(
          _fetchRoute(
            LatLng(pLat, pLng),
            LatLng(destLat, destLng),
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      if (!silent) {
        setState(() {
          _loading = false;
          _error = userFacingError(e, fallback: 'Could not load live tracking.');
        });
      }
    }
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
      if (res.statusCode < 200 || res.statusCode >= 300) return;
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
      _fit(from, to);
    } catch (_) {}
  }

  void _fit(LatLng a, LatLng b) {
    final c = _mapController;
    if (c == null) return;
    final south = a.latitude < b.latitude ? a.latitude : b.latitude;
    final west = a.longitude < b.longitude ? a.longitude : b.longitude;
    final north = a.latitude > b.latitude ? a.latitude : b.latitude;
    final east = a.longitude > b.longitude ? a.longitude : b.longitude;
    c.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(southwest: LatLng(south, west), northeast: LatLng(north, east)),
        72,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final request = _request;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Live tracking',
          style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700),
        ),
      ),
      body: _loading && request == null
          ? const Center(child: CircularProgressIndicator())
          : _error != null && request == null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_error!, textAlign: TextAlign.center),
                  ),
                )
              : request == null
                  ? const Center(child: Text('Request not found'))
                  : Column(
                      children: [
                        if (_etaMinutes != null || _distanceKm != null)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            color: AppColors.primarySoft,
                            child: Text(
                              [
                                if (_etaMinutes != null) 'Provider ~$_etaMinutes min away',
                                if (_distanceKm != null)
                                  '${_distanceKm!.toStringAsFixed(1)} km remaining',
                              ].join(' · '),
                              style: AppTheme.host(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: AppColors.primaryDeep,
                              ),
                            ),
                          ),
                        Expanded(child: _buildMap(request)),
                        _buildPanel(request),
                      ],
                    ),
    );
  }

  Widget _buildMap(BuyerServiceRequest request) {
    final dest = (request.destinationLat != null && request.destinationLng != null)
        ? LatLng(request.destinationLat!, request.destinationLng!)
        : null;
    final provider = (request.providerLat != null && request.providerLng != null)
        ? LatLng(request.providerLat!, request.providerLng!)
        : null;
    final searching = request.status == 'pending' || provider == null;
    final center = dest ?? provider ?? const LatLng(0.3476, 32.5825);

    return GoogleMap(
      initialCameraPosition: CameraPosition(target: center, zoom: searching ? 15 : 14),
      markers: {
        if (dest != null)
          Marker(
            markerId: const MarkerId('you'),
            position: dest,
            infoWindow: const InfoWindow(title: 'Your location'),
          ),
        if (provider != null && !searching)
          Marker(
            markerId: const MarkerId('provider'),
            position: provider,
            icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
            infoWindow: InfoWindow(title: _providerContact?.name.isNotEmpty == true
                ? _providerContact!.name
                : 'Your provider'),
          ),
      },
      polylines: {
        if (_route.length > 1 && !searching)
          Polyline(
            polylineId: const PolylineId('route'),
            points: _route,
            color: AppColors.primary,
            width: 5,
          ),
      },
      myLocationButtonEnabled: false,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      onMapCreated: (c) {
        _mapController = c;
        if (dest != null && provider != null) _fit(dest, provider);
      },
    );
  }

  Widget _buildPanel(BuyerServiceRequest request) {
    final phone = _providerContact?.phone ?? '';
    return Container(
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(20, 16, 20, 16 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: AppColors.border)),
        boxShadow: AppTheme.softShadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            request.service,
            style: AppTheme.host(fontSize: 18, fontWeight: FontWeight.w700, letterSpacing: -0.3),
          ),
          const SizedBox(height: 4),
          Text(
            request.status == 'pending'
                ? 'Looking for a nearby professional…'
                : 'Provider is on the way',
            style: AppTheme.host(fontSize: 13.5, color: AppColors.textMuted),
          ),
          if ((request.location ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              request.location!,
              style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary),
            ),
          ],
          if (phone.isNotEmpty) ...[
            const SizedBox(height: 14),
            ElevatedButton.icon(
              onPressed: () async {
                final uri = Uri(scheme: 'tel', path: phone);
                if (await canLaunchUrl(uri)) await launchUrl(uri);
              },
              icon: const Icon(Icons.phone_rounded),
              label: const Text('Call provider'),
            ),
          ],
        ],
      ),
    );
  }
}
