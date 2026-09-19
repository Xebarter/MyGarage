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

bool redirectIfActiveRequestExists(BuildContext context, Object error) {
  if (error is! ApiException || !error.isActiveRequestExists) return false;
  final id = error.requestId!.trim();
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(error.message)),
  );
  context.go(requestingPathFor(id));
  return true;
}
