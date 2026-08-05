import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../widgets/ui.dart';

class PendingVerificationScreen extends StatelessWidget {
  const PendingVerificationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    return AmbientBackground(
      accent: AppColors.warning.withOpacity(0.25),
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const StatusPill(label: 'In review', color: AppColors.warning),
                      const SizedBox(height: 18),
                      Text(
                        'Almost there',
                        style: AppTheme.host(fontSize: 28, fontWeight: FontWeight.w600, letterSpacing: -0.4),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Your provider account is being reviewed. You’ll unlock jobs as soon as you’re approved.',
                        style: AppTheme.host(fontSize: 15, color: AppColors.textSecondary, height: 1.5),
                      ),
                      const SizedBox(height: 28),
                      OutlinedButton(
                        onPressed: auth.busy ? null : () => auth.refreshVendor(),
                        child: const Text('Check status'),
                      ),
                    ],
                  ),
                ).animate().fadeIn(duration: 450.ms).slideY(begin: 0.05),
                const Spacer(flex: 2),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
