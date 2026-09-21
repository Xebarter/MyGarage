import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';
import '../models/models.dart';

const openBuyerServiceStatuses = {'pending', 'matched', 'in_progress'};

bool isOpenBuyerServiceStatus(String status) =>
    openBuyerServiceStatuses.contains(status.toLowerCase());

BuyerServiceRequest? firstOpenBuyerServiceRequest(Iterable<BuyerServiceRequest> requests) {
  for (final request in requests) {
    if (isOpenBuyerServiceStatus(request.status)) return request;
  }
  return null;
}

String requestingPathFor(String requestId) =>
    '/service/requesting?requestId=${Uri.encodeComponent(requestId)}';

/// Pending stays on the search screen; accepted/in-progress goes to live tracking.
String liveServicePathFor(BuyerServiceRequest request) {
  final status = request.status.toLowerCase();
  final assigned = (request.providerId ?? '').isNotEmpty;
  if (assigned || status == 'matched' || status == 'in_progress') {
    return '/service/track/${Uri.encodeComponent(request.id)}';
  }
  return requestingPathFor(request.id);
}

String liveServiceFocusCopy(BuyerServiceRequest request) {
  final status = request.status.toLowerCase();
  if (status == 'in_progress') return 'Your provider is on the way.';
  if (status == 'matched' || (request.providerId ?? '').isNotEmpty) {
    return 'A provider accepted. Opening live tracking.';
  }
  return 'Still searching. We’ll keep this request until someone accepts or it expires.';
}

bool redirectIfActiveRequestExists(BuildContext context, Object error) {
  if (error is! ApiException || !error.isActiveRequestExists) return false;
  final id = error.requestId!.trim();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(error.message)),
  );
  context.go(requestingPathFor(id));
  return true;
}
