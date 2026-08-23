import 'models.dart';

/// Flexible helpers for control-center JSON (dates may be strings).
String _s(dynamic v) => v?.toString() ?? '';
int _i(dynamic v) => (v as num?)?.toInt() ?? 0;
double _d(dynamic v) => (v as num?)?.toDouble() ?? 0;
bool _b(dynamic v) => v == true;

class BuyerControlCenter {
  BuyerControlCenter({
    required this.profile,
    required this.account,
    required this.notificationPreferences,
    required this.notifications,
    required this.unreadNotificationCount,
    required this.preferences,
    required this.documents,
    required this.documentAlerts,
    required this.payments,
    required this.pendingPaymentTotal,
    required this.recommendations,
    required this.analytics,
    this.subscription,
    required this.subscriptionHistory,
    required this.serviceRequests,
    required this.ratings,
  });

  final BuyerProfile profile;
  final BuyerAccount account;
  final NotifPreferences notificationPreferences;
  final List<BuyerNotification> notifications;
  final int unreadNotificationCount;
  final AppPreferences preferences;
  final List<VehicleDocument> documents;
  final List<DocumentAlert> documentAlerts;
  final List<BuyerPayment> payments;
  final double pendingPaymentTotal;
  final List<ServiceRecommendation> recommendations;
  final BuyerAnalytics analytics;
  final BuyerSubscription? subscription;
  final List<BuyerSubscription> subscriptionHistory;
  final List<BuyerServiceRequest> serviceRequests;
  final List<ProviderRating> ratings;

  factory BuyerControlCenter.fromJson(Map<String, dynamic> json) {
    final profileJson = json['profile'] is Map
        ? Map<String, dynamic>.from(json['profile'] as Map)
        : json;
    return BuyerControlCenter(
      profile: BuyerProfile.fromJson(profileJson),
      account: BuyerAccount.fromJson(
        json['account'] is Map
            ? Map<String, dynamic>.from(json['account'] as Map)
            : const {},
      ),
      notificationPreferences: NotifPreferences.fromJson(
        json['notificationPreferences'] is Map
            ? Map<String, dynamic>.from(json['notificationPreferences'] as Map)
            : const {},
      ),
      notifications: _list(json['notifications'], BuyerNotification.fromJson),
      unreadNotificationCount: _i(json['unreadNotificationCount']),
      preferences: AppPreferences.fromJson(
        json['preferences'] is Map
            ? Map<String, dynamic>.from(json['preferences'] as Map)
            : const {},
      ),
      documents: _list(json['documents'], VehicleDocument.fromJson),
      documentAlerts: _list(json['documentAlerts'], DocumentAlert.fromJson),
      payments: _list(json['payments'], BuyerPayment.fromJson),
      pendingPaymentTotal: _d(json['pendingPaymentTotal']),
      recommendations:
          _list(json['recommendations'], ServiceRecommendation.fromJson),
      analytics: BuyerAnalytics.fromJson(
        json['analytics'] is Map
            ? Map<String, dynamic>.from(json['analytics'] as Map)
            : const {},
      ),
      subscription: json['subscription'] is Map
          ? BuyerSubscription.fromJson(
              Map<String, dynamic>.from(json['subscription'] as Map),
            )
          : null,
      subscriptionHistory:
          _list(json['subscriptionHistory'], BuyerSubscription.fromJson),
      serviceRequests:
          _list(json['serviceRequests'], BuyerServiceRequest.fromJson),
      ratings: _list(json['ratings'], ProviderRating.fromJson),
    );
  }

  static List<T> _list<T>(
    dynamic raw,
    T Function(Map<String, dynamic>) parse,
  ) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map((e) => parse(Map<String, dynamic>.from(e)))
        .toList();
  }
}

class BuyerAccount {
  BuyerAccount({
    required this.preferredContactMethod,
    required this.accountStatus,
    required this.emailVerified,
    required this.phoneVerified,
  });

  final String preferredContactMethod;
  final String accountStatus;
  final bool emailVerified;
  final bool phoneVerified;

  factory BuyerAccount.fromJson(Map<String, dynamic> json) {
    return BuyerAccount(
      preferredContactMethod: _s(json['preferredContactMethod']).isEmpty
          ? 'email'
          : _s(json['preferredContactMethod']),
      accountStatus: _s(json['accountStatus']).isEmpty
          ? 'active'
          : _s(json['accountStatus']),
      emailVerified: _b(json['emailVerified']),
      phoneVerified: _b(json['phoneVerified']),
    );
  }
}

