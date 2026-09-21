import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Reject missing, out-of-range, and Null Island (0,0) coordinates.
bool isValidLatLng(double? lat, double? lng) {
  if (lat == null || lng == null) return false;
  if (lat.isNaN || lng.isNaN) return false;
  if (lat.abs() > 90 || lng.abs() > 180) return false;
  if (lat.abs() < 0.0001 && lng.abs() < 0.0001) return false;
  return true;
}

LatLng? parseLatLng(double? lat, double? lng) {
  if (!isValidLatLng(lat, lng)) return null;
  return LatLng(lat!, lng!);
}
