import 'package:http/http.dart' as http;

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
    String? findings,
    String? recommendations,
    String? partsUsed,
    int? odometerKm,
    List<String>? photoUrls,
    double? laborHours,
    String? attachVehicleId,
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
        if (findings != null) 'findings': findings,
        if (recommendations != null) 'recommendations': recommendations,
        if (partsUsed != null) 'partsUsed': partsUsed,
        if (odometerKm != null) 'odometerKm': odometerKm,
        if (photoUrls != null) 'photoUrls': photoUrls,
        if (laborHours != null) 'laborHours': laborHours,
        if (attachVehicleId != null) 'attachVehicleId': attachVehicleId,
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
        final request = nested is Map<String, dynamic>
            ? ServiceRequest.fromJson(nested)
            : ServiceRequest.fromJson(map);
        final vehicleJson = map['vehicle'];
        if (vehicleJson is Map<String, dynamic>) {
          return ServiceRequest(
            id: request.id,
            customerId: request.customerId,
            category: request.category,
            service: request.service,
            location: request.location,
            status: request.status,
            providerId: request.providerId,
            vehicleId: request.vehicleId,
            buyerContactPhone: request.buyerContactPhone,
            buyerContactName: request.buyerContactName,
            destinationLat: request.destinationLat,
            destinationLng: request.destinationLng,
            providerLat: request.providerLat,
            providerLng: request.providerLng,
            acceptedAt: request.acceptedAt,
            arrivedAt: request.arrivedAt,
            startedAt: request.startedAt,
            completedAt: request.completedAt,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
            garageReport: request.garageReport,
            vehicle: CustomerVehicle.fromJson(vehicleJson),
          );
        }
        return request;
      },
    );
  }

  Future<({List<CustomerVehicle> vehicles, CustomerVehicle? linked})> listCustomerVehicles({
    required String requestId,
    required String vendorId,
  }) {
    return _client.get(
      '/api/vendor/service-requests/$requestId/vehicles',
      query: {'vendorId': vendorId},
      parser: (json) {
        final map = json as Map<String, dynamic>;
        final list = map['vehicles'] as List<dynamic>? ?? [];
        final linked = map['linkedVehicle'];
        return (
          vehicles: list.whereType<Map<String, dynamic>>().map(CustomerVehicle.fromJson).toList(),
          linked: linked is Map<String, dynamic> ? CustomerVehicle.fromJson(linked) : null,
        );
      },
    );
  }

  Future<CustomerVehicle> createCustomerVehicle({
    required String requestId,
    required String vendorId,
    required String make,
    required String model,
    required int year,
    String? licensePlate,
  }) {
    return _client.post(
      '/api/vendor/service-requests/$requestId/vehicles',
      body: {
        'vendorId': vendorId,
        'make': make,
        'model': model,
        'year': year,
        if (licensePlate != null) 'licensePlate': licensePlate,
      },
      parser: (json) {
        final map = json as Map<String, dynamic>;
        final vehicle = map['vehicle'];
        return CustomerVehicle.fromJson(
          vehicle is Map<String, dynamic> ? vehicle : map,
        );
      },
    );
  }

  Future<String> uploadServicePhoto(List<int> bytes, String filename) {
    return _client.postMultipart(
      '/api/uploads/service-photo',
      files: [
        http.MultipartFile.fromBytes('file', bytes, filename: filename),
      ],
      parser: (json) => (json as Map<String, dynamic>)['url']?.toString() ?? '',
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
