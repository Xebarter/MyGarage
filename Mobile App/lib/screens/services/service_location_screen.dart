import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

/// Uber / SafeBoda style location picker: full-bleed map, center pin, bottom sheet CTA.
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
  static const _kampala = LatLng(0.3476, 32.5825);

  final _address = TextEditingController();
  final _notes = TextEditingController();
  final _api = BuyerApi(ApiClient());
  GoogleMapController? _map;

  LatLng _pin = _kampala;
  bool _mapReady = false;
  bool _locating = true;
  bool _busy = false;
  bool _movingMap = false;
  String? _status;

  @override
  void initState() {
    super.initState();
    unawaited(_bootstrapLocation());
  }

  @override
  void dispose() {
    _address.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _bootstrapLocation() async {
    try {
      await _acquireGps(silent: true);
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _acquireGps({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _status = 'Getting your location…';
        _busy = true;
      });
    }
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw Exception('Location permission is required.');
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      final next = LatLng(pos.latitude, pos.longitude);
      if (!mounted) return;
      setState(() {
        _pin = next;
        _status = 'Pin set to your location';
        if (_address.text.trim().isEmpty) {
          _address.text =
              'Near ${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
        }
      });
      await _map?.animateCamera(CameraUpdate.newLatLngZoom(next, 16));
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _status = userFacingError(e, fallback: 'Could not get location. Move the map to pin.');
      });
    } finally {
      if (mounted && !silent) setState(() => _busy = false);
    }
  }

  void _onCameraMove(CameraPosition pos) {
    _pin = pos.target;
    if (!_movingMap) setState(() => _movingMap = true);
  }

  void _onCameraIdle() {
    setState(() {
      _movingMap = false;
      if (_address.text.trim().isEmpty ||
          _address.text.startsWith('Near ') ||
          RegExp(r'^-?\d+\.\d+,\s*-?\d+\.\d+$').hasMatch(_address.text.trim())) {
        _address.text =
            'Near ${_pin.latitude.toStringAsFixed(5)}, ${_pin.longitude.toStringAsFixed(5)}';
      }
      _status = 'Service location pinned';
    });
  }

  Future<void> _submit() async {
    HapticFeedback.mediumImpact();
    final ok = await ensureSignedIn(context);
    if (!ok || !mounted) return;

    final auth = context.read<AuthController>();
    if (auth.customerId == null || auth.customerId!.isEmpty) {
      await auth.refreshProfile();
    }
    if (!mounted) return;
    final cid = auth.customerId;
    if (cid == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not load buyer profile.')),
      );
      return;
    }

    final locationLabel = _address.text.trim().isEmpty
        ? '${_pin.latitude.toStringAsFixed(5)}, ${_pin.longitude.toStringAsFixed(5)}'
        : _address.text.trim();

    setState(() => _busy = true);
    try {
      final request = await _api.createServiceRequest({
        'customerId': cid,
        'service': widget.serviceName,
        'categoryId': widget.categoryId,
        'location': locationLabel,
        'notes': _notes.text.trim(),
        'destinationLat': _pin.latitude,
        'destinationLng': _pin.longitude,
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
    final bottomInset = MediaQuery.paddingOf(context).bottom;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          Positioned.fill(
            child: GoogleMap(
              initialCameraPosition: CameraPosition(target: _pin, zoom: 15),
              myLocationEnabled: true,
              myLocationButtonEnabled: false,
              compassEnabled: false,
              mapToolbarEnabled: false,
              zoomControlsEnabled: false,
              onMapCreated: (c) {
                _map = c;
                setState(() => _mapReady = true);
                if (!_locating) {
                  c.animateCamera(CameraUpdate.newLatLngZoom(_pin, 16));
                }
              },
              onCameraMove: _onCameraMove,
              onCameraIdle: _onCameraIdle,
            ),
          ),
          // Fixed center pick pin
          IgnorePointer(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 28),
                child: AnimatedScale(
                  scale: _movingMap ? 1.12 : 1,
                  duration: const Duration(milliseconds: 120),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.primary,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(alpha: 0.35),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: const Icon(Icons.handyman_rounded, color: Colors.white, size: 22),
                      ),
                      CustomPaint(
                        size: const Size(14, 10),
                        painter: _PinTipPainter(color: AppColors.primary),
                      ),
                      AnimatedOpacity(
                        opacity: _movingMap ? 0.35 : 0.7,
                        duration: const Duration(milliseconds: 120),
                        child: Container(
                          width: 10,
                          height: 4,
                          decoration: BoxDecoration(
                            color: AppColors.ink.withValues(alpha: 0.35),
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 0),
              child: Row(
                children: [
                  _RoundMapBtn(
                    icon: Icons.arrow_back_rounded,
                    onTap: () => context.pop(),
                  ),
                  const Spacer(),
                  _RoundMapBtn(
                    icon: Icons.my_location_rounded,
                    onTap: _busy ? null : () => _acquireGps(),
                    tint: AppColors.primary,
                  ),
                ],
              ),
            ),
          ),
          if (_locating && !_mapReady)
            const Positioned.fill(
              child: ColoredBox(
                color: Color(0x88F2F4F8),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          Align(
            alignment: Alignment.bottomCenter,
            child: _ConfirmSheet(
              serviceName: widget.serviceName,
              address: _address,
              notes: _notes,
              status: _status,
              busy: _busy,
              bottomInset: bottomInset,
              onConfirm: _submit,
            ),
          ),
        ],
      ),
    );
  }
}

