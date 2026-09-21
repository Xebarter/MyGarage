import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../auth/phone.dart';
import '../../data/services_catalog.dart';
import '../../maps/premium_google_map.dart';
import '../../maps/map_coords.dart';
import '../../models/models.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';
import '../../utils/active_service_request.dart';
import '../../widgets/place_autocomplete_field.dart';

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
  final _phone = TextEditingController();
  final _addressFocus = FocusNode();
  final _api = BuyerApi(ApiClient());
  PremiumMapController? _map;

  LatLng _pin = _kampala;
  bool _mapReady = false;
  bool _locating = true;
  bool _busy = false;
  bool _movingMap = false;
  bool _suppressAddressRewrite = false;
  String? _status;
  List<Vehicle> _vehicles = const [];
  String? _selectedVehicleId;

  @override
  void initState() {
    super.initState();
    unawaited(_bootstrapLocation());
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _seedContactPhone();
      _loadVehicles();
      _bounceIfOpenRequest();
    });
  }

  void _seedContactPhone() {
    if (!mounted) return;
    if (_phone.text.trim().isNotEmpty) return;
    final phone = context.read<AuthController>().signedInPhone;
    if (phone.isNotEmpty) {
      _phone.text = formatE164Display(phone);
    }
  }

  Future<void> _loadVehicles() async {
    if (!mounted) return;
    final cid = context.read<AuthController>().customerId;
    if (cid == null || cid.isEmpty) return;
    try {
      final list = await _api.listVehicles(customerId: cid);
      if (!mounted) return;
      Vehicle? primary;
      for (final v in list) {
        if (v.isPrimary) {
          primary = v;
          break;
        }
      }
      setState(() {
        _vehicles = list;
        _selectedVehicleId ??= (primary ?? (list.isEmpty ? null : list.first))?.id;
      });
    } catch (_) {
      // Booking still works without a garage vehicle.
    }
  }

  Future<void> _bounceIfOpenRequest() async {
    if (!mounted) return;
    final cid = context.read<AuthController>().customerId;
    if (cid == null || cid.isEmpty) return;
    try {
      final list = await _api.listServiceRequests(cid);
      final open = firstOpenBuyerServiceRequest(list);
      if (!mounted || open == null) return;
      context.go(liveServicePathFor(open));
    } catch (_) {
      // Create still enforces one-at-a-time.
    }
  }

  @override
  void dispose() {
    _address.dispose();
    _notes.dispose();
    _phone.dispose();
    _addressFocus.dispose();
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
      final next = parseLatLng(pos.latitude, pos.longitude);
      if (next == null) return;
      if (!mounted) return;
      setState(() {
        _pin = next;
        _status = 'Pin set to your location';
        _suppressAddressRewrite = false;
        if (_address.text.trim().isEmpty) {
          _address.text =
              'Near ${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
        }
      });
      _map?.moveTo(next, zoom: 16);
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
      if (_suppressAddressRewrite) {
        _status = 'Service location pinned';
        return;
      }
      if (_address.text.trim().isEmpty ||
          _address.text.startsWith('Near ') ||
          RegExp(r'^-?\d+\.\d+,\s*-?\d+\.\d+$').hasMatch(_address.text.trim())) {
        _address.text =
            'Near ${_pin.latitude.toStringAsFixed(5)}, ${_pin.longitude.toStringAsFixed(5)}';
      }
      _status = 'Service location pinned';
    });
  }

  Future<void> _applyPlace(PlacePick pick) async {
    final lat = pick.lat;
    final lng = pick.lng;
    if (lat == null || lng == null) {
      setState(() {
        _suppressAddressRewrite = false;
        _status = 'Could not set that place. Try another.';
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not set that place.')),
      );
      return;
    }

    final next = LatLng(lat, lng);
    setState(() {
      _pin = next;
      _status = 'Pickup set to ${pick.title ?? pick.label}';
      _suppressAddressRewrite = true;
    });
    _map?.moveTo(next, zoom: 16.5);
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
    _seedContactPhone();
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

    final contactPhone = normalizeToE164(_phone.text) ?? _phone.text.trim();
    if (digitsOnly(contactPhone).length < 9) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Add a mobile number so the provider can reach you.')),
      );
      return;
    }

    setState(() => _busy = true);
    try {
      final catalog = categoryById(widget.categoryId);
      final request = await _api.createServiceRequest({
        'customerId': cid,
        'service': widget.serviceName,
        'category': catalog?.title ?? widget.categoryId,
        'categoryId': widget.categoryId,
        'location': locationLabel,
        'notes': _notes.text.trim(),
        'destinationLat': _pin.latitude,
        'destinationLng': _pin.longitude,
        'buyerContactPhone': contactPhone,
        if (auth.displayName.isNotEmpty) 'buyerContactName': auth.displayName,
        if (_selectedVehicleId != null && _selectedVehicleId!.isNotEmpty) 'vehicleId': _selectedVehicleId,
      });
      if (!mounted) return;
      context.go('/service/requesting?requestId=${Uri.encodeComponent(request.id)}');
    } catch (e) {
      if (!mounted) return;
      if (redirectIfActiveRequestExists(context, e)) return;
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
    final keyboard = MediaQuery.viewInsetsOf(context).bottom;

    return Scaffold(
      backgroundColor: AppColors.background,
      resizeToAvoidBottomInset: true,
      body: Stack(
        children: [
          Positioned.fill(
            child: PremiumGoogleMap(
              initialCameraPosition: CameraPosition(target: _pin, zoom: 15),
              myLocationEnabled: true,
              padding: EdgeInsets.only(
                top: 88,
                bottom: 300 + bottomInset,
                left: 12,
                right: 12,
              ),
              onMapCreated: (c) {
                _map = c;
                setState(() => _mapReady = true);
                if (!_locating) {
                  c.moveTo(_pin, zoom: 16);
                }
              },
              onCameraMove: _onCameraMove,
              onCameraIdle: _onCameraIdle,
            ),
          ),
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
                color: Color(0x88FFF6EA),
                child: Center(child: CircularProgressIndicator()),
              ),
            ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Padding(
              padding: EdgeInsets.only(bottom: keyboard > 0 ? keyboard * 0.15 : 0),
              child: _ConfirmSheet(
                serviceName: widget.serviceName,
                address: _address,
                addressFocus: _addressFocus,
                notes: _notes,
                phone: _phone,
                status: _status,
                busy: _busy,
                bottomInset: bottomInset,
                originLat: _pin.latitude,
                originLng: _pin.longitude,
                onConfirm: _submit,
                onSelectPlace: _applyPlace,
                onAddressEdited: () {
                  if (_suppressAddressRewrite) {
                    setState(() => _suppressAddressRewrite = false);
                  }
                },
                vehicles: _vehicles,
                selectedVehicleId: _selectedVehicleId,
                onSelectVehicle: (id) => setState(() => _selectedVehicleId = id),
              ),
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
    required this.addressFocus,
    required this.notes,
    required this.phone,
    required this.status,
    required this.busy,
    required this.bottomInset,
    required this.originLat,
    required this.originLng,
    required this.onConfirm,
    required this.onSelectPlace,
    required this.onAddressEdited,
    required this.vehicles,
    required this.selectedVehicleId,
    required this.onSelectVehicle,
  });

  final String serviceName;
  final TextEditingController address;
  final FocusNode addressFocus;
  final TextEditingController notes;
  final TextEditingController phone;
  final String? status;
  final bool busy;
  final double bottomInset;
  final double originLat;
  final double originLng;
  final VoidCallback onConfirm;
  final ValueChanged<PlacePick> onSelectPlace;
  final VoidCallback onAddressEdited;
  final List<Vehicle> vehicles;
  final String? selectedVehicleId;
  final ValueChanged<String> onSelectVehicle;

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
            PlaceAutocompleteField(
              controller: address,
              focusNode: addressFocus,
              enabled: !busy,
              originLat: originLat,
              originLng: originLng,
              shouldSearch: (q) => !q.startsWith('Near '),
              onChanged: (_) => onAddressEdited(),
              onPlaceSelected: onSelectPlace,
              decoration: const InputDecoration(
                labelText: 'Landmark or address',
                hintText: 'Search e.g. Acacia Mall, Kisementi…',
                prefixIcon: Icon(Icons.search_rounded),
                filled: true,
                fillColor: AppColors.surfaceMuted,
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: phone,
              enabled: !busy,
              keyboardType: TextInputType.phone,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Mobile number',
                prefixIcon: Icon(Icons.phone_outlined),
                filled: true,
                fillColor: AppColors.surfaceMuted,
              ),
            ),
            const SizedBox(height: 10),
            if (vehicles.isNotEmpty) ...[
              Text('Vehicle', style: AppTheme.host(fontSize: 13, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final v in vehicles)
                    ChoiceChip(
                      label: Text(v.label),
                      selected: selectedVehicleId == v.id,
                      onSelected: busy ? null : (_) => onSelectVehicle(v.id),
                    ),
                ],
              ),
              const SizedBox(height: 10),
            ],
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
