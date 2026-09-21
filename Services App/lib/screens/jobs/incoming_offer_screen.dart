import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../maps/premium_google_map.dart';
import '../../maps/premium_map_markers.dart';
import '../../maps/map_coords.dart';
import '../../models/service_request.dart';
import '../../services/job_alert_service.dart';
import '../../theme/app_theme.dart';

/// Full-bleed Uber / SafeBoda style incoming job intercept.
class IncomingOfferScreen extends StatefulWidget {
  const IncomingOfferScreen({
    super.key,
    required this.offer,
    this.onVolumeSilence,
  });

  final DispatchOffer offer;
  final VoidCallback? onVolumeSilence;

  @override
  State<IncomingOfferScreen> createState() => _IncomingOfferScreenState();
}

class _IncomingOfferScreenState extends State<IncomingOfferScreen> {
  static const _window = Duration(seconds: 90);
  late Duration _remaining;
  Timer? _timer;
  bool _expiredHandled = false;
  bool _closing = false;
  BitmapDescriptor? _pinIcon;

  bool _onKey(KeyEvent event) {
    if (event is KeyDownEvent &&
        (event.logicalKey == LogicalKeyboardKey.audioVolumeDown ||
            event.logicalKey == LogicalKeyboardKey.audioVolumeMute)) {
      (widget.onVolumeSilence ?? () => JobAlertService.instance.silence)();
      return false;
    }
    return false;
  }

  void _choose(String action) {
    if (_closing) return;
    _closing = true;
    if (action == 'accept') {
      HapticFeedback.mediumImpact();
    } else {
      HapticFeedback.selectionClick();
    }
    // Kill the ringer immediately — don't wait for dialog teardown / network.
    unawaited(JobAlertService.instance.stop());
    Navigator.of(context).pop(action);
  }

  @override
  void initState() {
    super.initState();
    HardwareKeyboard.instance.addHandler(_onKey);
    unawaited(_loadPin());
    final assigned = widget.offer.assignedAt ?? DateTime.now();
    final elapsed = DateTime.now().difference(assigned);
    _remaining = _window - elapsed;
    if (_remaining.isNegative) _remaining = Duration.zero;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() {
        _remaining -= const Duration(seconds: 1);
        if (_remaining.isNegative) _remaining = Duration.zero;
      });
      if (_remaining == Duration.zero && !_expiredHandled) {
        _expiredHandled = true;
        Navigator.of(context).pop('decline');
      }
    });
  }

  Future<void> _loadPin() async {
    try {
      final icon = await PremiumMapMarkers.destinationPin(AppColors.ink);
      if (!mounted) return;
      setState(() => _pinIcon = icon);
    } catch (_) {}
  }

  @override
  void dispose() {
    HardwareKeyboard.instance.removeHandler(_onKey);
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final progress = (_remaining.inSeconds / _window.inSeconds).clamp(0.0, 1.0);
    final urgent = _remaining.inSeconds < 20;
    final req = widget.offer.request;
    final dest = parseLatLng(req?.destinationLat, req?.destinationLng);
    final center = dest ?? const LatLng(0.3476, 32.5825);
    final padBottom = MediaQuery.paddingOf(context).bottom;

    return Material(
      color: AppColors.ink,
      child: Stack(
        children: [
          Positioned.fill(
            child: dest != null
                ? PremiumGoogleMap(
                    initialCameraPosition: CameraPosition(target: center, zoom: 15),
                    padding: EdgeInsets.only(top: 120, bottom: 280 + padBottom, left: 12, right: 12),
                    myLocationEnabled: true,
                    markers: {
                      Marker(
                        markerId: const MarkerId('customer'),
                        position: dest,
                        icon: _pinIcon ??
                            BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
                        infoWindow: InfoWindow(
                          title: 'Customer',
                          snippet: req?.buyerContactName,
                        ),
                        anchor: const Offset(0.5, 0.92),
                      ),
                    },
                    circles: premiumSearchCircles(center: dest, color: AppColors.primary),
                  )
                : Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [AppColors.ink, AppColors.primaryDeep],
                      ),
                    ),
                  ),
          ),
          // Top status strip
          SafeArea(
            bottom: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadii.lg),
                      boxShadow: AppTheme.softShadow,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.primarySoft,
                                borderRadius: BorderRadius.circular(AppRadii.pill),
                              ),
                              child: Text(
                                'NEW JOB',
                                style: AppTheme.host(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.primary,
                                  letterSpacing: 1.1,
                                ),
                              ),
                            ),
                            const Spacer(),
                            Text(
                              '${_remaining.inSeconds}s',
                              style: AppTheme.host(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: urgent ? AppColors.danger : AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(99),
                          child: LinearProgressIndicator(
                            value: progress,
                            minHeight: 5,
                            backgroundColor: AppColors.borderSoft,
                            color: urgent ? AppColors.danger : AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          // Bottom decision sheet
          Align(
            alignment: Alignment.bottomCenter,
            child: Container(
              width: double.infinity,
              margin: EdgeInsets.fromLTRB(12, 0, 12, 12 + padBottom),
              padding: const EdgeInsets.fromLTRB(20, 14, 20, 18),
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
                  Text(
                    req?.service ?? 'Service request',
                    style: AppTheme.host(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                    ),
                  ),
                  if ((req?.location ?? '').isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.place_rounded, size: 18, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            req!.location,
                            style: AppTheme.host(
                              fontSize: 15,
                              color: AppColors.textSecondary,
                              height: 1.35,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                  if ((req?.buyerContactName ?? '').isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: AppColors.primarySoft,
                          child: Text(
                            req!.buyerContactName[0].toUpperCase(),
                            style: AppTheme.host(
                              fontWeight: FontWeight.w700,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            req.buyerContactName,
                            style: AppTheme.host(fontSize: 14, fontWeight: FontWeight.w600),
                          ),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 56,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        foregroundColor: AppColors.onPrimary,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadii.md),
                        ),
                      ),
                      onPressed: _closing ? null : () => _choose('accept'),
                      child: Text(
                        'Accept job',
                        style: AppTheme.host(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: AppColors.onPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.danger,
                        side: BorderSide(color: AppColors.danger.withValues(alpha: 0.35)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppRadii.md),
                        ),
                      ),
                      onPressed: _closing ? null : () => _choose('decline'),
                      child: Text(
                        'Decline',
                        style: AppTheme.host(fontWeight: FontWeight.w700, color: AppColors.danger),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Volume down silences the ringer',
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
