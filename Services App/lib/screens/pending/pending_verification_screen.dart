import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ui.dart';

class PendingVerificationScreen extends StatefulWidget {
  const PendingVerificationScreen({super.key});

  @override
  State<PendingVerificationScreen> createState() => _PendingVerificationScreenState();
}

class _PendingVerificationScreenState extends State<PendingVerificationScreen> {
  bool _checking = false;
  String? _feedback;

  Future<void> _checkStatus() async {
    if (_checking) return;
    setState(() {
      _checking = true;
      _feedback = null;
    });
    final auth = context.read<AuthController>();
    await auth.refreshVendor(quiet: true);
    if (!mounted) return;
    setState(() {
      _checking = false;
      if (auth.status == AuthStatus.pendingVerification) {
        _feedback = 'Still pending';
      } else if (auth.status == AuthStatus.authenticated) {
        _feedback = 'Approved';
      } else {
        _feedback = auth.errorMessage ?? 'Could not check status';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    return AmbientBackground(
      accent: AppColors.warning.withValues(alpha: 0.28),
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => auth.signOut(),
                    child: const Text('Sign out'),
                  ),
                ),
                const Spacer(),
                GlassCard(
                  highlight: true,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const StatusPill(label: 'Pending', color: AppColors.warning),
                      const SizedBox(height: 16),
                      Text(
                        'Waiting for approval',
                        style: AppTheme.host(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.4,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'An admin needs to approve your Services access.',
                        style: AppTheme.host(
                          fontSize: 14.5,
                          color: AppColors.textSecondary,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 22),
                      ElevatedButton(
                        onPressed: _checking ? null : _checkStatus,
                        child: _checking
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Check status'),
                      ),
                      if (_feedback != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _feedback!,
                          textAlign: TextAlign.center,
                          style: AppTheme.host(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: _feedback == 'Approved'
                                ? AppColors.primary
                                : AppColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.04),
                const Spacer(flex: 2),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
