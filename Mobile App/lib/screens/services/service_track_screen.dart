import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../config.dart';
import '../../maps/premium_google_map.dart';
import '../../maps/premium_map_markers.dart';
import '../../maps/map_coords.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/active_service_request.dart';
import '../../utils/user_facing_error.dart';
import '../../widgets/app_brand_logo.dart';
import '../../widgets/cancel_service_request_sheet.dart';

/// Premium Uber-style live tracking for the buyer.
class ServiceTrackScreen extends StatefulWidget {
  const ServiceTrackScreen({super.key, required this.requestId});

  final String requestId;

  @override
  State<ServiceTrackScreen> createState() => _ServiceTrackScreenState();
}

class _ServiceTrackScreenState extends State<ServiceTrackScreen> {
  final _api = BuyerApi(ApiClient());
  Timer? _poll;
  PremiumMapController? _mapController;

  BuyerServiceRequest? _request;
  ServiceProviderContact? _providerContact;
  String? _error;
  bool _loading = true;
  bool _restarting = false;
  bool _cancelling = false;

  List<LatLng> _route = [];
  int? _etaMinutes;
  double? _distanceKm;
  String? _lastRouteKey;
  bool _follow = true;
  String? _lastFollowKey;
  bool _programmaticCamera = false;
  BitmapDescriptor? _youIcon;
  BitmapDescriptor? _providerIcon;
  LatLng? _lastProvider;
  double _providerHeading = 0;

  @override
  void initState() {
    super.initState();
    unawaited(_prepareMarkers());
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

  Future<void> _prepareMarkers() async {
    try {
      final you = await PremiumMapMarkers.destinationPin(AppColors.ink);
      final provider = await PremiumMapMarkers.vehicle(AppColors.primary);
      if (!mounted) return;
      setState(() {
        _youIcon = you;
        _providerIcon = provider;
      });
    } catch (_) {}
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
        unawaited(_fetchRoute(LatLng(pLat, pLng), LatLng(destLat, destLng)));
        _maybeFollowProvider(LatLng(pLat, pLng));
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

  Future<void> _requestAgain() async {
    if (_restarting) return;
    final auth = context.read<AuthController>();
    final customerId = auth.customerId;
    if (customerId == null || customerId.isEmpty) return;
    setState(() => _restarting = true);
    try {
      await _api.restartServiceRequestSearch(
        requestId: widget.requestId,
        customerId: customerId,
      );
      if (!mounted) return;
      setState(() => _restarting = false);
      await _load();
    } catch (e) {
      if (!mounted) return;
      setState(() => _restarting = false);
      if (redirectIfActiveRequestExists(context, e)) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not restart this search.'))),
      );
    }
  }

  Future<void> _stopSearch() async {
    if (_cancelling) return;
    final request = _request;
    final auth = context.read<AuthController>();
    final customerId = auth.customerId;
    if (customerId == null || customerId.isEmpty || request == null) return;
    final choice = await showCancelServiceRequestSheet(
      context,
      stage: cancelStageFromRequest(status: request.status, acceptedAt: request.acceptedAt),
      service: request.service,
      location: request.location,
    );
    if (choice == null || !mounted) return;
    setState(() => _cancelling = true);
    try {
      await _api.cancelServiceRequestSearch(
        requestId: widget.requestId,
        customerId: customerId,
        reasonId: choice.reasonId,
        note: choice.note,
      );
      _poll?.cancel();
      if (!mounted) return;
      context.go('/services');
    } catch (e) {
      if (!mounted) return;
      setState(() => _cancelling = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not cancel this request.'))),
      );
    }
  }

  void _maybeFollowProvider(LatLng provider) {
    if (_lastProvider != null) {
      final moved = math.max(
        (provider.latitude - _lastProvider!.latitude).abs(),
        (provider.longitude - _lastProvider!.longitude).abs(),
      );
      if (moved > 0.00004) {
        _providerHeading = bearingDegrees(_lastProvider!, provider);
      }
    }
    _lastProvider = provider;
    if (!_follow || _mapController == null) return;
    final key =
        '${provider.latitude.toStringAsFixed(4)},${provider.longitude.toStringAsFixed(4)}';
    if (key == _lastFollowKey) return;
    _lastFollowKey = key;
    _programmaticCamera = true;
    _mapController!.moveTo(provider);
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
      if (!_follow) _fit(from, to);
    } catch (_) {}
  }

  void _fit(LatLng a, LatLng b) {
    final c = _mapController;
    if (c == null) return;
    _programmaticCamera = true;
    c.fitPoints(a, b, padding: 96);
  }

  String _headline(BuyerServiceRequest r) {
    final s = r.status.toLowerCase();
    if (s == 'pending') return 'Looking for a provider';
    if (s == 'matched') return 'Provider is on the way';
    if (s == 'in_progress') return 'Service in progress';
    if (s == 'completed') return 'Service completed';
    if (s == 'expired') return 'No provider found';
    if (s == 'cancelled' || s == 'canceled') return 'Request cancelled';
    return 'Tracking your request';
  }

