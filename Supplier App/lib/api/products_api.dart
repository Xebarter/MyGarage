import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../models/product.dart';
import 'api_client.dart';

class ProductsApi {
  ProductsApi(this._client);

  final ApiClient _client;

  Future<List<SupplierProduct>> list(String vendorId) {
    return _client.get(
      '/api/vendor/products',
      query: {'vendorId': vendorId},
      parser: (json) {
        final list = json is List ? json : const [];
        return list
            .whereType<Map>()
            .map((e) => SupplierProduct.fromJson(Map<String, dynamic>.from(e)))
            .toList();
      },
    );
  }

  Future<SupplierProduct> create(Map<String, dynamic> body) {
    return _client.post(
      '/api/vendor/products',
      body: body,
      auth: true,
      parser: (json) => SupplierProduct.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<SupplierProduct> update(String id, Map<String, dynamic> body) {
    return _client.put(
      '/api/vendor/products/$id',
      body: body,
      auth: true,
      parser: (json) => SupplierProduct.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> delete(String id, String vendorId) {
    return _client.delete(
      '/api/vendor/products/$id',
      query: {'vendorId': vendorId},
      auth: true,
      parser: (_) {},
    );
  }

  Future<String> uploadListingImage({
    required List<int> bytes,
    required String filename,
    String contentType = 'image/jpeg',
  }) {
    final mimeParts = contentType.split('/');
    final mediaType = mimeParts.length == 2
        ? MediaType(mimeParts[0].trim(), mimeParts[1].trim())
        : MediaType('image', 'jpeg');

    return _client.postMultipart(
      '/api/uploads/listing-image',
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
