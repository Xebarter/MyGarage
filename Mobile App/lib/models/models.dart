class BuyerProfile {
  BuyerProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    this.address = '',
    this.totalOrders = 0,
    this.totalSpent = 0,
    this.wishlistCount = 0,
    this.vehicleCount = 0,
    this.serviceRequestCount = 0,
    this.defaultAddress,
  });

  final String id;
  final String name;
  final String email;
  final String phone;
  final String address;
  final int totalOrders;
  final double totalSpent;
  final int wishlistCount;
  final int vehicleCount;
  final int serviceRequestCount;
  final String? defaultAddress;

  factory BuyerProfile.fromJson(Map<String, dynamic> json) {
    // API returns { customer: {...}, stats: ... } or flat customer fields.
    final customer = json['customer'] is Map
        ? Map<String, dynamic>.from(json['customer'] as Map)
        : json;
    final stats = json['stats'] is Map
        ? Map<String, dynamic>.from(json['stats'] as Map)
        : <String, dynamic>{};
    final def = json['defaultAddress'];
    String? defaultAddr;
    if (def is Map) {
      defaultAddr = def['fullAddress']?.toString();
    } else if (def is String) {
      defaultAddr = def;
    }

    return BuyerProfile(
      id: customer['id']?.toString() ?? '',
      name: customer['name']?.toString() ?? '',
      email: customer['email']?.toString() ?? '',
      phone: customer['phone']?.toString() ?? '',
      address: customer['address']?.toString() ?? '',
      totalOrders: (customer['totalOrders'] as num?)?.toInt() ?? 0,
      totalSpent: (customer['totalSpent'] as num?)?.toDouble() ?? 0,
      wishlistCount: (stats['wishlistItems'] as num?)?.toInt() ?? 0,
      vehicleCount: (stats['vehicles'] as num?)?.toInt() ?? 0,
      serviceRequestCount: (stats['serviceRequests'] as num?)?.toInt() ?? 0,
      defaultAddress: defaultAddr,
    );
  }

  BuyerProfile copyWith({
    String? name,
    String? phone,
    String? address,
  }) {
    return BuyerProfile(
      id: id,
      name: name ?? this.name,
      email: email,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      totalOrders: totalOrders,
      totalSpent: totalSpent,
      wishlistCount: wishlistCount,
      vehicleCount: vehicleCount,
      serviceRequestCount: serviceRequestCount,
      defaultAddress: defaultAddress,
    );
  }
}

class Product {
  Product({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.image,
    required this.category,
    required this.brand,
  });

  final String id;
  final String name;
  final String description;
  final double price;
  final String image;
  final String category;
  final String brand;

  factory Product.fromJson(Map<String, dynamic> json) {
    final primary = json['image']?.toString().trim() ?? '';
    final gallery = <String>[];
    final rawImages = json['images'];
    if (rawImages is List) {
      for (final e in rawImages) {
        final s = e?.toString().trim() ?? '';
        if (s.isNotEmpty) gallery.add(s);
      }
    }
    return Product(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      image: primary.isNotEmpty ? primary : (gallery.isNotEmpty ? gallery.first : ''),
      category: json['category']?.toString() ?? '',
      brand: json['brand']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'description': description,
        'price': price,
        'image': image,
        'category': category,
        'brand': brand,
      };
}

class ShopSearchSuggestions {
  ShopSearchSuggestions({
    required this.query,
    required this.categories,
    required this.products,
  });

  final String query;
  final List<ShopCategorySuggestion> categories;
  final List<Product> products;

  factory ShopSearchSuggestions.fromJson(Map<String, dynamic> json) {
    final cats = json['categories'] is List ? json['categories'] as List : const [];
    final products = json['products'] is List ? json['products'] as List : const [];
    return ShopSearchSuggestions(
      query: json['query']?.toString() ?? '',
      categories: cats
          .whereType<Map>()
          .map((e) => ShopCategorySuggestion.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
      products: products
          .whereType<Map>()
          .map((e) => Product.fromJson(Map<String, dynamic>.from(e)))
          .toList(),
    );
  }

  bool get isEmpty => categories.isEmpty && products.isEmpty;
}

class ShopCategorySuggestion {
  ShopCategorySuggestion({
    required this.name,
    required this.image,
    required this.count,
    required this.headline,
  });

  final String name;
  final String image;
  final int count;
  final String headline;

  factory ShopCategorySuggestion.fromJson(Map<String, dynamic> json) {
    return ShopCategorySuggestion(
      name: json['name']?.toString() ?? '',
      image: json['image']?.toString() ?? '',
      count: (json['count'] as num?)?.toInt() ?? 0,
      headline: json['headline']?.toString() ?? json['name']?.toString() ?? '',
    );
  }
}

/// Sidebar / browse catalog node from GET /api/additems.
class ShopCategoryNode {
  ShopCategoryNode({
    required this.title,
    this.children = const [],
  });

  final String title;
  final List<ShopCategoryNode> children;

  bool get hasChildren => children.isNotEmpty;

