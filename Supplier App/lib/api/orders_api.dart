import '../models/vendor_order.dart';
import 'api_client.dart';

class OrdersApi {
  OrdersApi(this._client);

  final ApiClient _client;

  Future<List<VendorOrder>> list(String vendorId) {
    return _client.get(
      '/api/vendor/orders',
      query: {'vendorId': vendorId},
      parser: (json) {
        final list = json is List ? json : const [];
        return list
            .whereType<Map>()
            .map((e) => VendorOrder.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<VendorOrder> updateStatus({
    required String orderId,
    required String vendorId,
    required String status,
    String? trackingNumber,
    String? carrier,
  }) {
    return _client.patch(
      '/api/vendor/orders/$orderId',
      auth: true,
      body: {
        'vendorId': vendorId,
        'status': status,
        if (trackingNumber != null && trackingNumber.isNotEmpty) 'trackingNumber': trackingNumber,
        if (carrier != null && carrier.isNotEmpty) 'carrier': carrier,
      },
      parser: (json) => VendorOrder.fromJson(json as Map<String, dynamic>),
    );
  }
}
