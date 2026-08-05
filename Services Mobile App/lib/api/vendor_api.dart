import '../models/vendor_profile.dart';
import 'api_client.dart';

class VendorApi {
  VendorApi(this._client);

  final ApiClient _client;

  Future<void> bootstrap() {
    return _client.post(
      '/api/vendor/bootstrap',
      auth: true,
      parser: (_) => null,
    );
  }

  Future<VendorProfile> getVendor(String id) {
    return _client.get(
      '/api/vendors/$id',
      parser: (json) => VendorProfile.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<VendorProfile> updateVendor(String id, Map<String, dynamic> body) {
    return _client.put(
      '/api/vendors/$id',
      body: body,
      parser: (json) => VendorProfile.fromJson(json as Map<String, dynamic>),
    );
  }
}