class NotifPreferences {
  NotifPreferences({
    required this.emailEnabled,
    required this.smsEnabled,
    required this.inAppEnabled,
    required this.serviceUpdates,
    required this.maintenanceReminders,
    required this.marketing,
  });

  final bool emailEnabled;
  final bool smsEnabled;
  final bool inAppEnabled;
  final bool serviceUpdates;
  final bool maintenanceReminders;
  final bool marketing;

  factory NotifPreferences.fromJson(Map<String, dynamic> json) {
    return NotifPreferences(
      emailEnabled: json['emailEnabled'] != false,
      smsEnabled: _b(json['smsEnabled']),
      inAppEnabled: json['inAppEnabled'] != false,
      serviceUpdates: json['serviceUpdates'] != false,
      maintenanceReminders: json['maintenanceReminders'] != false,
      marketing: _b(json['marketing']),
    );
  }

  Map<String, dynamic> toJson() => {
        'emailEnabled': emailEnabled,
        'smsEnabled': smsEnabled,
        'inAppEnabled': inAppEnabled,
        'serviceUpdates': serviceUpdates,
        'maintenanceReminders': maintenanceReminders,
        'marketing': marketing,
      };

  NotifPreferences copyWith({
    bool? emailEnabled,
    bool? smsEnabled,
    bool? inAppEnabled,
    bool? serviceUpdates,
    bool? maintenanceReminders,
    bool? marketing,
  }) {
    return NotifPreferences(
      emailEnabled: emailEnabled ?? this.emailEnabled,
      smsEnabled: smsEnabled ?? this.smsEnabled,
      inAppEnabled: inAppEnabled ?? this.inAppEnabled,
      serviceUpdates: serviceUpdates ?? this.serviceUpdates,
      maintenanceReminders: maintenanceReminders ?? this.maintenanceReminders,
      marketing: marketing ?? this.marketing,
    );
  }
}

class AppPreferences {
  AppPreferences({
    required this.serviceMode,
    required this.distanceUnit,
    required this.currency,
    required this.language,
    required this.region,
    required this.theme,
  });

  final String serviceMode;
  final String distanceUnit;
  final String currency;
  final String language;
  final String region;
  final String theme;

  factory AppPreferences.fromJson(Map<String, dynamic> json) {
    return AppPreferences(
      serviceMode: _s(json['serviceMode']).isEmpty ? 'both' : _s(json['serviceMode']),
      distanceUnit: _s(json['distanceUnit']).isEmpty ? 'km' : _s(json['distanceUnit']),
      currency: _s(json['currency']).isEmpty ? 'UGX' : _s(json['currency']),
      language: _s(json['language']).isEmpty ? 'en' : _s(json['language']),
      region: _s(json['region']),
      theme: _s(json['theme']).isEmpty ? 'system' : _s(json['theme']),
    );
  }

  Map<String, dynamic> toJson() => {
        'serviceMode': serviceMode,
        'distanceUnit': distanceUnit,
        'currency': currency,
        'language': language,
        'region': region,
        'theme': theme,
      };

  AppPreferences copyWith({
    String? serviceMode,
    String? distanceUnit,
    String? currency,
    String? language,
    String? region,
    String? theme,
  }) {
    return AppPreferences(
      serviceMode: serviceMode ?? this.serviceMode,
      distanceUnit: distanceUnit ?? this.distanceUnit,
      currency: currency ?? this.currency,
      language: language ?? this.language,
      region: region ?? this.region,
      theme: theme ?? this.theme,
    );
  }
}

class BuyerNotification {
  BuyerNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.notificationType,
    required this.readAt,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String body;
  final String notificationType;
  final String? readAt;
  final String createdAt;

  bool get isRead => readAt != null && readAt!.isNotEmpty;

  factory BuyerNotification.fromJson(Map<String, dynamic> json) {
    return BuyerNotification(
      id: _s(json['id']),
      title: _s(json['title']),
      body: _s(json['body']),
      notificationType: _s(json['notificationType']),
      readAt: json['readAt']?.toString(),
      createdAt: _s(json['createdAt']),
    );
  }
}

class VehicleDocument {
  VehicleDocument({
    required this.id,
    required this.vehicleId,
    required this.documentType,
    required this.name,
    required this.fileUrl,
    required this.expiresAt,
  });

