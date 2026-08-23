import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
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
  static const _tips = [
    'Matching you with a nearby professional…',
    'Checking who’s available in your area…',
    'Almost there — hang tight…',
  ];

  final _api = BuyerApi(ApiClient());
  Timer? _poll;
  Timer? _tipTimer;
  late final AnimationController _radar;

  BuyerServiceRequest? _request;
  String _status = 'Finding help nearby';
  String _tip = _tips.first;
  String? _error;
  int _tipIndex = 0;
  int _seconds = 0;

  @override
  void initState() {
    super.initState();
    _radar = AnimationController(vsync: this, duration: const Duration(seconds: 2))
      ..repeat();
    _poll = Timer.periodic(const Duration(seconds: 3), (_) => _pollStatus());
    _tipTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _seconds++;
        if (_seconds % 4 == 0) {
          _tipIndex = (_tipIndex + 1) % _tips.length;
          _tip = _tips[_tipIndex];
        }
      });
    });
    unawaited(_pollStatus());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _tipTimer?.cancel();
    _radar.dispose();
    super.dispose();
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

      if (status == 'cancelled' || status == 'canceled') {
        setState(() => _status = 'Request cancelled');
        _poll?.cancel();
        _radar.stop();
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

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          Positioned.fill(
            child: GoogleMap(
              initialCameraPosition: CameraPosition(target: dest, zoom: 15),
              markers: {
                Marker(
                  markerId: const MarkerId('you'),
                  position: dest,
                  icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
                  infoWindow: const InfoWindow(title: 'Pickup'),
                ),
              },
              myLocationButtonEnabled: false,
              zoomControlsEnabled: false,
              mapToolbarEnabled: false,
              compassEnabled: false,
              onMapCreated: (c) {
                c.animateCamera(CameraUpdate.newLatLngZoom(dest, 15.5));
              },
            ),
          ),
          // Searching radar overlay (SafeBoda-style pulse)
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
                    tooltip: 'Cancel',
                    onPressed: () => context.go('/services'),
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
                          color: AppColors.primarySoft,
                          borderRadius: BorderRadius.circular(AppRadii.md),
                        ),
                        child: const Icon(Icons.radar_rounded, color: AppColors.primary),
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
                      minHeight: 4,
                      backgroundColor: AppColors.borderSoft,
                      color: AppColors.primary,
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
                    'We’ll notify you the moment a provider accepts.',
                    textAlign: TextAlign.center,
                    style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
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
