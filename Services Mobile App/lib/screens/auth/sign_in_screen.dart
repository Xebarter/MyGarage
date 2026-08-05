import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../config.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../widgets/google_logo.dart';
import '../../widgets/ui.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;
  bool _showEmail = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await context.read<AuthController>().signIn(_email.text, _password.text);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    return AmbientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 28),
                      Center(
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: AppColors.border),
                            boxShadow: AppTheme.softShadow,
                          ),
                          child: Image.asset(
                            'assets/images/logo_mark.png',
                            height: 56,
                            fit: BoxFit.contain,
                          ),
                        ),
                      )
                          .animate()
                          .fadeIn(duration: 500.ms)
                          .scale(begin: const Offset(0.92, 0.92), curve: Curves.easeOutCubic),
                      const SizedBox(height: 28),
                      Text(
                        AppConfig.appName,
                        textAlign: TextAlign.center,
                        style: AppTheme.host(
                          fontSize: 34,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.6,
                        ),
                      ).animate().fadeIn(delay: 80.ms, duration: 450.ms).slideY(begin: 0.08),
                      const SizedBox(height: 8),
                      Text(
                        'Service provider workspace',
                        textAlign: TextAlign.center,
                        style: AppTheme.host(fontSize: 15, color: AppColors.textSecondary, height: 1.4),
                      ).animate().fadeIn(delay: 140.ms, duration: 450.ms),
                      const SizedBox(height: 36),
                      GlassCard(
                        padding: const EdgeInsets.all(20),
                        highlight: true,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            OutlinedButton(
                              onPressed: auth.busy
                                  ? null
                                  : () => context.read<AuthController>().signInWithGoogle(),
                              style: OutlinedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFF1F1F1F),
                                side: const BorderSide(color: Color(0xFFDADCE0)),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: auth.busy
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const GoogleLogo(size: 22),
                                        const SizedBox(width: 12),
                                        Text(
                                          'Continue with Google',
                                          style: AppTheme.host(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w600,
                                            color: const Color(0xFF1F1F1F),
                                          ),
                                        ),
                                      ],
                                    ),
                            ),
                            AnimatedSize(
                              duration: 280.ms,
                              curve: Curves.easeOutCubic,
                              child: _showEmail
                                  ? Column(
                                      children: [
                                        const SizedBox(height: 18),
                                        TextFormField(
                                          controller: _email,
                                          keyboardType: TextInputType.emailAddress,
                                          decoration: const InputDecoration(labelText: 'Email'),
                                          validator: (v) {
                                            if (!_showEmail) return null;
                                            if (v == null || v.trim().isEmpty) return 'Enter your email';
                                            if (!v.contains('@')) return 'Enter a valid email';
                                            return null;
                                          },
                                        ),
                                        const SizedBox(height: 12),
                                        TextFormField(
                                          controller: _password,
                                          obscureText: _obscure,
                                          decoration: InputDecoration(
                                            labelText: 'Password',
                                            suffixIcon: Tooltip(
                                              message: _obscure ? 'View password' : 'Hide password',
                                              child: IconButton(
                                                onPressed: () => setState(() => _obscure = !_obscure),
                                                icon: Icon(
                                                  _obscure
                                                      ? Icons.visibility_outlined
                                                      : Icons.visibility_off_outlined,
                                                  size: 22,
                                                  color: AppColors.textSecondary,
                                                ),
                                                tooltip: _obscure ? 'View password' : 'Hide password',
                                              ),
                                            ),
                                          ),
                                          validator: (v) {
                                            if (!_showEmail) return null;
                                            return (v == null || v.isEmpty) ? 'Enter your password' : null;
                                          },
                                          onFieldSubmitted: (_) => _submit(),
                                        ),
                                        const SizedBox(height: 18),
                                        ElevatedButton(
                                          onPressed: auth.busy ? null : _submit,
                                          child: const Text('Sign in with email'),
                                        ),
                                      ],
                                    )
                                  : const SizedBox.shrink(),
                            ),
                          ],
                        ),
                      ).animate().fadeIn(delay: 200.ms, duration: 500.ms).slideY(begin: 0.06),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: () => setState(() => _showEmail = !_showEmail),
                        child: Text(_showEmail ? 'Hide email sign in' : 'Use email instead'),
                      ),
                      if (auth.errorMessage != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          auth.errorMessage!,
                          textAlign: TextAlign.center,
                          style: AppTheme.host(fontSize: 13, color: AppColors.danger, height: 1.4),
                        ).animate().fadeIn().shake(hz: 2, offset: const Offset(2, 0)),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
