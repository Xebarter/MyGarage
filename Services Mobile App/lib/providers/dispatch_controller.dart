import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../api/api_client.dart';
import '../api/dispatch_api.dart';
import '../auth/session_backup.dart';
import '../config.dart';
import '../models/service_request.dart';
import '../services/dispatch_background.dart';
import '../services/job_alert_service.dart';
import '../services/push_service.dart';
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
  /// While a respond is in flight, ignore this assignment if the poll still returns it.
  String? _suppressOfferId;

  /// Live GPS of the provider device (for map) — may be fresher than server.
  double? liveProviderLat;
  double? liveProviderLng;

  void start(String vendorId) {
    if (_vendorId == vendorId && _pollTimer != null) {
      unawaited(_armBackgroundDuty());
      unawaited(refresh(silent: true));
      return;
    }
    _vendorId = vendorId;
    unawaited(JobAlertService.instance.ensurePermissions());
    unawaited(_armBackgroundDuty());
    unawaited(refresh());
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => refresh(silent: true));
  }

  void stop() {
    _pollTimer?.cancel();
    _pollTimer = null;
    _stopLocationUpdates();
    unawaited(JobAlertService.instance.stop());
    unawaited(DispatchBackground.stop());
    unawaited(PushService.unregister(ApiClient()));
  }

  Future<void> _armBackgroundDuty() async {
    final vendorId = _vendorId;
    if (vendorId == null) return;
    await _persistDutySession(vendorId);
    try {
      await DispatchBackground.start();
    } catch (e) {
      if (kDebugMode) {
        // ignore: avoid_print
        print('Background duty start failed: $e');
      }
    }
    unawaited(PushService.register(ApiClient()));
  }

  Future<void> _persistDutySession(String vendorId) async {
    String? accessToken;
    try {
      accessToken = Supabase.instance.client.auth.currentSession?.accessToken;
    } catch (_) {}
    if (accessToken == null || accessToken.isEmpty) {
      accessToken = await SessionBackup.readAccessToken();
    }
    await DispatchBackground.persistSession(
      vendorId: vendorId,
      apiUrl: AppConfig.apiUrl,
      accessToken: accessToken,
    );
  }

  Future<void> onAppResumed() async {
    if (_vendorId == null) return;
    unawaited(_armBackgroundDuty());
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
      final nextOffer = state.offer;
      if (nextOffer != null &&
          _suppressOfferId != null &&
          nextOffer.assignmentId == _suppressOfferId) {
        offer = null;
      } else {
        offer = nextOffer;
      }
      // Keep optimistic accepted job while respond is in flight.
      if (state.activeJob != null) {
        activeJob = state.activeJob;
      } else if (_suppressOfferId == null) {
        activeJob = null;
      }
      unawaited(_persistDutySession(vendorId));

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

  /// Instantly applies accept/decline locally and returns trip id (accept).
  /// Await [OfferResponseHandle.done] for the server confirmation.
  OfferResponseHandle respondToOfferNow(String action) {
    final vendorId = _vendorId;
    final current = offer;
    if (vendorId == null || current == null) {
      return OfferResponseHandle(
        tripId: null,
        done: Future<void>.value(),
        snapshot: null,
      );
    }

    final requestId = current.requestId.isNotEmpty
        ? current.requestId
        : (current.request?.id ?? '');
    final tripId = action == 'accept' && requestId.isNotEmpty ? requestId : null;

    _applyOfferResponseLocally(
      action: action,
      offer: current,
      vendorId: vendorId,
      requestId: requestId,
    );

    final done = () async {
      try {
        await _api.respond(
          assignmentId: current.assignmentId,
          vendorId: vendorId,
          action: action,
          providerLat: liveProviderLat,
          providerLng: liveProviderLng,
        );
        try {
          await refresh(silent: true);
          if (action == 'accept' && requestId.isNotEmpty) {
            await _hydrateAcceptedJob(requestId);
          }
        } finally {
          _suppressOfferId = null;
        }
      } catch (e) {
        _restoreOffer(current, clearActiveOnAccept: action == 'accept');
        rethrow;
      }
    }();

    return OfferResponseHandle(
      tripId: tripId,
      done: done,
      snapshot: current,
    );
  }

  /// Accept or decline — local UI updates immediately; awaits server confirm.
  /// Prefer [respondToOfferNow] when the caller must navigate before the network.
  Future<String?> respondToOffer(String action) async {
    final handle = respondToOfferNow(action);
    await handle.done;
    return handle.tripId;
  }

  void _applyOfferResponseLocally({
    required String action,
    required DispatchOffer offer,
    required String vendorId,
    required String requestId,
  }) {
    _suppressOfferId = offer.assignmentId;
    this.offer = null;
    _lastOfferId = null;
    unawaited(JobAlertService.instance.stop());

    if (action == 'accept' && requestId.isNotEmpty) {
      activeJob = _seedAcceptedJob(offer, vendorId: vendorId, requestId: requestId);
      liveProviderLat ??= activeJob?.providerLat;
      liveProviderLng ??= activeJob?.providerLng;
      _ensureLocationUpdates();
    }
    notifyListeners();
  }

  void _restoreOffer(DispatchOffer snapshot, {required bool clearActiveOnAccept}) {
    _suppressOfferId = null;
    offer = snapshot;
    _lastOfferId = snapshot.assignmentId;
    if (clearActiveOnAccept) {
      final seededId = snapshot.requestId.isNotEmpty
          ? snapshot.requestId
          : snapshot.request?.id;
      if (activeJob != null &&
          seededId != null &&
          seededId.isNotEmpty &&
          activeJob!.id == seededId) {
        activeJob = null;
        _stopLocationUpdates();
        liveProviderLat = null;
        liveProviderLng = null;
      }
    }
    notifyListeners();
    unawaited(JobAlertService.instance.startForOffer(snapshot));
  }

  ServiceRequest _seedAcceptedJob(
    DispatchOffer offer, {
    required String vendorId,
    required String requestId,
  }) {
    final r = offer.request;
    if (r != null) {
      return ServiceRequest(
        id: r.id.isNotEmpty ? r.id : requestId,
        customerId: r.customerId,
        category: r.category,
        service: r.service,
        location: r.location,
        status: 'matched',
        providerId: vendorId,
        vehicleId: r.vehicleId,
        buyerContactPhone: r.buyerContactPhone,
        buyerContactName: r.buyerContactName,
        destinationLat: r.destinationLat,
        destinationLng: r.destinationLng,
        providerLat: r.providerLat,
        providerLng: r.providerLng,
        acceptedAt: DateTime.now(),
        arrivedAt: r.arrivedAt,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        createdAt: r.createdAt,
        updatedAt: DateTime.now(),
        garageReport: r.garageReport,
        vehicle: r.vehicle,
      );
    }
    return ServiceRequest(
      id: requestId,
      customerId: '',
      category: '',
      service: 'Job',
      location: '',
      status: 'matched',
      providerId: vendorId,
      acceptedAt: DateTime.now(),
    );
  }

  Future<void> _hydrateAcceptedJob(String requestId) async {
    try {
      final job = await loadJob(requestId);
      if (job != null && job.isActive) {
        activeJob = job;
        _ensureLocationUpdates();
        liveProviderLat ??= job.providerLat;
        liveProviderLng ??= job.providerLng;
        notifyListeners();
      }
    } catch (_) {
      // Trip screen can load by id if hydration fails.
    }
  }

  String? get vendorId => _vendorId;

  Future<void> advanceStage({
    required String stage,
    String? vehicleStatus,
    String? notes,
    String? nextServiceDate,
    String? findings,
    String? recommendations,
    String? partsUsed,
    int? odometerKm,
    List<String>? photoUrls,
    double? laborHours,
    String? attachVehicleId,
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
      findings: findings,
      recommendations: recommendations,
      partsUsed: partsUsed,
      odometerKm: odometerKm,
      photoUrls: photoUrls,
      laborHours: laborHours,
      attachVehicleId: attachVehicleId,
    );
    await refresh();
  }

  Future<({List<CustomerVehicle> vehicles, CustomerVehicle? linked})> customerVehicles(String requestId) {
    final vendorId = _vendorId;
    if (vendorId == null) {
      return Future.value((vehicles: <CustomerVehicle>[], linked: null));
    }
    return _api.listCustomerVehicles(requestId: requestId, vendorId: vendorId);
  }

  Future<CustomerVehicle> addCustomerVehicle({
    required String requestId,
    required String make,
    required String model,
    required int year,
    String? licensePlate,
  }) {
    final vendorId = _vendorId;
    if (vendorId == null) {
      throw StateError('Not signed in');
    }
    return _api.createCustomerVehicle(
      requestId: requestId,
      vendorId: vendorId,
      make: make,
      model: model,
      year: year,
      licensePlate: licensePlate,
    );
  }

  Future<String> uploadServicePhoto(List<int> bytes, String filename) {
    return _api.uploadServicePhoto(bytes, filename);
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

/// Result of an optimistic offer response — UI can navigate using [tripId]
/// immediately, then await [done] for server confirmation.
class OfferResponseHandle {
  const OfferResponseHandle({
    required this.tripId,
    required this.done,
    required this.snapshot,
  });

  final String? tripId;
  final Future<void> done;
  final DispatchOffer? snapshot;
}
