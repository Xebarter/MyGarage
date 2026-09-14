import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart' as fm;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:latlong2/latlong.dart' as ll;

import '../theme/app_theme.dart';

typedef PremiumMapCreatedCallback = void Function(PremiumMapController controller);

/// Camera handle for OSM-backed [PremiumGoogleMap] (Google Maps JS key is expired).
class PremiumMapController {
  fm.MapController? _map;
  double _zoom = 14.5;
  EdgeInsets _padding = EdgeInsets.zero;

  void _attach(fm.MapController map, double zoom, EdgeInsets padding) {
    _map = map;
    _zoom = zoom;
    _padding = padding;
  }

  void moveTo(LatLng target, {double? zoom}) {
    final z = zoom ?? _map?.camera.zoom ?? _zoom;
    _zoom = z;
    _map?.move(ll.LatLng(target.latitude, target.longitude), z);
  }

  void fitPoints(LatLng a, LatLng b, {double padding = 80}) {
    final map = _map;
    if (map == null) return;
    final south = math.min(a.latitude, b.latitude);
    final west = math.min(a.longitude, b.longitude);
    final north = math.max(a.latitude, b.latitude);
    final east = math.max(a.longitude, b.longitude);
    if ((north - south).abs() < 0.0001 && (east - west).abs() < 0.0001) {
      moveTo(a, zoom: 15);
      return;
    }
    final pad = _padding == EdgeInsets.zero
        ? EdgeInsets.all(padding)
        : _padding;
    map.fitCamera(
      fm.CameraFit.bounds(
        bounds: ll.LatLngBounds(
          ll.LatLng(south, west),
          ll.LatLng(north, east),
        ),
        padding: pad,
        maxZoom: 16,
      ),
    );
  }
}

/// Muted Carto/OSM trip map. Same marker/polyline API as the old Google widget.
class PremiumGoogleMap extends StatefulWidget {
  const PremiumGoogleMap({
    super.key,
    required this.initialCameraPosition,
    this.onMapCreated,
    this.markers = const {},
    this.polylines = const {},
    this.circles = const {},
    this.myLocationEnabled = false,
    this.liteModeEnabled = false,
    this.padding = EdgeInsets.zero,
    this.scrollGesturesEnabled = true,
    this.zoomGesturesEnabled = true,
    this.rotateGesturesEnabled = true,
    this.tiltGesturesEnabled = true,
    this.onCameraMove,
    this.onCameraIdle,
    this.onCameraMoveStarted,
  });

  final CameraPosition initialCameraPosition;
  final PremiumMapCreatedCallback? onMapCreated;
  final Set<Marker> markers;
  final Set<Polyline> polylines;
  final Set<Circle> circles;
  final bool myLocationEnabled;
  final bool liteModeEnabled;
  final EdgeInsets padding;
  final bool scrollGesturesEnabled;
  final bool zoomGesturesEnabled;
  final bool rotateGesturesEnabled;
  final bool tiltGesturesEnabled;
  final CameraPositionCallback? onCameraMove;
  final VoidCallback? onCameraIdle;
  final VoidCallback? onCameraMoveStarted;

  @override
  State<PremiumGoogleMap> createState() => _PremiumGoogleMapState();
}

class _PremiumGoogleMapState extends State<PremiumGoogleMap> {
  final fm.MapController _map = fm.MapController();
  final PremiumMapController _handle = PremiumMapController();
  Timer? _idle;
  bool _notifiedCreated = false;

  @override
  void initState() {
    super.initState();
    _handle._attach(
      _map,
      widget.initialCameraPosition.zoom,
      widget.padding,
    );
  }

  @override
  void didUpdateWidget(covariant PremiumGoogleMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    _handle._padding = widget.padding;
  }

  @override
  void dispose() {
    _idle?.cancel();
    super.dispose();
  }

  int get _flags {
    if (widget.liteModeEnabled) return fm.InteractiveFlag.none;
    var flags = fm.InteractiveFlag.none;
    if (widget.scrollGesturesEnabled) {
      flags |= fm.InteractiveFlag.drag | fm.InteractiveFlag.flingAnimation;
    }
    if (widget.zoomGesturesEnabled) {
      flags |= fm.InteractiveFlag.pinchZoom |
          fm.InteractiveFlag.doubleTapZoom |
          fm.InteractiveFlag.scrollWheelZoom;
    }
    if (widget.rotateGesturesEnabled) {
      flags |= fm.InteractiveFlag.rotate;
    }
    return flags;
  }