  final String id;
  final String vehicleId;
  final String documentType;
  final String name;
  final String fileUrl;
  final String? expiresAt;

  factory VehicleDocument.fromJson(Map<String, dynamic> json) {
    return VehicleDocument(
      id: _s(json['id']),
      vehicleId: _s(json['vehicleId']),
      documentType: _s(json['documentType']),
      name: _s(json['name']),
      fileUrl: _s(json['fileUrl']),
      expiresAt: json['expiresAt']?.toString(),
    );
  }
}

class DocumentAlert {
  DocumentAlert({
    required this.documentId,
    required this.name,
    required this.status,
    required this.expiresAt,
  });

  final String documentId;
  final String name;
  final String status;
  final String? expiresAt;

  factory DocumentAlert.fromJson(Map<String, dynamic> json) {
    return DocumentAlert(
      documentId: _s(json['documentId']),
      name: _s(json['name']),
      status: _s(json['status']),
      expiresAt: json['expiresAt']?.toString(),
    );
  }
}

class BuyerPayment {
  BuyerPayment({
    required this.id,
    required this.label,
    required this.amount,
    required this.currency,
    required this.status,
    required this.source,
    required this.createdAt,
  });

  final String id;
  final String label;
  final double amount;
  final String currency;
  final String status;
  final String source;
  final String createdAt;

  factory BuyerPayment.fromJson(Map<String, dynamic> json) {
    return BuyerPayment(
      id: _s(json['id']),
      label: _s(json['label']).isEmpty ? _s(json['referenceId']) : _s(json['label']),
      amount: _d(json['amount']),
      currency: _s(json['currency']).isEmpty ? 'UGX' : _s(json['currency']),
      status: _s(json['status']),
      source: _s(json['source']),
      createdAt: _s(json['createdAt']),
    );
  }
}

class ServiceRecommendation {
  ServiceRecommendation({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
  });

  final String id;
  final String title;
  final String description;
  final String status;

  factory ServiceRecommendation.fromJson(Map<String, dynamic> json) {
    return ServiceRecommendation(
      id: _s(json['id']),
      title: _s(json['title']),
      description: _s(json['description']),
      status: _s(json['status']),
    );
  }
}

class BuyerAnalytics {
  BuyerAnalytics({
    required this.totalMaintenanceCost,
    required this.totalServices,
    required this.vehicles,
    required this.monthlySpend,
  });

  final double totalMaintenanceCost;
  final int totalServices;
  final List<VehicleHealth> vehicles;
  final List<MonthlySpend> monthlySpend;

  factory BuyerAnalytics.fromJson(Map<String, dynamic> json) {
    return BuyerAnalytics(
      totalMaintenanceCost: _d(json['totalMaintenanceCost']),
      totalServices: _i(json['totalServices']),
      vehicles: BuyerControlCenter._list(json['vehicles'], VehicleHealth.fromJson),
      monthlySpend:
          BuyerControlCenter._list(json['monthlySpend'], MonthlySpend.fromJson),
    );
  }
}

class VehicleHealth {
  VehicleHealth({
    required this.vehicleId,
    required this.vehicleLabel,
    required this.healthStatus,
    required this.totalMaintenanceCost,
    required this.serviceCount,
  });

  final String vehicleId;
  final String vehicleLabel;
  final String healthStatus;
  final double totalMaintenanceCost;
  final int serviceCount;

  factory VehicleHealth.fromJson(Map<String, dynamic> json) {
    return VehicleHealth(
      vehicleId: _s(json['vehicleId']),
      vehicleLabel: _s(json['vehicleLabel']),
      healthStatus: _s(json['healthStatus']),
      totalMaintenanceCost: _d(json['totalMaintenanceCost']),
      serviceCount: _i(json['serviceCount']),
    );
  }
}

class MonthlySpend {
  MonthlySpend({required this.month, required this.amount});

  final String month;
  final double amount;

  factory MonthlySpend.fromJson(Map<String, dynamic> json) {
    return MonthlySpend(month: _s(json['month']), amount: _d(json['amount']));
  }
}

class BuyerSubscription {
  BuyerSubscription({
    required this.id,
    required this.planTier,
    required this.status,
    required this.amount,
    required this.currency,
  });

  final String id;
  final String planTier;
  final String status;
  final double amount;
  final String currency;

