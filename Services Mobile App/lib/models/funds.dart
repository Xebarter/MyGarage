class FundsSummary {
  FundsSummary({
    required this.productGross,
    required this.serviceGross,
    required this.totalGross,
    required this.estimatedFees,
    required this.netEarnings,
    required this.paidOut,
    required this.pendingDisbursement,
    required this.availableBalance,
  });

  final double productGross;
  final double serviceGross;
  final double totalGross;
  final double estimatedFees;
  final double netEarnings;
  final double paidOut;
  final double pendingDisbursement;
  final double availableBalance;

  factory FundsSummary.fromJson(Map<String, dynamic> json) {
    double n(dynamic v) => (v as num?)?.toDouble() ?? 0;
    return FundsSummary(
      productGross: n(json['productGross']),
      serviceGross: n(json['serviceGross']),
      totalGross: n(json['totalGross']),
      estimatedFees: n(json['estimatedFees']),
      netEarnings: n(json['netEarnings']),
      paidOut: n(json['paidOut']),
      pendingDisbursement: n(json['pendingDisbursement']),
      availableBalance: n(json['availableBalance']),
    );
  }
}

class PaymentRecord {
  PaymentRecord({
    required this.id,
    required this.checkoutType,
    required this.amount,
    required this.status,
    required this.providerReference,
    this.createdAt,
  });

  final String id;
  final String checkoutType;
  final double amount;
  final String status;
  final String providerReference;
  final DateTime? createdAt;

  factory PaymentRecord.fromJson(Map<String, dynamic> json) {
    return PaymentRecord(
      id: json['id']?.toString() ?? '',
      checkoutType: json['checkoutType']?.toString() ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      status: json['status']?.toString() ?? '',
      providerReference: json['providerReference']?.toString() ?? '',
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }
}

class DisbursementRecord {
  DisbursementRecord({
    required this.id,
    required this.sourceType,
    required this.netAmount,
    required this.status,
    this.createdAt,
  });

  final String id;
  final String sourceType;
  final double netAmount;
  final String status;
  final DateTime? createdAt;

  factory DisbursementRecord.fromJson(Map<String, dynamic> json) {
    return DisbursementRecord(
      id: json['id']?.toString() ?? '',
      sourceType: json['sourceType']?.toString() ?? '',
      netAmount: (json['netAmount'] as num?)?.toDouble() ?? 0,
      status: json['status']?.toString() ?? '',
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'].toString()) : null,
    );
  }
}

class PayoutPreference {
  PayoutPreference({
    this.payoutMethod = 'mobile_money',
    this.payoutAccountName = '',
    this.payoutAccountNumber = '',
    this.network = '',
    this.frequency = 'weekly',
    this.minimumPayoutAmount = 0,
    this.autoDisburseEnabled = true,
  });

  final String payoutMethod;
  final String payoutAccountName;
  final String payoutAccountNumber;
  final String network;
  final String frequency;
  final double minimumPayoutAmount;
  final bool autoDisburseEnabled;

  factory PayoutPreference.fromJson(Map<String, dynamic>? json) {
    if (json == null) return PayoutPreference();
    return PayoutPreference(
      payoutMethod: json['payoutMethod']?.toString() ?? 'mobile_money',
      payoutAccountName: json['payoutAccountName']?.toString() ?? '',
      payoutAccountNumber: json['payoutAccountNumber']?.toString() ?? '',
      network: json['network']?.toString() ?? '',
      frequency: json['frequency']?.toString() ?? 'weekly',
      minimumPayoutAmount: (json['minimumPayoutAmount'] as num?)?.toDouble() ?? 0,
      autoDisburseEnabled: json['autoDisburseEnabled'] != false,
    );
  }

  Map<String, dynamic> toJson(String vendorId) => {
        'vendorId': vendorId,
        'payoutMethod': payoutMethod,
        'payoutAccountName': payoutAccountName,
        'payoutAccountNumber': payoutAccountNumber,
        'network': network,
        'frequency': frequency,
        'minimumPayoutAmount': minimumPayoutAmount,
        'autoDisburseEnabled': autoDisburseEnabled,
      };
}

class FundsData {
  FundsData({
    required this.vendorId,
    required this.vendorName,
    required this.summary,
    required this.paymentHistory,
    required this.disbursements,
    this.preference,
  });

  final String vendorId;
  final String vendorName;
  final FundsSummary summary;
  final List<PaymentRecord> paymentHistory;
  final List<DisbursementRecord> disbursements;
  final PayoutPreference? preference;

  factory FundsData.fromJson(Map<String, dynamic> json) {
    return FundsData(
      vendorId: json['vendorId']?.toString() ?? '',
      vendorName: json['vendorName']?.toString() ?? '',
      summary: FundsSummary.fromJson(json['summary'] as Map<String, dynamic>? ?? {}),
      paymentHistory: (json['paymentHistory'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(PaymentRecord.fromJson)
          .toList(),
      disbursements: (json['disbursements'] as List<dynamic>? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(DisbursementRecord.fromJson)
          .toList(),
      preference: json['preference'] is Map<String, dynamic>
          ? PayoutPreference.fromJson(json['preference'] as Map<String, dynamic>)
          : null,
    );
  }
}
