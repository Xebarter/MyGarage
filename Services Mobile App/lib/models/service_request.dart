class ServiceRequest {
  ServiceRequest({
    required this.id,
    required this.customerId,
    required this.category,
    required this.service,
    required this.location,
    required this.status,
    this.providerId,
    this.vehicleId,
    this.buyerContactPhone = '',
    this.buyerContactName = '',
    this.destinationLat,
    this.destinationLng,
    this.providerLat,
    this.providerLng,
    this.acceptedAt,
    this.arrivedAt,
    this.startedAt,
    this.completedAt,
    this.createdAt,
    this.updatedAt,
  });

  final String id;
  final String customerId;
  final String category;
  final String service;
  final String location;
  final String status;
  final String? providerId;
  final String? vehicleId;
  final String buyerContactPhone;
  final String buyerContactName;
  final double? destinationLat;
  final double? destinationLng;
  final double? providerLat;
  final double? providerLng;
  final DateTime? acceptedAt;
  final DateTime? arrivedAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  bool get isActive => status == 'matched' || status == 'in_progress';

  String get nextStage {
    if (arrivedAt == null) return 'arrived';
    if (startedAt == null) return 'started';
    return 'completed';
  }

  String get stageLabel {
    switch (nextStage) {
      case 'arrived':
        return 'Mark arrived';
      case 'started':
        return 'Start service';
      default:
        return 'Complete job';
    }
  }

  static dynamic _pick(Map<String, dynamic> json, String camel, String snake) {
    return json[camel] ?? json[snake];
  }

  factory ServiceRequest.fromJson(Map<String, dynamic> json) {
    DateTime? parseDate(dynamic v) {
      if (v == null) return null;
      return DateTime.tryParse(v.toString());
    }

    double? parseDouble(dynamic v) {
      if (v == null) return null;
      return double.tryParse(v.toString());
    }

    return ServiceRequest(
      id: json['id']?.toString() ?? '',
      customerId: _pick(json, 'customerId', 'customer_id')?.toString() ?? '',
      category: json['category']?.toString() ?? '',
      service: json['service']?.toString() ?? '',
      location: json['location']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      providerId: _pick(json, 'providerId', 'provider_id')?.toString(),
      vehicleId: _pick(json, 'vehicleId', 'vehicle_id')?.toString(),
      buyerContactPhone: _pick(json, 'buyerContactPhone', 'buyer_contact_phone')?.toString() ?? '',
      buyerContactName: _pick(json, 'buyerContactName', 'buyer_contact_name')?.toString() ?? '',
      destinationLat: parseDouble(_pick(json, 'destinationLat', 'destination_lat')),
      destinationLng: parseDouble(_pick(json, 'destinationLng', 'destination_lng')),
      providerLat: parseDouble(_pick(json, 'providerLat', 'provider_lat')),
      providerLng: parseDouble(_pick(json, 'providerLng', 'provider_lng')),
      acceptedAt: parseDate(_pick(json, 'acceptedAt', 'accepted_at')),
      arrivedAt: parseDate(_pick(json, 'arrivedAt', 'arrived_at')),
      startedAt: parseDate(_pick(json, 'startedAt', 'started_at')),
      completedAt: parseDate(_pick(json, 'completedAt', 'completed_at')),
      createdAt: parseDate(_pick(json, 'createdAt', 'created_at')),
      updatedAt: parseDate(_pick(json, 'updatedAt', 'updated_at')),
    );
  }
}

class DispatchOffer {
  DispatchOffer({
    required this.assignmentId,
    required this.requestId,
    required this.providerId,
    this.assignedAt,
    this.request,
  });

  final String assignmentId;
  final String requestId;
  final String providerId;
  final DateTime? assignedAt;
  final ServiceRequest? request;

  factory DispatchOffer.fromJson(Map<String, dynamic> json) {
    final assignment = (json['assignment'] as Map<String, dynamic>?) ?? json;
    final requestJson = json['request'] as Map<String, dynamic>?;
    final assignedRaw = assignment['assignedAt'] ?? assignment['assigned_at'];
    return DispatchOffer(
      assignmentId: (assignment['id'] ?? '').toString(),
      requestId: (assignment['requestId'] ?? assignment['request_id'] ?? '').toString(),
      providerId: (assignment['providerId'] ?? assignment['provider_id'] ?? '').toString(),
      assignedAt: assignedRaw != null ? DateTime.tryParse(assignedRaw.toString()) : null,
      request: requestJson == null ? null : ServiceRequest.fromJson(requestJson),
    );
  }
}

class DispatchState {
  DispatchState({this.offer, this.activeJob});

  final DispatchOffer? offer;
  final ServiceRequest? activeJob;

  factory DispatchState.fromJson(Map<String, dynamic> json) {
    final offerJson = json['offer'] as Map<String, dynamic>?;
    final activeJson = json['activeJob'] as Map<String, dynamic>?;
    return DispatchState(
      offer: offerJson == null ? null : DispatchOffer.fromJson(offerJson),
      activeJob: activeJson == null ? null : ServiceRequest.fromJson(activeJson),
    );
  }
}
