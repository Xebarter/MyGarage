import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final profile = auth.profile;
    final signedIn = auth.status == AuthStatus.authenticated && auth.user != null;

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          Card(
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: AppColors.primarySoft,
                child: Text(
                  (profile?.name.isNotEmpty == true ? profile!.name[0] : 'M').toUpperCase(),
                  style: AppTheme.host(fontWeight: FontWeight.w700, color: AppColors.primary),
                ),
              ),
              title: Text(
                signedIn
                    ? (profile?.name.isNotEmpty == true ? profile!.name : auth.user?.email ?? 'Buyer')
                    : 'Guest',
              ),
              subtitle: Text(signedIn ? (auth.user?.email ?? '') : 'Sign in to sync garage and orders'),
              trailing: signedIn
                  ? null
                  : TextButton(onPressed: () => context.push('/login'), child: const Text('Sign in')),
            ),
          ),
          const SizedBox(height: 16),
          _tile(context, Icons.directions_car_outlined, 'My garage', () => context.push('/garage')),
          _tile(context, Icons.receipt_long_outlined, 'Orders', () => context.push('/orders')),
          if (signedIn)
            _tile(context, Icons.logout, 'Sign out', () => auth.signOut(), danger: true),
        ],
      ),
    );
  }

  Widget _tile(
    BuildContext context,
    IconData icon,
    String title,
    VoidCallback onTap, {
    bool danger = false,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Icon(icon, color: danger ? AppColors.danger : AppColors.primary),
        title: Text(
          title,
          style: AppTheme.host(
            fontWeight: FontWeight.w600,
            color: danger ? AppColors.danger : AppColors.textPrimary,
          ),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
