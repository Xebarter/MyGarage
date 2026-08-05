import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

import '../api/api_client.dart';
import '../api/dispatch_api.dart';
import '../models/service_request.dart';
import '../services/job_alert_service.dart';
import '../utils/user_facing_error.dart';

class DispatchController extends ChangeNotifier {
  DispatchController({ApiClient? apiClient})
      : _api = DispatchApi(apiClient ?? ApiClient());

  final DispatchApi _api;
  Timer? _pollTimer;
  Timer? _locationTimer;
  String? _vendorId;
  bool _refreshing = false;

  DispatchOffer? offer;
  ServiceRequest? activeJob;
  List<ServiceRequest> history = [];
  bool loading = false;
  /// Soft UI hint only — never raw exceptions / stack traces.
  String? statusHint;
  bool offline = false;
  String? _lastOfferId;


  void start(String vendorId) {
    if (_vendorId == vendorId && _pollTimer != null) {
      // Still force a silent refresh after resume / re-auth.
      unawaited(refresh(silent: true));
      return;
    }
    _vendorId = vendorId;
    unawaited(JobAlertService.instance.ensurePermissions());
    unawaited(refresh());
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 12), (_) => refresh(silent: true));
  }

  void stop() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _stopLocationUpdates();
    unawaited(JobAlertService.instance.stop());
  }

  /// Called when the app returns to the foreground.
  Future<void> onAppResumed() async {
    if (_vendorId == null) return;
    await refresh(silent: true);
  }

  Future<void> refresh({bool silent = false}) async {
    final vendorId = _vendorId;
    if (vendorId == null) return;
    if (_refreshing) return;
    _refreshing = true;

    if (!silent) {
      loading = true;
      statusHint = null;
      notifyListeners();
    }

    try {
      final state = await _api.getMe(vendorId);
      offer = state.offer;
      activeJob = state.activeJob;

      if (offer != null && offer!.assignmentId != _lastOfferId) {
        _lastOfferId = offer!.assignmentId;
        unawaited(JobAlertService.instance.startForOffer(offer!));
      } else if (offer == null && _lastOfferId != null) {
        _lastOfferId = null;
        unawaited(JobAlertService.instance.stop());
      }

      if (activeJob != null) {
        _ensureLocationUpdates();
      } else {
        _stopLocationUpdates();
      }

      try {
        final all = await _api.listRequests();
        history = all.where((r) => r.providerId == vendorId).toList()
          ..sort((a, b) {
            final aT = a.updatedAt ?? a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
            final bT = b.updatedAt ?? b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
            return bT.compareTo(aT);
          });
      } catch (_) {
        // Keep last known history if the secondary list call fails.
      }

      offline = false;
      statusHint = null;
    } catch (e) {
      if (isTransientNetworkError(e)) {
        offline = true;
        statusHint = null; // Jobs UI shows OfflineBanner instead of exception text.
      } else if (!silent) {
        offline = false;
        statusHint = userFacingError(
          e,
          fallback: 'Could not refresh jobs. Pull down to try again.',
        );
      }
      if (kDebugMode) {
        // ignore: avoid_print
        print('Dispatch refresh failed: $e');
      }
    } finally {
      loading = false;
      _refreshing = false;
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
