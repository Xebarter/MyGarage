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
  StreamSubscription<Position>? _locationSub;
  Timer? _locationThrottle;
  String? _vendorId;
  bool _refreshing = false;
  DateTime? _lastLocationPush;

  DispatchOffer? offer;
  ServiceRequest? activeJob;
  List<ServiceRequest> history = [];
  bool loading = false;
  /// Soft UI hint only — never raw exceptions / stack traces.
  String? statusHint;
  bool offline = false;
  String? _lastOfferId;

  /// Live GPS of the provider device (for map) — may be fresher than server.
  double? liveProviderLat;
  double? liveProviderLng;

  void start(String vendorId) {
    if (_vendorId == vendorId && _pollTimer != null) {
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
        liveProviderLat = null;
        liveProviderLng = null;
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
        statusHint = null;
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

  /// Accept or decline the current offer.
  /// Returns the request id when [action] is accept (for trip navigation).
  Future<String?> respondToOffer(String action) async {
    final vendorId = _vendorId;
    final current = offer;
    if (vendorId == null || current == null) return null;

    final requestId = current.requestId.isNotEmpty
        ? current.requestId
        : (current.request?.id ?? '');

    await _api.respond(
      assignmentId: current.assignmentId,
      vendorId: vendorId,
      action: action,
    );

    // Always refresh after respond — wait out any in-flight poll first.
    await _awaitRefreshIdle();
    await refresh(silent: true);

    if (action != 'accept' || requestId.isEmpty) return null;

    // Ensure we have an active job for the trip screen (poll race / lag).
    if (activeJob == null || activeJob!.id != requestId) {
      try {
        final job = await loadJob(requestId);
        if (job != null && job.isActive) {
          activeJob = job;
          _ensureLocationUpdates();
          notifyListeners();
        }
      } catch (_) {
        // Still navigate — trip screen will load by id.
      }
    } else {
      _ensureLocationUpdates();
    }

    // Optimistic seed so the map has a marker while GPS starts.
    liveProviderLat ??= activeJob?.providerLat;
    liveProviderLng ??= activeJob?.providerLng;

    return requestId;
  }

  Future<void> _awaitRefreshIdle() async {
    var spins = 0;
    while (_refreshing && spins < 40) {
      await Future<void>.delayed(const Duration(milliseconds: 50));
      spins++;
    }
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

  /// Start / restart GPS stream for an active trip (trip screen entry).
  void ensureLiveTrackingForJob(ServiceRequest job) {
    if (job.isActive) {
      if (activeJob == null || activeJob!.id != job.id) {
        activeJob = job;
      }
      // Restart stream if it was stopped, or if we need a fix immediately.
      if (_locationSub == null) {
        _ensureLocationUpdates();
      } else {
        unawaited(_pushOnce());
      }
      notifyListeners();
    }
  }

  void _ensureLocationUpdates() {
    if (_locationSub != null) return;
    unawaited(_startLocationStream());
  }

  Future<void> _startLocationStream() async {
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        final asked = await Geolocator.requestPermission();
        if (asked == LocationPermission.denied ||
            asked == LocationPermission.deniedForever) {
          return;
        }
      }
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) return;

      _locationSub = Geolocator.getPositionStream(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 12,
        ),
      ).listen((pos) {
        liveProviderLat = pos.latitude;
        liveProviderLng = pos.longitude;
        notifyListeners();
        _throttledPush(pos);
      }, onError: (_) {});
      // Immediate fix
      unawaited(_pushOnce());
    } catch (_) {}
  }

  void _throttledPush(Position pos) {
    final now = DateTime.now();
    if (_lastLocationPush != null &&
        now.difference(_lastLocationPush!) < const Duration(seconds: 4)) {
      return;
    }
    _lastLocationPush = now;
    unawaited(_sendLocation(pos.latitude, pos.longitude));
  }

  Future<void> _pushOnce() async {
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high),
      );
      liveProviderLat = pos.latitude;
      liveProviderLng = pos.longitude;
      notifyListeners();
      await _sendLocation(pos.latitude, pos.longitude);
    } catch (_) {}
  }

  void _stopLocationUpdates() {
    _locationSub?.cancel();
    _locationSub = null;
    _locationThrottle?.cancel();
    _locationThrottle = null;
  }

  Future<void> _sendLocation(double lat, double lng) async {
    final vendorId = _vendorId;
    final job = activeJob;
    if (vendorId == null || job == null) return;
    try {
      await _api.updateLocation(
        requestId: job.id,
        vendorId: vendorId,
        lat: lat,
        lng: lng,
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
