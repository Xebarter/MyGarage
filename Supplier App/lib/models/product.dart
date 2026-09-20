class SupplierProduct {
  SupplierProduct({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.vendorId,
    this.compareAtPrice,
    this.image = '',
    this.images = const [],
    this.featured = false,
    this.featuredRequestPending = false,
    this.published = true,
    this.category = '',
    this.subcategory = '',
    this.brand = '',
    this.sku = '',
    this.variants = const [],
  });

  final String id;
  final String name;
  final String description;
  final double price;
  final double? compareAtPrice;
  final String image;
  final List<String> images;
  final bool featured;
  final bool featuredRequestPending;
  final bool published;
  final String category;
  final String subcategory;
  final String brand;
  final String sku;
  final String vendorId;
  final List<SupplierProductVariant> variants;

  String get displayImage {
    if (image.trim().isNotEmpty) return image;
    if (images.isNotEmpty) return images.first;
    return '';
  }

  factory SupplierProduct.fromJson(Map<String, dynamic> json) {
    final imagesRaw = json['images'];
    final variantsRaw = json['variants'];
    return SupplierProduct(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      compareAtPrice: (json['compareAtPrice'] as num?)?.toDouble(),
      image: json['image']?.toString() ?? '',
      images: imagesRaw is List
          ? imagesRaw.map((e) => e.toString()).where((e) => e.isNotEmpty).toList()
          : const [],
      featured: json['featured'] == true,
      featuredRequestPending: json['featuredRequestPending'] == true,
      published: json['published'] != false,
      category: json['category']?.toString() ?? '',
      subcategory: json['subcategory']?.toString() ?? '',
      brand: json['brand']?.toString() ?? '',
      sku: json['sku']?.toString() ?? '',
      vendorId: json['vendorId']?.toString() ?? '',
      variants: variantsRaw is List
          ? variantsRaw
              .whereType<Map>()
              .map((e) => SupplierProductVariant.fromJson(Map<String, dynamic>.from(e)))
              .toList()
          : const [],
    );
  }

  Map<String, dynamic> toPayload({required String vendorId, bool requestFeatured = false}) {
    return {
      'vendorId': vendorId,
      'name': name.trim(),
      'description': description.trim(),
      'price': price,
      'compareAtPrice': compareAtPrice,
      'image': image,
      'images': images,
      'published': published,
      'featured': requestFeatured,
      'category': category.trim(),
      'subcategory': subcategory.trim(),
      'brand': brand.trim(),
      'sku': sku.trim(),
      'variants': variants.map((v) => v.toJson()).toList(),
    };
  }
}

class SupplierProductVariant {
  SupplierProductVariant({
    required this.id,
    required this.label,
    required this.price,
  });

  final String id;
  final String label;
  final double price;

  factory SupplierProductVariant.fromJson(Map<String, dynamic> json) {
    return SupplierProductVariant(
      id: json['id']?.toString() ?? '',
      label: json['label']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'label': label,
        'selections': <String, String>{},
        'price': price,
      };
}
