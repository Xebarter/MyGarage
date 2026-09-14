import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Custom destination pin + vehicle chevron, cached per color.
class PremiumMapMarkers {
  PremiumMapMarkers._();

  static final Map<int, BitmapDescriptor> _pins = {};
  static final Map<int, BitmapDescriptor> _vehicles = {};

  static Future<BitmapDescriptor> destinationPin(Color color) async {
    return _pins[color.hashCode] ??= await _drawPin(color);
  }

  static Future<BitmapDescriptor> vehicle(Color color) async {
    return _vehicles[color.hashCode] ??= await _drawVehicle(color);
  }

  static Future<BitmapDescriptor> _drawPin(Color fill) async {
    const logicalW = 44.0;
    const logicalH = 58.0;
    const dpr = 3.0;
    final w = (logicalW * dpr).toInt();
    final h = (logicalH * dpr).toInt();
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.scale(dpr);

    final path = Path()
      ..moveTo(22, 4)
      ..cubicTo(33.5, 4, 42, 12.2, 42, 22.4)
      ..cubicTo(42, 36.5, 22, 54, 22, 54)
      ..cubicTo(22, 54, 2, 36.5, 2, 22.4)
      ..cubicTo(2, 12.2, 10.5, 4, 22, 4)
      ..close();

    canvas.drawPath(
      path,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.16)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2),
    );
    canvas.drawPath(path, Paint()..color = fill);
    canvas.drawCircle(const Offset(22, 21), 7.2, Paint()..color = Colors.white);

    final picture = recorder.endRecording();
    final image = await picture.toImage(w, h);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(
      bytes!.buffer.asUint8List(),
      imagePixelRatio: dpr,
    );
  }

  static Future<BitmapDescriptor> _drawVehicle(Color fill) async {
    const logical = 40.0;
    const dpr = 3.0;
    final size = (logical * dpr).toInt();
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    canvas.scale(dpr);

    const c = Offset(20, 20);
    canvas.drawCircle(
      c,
      16,
      Paint()
        ..color = Colors.black.withValues(alpha: 0.14)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 1.6),
    );
    canvas.drawCircle(c, 14.5, Paint()..color = Colors.white);
    canvas.drawCircle(c, 12.2, Paint()..color = fill);

    final chevron = Path()
      ..moveTo(20, 10.5)
      ..lineTo(26.5, 23)
      ..lineTo(20, 20)
      ..lineTo(13.5, 23)
      ..close();
    canvas.drawPath(chevron, Paint()..color = Colors.white);

    final picture = recorder.endRecording();
    final image = await picture.toImage(size, size);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    return BitmapDescriptor.bytes(
      bytes!.buffer.asUint8List(),
      imagePixelRatio: dpr,
    );
  }
}

double bearingDegrees(LatLng from, LatLng to) {
  final lat1 = from.latitude * math.pi / 180;
  final lat2 = to.latitude * math.pi / 180;
  final dLng = (to.longitude - from.longitude) * math.pi / 180;
  final y = math.sin(dLng) * math.cos(lat2);
  final x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dLng);
  return (math.atan2(y, x) * 180 / math.pi + 360) % 360;
}

Set<Polyline> premiumRoutePolylines({
  required List<LatLng> points,
  required Color core,
  String id = 'route',
}) {
  if (points.length < 2) return {};
  return {
    Polyline(
      polylineId: PolylineId('$id-case'),
      points: points,
      color: Colors.white,
      width: 10,
      startCap: Cap.roundCap,
      endCap: Cap.roundCap,
      jointType: JointType.round,
      zIndex: 1,
    ),
    Polyline(
      polylineId: PolylineId(id),
      points: points,
      color: core,
      width: 5,
      startCap: Cap.roundCap,
      endCap: Cap.roundCap,
      jointType: JointType.round,
      zIndex: 2,
    ),
  };
}

Set<Circle> premiumSearchCircles({
  required LatLng center,
  required Color color,
}) {
  return {
    Circle(
      circleId: const CircleId('search-outer'),
      center: center,
      radius: 220,
      fillColor: color.withValues(alpha: 0.07),
      strokeColor: color.withValues(alpha: 0.22),
      strokeWidth: 1,
    ),
    Circle(
      circleId: const CircleId('search-inner'),
      center: center,
      radius: 90,
      fillColor: color.withValues(alpha: 0.10),
      strokeColor: color.withValues(alpha: 0.35),
      strokeWidth: 1,
    ),
  };
}
