import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../api/api_client.dart';
import '../api/vendor_api.dart';
import '../theme/app_theme.dart';

class PlacePick {
  const PlacePick({
    required this.label,
    this.lat,
    this.lng,
    this.placeId,
    this.title,
  });

  final String label;
  final double? lat;
  final double? lng;
  final String? placeId;
  final String? title;
}

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

/// Uber / SafeBoda style address typeahead using the server Places proxy.
class PlaceAutocompleteField extends StatefulWidget {
  const PlaceAutocompleteField({
    super.key,
    required this.controller,
    this.focusNode,
    this.decoration,
    this.maxLines = 1,
    this.enabled = true,
    this.originLat,
    this.originLng,
    this.shouldSearch,
    this.onPlaceSelected,
    this.onChanged,
    this.textInputAction,
  });

  final TextEditingController controller;
  final FocusNode? focusNode;
  final InputDecoration? decoration;
  final int maxLines;
  final bool enabled;
  final double? originLat;
  final double? originLng;
  final bool Function(String query)? shouldSearch;
  final ValueChanged<PlacePick>? onPlaceSelected;
  final ValueChanged<String>? onChanged;
  final TextInputAction? textInputAction;

  @override
  State<PlaceAutocompleteField> createState() => _PlaceAutocompleteFieldState();
}

class _PlaceAutocompleteFieldState extends State<PlaceAutocompleteField> {
  final _api = VendorApi(ApiClient());
  Timer? _debounce;
  int _seq = 0;
  String _sessionToken = _newSessionToken();
  bool _loading = false;
  bool _suppress = false;
  List<_PlaceSuggestion> _suggestions = const [];

  static String _newSessionToken() {
    final r = math.Random();
    // Flutter web treats shifts as 32-bit, so `1 << 32` is 0 and nextInt throws.
    final a = r.nextInt(1 << 30);
    final b = r.nextInt(1 << 30);
    return '${DateTime.now().microsecondsSinceEpoch}-$a$b';
  }

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onText);
  }

  @override
  void didUpdateWidget(covariant PlaceAutocompleteField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_onText);
      widget.controller.addListener(_onText);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onText);
    _debounce?.cancel();
    super.dispose();
  }

  void _onText() {
    if (_suppress) return;
    widget.onChanged?.call(widget.controller.text);
    final q = widget.controller.text.trim();
    _debounce?.cancel();
    final allowed = widget.shouldSearch?.call(q) ?? true;
    if (q.length < 2 || !allowed) {
      if (_suggestions.isNotEmpty || _loading) {
        setState(() {
          _suggestions = const [];
          _loading = false;
        });
      }
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () {
      unawaited(_fetch(q));
    });
  }

  Future<void> _fetch(String q) async {
    final seq = ++_seq;
    if (mounted) setState(() => _loading = true);
    try {
      final rows = await _api.geocodeSuggestions(
        q,
        lat: widget.originLat,
        lng: widget.originLng,
        sessionToken: _sessionToken,
        limit: 7,
      );
      if (!mounted || seq != _seq) return;
      setState(() {
        _suggestions = rows.map(_PlaceSuggestion.fromJson).where((s) => s.label.isNotEmpty).toList();
        _loading = false;
      });
    } catch (_) {
      if (!mounted || seq != _seq) return;
      setState(() {
        _suggestions = const [];
        _loading = false;
      });
    }
  }

  Future<void> _select(_PlaceSuggestion suggestion) async {
    HapticFeedback.selectionClick();
    _debounce?.cancel();
    _seq++;
    widget.focusNode?.unfocus();
    FocusManager.instance.primaryFocus?.unfocus();

    setState(() {
      _loading = true;
      _suggestions = const [];
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

      _suppress = true;
      widget.controller.value = TextEditingValue(
        text: label,
        selection: TextSelection.collapsed(offset: label.length),
      );
      _suppress = false;
      _sessionToken = _newSessionToken();
      widget.onPlaceSelected?.call(
        PlacePick(
          label: label,
          lat: lat,
          lng: lng,
          placeId: suggestion.placeId,
          title: suggestion.title,
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final base = widget.decoration ?? const InputDecoration();
    final decoration = base.copyWith(
      prefixIcon: base.prefixIcon ?? const Icon(Icons.search_rounded),
      suffixIcon: _loading
          ? const Padding(
              padding: EdgeInsets.all(14),
              child: SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          : base.suffixIcon,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: widget.controller,
          focusNode: widget.focusNode,
          enabled: widget.enabled,
          maxLines: widget.maxLines,
          textInputAction: widget.textInputAction ?? TextInputAction.search,
          decoration: decoration,
        ),
        if (_suggestions.isNotEmpty) ...[
          const SizedBox(height: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 220),
            child: Material(
              color: AppColors.surfaceMuted,
              borderRadius: BorderRadius.circular(AppRadii.md),
              child: ListView.separated(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: 4),
                itemCount: _suggestions.length,
                separatorBuilder: (context, index) => Divider(
                  height: 1,
                  color: AppColors.border.withValues(alpha: 0.8),
                ),
                itemBuilder: (context, index) {
                  final s = _suggestions[index];
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
                    onTap: widget.enabled ? () => _select(s) : null,
                  );
                },
              ),
            ),
          ),
        ],
      ],
    );
  }
}
