import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../api/api_client.dart';
import '../../api/buyer_api.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../utils/user_facing_error.dart';

class ServiceRequestingScreen extends StatefulWidget {
  const ServiceRequestingScreen({super.key, required this.requestId});

  final String requestId;

  @override
  State<ServiceRequestingScreen> createState() => _ServiceRequestingScreenState();
}

class _ServiceRequestingScreenState extends State<ServiceRequestingScreen> {
  final _api = BuyerApi(ApiClient());
  Timer? _timer;
  String _status = 'Searching for a provider…';
  String? _error;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 3), (_) => _poll());
    _poll();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    final auth = context.read<AuthController>();
    final customerId = auth.customerId;
    if (customerId == null || widget.requestId.isEmpty) return;
    try {
      final detail = await _api.getServiceRequestDetail(
        requestId: widget.requestId,
        customerId: customerId,
      );
      final status = detail.request.status.toLowerCase();
      final hasProvider =
          detail.request.providerId != null && detail.request.providerId!.isNotEmpty;

      if (!mounted) return;
      if (status == 'cancelled') {
        setState(() => _status = 'Request cancelled');
        _timer?.cancel();
        return;
      }
      if (hasProvider || status == 'matched' || status == 'in_progress' || status == 'completed') {
        _timer?.cancel();
        context.go('/service/track/${widget.requestId}');
        return;
      }
      setState(() {
        _status = 'Still searching… (${detail.request.status})';
        _error = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = userFacingError(e, fallback: 'Could not refresh status.'));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Finding help'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.go('/services'),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const CircularProgressIndicator(),
              const SizedBox(height: 24),
              Text(
                _status,
                textAlign: TextAlign.center,
                style: AppTheme.host(fontSize: 17, fontWeight: FontWeight.w600),
              ),
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: AppTheme.host(color: AppColors.danger, fontSize: 13)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