  factory ShopCategoryNode.fromJson(Map<String, dynamic> json) {
    final raw = json['children'];
    final kids = raw is List
        ? raw
            .whereType<Map>()
            .map((e) => ShopCategoryNode.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : const <ShopCategoryNode>[];
    return ShopCategoryNode(
      title: json['title']?.toString() ?? '',
      children: kids,
    );
  }

  Map<String, dynamic> toJson() => {
        'title': title,
        if (children.isNotEmpty)
          'children': children.map((c) => c.toJson()).toList(),
      };
}

/// Flattened hit used by browse-menu search.
class ShopCategorySearchHit {
  ShopCategorySearchHit({
    required this.title,
    required this.breadcrumb,
  });

  final String title;
  final String breadcrumb;
}

class CartItem {
  CartItem({
    required this.productId,
    required this.name,
    required this.price,
    required this.image,
    required this.quantity,
  });

  final String productId;
  final String name;
  final double price;
  final String image;
  final int quantity;

  double get lineTotal => price * quantity;

  CartItem copyWith({int? quantity, String? image}) {
    return CartItem(
      productId: productId,
      name: name,
      price: price,
      image: image ?? this.image,
      quantity: quantity ?? this.quantity,
    );
  }

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'name': name,
        'price': price,
        'image': image,
        'quantity': quantity,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      productId: json['productId']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      image: json['image']?.toString() ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
    );
  }
}

class CatalogService {
  CatalogService({required this.name, required this.defaultPriceUgx});

  final String name;
  final int defaultPriceUgx;
}

class ServiceCategory {
  ServiceCategory({
    required this.id,
    required this.emoji,
    required this.title,
    required this.useWhen,
    required this.priority,
    required this.services,
  });

  final String id;
  final String emoji;
  final String title;
  final String useWhen;
  final String priority;
  final List<CatalogService> services;
}

class ServiceProviderContact {
  ServiceProviderContact({
    required this.id,
    required this.name,
    this.businessName,
    required this.phone,
    this.rating,
    this.completedJobs,
    this.address,
    this.vehicleLabel,
    this.photoUrl,
  });

  final String id;
  final String name;
  final String? businessName;
  final String phone;
  final double? rating;
  final int? completedJobs;
  final String? address;
  final String? vehicleLabel;
  final String? photoUrl;

  factory ServiceProviderContact.fromJson(Map<String, dynamic> json) {
    return ServiceProviderContact(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      businessName: json['businessName']?.toString(),
      phone: json['phone']?.toString() ?? '',
      rating: (json['rating'] as num?)?.toDouble(),
      completedJobs: (json['completedJobs'] as num?)?.toInt(),
      address: json['address']?.toString(),
      vehicleLabel: json['vehicleLabel']?.toString(),
      photoUrl: json['photoUrl']?.toString(),
    );
  }
}

class BuyerServiceRequest {
  BuyerServiceRequest({
    required this.id,
    required this.customerId,
    required this.service,
    required this.status,
    this.providerId,
    this.location,
    this.destinationLat,
    this.destinationLng,
    this.providerLat,
    this.providerLng,
  });

  final String id;
  final String customerId;
  final String service;
  final String status;
  final String? providerId;
  final String? location;
  final double? destinationLat;
  final double? destinationLng;
  final double? providerLat;
  final double? providerLng;

  factory BuyerServiceRequest.fromJson(Map<String, dynamic> json) {
    return BuyerServiceRequest(
      id: json['id']?.toString() ?? '',
      customerId: json['customerId']?.toString() ?? json['customer_id']?.toString() ?? '',
      service: json['service']?.toString() ?? '',
      status: json['status']?.toString() ?? 'pending',
      providerId: json['providerId']?.toString() ?? json['provider_id']?.toString(),
      location: json['location']?.toString(),
      destinationLat: (json['destinationLat'] as num?)?.toDouble() ??
          (json['destination_lat'] as num?)?.toDouble(),
      destinationLng: (json['destinationLng'] as num?)?.toDouble() ??
          (json['destination_lng'] as num?)?.toDouble(),
      providerLat: (json['providerLat'] as num?)?.toDouble() ??
          (json['provider_lat'] as num?)?.toDouble(),
      providerLng: (json['providerLng'] as num?)?.toDouble() ??
          (json['provider_lng'] as num?)?.toDouble(),
    );
  }
}

class OrderSummary {
  OrderSummary({
    required this.id,
    required this.status,
    required this.total,
    required this.createdAt,
  });

  final String id;
  final String status;
  final double total;
  final String createdAt;

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      total: (json['total'] as num?)?.toDouble() ??
          (json['totalAmount'] as num?)?.toDouble() ??
          0,
      createdAt: json['createdAt']?.toString() ?? json['created_at']?.toString() ?? '',
    );
  }
}

class Vehicle {
  Vehicle({
    required this.id,
    required this.make,
    required this.model,
    required this.year,
    this.plate,
    this.imageUrl,
  });

  final String id;
  final String make;
  final String model;
  final int year;
  final String? plate;
  final String? imageUrl;

  String get label => [year.toString(), make, model].where((e) => e.isNotEmpty).join(' ');

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id']?.toString() ?? '',
      make: json['make']?.toString() ?? '',
      model: json['model']?.toString() ?? '',
      year: (json['year'] as num?)?.toInt() ?? 0,
      plate: json['plate']?.toString() ?? json['licensePlate']?.toString(),
      imageUrl: json['imageUrl']?.toString() ?? json['image_url']?.toString(),
    );
  }
}
