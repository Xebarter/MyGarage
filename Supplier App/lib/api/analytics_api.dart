import '../models/analytics.dart';
import 'api_client.dart';

class AnalyticsApi {
  AnalyticsApi(this._client);

  final ApiClient _client;

  Future<VendorAnalytics> getAnalytics(String vendorId) {
    return _client.get(
      '/api/vendor/analytics',
      query: {'vendorId': vendorId},
      parser: (json) => VendorAnalytics.fromJson(json as Map<String, dynamic>),
    );
  }
}
