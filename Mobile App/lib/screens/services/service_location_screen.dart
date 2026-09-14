import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../data/services_catalog.dart';
import '../../maps/premium_google_map.dart';
import '../../providers/auth_controller.dart';
import '../../router/app_router.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class _PlaceSuggestion {
  const _PlaceSuggestion({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.label,
    this.placeId,
    this.lat,
    this.lng,
  });

  final String id;
  final String title;
  final String subtitle;
  final String label;
  final String? placeId;
  final double? lat;
  final double? lng;

  factory _PlaceSuggestion.fromJson(Map<String, dynamic> json) {
    final title = (json['title'] as String?)?.trim() ?? '';
    final subtitle = (json['subtitle'] as String?)?.trim() ?? '';
    final label = (json['label'] as String?)?.trim().isNotEmpty == true
        ? (json['label'] as String).trim()
        : [title, subtitle].where((s) => s.isNotEmpty).join(', ');
    final latRaw = json['lat'];
    final lngRaw = json['lng'];
    return _PlaceSuggestion(
      id: (json['id'] as String?)?.trim().isNotEmpty == true
          ? (json['id'] as String).trim()
          : (json['placeId'] as String?)?.trim() ?? label,
      title: title.isNotEmpty ? title : label,
      subtitle: subtitle,
      label: label,
      placeId: (json['placeId'] as String?)?.trim(),
      lat: latRaw is num ? latRaw.toDouble() : double.tryParse('$latRaw'),
      lng: lngRaw is num ? lngRaw.toDouble() : double.tryParse('$lngRaw'),
    );
  }
}

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
  final _addressFocus = FocusNode();
  final _api = BuyerApi(ApiClient());
  PremiumMapController? _map;

  LatLng _pin = _kampala;
  bool _mapReady = false;
  bool _locating = true;
  bool _busy = false;
  bool _movingMap = false;
  bool _suppressAddressRewrite = false;
  bool _loadingSuggestions = false;
  String? _status;
  String _sessionToken = _newSessionToken();
  List<_PlaceSuggestion> _suggestions = const [];
  Timer? _suggestDebounce;
  int _suggestSeq = 0;

  static String _newSessionToken() {
    final r = math.Random();
    return '${DateTime.now().microsecondsSinceEpoch}-${r.nextInt(1 << 32)}';
  }

  @override
  void initState() {
    super.initState();
    _address.addListener(_onAddressChanged);
    unawaited(_bootstrapLocation());
  }

  @override
  void dispose() {
    _suggestDebounce?.cancel();
    _address.removeListener(_onAddressChanged);
    _address.dispose();
    _notes.dispose();
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
      final next = LatLng(pos.latitude, pos.longitude);
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

  void _onAddressChanged() {
    if (_suppressAddressRewrite) return;
    final q = _address.text.trim();
    _suggestDebounce?.cancel();
    if (q.length < 2 || q.startsWith('Near ')) {
      if (_suggestions.isNotEmpty || _loadingSuggestions) {
        setState(() {
          _suggestions = const [];
          _loadingSuggestions = false;
        });
      }
      return;
    }
    _suggestDebounce = Timer(const Duration(milliseconds: 320), () {
      unawaited(_fetchSuggestions(q));
    });
  }

  Future<void> _fetchSuggestions(String q) async {
    final seq = ++_suggestSeq;
    if (mounted) setState(() => _loadingSuggestions = true);
    try {
      final rows = await _api.geocodeSuggestions(
        q,
        lat: _pin.latitude,
        lng: _pin.longitude,
        sessionToken: _sessionToken,
        limit: 7,
      );
      if (!mounted || seq != _suggestSeq) return;
      final mapped = rows.map(_PlaceSuggestion.fromJson).where((s) => s.label.isNotEmpty).toList();
      setState(() {
        _suggestions = mapped;
        _loadingSuggestions = false;
      });
    } catch (_) {
      if (!mounted || seq != _suggestSeq) return;
      setState(() {
        _suggestions = const [];
        _loadingSuggestions = false;
      });
    }
  }

  Future<void> _selectSuggestion(_PlaceSuggestion suggestion) async {
    HapticFeedback.selectionClick();
    _suggestDebounce?.cancel();
    _suggestSeq++;
    _addressFocus.unfocus();

    setState(() {
      _busy = true;
      _loadingSuggestions = false;
      _suggestions = const [];
      _status = 'Setting pickup…';
      _suppressAddressRewrite = true;
    });

    try {
      double? lat = suggestion.lat;
      double? lng = suggestion.lng;
      var label = suggestion.label;

      final placeId = suggestion.placeId?.trim();
      if ((lat == null || lng == null) && placeId != null && placeId.isNotEmpty) {
        final place = await _api.geocodePlace(placeId, sessionToken: _sessionToken);
        final placeLat = place['lat'];
        final placeLng = place['lng'];
        lat = placeLat is num ? placeLat.toDouble() : double.tryParse('$placeLat');
        lng = placeLng is num ? placeLng.toDouble() : double.tryParse('$placeLng');
        final placeLabel = (place['label'] as String?)?.trim();
        if (placeLabel != null && placeLabel.isNotEmpty) label = placeLabel;
      }

      if (lat == null || lng == null) {
        throw Exception('Could not resolve that place on the map.');
      }

      final next = LatLng(lat, lng);
      if (!mounted) return;
      _address.removeListener(_onAddressChanged);
      _address.text = label;
      _address.addListener(_onAddressChanged);
      setState(() {
        _pin = next;
        _status = 'Pickup set to ${suggestion.title}';
        _sessionToken = _newSessionToken();
      });
      _map?.moveTo(next, zoom: 16.5);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _suppressAddressRewrite = false;
        _status = userFacingError(e, fallback: 'Could not set that place. Try another.');
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(userFacingError(e, fallback: 'Could not set that place.'))),
      );
    } finally {
      if (mounted) setState(() => _busy = false);
    }
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
                color: Color(0x88F2F4F8),
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
                status: _status,
                busy: _busy,
                bottomInset: bottomInset,
                suggestions: _suggestions,
                loadingSuggestions: _loadingSuggestions,
                onConfirm: _submit,
                onSelectSuggestion: _selectSuggestion,
                onAddressEdited: () {
                  if (_suppressAddressRewrite) {
                    setState(() => _suppressAddressRewrite = false);
                  }
                },
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
    required this.status,
    required this.busy,
    required this.bottomInset,
    required this.suggestions,
    required this.loadingSuggestions,
    required this.onConfirm,
    required this.onSelectSuggestion,
    required this.onAddressEdited,
  });

  final String serviceName;
  final TextEditingController address;
  final FocusNode addressFocus;
  final TextEditingController notes;
  final String? status;
  final bool busy;
  final double bottomInset;
  final List<_PlaceSuggestion> suggestions;
  final bool loadingSuggestions;
  final VoidCallback onConfirm;
  final ValueChanged<_PlaceSuggestion> onSelectSuggestion;
  final VoidCallback onAddressEdited;

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
              focusNode: addressFocus,
              onChanged: (_) => onAddressEdited(),
              decoration: InputDecoration(
                labelText: 'Landmark or address',
                hintText: 'Search e.g. Acacia Mall, Kisementi…',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: loadingSuggestions
                    ? const Padding(
                        padding: EdgeInsets.all(14),
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                      )
                    : null,
                filled: true,
                fillColor: AppColors.surfaceMuted,
              ),
              maxLines: 1,
              textInputAction: TextInputAction.search,
            ),
            if (suggestions.isNotEmpty) ...[
              const SizedBox(height: 8),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 220),
                child: Material(
                  color: AppColors.surfaceMuted,
                  borderRadius: BorderRadius.circular(AppRadii.md),
                  child: ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    itemCount: suggestions.length,
                    separatorBuilder: (_, __) => Divider(
                      height: 1,
                      color: AppColors.border.withValues(alpha: 0.8),
                    ),
                    itemBuilder: (context, index) {
                      final s = suggestions[index];
                      return ListTile(
                        dense: true,
                        leading: const Icon(Icons.place_outlined, color: AppColors.primary),
                        title: Text(
                          s.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: AppTheme.host(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
                        subtitle: s.subtitle.isEmpty
                            ? null
                            : Text(
                                s.subtitle,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                              ),
                        onTap: busy ? null : () => onSelectSuggestion(s),
                      );
                    },
                  ),
                ),
              ),
            ],
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
