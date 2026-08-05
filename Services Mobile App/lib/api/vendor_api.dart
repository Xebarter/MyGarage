import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

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

  /// Authenticated self-update (preferred over public PUT /api/vendors/:id).
  Future<VendorProfile> updateProfile(Map<String, dynamic> body) {
    return _client.post(
      '/api/vendor/profile',
      body: body,
      auth: true,
      parser: (json) => VendorProfile.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Upload a profile photo; returns public URL.
  Future<String> uploadAvatar({
    required List<int> bytes,
    required String filename,
    String contentType = 'image/jpeg',
  }) {
    final mimeParts = contentType.split('/');
    final mediaType = mimeParts.length == 2
        ? MediaType(mimeParts[0].trim(), mimeParts[1].trim())
        : MediaType('image', 'jpeg');

    return _client.postMultipart(
      '/api/uploads/vendor-avatar',
      auth: true,
      files: [
        http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: filename,
          contentType: mediaType,
        ),
      ],
      parser: (json) {
        final map = json as Map<String, dynamic>;
        final url = map['url']?.toString();
        if (url == null || url.isEmpty) {
          throw ApiException('Upload did not return a URL');
        }
        return url;
      },
    );
  }
}
