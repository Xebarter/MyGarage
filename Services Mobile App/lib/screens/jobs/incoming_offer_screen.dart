import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../models/service_request.dart';
import '../../services/job_alert_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ui.dart';

/// Full-screen intercept for an incoming job — Accept / Reject with countdown + map.
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

  bool _onKey(KeyEvent event) {
    if (event is KeyDownEvent &&
        (event.logicalKey == LogicalKeyboardKey.audioVolumeDown ||
            event.logicalKey == LogicalKeyboardKey.audioVolumeMute)) {
      (widget.onVolumeSilence ?? () => JobAlertService.instance.silence)();
      return false;
    }
    return false;
  }

  @override
  void initState() {
    super.initState();
    HardwareKeyboard.instance.addHandler(_onKey);
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
    final dest = (req?.destinationLat != null && req?.destinationLng != null)
        ? LatLng(req!.destinationLat!, req.destinationLng!)
        : null;

    return Material(
      color: AppColors.background,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Text(
                    'INCOMING JOB',
                    style: AppTheme.host(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                      letterSpacing: 1.4,
                    ),
                  ),
                  const Spacer(),
                  StatusPill(
                    label: '${_remaining.inSeconds}s left',
                    color: urgent ? AppColors.danger : AppColors.warning,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: progress,
                  minHeight: 4,
                  backgroundColor: AppColors.borderSoft,
                  color: urgent ? AppColors.danger : AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
              if (dest != null)
                Expanded(
                  flex: 3,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: GoogleMap(
                      initialCameraPosition: CameraPosition(target: dest, zoom: 14.5),
                      markers: {
                        Marker(
                          markerId: const MarkerId('customer'),
                          position: dest,
                          infoWindow: const InfoWindow(title: 'Customer'),
                        ),
                      },
                      myLocationButtonEnabled: false,
                      zoomControlsEnabled: false,
                      mapToolbarEnabled: false,
                    ),
                  ),
                )
              else
                const Spacer(),
              const SizedBox(height: 16),
              Text(
                req?.service ?? 'Service request',
                style: AppTheme.host(
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.5,
                  color: AppColors.textPrimary,
                ),
              ),
              if ((req?.location ?? '').isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  req!.location,
                  style: AppTheme.host(fontSize: 15, color: AppColors.textSecondary, height: 1.4),
                ),
              ],
              if ((req?.buyerContactName ?? '').isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  req!.buyerContactName,
                  style: AppTheme.host(fontSize: 14, color: AppColors.textMuted),
                ),
              ],
              const Spacer(),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () => Navigator.of(context).pop('accept'),
                child: Text(
                  'Accept job',
                  style: AppTheme.host(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(52),
                  foregroundColor: AppColors.danger,
                  side: BorderSide(color: AppColors.danger.withValues(alpha: 0.35)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () => Navigator.of(context).pop('decline'),
                child: const Text('Reject'),
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
    );
  }
}
