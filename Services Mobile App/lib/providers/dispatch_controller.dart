import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart';

import '../api/api_client.dart';
import '../api/dispatch_api.dart';
import '../models/service_request.dart';

class DispatchController extends ChangeNotifier {
  DispatchController({ApiClient? apiClient})
      : _api = DispatchApi(apiClient ?? ApiClient());

  final DispatchApi _api;
  Timer? _pollTimer;
  Timer? _locationTimer;
  String? _vendorId;

  DispatchOffer? offer;
  ServiceRequest? activeJob;
  List<ServiceRequest> history = [];
  bool loading = false;
  String? errorMessage;
  String? _lastOfferId;

  void start(String vendorId) {
    if (_vendorId == vendorId && _pollTimer != null) return;
    _vendorId = vendorId;
    refresh();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 12), (_) => refresh(silent: true));
  }

  void stop() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _stopLocationUpdates();
  }

  Future<void> refresh({bool silent = false}) async {
    final vendorId = _vendorId;
    if (vendorId == null) return;
    if (!silent) {
      loading = true;
      notifyListeners();
    }
    try {
      final state = await _api.getMe(vendorId);
      offer = state.offer;
      activeJob = state.activeJob;

      if (offer != null && offer!.assignmentId != _lastOfferId) {
        _lastOfferId = offer!.assignmentId;
        unawaited(HapticFeedback.heavyImpact());
        unawaited(SystemSound.play(SystemSoundType.alert));
      }
      if (offer == null) _lastOfferId = null;

      if (activeJob != null) {
        _ensureLocationUpdates();
      } else {
        _stopLocationUpdates();
      }

      final all = await _api.listRequests();
      history = all.where((r) => r.providerId == vendorId).toList()
        ..sort((a, b) {
          final aT = a.updatedAt ?? a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          final bT = b.updatedAt ?? b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
          return bT.compareTo(aT);
        });

      errorMessage = null;
    } catch (e) {
      errorMessage = e.toString();
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> respondToOffer(String action) async {
    final vendorId = _vendorId;
    final current = offer;
    if (vendorId == null || current == null) return;
    await _api.respond(
      assignmentId: current.assignmentId,
      vendorId: vendorId,
      action: action,
    );
    await refresh();
  }

  Future<void> advanceStage({
    required String stage,
    String? vehicleStatus,
    String? notes,
    String? nextServiceDate,
  }) async {
    final vendorId = _vendorId;
    final job = activeJob;
    if (vendorId == null || job == null) return;
    await _api.advanceStage(
      requestId: job.id,
      vendorId: vendorId,
      stage: stage,
      vehicleStatus: vehicleStatus,
      notes: notes,
      nextServiceDate: nextServiceDate,
    );
    await refresh();
  }

  Future<ServiceRequest?> loadJob(String requestId) async {
    final vendorId = _vendorId;
    if (vendorId == null) return null;
    final job = await _api.getRequest(requestId, vendorId);
    if (job.isActive) activeJob = job;
    notifyListeners();
    return job;
  }

  void _ensureLocationUpdates() {
    if (_locationTimer != null) return;
    _pushLocation();
    _locationTimer = Timer.periodic(const Duration(seconds: 20), (_) => _pushLocation());
  }

  void _stopLocationUpdates() {
    _locationTimer?.cancel();
    _locationTimer = null;
  }

  Future<void> _pushLocation() async {
    final vendorId = _vendorId;
    final job = activeJob;
    if (vendorId == null || job == null) return;
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final asked = await Geolocator.requestPermission();
        if (asked == LocationPermission.denied ||
            asked == LocationPermission.deniedForever) {
          return;
        }
      }
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      await _api.updateLocation(
        requestId: job.id,
        vendorId: vendorId,
        lat: pos.latitude,
        lng: pos.longitude,
      );
    } catch (_) {
      // Location is best-effort while on a job.
    }
  }

  @override
  void dispose() {
    stop();
    super.dispose();
  }
}