  String _statusLabel(BuyerServiceRequest r) {
    final s = r.status.toLowerCase();
    if (s == 'pending') return 'Searching';
    if (s == 'matched') return 'En route';
    if (s == 'in_progress') return 'Working';
    if (s == 'completed') return 'Done';
    if (s == 'expired') return 'Expired';
    if (s == 'cancelled' || s == 'canceled') return 'Cancelled';
    return s.isEmpty ? 'Active' : '${s[0].toUpperCase()}${s.substring(1)}';
  }

  List<(String, bool)> _stages(BuyerServiceRequest r) {
    final s = r.status.toLowerCase();
    final matched = s == 'matched' || s == 'in_progress' || s == 'completed' ||
        (r.providerId != null && r.providerId!.isNotEmpty);
    final working = s == 'in_progress' || s == 'completed';
    final done = s == 'completed';
    return [
      ('Requested', true),
      ('Matched', matched),
      ('On site', working),
      ('Done', done),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final request = _request;
    final padBottom = MediaQuery.paddingOf(context).bottom;

    if (_loading && request == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (_error != null && request == null) {
      return Scaffold(
        backgroundColor: AppColors.background,
        appBar: AppBar(title: const AppBarTitle('Live tracking')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                OutlinedButton(onPressed: _load, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      );
    }

    if (request == null) {
      return Scaffold(
        appBar: AppBar(title: const AppBarTitle('Live tracking')),
        body: const Center(child: Text('Request not found')),
      );
    }

    final dest = parseLatLng(request.destinationLat, request.destinationLng);
    final provider = parseLatLng(request.providerLat, request.providerLng);
    final searching = request.status == 'pending';
    final center = provider ?? dest ?? const LatLng(0.3476, 32.5825);
    final phone = _providerContact?.phone ?? '';
    final name = (_providerContact?.businessName?.isNotEmpty == true)
        ? _providerContact!.businessName!
        : (_providerContact?.name.isNotEmpty == true
            ? _providerContact!.name
            : 'Your provider');

    final markers = <Marker>{
      if (dest != null)
        Marker(
          markerId: const MarkerId('you'),
          position: dest,
          icon: _youIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
          infoWindow: const InfoWindow(title: 'You'),
          anchor: const Offset(0.5, 0.92),
        ),
      if (provider != null && !searching)
        Marker(
          markerId: const MarkerId('provider'),
          position: provider,
          icon: _providerIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
          infoWindow: InfoWindow(title: name),
          rotation: _providerHeading,
          flat: true,
          anchor: const Offset(0.5, 0.5),
          zIndexInt: 2,
        ),
    };

    final polylines = premiumRoutePolylines(
      points: searching ? const [] : _route,
      core: AppColors.primary,
    );

    final circles = searching && dest != null
        ? premiumSearchCircles(center: dest, color: AppColors.primary)
        : <Circle>{};

    final etaLabel = [
      if (_etaMinutes != null) '$_etaMinutes min',
      if (_distanceKm != null) '${_distanceKm!.toStringAsFixed(1)} km',
    ].join(' · ');

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          Positioned.fill(
            child: PremiumGoogleMap(
              initialCameraPosition: CameraPosition(target: center, zoom: searching ? 15 : 14.2),
              markers: markers,
              polylines: polylines,
              circles: circles,
              padding: EdgeInsets.only(top: 88, bottom: 300 + padBottom, left: 12, right: 12),
              onCameraMoveStarted: () {
                if (_programmaticCamera) {
                  _programmaticCamera = false;
                  return;
                }
                if (_follow) setState(() => _follow = false);
              },
              onMapCreated: (c) {
                _mapController = c;
                if (dest != null && provider != null) {
                  _fit(dest, provider);
                }
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(
                children: [
                  _CircleAction(
                    icon: Icons.arrow_back_rounded,
                    onTap: () => context.canPop() ? context.pop() : context.go('/services'),
                  ),
                  const Spacer(),
                  if (etaLabel.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(AppRadii.pill),
                        border: Border.all(color: AppColors.border),
                        boxShadow: AppTheme.cardShadow,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.schedule_rounded, size: 16, color: AppColors.primary),
                          const SizedBox(width: 6),
                          Text(
                            etaLabel,
                            style: AppTheme.host(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: AppColors.primaryDeep,
                            ),
                          ),
                        ],
                      ),
                    ),
                  const Spacer(),
                  _CircleAction(
                    icon: _follow ? Icons.my_location_rounded : Icons.location_searching_rounded,
                    tint: _follow ? AppColors.primary : null,
                    onTap: () {
                      setState(() => _follow = !_follow);
                      if (_follow && provider != null) {
                        _lastFollowKey = null;
                        _programmaticCamera = true;
                        _maybeFollowProvider(provider);
                      } else if (dest != null && provider != null) {
                        _fit(dest, provider);
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              margin: EdgeInsets.fromLTRB(12, 0, 12, 12 + padBottom),
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 18),
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
                      width: 40,
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
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _headline(request),
                              style: AppTheme.host(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.3,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              request.service,
                              style: AppTheme.host(fontSize: 13.5, color: AppColors.textSecondary),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(AppRadii.pill),
                        ),
                        child: Text(
                          _statusLabel(request),
                          style: AppTheme.host(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (request.status == 'pending') ...[
                    const SizedBox(height: 14),
                    Text(
                      'We search for up to 2.5 minutes — or until you stop.',
                      style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted, height: 1.35),
                    ),
                  ],
                  if (canBuyerCancelBeforeArrival(
                    status: request.status,
                    arrivedAt: request.arrivedAt,
                    startedAt: request.startedAt,
                  )) ...[
                    const SizedBox(height: 12),
                    OutlinedButton(
                      onPressed: _cancelling ? null : _stopSearch,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        side: BorderSide(color: AppColors.danger.withValues(alpha: 0.35)),
                      ),
                      child: Text(
                        _cancelling
                            ? 'Cancelling…'
                            : request.status == 'pending'
                                ? 'Stop searching'
                                : 'Cancel request',
                      ),
                    ),
                  ],
                  if (request.status == 'expired' ||
                      request.status == 'cancelled' ||
                      request.status == 'canceled') ...[
                    const SizedBox(height: 14),
                    Text(
                      request.status == 'expired'
                          ? 'No provider accepted within 2.5 minutes. Request again to keep looking.'
                          : 'This search was stopped. Request again when you’re ready.',
                      style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted, height: 1.35),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _restarting ? null : _requestAgain,
                      child: Text(_restarting ? 'Starting search…' : 'Request again'),
                    ),
                  ],
                  if (!searching && _providerContact != null) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 24,
                          backgroundColor: AppColors.primarySoft,
                          backgroundImage: (_providerContact!.photoUrl != null &&
                                  _providerContact!.photoUrl!.isNotEmpty)
                              ? NetworkImage(_providerContact!.photoUrl!)
                              : null,
                          child: (_providerContact!.photoUrl == null ||
                                  _providerContact!.photoUrl!.isEmpty)
                              ? Text(
                                  name.isNotEmpty ? name[0].toUpperCase() : 'P',
                                  style: AppTheme.host(
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.primary,
                                    fontSize: 18,
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                name,
                                style: AppTheme.host(fontSize: 15, fontWeight: FontWeight.w700),
                              ),
                              if ((_providerContact!.vehicleLabel ?? '').isNotEmpty)
                                Text(
                                  _providerContact!.vehicleLabel!,
                                  style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                                )
                              else if (_providerContact!.rating != null)
                                Text(
                                  '★ ${_providerContact!.rating!.toStringAsFixed(1)}'
                                  '${_providerContact!.completedJobs != null ? ' · ${_providerContact!.completedJobs} jobs' : ''}',
                                  style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                                ),
                            ],
                          ),
                        ),
                        if (phone.isNotEmpty)
                          Material(
                            color: AppColors.primary,
                            shape: const CircleBorder(),
                            child: IconButton(
                              tooltip: 'Call',
                              onPressed: () async {
                                HapticFeedback.lightImpact();
                                final uri = Uri(scheme: 'tel', path: phone);
                                if (await canLaunchUrl(uri)) await launchUrl(uri);
                              },
                              icon: const Icon(Icons.phone_rounded, color: Colors.white),
                            ),
                          ),
                      ],
                    ),
                  ],
                  if ((request.location ?? '').isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.place_outlined, size: 18, color: AppColors.textMuted),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            request.location!,
                            style: AppTheme.host(
                              fontSize: 13.5,
                              color: AppColors.textSecondary,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
                  _JourneyStages(stages: _stages(request)),
                  if (searching) ...[
                    const SizedBox(height: 14),
                    Text(
                      'Hang tight — we’re finding the best pro near you.',
                      style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _JourneyStages extends StatelessWidget {
  const _JourneyStages({required this.stages});

  final List<(String, bool)> stages;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (var i = 0; i < stages.length; i++) ...[
          Expanded(
            child: Column(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 260),
                  height: 4,
                  decoration: BoxDecoration(
                    color: stages[i].$2 ? AppColors.primary : AppColors.borderSoft,
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  stages[i].$1,
                  textAlign: TextAlign.center,
                  style: AppTheme.host(
                    fontSize: 11.5,
                    fontWeight: stages[i].$2 ? FontWeight.w700 : FontWeight.w500,
                    color: stages[i].$2 ? AppColors.primary : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
          if (i < stages.length - 1) const SizedBox(width: 6),
        ],
      ],
    );
  }
}

class _CircleAction extends StatelessWidget {
  const _CircleAction({required this.icon, required this.onTap, this.tint});

  final IconData icon;
  final VoidCallback onTap;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: const CircleBorder(),
      elevation: 3,
      shadowColor: AppColors.ink.withValues(alpha: 0.15),
      child: IconButton(
        onPressed: onTap,
        icon: Icon(icon, color: tint ?? AppColors.textPrimary),
      ),
    );
  }
}
