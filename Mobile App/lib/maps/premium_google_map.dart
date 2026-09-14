import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'premium_map_style.dart';

typedef PremiumMapCreatedCallback = void Function(PremiumMapController controller);

/// Camera handle for [PremiumGoogleMap] (Google Maps SDK).
class PremiumMapController {
  GoogleMapController? _map;
  EdgeInsets _padding = EdgeInsets.zero;

  void _attach(GoogleMapController map, EdgeInsets padding) {
    _map = map;
    _padding = padding;
  }

  void moveTo(LatLng target, {double? zoom}) {
    final map = _map;
    if (map == null) return;
    if (zoom != null) {
      map.animateCamera(CameraUpdate.newLatLngZoom(target, zoom));
    } else {
      map.animateCamera(CameraUpdate.newLatLng(target));
    }
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
    final edgePad = _padding == EdgeInsets.zero
        ? padding
        : [
            padding,
            _padding.left,
            _padding.right,
            _padding.top,
            _padding.bottom,
          ].reduce(math.max);
    map.animateCamera(
      CameraUpdate.newLatLngBounds(
        LatLngBounds(
          southwest: LatLng(south, west),
          northeast: LatLng(north, east),
        ),
        edgePad,
      ),
    );
  }
}

/// Premium styled Google Map with the same marker/polyline API used across trip screens.
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
  final PremiumMapController _handle = PremiumMapController();

  @override
  void didUpdateWidget(covariant PremiumGoogleMap oldWidget) {
    super.didUpdateWidget(oldWidget);
    _handle._padding = widget.padding;
  }

  void _onCreated(GoogleMapController controller) {
    _handle._attach(controller, widget.padding);
    widget.onMapCreated?.call(_handle);
  }

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: widget.initialCameraPosition,
      onMapCreated: _onCreated,
      style: kPremiumMapStyle,
      markers: widget.markers,
      polylines: widget.polylines,
      circles: widget.circles,
      myLocationEnabled: widget.myLocationEnabled,
      myLocationButtonEnabled: false,
      liteModeEnabled: widget.liteModeEnabled,
      padding: widget.padding,
      scrollGesturesEnabled: widget.scrollGesturesEnabled,
      zoomGesturesEnabled: widget.zoomGesturesEnabled,
      rotateGesturesEnabled: widget.rotateGesturesEnabled,
      tiltGesturesEnabled: widget.tiltGesturesEnabled,
      zoomControlsEnabled: false,
      mapToolbarEnabled: false,
      compassEnabled: false,
      indoorViewEnabled: false,
      trafficEnabled: false,
      buildingsEnabled: false,
      onCameraMove: widget.onCameraMove,
      onCameraIdle: widget.onCameraIdle,
      onCameraMoveStarted: widget.onCameraMoveStarted,
    );
  }
}
