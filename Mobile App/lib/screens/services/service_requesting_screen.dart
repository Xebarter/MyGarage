import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../maps/premium_google_map.dart';
import '../../maps/premium_map_markers.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

/// Ride-hailing style “searching for driver” screen with radar + status sheet.
class ServiceRequestingScreen extends StatefulWidget {
  const ServiceRequestingScreen({super.key, required this.requestId});

  final String requestId;

  @override
  State<ServiceRequestingScreen> createState() => _ServiceRequestingScreenState();
}

class _ServiceRequestingScreenState extends State<ServiceRequestingScreen>
    with TickerProviderStateMixin {
  static const _kampala = LatLng(0.3476, 32.5825);
  static const _searchTimeoutSeconds = 150; // 2.5 minutes
  static const _tips = [
    'Matching you with a nearby professional…',
    'Checking who’s available in your area…',
    'Almost there — hang tight…',
  ];

  final _api = BuyerApi(ApiClient());
  Timer? _poll;
  Timer? _tipTimer;
  late final AnimationController _radar;
  PremiumMapController? _map;
  BitmapDescriptor? _pinIcon;
  LatLng? _lastCameraTarget;

  BuyerServiceRequest? _request;
  String _status = 'Finding help nearby';
  String _tip = _tips.first;
  String? _error;
  int _tipIndex = 0;
  int _seconds = 0;
  bool _expired = false;

  @override
  void initState() {
    super.initState();
    _radar = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
    _poll = Timer.periodic(const Duration(seconds: 3), (_) => _pollStatus());
    _tipTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _expired) return;
      setState(() {
        _seconds++;
        if (_seconds % 4 == 0) {
          _tipIndex = (_tipIndex + 1) % _tips.length;
          _tip = _tips[_tipIndex];
        }
      });
      if (_seconds >= _searchTimeoutSeconds) {
        unawaited(_pollStatus());
      }
    });
    unawaited(_pollStatus());
    unawaited(_loadPin());
  }

  Future<void> _loadPin() async {
    try {
      final icon = await PremiumMapMarkers.destinationPin(AppColors.primary);
      if (!mounted) return;
      setState(() => _pinIcon = icon);
    } catch (_) {}
  }

  @override
  void dispose() {
    _poll?.cancel();
    _tipTimer?.cancel();
    _radar.dispose();
    super.dispose();
  }

  void _markExpired({required String statusText, required String tip}) {
    _poll?.cancel();
    _tipTimer?.cancel();
    _radar.stop();
    setState(() {
      _expired = true;
      _status = statusText;
      _tip = tip;
    });
  }

  Future<void> _pollStatus() async {
    final auth = context.read<AuthController>();
    final customerId = auth.customerId;
    if (customerId == null || widget.requestId.isEmpty) return;
    try {
      final detail = await _api.getServiceRequestDetail(
        requestId: widget.requestId,
        customerId: customerId,
      );
      final status = detail.request.status.toLowerCase();
      final hasProvider =
          detail.request.providerId != null && detail.request.providerId!.isNotEmpty;

      if (!mounted) return;
      setState(() {
        _request = detail.request;
        _error = null;
      });

      if (status == 'expired') {
        _markExpired(
          statusText: 'No provider found',
          tip: 'This search expired after 2.5 minutes. Request again to keep looking.',
        );
        return;
      }
      if (status == 'cancelled' || status == 'canceled') {
        _markExpired(
          statusText: 'Request cancelled',
          tip: 'You can request again whenever you’re ready.',
        );
        return;
      }
      if (hasProvider ||
          status == 'matched' ||
          status == 'in_progress' ||
          status == 'completed') {
        _poll?.cancel();
        HapticFeedback.mediumImpact();
        context.go('/service/track/${widget.requestId}');
        return;
      }
      setState(() => _status = 'Searching for a provider…');
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = userFacingError(e, fallback: 'Could not refresh status.'));
    }
  }

  Future<void> _cancelSearch() async {
    final auth = context.read<AuthController>();
    final customerId = auth.customerId;
    if (customerId == null) {
      if (mounted) context.go('/services');
      return;
    }
    try {
      await _api.cancelServiceRequestSearch(
        requestId: widget.requestId,
        customerId: customerId,
      );
      _poll?.cancel();
      _tipTimer?.cancel();
      _radar.stop();
      if (!mounted) return;
      context.go('/services');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not cancel search.'))),
      );
    }
  }

  void _requestAgain() {
    context.go('/services');
  }

  LatLng get _center {
    final r = _request;
    if (r?.destinationLat != null && r?.destinationLng != null) {
      return LatLng(r!.destinationLat!, r.destinationLng!);
    }
    return _kampala;
  }

  @override
  Widget build(BuildContext context) {
    final padBottom = MediaQuery.paddingOf(context).bottom;
    final dest = _center;
    if (_map != null &&
        (_lastCameraTarget == null ||
            (dest.latitude - _lastCameraTarget!.latitude).abs() > 0.00025 ||
            (dest.longitude - _lastCameraTarget!.longitude).abs() > 0.00025)) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _lastCameraTarget = dest;
        _map?.moveTo(dest, zoom: 15.5);
      });
    }

    final remaining = (_searchTimeoutSeconds - _seconds).clamp(0, _searchTimeoutSeconds);
    final progress = _expired ? 1.0 : (_seconds / _searchTimeoutSeconds).clamp(0.0, 1.0);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          Positioned.fill(
            child: PremiumGoogleMap(
              initialCameraPosition: CameraPosition(target: dest, zoom: 15),
              padding: EdgeInsets.only(top: 72, bottom: 280 + padBottom, left: 12, right: 12),
              markers: {
                Marker(
                  markerId: const MarkerId('you'),
                  position: dest,
                  icon: _pinIcon ?? BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
                  infoWindow: const InfoWindow(title: 'Pickup'),
                  anchor: const Offset(0.5, 0.92),
                ),
              },
              circles: premiumSearchCircles(center: dest, color: AppColors.primary),
              onMapCreated: (c) {
                _map = c;
                c.moveTo(dest, zoom: 15.5);
                _lastCameraTarget = dest;
              },
            ),
          ),
          if (!_expired)
            IgnorePointer(
              child: Center(
                child: AnimatedBuilder(
                  animation: _radar,
                  builder: (context, _) {
                    return CustomPaint(
                      size: const Size(280, 280),
                      painter: _RadarPainter(
                        progress: _radar.value,
                        color: AppColors.primary,
                      ),
                    );
                  },
                ),
              ),
            ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Align(
                alignment: Alignment.topLeft,
                child: Material(
                  color: AppColors.surface,
                  shape: const CircleBorder(),
                  elevation: 3,
                  child: IconButton(
                    tooltip: _expired ? 'Back' : 'Stop search',
                    onPressed: _expired ? _requestAgain : _cancelSearch,
                    icon: const Icon(Icons.close_rounded),
                  ),
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              margin: EdgeInsets.fromLTRB(12, 0, 12, 12 + padBottom),
              padding: const EdgeInsets.fromLTRB(22, 14, 22, 22),
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
                      margin: const EdgeInsets.only(bottom: 16),
                      decoration: BoxDecoration(
                        color: AppColors.borderStrong,
                        borderRadius: BorderRadius.circular(99),
                      ),
                    ),
                  ),
                  Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: _expired
                              ? AppColors.danger.withValues(alpha: 0.12)
                              : AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(AppRadii.md),
                        ),
                        child: Icon(
                          _expired ? Icons.timer_off_rounded : Icons.radar_rounded,
                          color: _expired ? AppColors.danger : AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _status,
                              style: AppTheme.host(
                                fontSize: 17,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.2,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _tip,
                              style: AppTheme.host(
                                fontSize: 13.5,
                                color: AppColors.textSecondary,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  if (_request?.service.isNotEmpty == true) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceMuted,
                        borderRadius: BorderRadius.circular(AppRadii.md),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.handyman_outlined, size: 18, color: AppColors.textMuted),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _request!.service,
                              style: AppTheme.host(fontSize: 13.5, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if ((_request?.location ?? '').isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.place_outlined, size: 16, color: AppColors.textMuted),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            _request!.location!,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTheme.host(fontSize: 13, color: AppColors.textMuted),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(99),
                    child: LinearProgressIndicator(
                      value: progress,
                      minHeight: 4,
                      backgroundColor: AppColors.borderSoft,
                      color: _expired ? AppColors.danger : AppColors.primary,
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      _error!,
                      style: AppTheme.host(color: AppColors.danger, fontSize: 13),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Text(
                    _expired
                        ? 'Start a new request to search for providers again.'
                        : remaining > 0
                            ? 'Searching for up to ${remaining ~/ 60}:${(remaining % 60).toString().padLeft(2, '0')} — or stop anytime.'
                            : 'Finishing search…',
                    textAlign: TextAlign.center,
                    style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 14),
                  if (_expired)
                    FilledButton(
                      onPressed: _requestAgain,
                      child: const Text('Request again'),
                    )
                  else
                    OutlinedButton(
                      onPressed: _cancelSearch,
                      child: const Text('Stop searching'),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RadarPainter extends CustomPainter {
  _RadarPainter({required this.progress, required this.color});

  final double progress;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final maxR = size.width / 2;

    for (var i = 0; i < 3; i++) {
      final t = (progress + i / 3) % 1.0;
      final r = maxR * (0.25 + t * 0.75);
      final opacity = (1 - t) * 0.35;
      canvas.drawCircle(
        center,
        r,
        Paint()
          ..color = color.withValues(alpha: opacity)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.5,
      );
    }

    canvas.drawCircle(
      center,
      10,
      Paint()..color = color.withValues(alpha: 0.9),
    );
    canvas.drawCircle(
      center,
      18,
      Paint()
        ..color = color.withValues(alpha: 0.2)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3,
    );

    // Soft cones
    final sweep = Paint()
      ..shader = SweepGradient(
        colors: [
          color.withValues(alpha: 0),
          color.withValues(alpha: 0.18),
          color.withValues(alpha: 0),
        ],
        stops: const [0.0, 0.12, 0.28],
        transform: GradientRotation(progress * math.pi * 2),
      ).createShader(Rect.fromCircle(center: center, radius: maxR));
    canvas.drawCircle(center, maxR * 0.95, sweep);
  }

  @override
  bool shouldRepaint(covariant _RadarPainter oldDelegate) =>
      oldDelegate.progress != progress || oldDelegate.color != color;
}