  void _onPositionChanged(fm.MapCamera camera, bool hasGesture) {
    widget.onCameraMove?.call(
      CameraPosition(
        target: LatLng(camera.center.latitude, camera.center.longitude),
        zoom: camera.zoom,
      ),
    );
    if (hasGesture) widget.onCameraMoveStarted?.call();
    _idle?.cancel();
    _idle = Timer(const Duration(milliseconds: 180), () {
      widget.onCameraIdle?.call();
    });
  }

  @override
  Widget build(BuildContext context) {
    final start = widget.initialCameraPosition.target;
    return Stack(
      children: [
        fm.FlutterMap(
          mapController: _map,
          options: fm.MapOptions(
            initialCenter: ll.LatLng(start.latitude, start.longitude),
            initialZoom: widget.initialCameraPosition.zoom,
            minZoom: 4,
            maxZoom: 19,
            backgroundColor: const Color(0xFFF3F5F8),
            interactionOptions: fm.InteractionOptions(flags: _flags),
            onMapReady: () {
              if (_notifiedCreated) return;
              _notifiedCreated = true;
              widget.onMapCreated?.call(_handle);
            },
            onPositionChanged: _onPositionChanged,
          ),
          children: [
            fm.TileLayer(
              urlTemplate:
                  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
              subdomains: const ['a', 'b', 'c', 'd'],
              userAgentPackageName: 'ug.mygarage.services',
            ),
            if (widget.circles.isNotEmpty)
              fm.CircleLayer(
                circles: [
                  for (final c in widget.circles)
                    fm.CircleMarker(
                      point: ll.LatLng(c.center.latitude, c.center.longitude),
                      radius: c.radius,
                      useRadiusInMeter: true,
                      color: c.fillColor,
                      borderColor: c.strokeColor,
                      borderStrokeWidth: c.strokeWidth.toDouble(),
                    ),
                ],
              ),
            if (widget.polylines.isNotEmpty)
              fm.PolylineLayer(
                polylines: [
                  for (final line in widget.polylines)
                    fm.Polyline(
                      points: [
                        for (final p in line.points)
                          ll.LatLng(p.latitude, p.longitude),
                      ],
                      color: line.color,
                      strokeWidth: line.width.toDouble(),
                    ),
                ],
              ),
            fm.MarkerLayer(
              markers: [
                for (final m in widget.markers) _osmMarker(m),
              ],
            ),
          ],
        ),
        const Positioned(
          left: 10,
          bottom: 8,
          child: IgnorePointer(
            child: Text(
              '© OpenStreetMap · CARTO',
              style: TextStyle(
                fontSize: 9,
                color: Color(0x99000000),
                height: 1,
              ),
            ),
          ),
        ),
      ],
    );
  }

  fm.Marker _osmMarker(Marker m) {
    final vehicle = m.markerId.value == 'provider';
    return fm.Marker(
      point: ll.LatLng(m.position.latitude, m.position.longitude),
      width: vehicle ? 44 : 44,
      height: vehicle ? 44 : 56,
      alignment: vehicle ? Alignment.center : Alignment.bottomCenter,
      child: vehicle
          ? Transform.rotate(
              angle: m.rotation * math.pi / 180,
              child: const _VehicleMark(),
            )
          : const _PinMark(),
    );
  }
}

class _PinMark extends StatelessWidget {
  const _PinMark();

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: AppColors.ink,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 3),
            boxShadow: const [
              BoxShadow(color: Color(0x33000000), blurRadius: 8, offset: Offset(0, 3)),
            ],
          ),
          child: const Center(
            child: CircleAvatar(radius: 5, backgroundColor: Colors.white),
          ),
        ),
        Container(width: 3, height: 10, color: AppColors.ink),
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: AppColors.ink,
            shape: BoxShape.circle,
            border: Border.all(color: Colors.white, width: 1.5),
          ),
        ),
      ],
    );
  }
}

class _VehicleMark extends StatelessWidget {
  const _VehicleMark();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: AppColors.primary,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
        boxShadow: const [
          BoxShadow(color: Color(0x33000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: const Icon(Icons.navigation_rounded, color: Colors.white, size: 18),
    );
  }
}