  factory BuyerSubscription.fromJson(Map<String, dynamic> json) {
    return BuyerSubscription(
      id: _s(json['id']),
      planTier: _s(json['planTier']).isEmpty ? _s(json['tier']) : _s(json['planTier']),
      status: _s(json['status']),
      amount: _d(json['amount']),
      currency: _s(json['currency']).isEmpty ? 'UGX' : _s(json['currency']),
    );
  }
}

class ProviderRating {
  ProviderRating({
    required this.providerId,
    required this.stars,
  });

  final String providerId;
  final int stars;

  factory ProviderRating.fromJson(Map<String, dynamic> json) {
    return ProviderRating(
      providerId: _s(json['providerId']),
      stars: _i(json['stars']),
    );
  }
}

class BuyerAddress {
  BuyerAddress({
    required this.id,
    required this.label,
    required this.fullAddress,
    required this.isDefault,
  });

  final String id;
  final String label;
  final String fullAddress;
  final bool isDefault;

  factory BuyerAddress.fromJson(Map<String, dynamic> json) {
    return BuyerAddress(
      id: _s(json['id']),
      label: _s(json['label']),
      fullAddress: _s(json['fullAddress']),
      isDefault: _b(json['isDefault']),
    );
  }
}

class WishlistItem {
  WishlistItem({
    required this.id,
    required this.productName,
    required this.priceSnapshot,
    required this.categorySnapshot,
    this.imageUrl,
    this.productId,
  });

  final String id;
  final String productName;
  final double priceSnapshot;
  final String categorySnapshot;
  final String? imageUrl;
  final String? productId;

  factory WishlistItem.fromJson(Map<String, dynamic> json) {
    return WishlistItem(
      id: _s(json['id']),
      productName: _s(json['productName']),
      priceSnapshot: _d(json['priceSnapshot'] ?? json['price']),
      categorySnapshot: _s(json['categorySnapshot'] ?? json['category']),
      imageUrl: json['imageUrl']?.toString(),
      productId: json['productId']?.toString(),
    );
  }
}

class SupportTicket {
  SupportTicket({
    required this.id,
    required this.subject,
    required this.message,
    required this.status,
    required this.priority,
    required this.createdAt,
  });

  final String id;
  final String subject;
  final String message;
  final String status;
  final String priority;
  final String createdAt;

  factory SupportTicket.fromJson(Map<String, dynamic> json) {
    return SupportTicket(
      id: _s(json['id']),
      subject: _s(json['subject']),
      message: _s(json['message']),
      status: _s(json['status']),
      priority: _s(json['priority']),
      createdAt: _s(json['createdAt']),
    );
  }
}

class SubscriptionPlanDef {
  const SubscriptionPlanDef({
    required this.tier,
    required this.name,
    required this.tagline,
    required this.monthlyPrice,
    required this.features,
    this.highlight = false,
    this.badge,
  });

  final String tier;
  final String name;
  final String tagline;
  final int monthlyPrice;
  final List<String> features;
  final bool highlight;
  final String? badge;
}

const kSubscriptionPlans = <SubscriptionPlanDef>[
  SubscriptionPlanDef(
    tier: 'platinum',
    name: 'Platinum',
    tagline: 'Ultimate care for serious drivers and fleets',
    monthlyPrice: 99000,
    badge: 'Best value',
    highlight: true,
    features: [
      'Unlimited vehicles',
      'VIP provider matching',
      'Dedicated support',
      'Advanced analytics',
      'Document vault',
      '10% shop discount',
    ],
  ),
  SubscriptionPlanDef(
    tier: 'gold',
    name: 'Gold',
    tagline: 'Priority service and deeper vehicle insights',
    monthlyPrice: 59000,
    features: [
      'Unlimited vehicles',
      'Priority dispatch',
      'Provider messaging',
      'Health dashboard',
      '5% shop discount',
    ],
  ),
  SubscriptionPlanDef(
    tier: 'silver',
    name: 'Silver',
    tagline: 'Essential tools for everyday owners',
    monthlyPrice: 29000,
    features: [
      'Up to 3 vehicles',
      'Standard booking',
      'Document reminders',
      'Service history',
    ],
  ),
  SubscriptionPlanDef(
    tier: 'bronze',
    name: 'Bronze',
    tagline: 'Get started free with core tracking',
    monthlyPrice: 0,
    features: [
      '1 vehicle',
      'Basic service requests',
      'Order & service history',
      'Email notifications',
    ],
  ),
];