class _ConfirmSheet extends StatelessWidget {
  const _ConfirmSheet({
    required this.serviceName,
    required this.address,
    required this.notes,
    required this.status,
    required this.busy,
    required this.bottomInset,
    required this.onConfirm,
  });

  final String serviceName;
  final TextEditingController address;
  final TextEditingController notes;
  final String? status;
  final bool busy;
  final double bottomInset;
  final VoidCallback onConfirm;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        width: double.infinity,
        margin: EdgeInsets.fromLTRB(12, 0, 12, 12 + bottomInset),
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
            Text(
              'Where should we meet you?',
              style: AppTheme.host(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              serviceName,
              style: AppTheme.host(fontSize: 13.5, color: AppColors.primary, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: address,
              decoration: InputDecoration(
                labelText: 'Landmark or address',
                hintText: 'e.g. Kisementi parking, opposite Café',
                prefixIcon: const Icon(Icons.place_outlined),
                filled: true,
                fillColor: AppColors.surfaceMuted,
              ),
              maxLines: 2,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 10),
            TextField(
              controller: notes,
              decoration: InputDecoration(
                labelText: 'Notes for provider (optional)',
                prefixIcon: const Icon(Icons.notes_outlined),
                filled: true,
                fillColor: AppColors.surfaceMuted,
              ),
              maxLines: 2,
            ),
            if (status != null) ...[
              const SizedBox(height: 8),
              Text(
                status!,
                style: AppTheme.host(fontSize: 12.5, color: AppColors.textMuted),
              ),
            ],
            const SizedBox(height: 16),
            SizedBox(
              height: 54,
              child: ElevatedButton(
                onPressed: busy ? null : onConfirm,
                style: ElevatedButton.styleFrom(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                ),
                child: busy
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white),
                      )
                    : Text(
                        'Confirm pickup & request',
                        style: AppTheme.host(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RoundMapBtn extends StatelessWidget {
  const _RoundMapBtn({required this.icon, this.onTap, this.tint});

  final IconData icon;
  final VoidCallback? onTap;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: const CircleBorder(),
      elevation: 3,
      shadowColor: AppColors.ink.withValues(alpha: 0.18),
      child: IconButton(
        onPressed: onTap,
        icon: Icon(icon, color: tint ?? AppColors.textPrimary),
      ),
    );
  }
}

class _PinTipPainter extends CustomPainter {
  _PinTipPainter({required this.color});
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final path = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width / 2, size.height)
      ..lineTo(size.width, 0)
      ..close();
    canvas.drawPath(path, Paint()..color = color);
  }

  @override
  bool shouldRepaint(covariant _PinTipPainter oldDelegate) => oldDelegate.color != color;
}
