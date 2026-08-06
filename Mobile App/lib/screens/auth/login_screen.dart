import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _register = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthController>();
    if (_register) {
      await auth.signUp(_email.text, _password.text, _name.text);
    } else {
      await auth.signIn(_email.text, _password.text);
    }
    if (!mounted) return;
    if (auth.status == AuthStatus.authenticated) {
      context.pop();
    } else if (auth.errorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(auth.errorMessage!)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    return Scaffold(
      appBar: AppBar(title: Text(_register ? 'Create account' : 'Sign in')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (_register) ...[
            TextField(
              controller: _name,
              decoration: const InputDecoration(labelText: 'Full name'),
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 12),
          ],
          TextField(
            controller: _email,
            decoration: const InputDecoration(labelText: 'Email'),
            keyboardType: TextInputType.emailAddress,
            autocorrect: false,
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            decoration: const InputDecoration(labelText: 'Password'),
            obscureText: true,
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: auth.busy ? null : _submit,
            child: auth.busy
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(_register ? 'Sign up' : 'Sign in'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: auth.busy ? null : () => auth.signInWithGoogle(),
            icon: const Icon(Icons.g_mobiledata, size: 28),
            label: const Text('Continue with Google'),
          ),
          TextButton(
            onPressed: () => setState(() => _register = !_register),
            child: Text(
              _register ? 'Already have an account? Sign in' : 'Need an account? Sign up',
              style: AppTheme.host(color: AppColors.primary),
            ),
          ),
          if (!auth.configured)
            Padding(
              padding: const EdgeInsets.only(top: 16),
              child: Text(
                'Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env',
                style: AppTheme.host(color: AppColors.danger, fontSize: 13),
              ),
            ),
        ],
      ),
    );
  }
}
