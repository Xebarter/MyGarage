import '../models/service_request.dart';
import 'api_client.dart';

class DispatchApi {
  DispatchApi(this._client);

  final ApiClient _client;

  Future<DispatchState> getMe(String vendorId) {
    return _client.get(
      '/api/services/dispatch/me',
      query: {'vendorId': vendorId},
      parser: (json) => DispatchState.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> respond({
    required String assignmentId,
    required String vendorId,
    required String action,
  }) {
    return _client.post(
      '/api/services/dispatch/respond',
      body: {
        'assignmentId': assignmentId,
        'vendorId': vendorId,
        'action': action,
      },
      parser: (_) => null,
    );
  }

  Future<void> advanceStage({
    required String requestId,
    required String vendorId,
    required String stage,
    String? vehicleStatus,
    String? notes,
    String? nextServiceDate,
  }) {
    return _client.post(
      '/api/services/dispatch/stage',
      body: {
        'requestId': requestId,
        'vendorId': vendorId,
        'stage': stage,
        if (vehicleStatus != null) 'vehicleStatus': vehicleStatus,
        if (notes != null) 'notes': notes,
        if (nextServiceDate != null) 'nextServiceDate': nextServiceDate,
      },
      parser: (_) => null,
    );
  }

  Future<List<ServiceRequest>> listRequests() {
    return _client.get(
      '/api/vendor/service-requests',
      parser: (json) {
        final list = json as List<dynamic>? ?? [];
        return list
            .whereType<Map<String, dynamic>>()
            .map(ServiceRequest.fromJson)
            .toList();
      },
    );
  }

  Future<ServiceRequest> getRequest(String id, String vendorId) {
    return _client.get(
      '/api/vendor/service-requests/$id',
      query: {'vendorId': vendorId},
      parser: (json) {
        final map = json as Map<String, dynamic>;
        final nested = map['request'];
        if (nested is Map<String, dynamic>) {
          return ServiceRequest.fromJson(nested);
        }
        return ServiceRequest.fromJson(map);
      },
    );
  }

  Future<void> updateLocation({
    required String requestId,
    required String vendorId,
    required double lat,
    required double lng,
  }) {
    return _client.patch(
      '/api/vendor/service-requests',
      body: {
        'id': requestId,
        'vendorId': vendorId,
        'providerLat': lat,
        'providerLng': lng,
      },
      parser: (_) => null,
    );
  }
}
