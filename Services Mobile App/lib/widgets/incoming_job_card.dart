import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../models/service_request.dart';
import '../providers/dispatch_controller.dart';
import '../theme/app_theme.dart';
import '../utils/user_facing_error.dart';
import 'ui.dart';

/// Primary job offer card with Accept / Reject actions.
class IncomingJobCard extends StatefulWidget {
  const IncomingJobCard({
    super.key,
    required this.offer,
    this.compactMap = true,
  });

  final DispatchOffer offer;
  final bool compactMap;

  @override
  State<IncomingJobCard> createState() => _IncomingJobCardState();
}

class _IncomingJobCardState extends State<IncomingJobCard> {
  static const _window = Duration(seconds: 90);
  late Duration _remaining;
  Timer? _timer;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
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
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _respond(String action) async {
    if (_busy) return;
    setState(() => _busy = true);
    try {
      final knownId = widget.offer.requestId.isNotEmpty
          ? widget.offer.requestId
          : widget.offer.request?.id;
      final tripId = await context.read<DispatchController>().respondToOffer(action);
      if (!mounted) return;
      if (action == 'accept') {
        final id = (tripId != null && tripId.isNotEmpty) ? tripId : knownId;
        if (id != null && id.isNotEmpty) {
          context.go('/trip/$id');
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not respond to this offer.'))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final req = widget.offer.request;
    final progress = (_remaining.inSeconds / _window.inSeconds).clamp(0.0, 1.0);
    final urgent = _remaining.inSeconds < 20;
    final dest = (req?.destinationLat != null && req?.destinationLng != null)
        ? LatLng(req!.destinationLat!, req.destinationLng!)
        : null;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.22)),
        boxShadow: AppTheme.softShadow,
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (widget.compactMap && dest != null)
            SizedBox(
              height: 140,
              child: GoogleMap(
                initialCameraPosition: CameraPosition(target: dest, zoom: 14.5),
                markers: {
                  Marker(
                    markerId: const MarkerId('customer'),
                    position: dest,
                    infoWindow: const InfoWindow(title: 'Customer'),
                  ),
                },
                zoomControlsEnabled: false,
                myLocationButtonEnabled: false,
                liteModeEnabled: true,
                mapToolbarEnabled: false,
                scrollGesturesEnabled: false,
                rotateGesturesEnabled: false,
                tiltGesturesEnabled: false,
                zoomGesturesEnabled: false,
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    StatusPill(
                      label: urgent ? 'Respond now' : 'New offer',
                      color: urgent ? AppColors.danger : AppColors.primary,
                    ),
                    const Spacer(),
                    Text(
                      '${_remaining.inSeconds}s',
                      style: AppTheme.host(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: urgent ? AppColors.danger : AppColors.primary,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(99),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 4,
                    backgroundColor: AppColors.borderSoft,
                    color: urgent ? AppColors.danger : AppColors.primary,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  req?.service ?? 'Service request',
                  style: AppTheme.host(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.35,
                    color: AppColors.textPrimary,
                  ),
                ),
                if ((req?.location ?? '').isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.place_outlined, size: 16, color: AppColors.textMuted),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          req!.location,
                          style: AppTheme.host(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                if ((req?.category ?? '').isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(
                    req!.category,
                    style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
                  ),
                ],
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _busy ? null : () => _respond('accept'),
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: _busy
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Accept job'),
                ),
                const SizedBox(height: 10),
                OutlinedButton(
                  onPressed: _busy ? null : () => _respond('decline'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size.fromHeight(48),
                    foregroundColor: AppColors.danger,
                    side: BorderSide(color: AppColors.danger.withValues(alpha: 0.35)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Reject'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
