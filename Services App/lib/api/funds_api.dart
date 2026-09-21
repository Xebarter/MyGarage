import '../models/funds.dart';
import 'api_client.dart';

class FundsApi {
  FundsApi(this._client);

  final ApiClient _client;

  Future<FundsData> getFunds(String vendorId) {
    return _client.get(
      '/api/vendor/funds',
      query: {'vendorId': vendorId},
      parser: (json) => FundsData.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<PayoutPreference?> getPayoutPreference(String vendorId) {
    return _client.get(
      '/api/vendor/payout-preferences',
      query: {'vendorId': vendorId},
      parser: (json) {
        if (json == null) return null;
        return PayoutPreference.fromJson(json as Map<String, dynamic>);
      },
    );
  }

  Future<void> savePayoutPreference(String vendorId, PayoutPreference pref) {
    return _client.put(
      '/api/vendor/payout-preferences',
      body: pref.toJson(vendorId),
      parser: (_) => null,
    );
  }
}
