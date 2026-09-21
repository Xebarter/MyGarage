import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';

import '../../auth/phone.dart';
import '../../config.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../widgets/google_logo.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key});

  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;
  bool _showEmail = false;
  bool _otpSent = false;
  String _intent = 'phone';
  int _resendIn = 0;
  Timer? _resendTimer;

  @override
  void dispose() {
    _resendTimer?.cancel();
    _phone.dispose();
    _otp.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  void _startResendCooldown() {
    _resendTimer?.cancel();
    setState(() => _resendIn = 60);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_resendIn <= 1) {
        timer.cancel();
        setState(() => _resendIn = 0);
        return;
      }
      setState(() => _resendIn -= 1);
    });
  }

  Future<void> _sendCode() async {
    setState(() => _intent = 'phone');
    if (!_formKey.currentState!.validate()) return;
    final needsCode = await context.read<AuthController>().sendPhoneOtp(_phone.text);
    if (!mounted || !needsCode) return;
    setState(() {
      _otpSent = true;
      _showEmail = false;
      _otp.clear();
    });
    _startResendCooldown();
  }

  Future<void> _verifyCode() async {
    setState(() => _intent = 'otp');
    if (!_formKey.currentState!.validate()) return;
    await context.read<AuthController>().verifyPhoneOtp(
          rawPhone: _phone.text,
          token: _otp.text,
        );
  }

  Future<void> _submitEmail() async {
    setState(() => _intent = 'email');
    if (!_formKey.currentState!.validate()) return;
    await context.read<AuthController>().signIn(_email.text, _password.text);
  }

  void _changeNumber() {
    _resendTimer?.cancel();
    setState(() {
      _otpSent = false;
      _otp.clear();
      _resendIn = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 36),
                    Center(
                      child: Image.asset(
                        'assets/images/logo_mark.png',
                        height: 64,
                        fit: BoxFit.contain,
                      ),
                    ).animate().fadeIn(duration: 400.ms),
                    const SizedBox(height: 28),
                    Text(
                      _otpSent ? 'Enter the code' : AppConfig.appName,
                      textAlign: TextAlign.center,
                      style: AppTheme.host(
                        fontSize: 32,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.7,
                      ),
                    ).animate().fadeIn(delay: 60.ms, duration: 400.ms),
                    const SizedBox(height: 8),
                    Text(
                      _otpSent
                          ? 'Sent to ${formatE164Display(_phone.text)}'
                          : 'Sign in with your phone number to manage products, orders, and payouts',
                      textAlign: TextAlign.center,
                      style: AppTheme.host(
                        fontSize: 15,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 40),
                    if (!_otpSent) ...[
                      TextFormField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.telephoneNumber],
                        onFieldSubmitted: (_) => auth.busy ? null : _sendCode(),
                        decoration: const InputDecoration(
                          labelText: 'Phone number',
                          hintText: '0700 123 456',
                        ),
                        validator: (v) {
                          if (_intent != 'phone') return null;
                          if (normalizeToE164(v ?? '') == null) {
                            return 'Enter a valid phone number';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      ElevatedButton(
                        onPressed: auth.busy ? null : _sendCode,
                        child: auth.busy
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Continue with phone'),
                      ),
                      const SizedBox(height: 28),
                      Row(
                        children: [
                          const Expanded(child: Divider()),
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            child: Text(
                              'or',
                              style: AppTheme.host(
                                fontSize: 12,
                                color: AppColors.textMuted,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                          const Expanded(child: Divider()),
                        ],
                      ),
                      const SizedBox(height: 20),
                      _GoogleSignInButton(
                        busy: auth.busy,
                        onPressed: () => context.read<AuthController>().signInWithGoogle(),
                      ).animate().fadeIn(delay: 120.ms, duration: 400.ms),
                      AnimatedSize(
                        duration: 280.ms,
                        curve: Curves.easeOutCubic,
                        child: _showEmail
                            ? Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  const SizedBox(height: 28),
                                  Row(
                                    children: [
                                      const Expanded(child: Divider()),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(horizontal: 12),
                                        child: Text(
                                          'or email',
                                          style: AppTheme.host(
                                            fontSize: 12,
                                            color: AppColors.textMuted,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                      const Expanded(child: Divider()),
                                    ],
                                  ),
                                  const SizedBox(height: 20),
                                  TextFormField(
                                    controller: _email,
                                    keyboardType: TextInputType.emailAddress,
                                    decoration: const InputDecoration(labelText: 'Email'),
                                    validator: (v) {
                                      if (_intent != 'email') return null;
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
                                      suffixIcon: IconButton(
                                        onPressed: () => setState(() => _obscure = !_obscure),
                                        icon: Icon(
                                          _obscure
                                              ? Icons.visibility_outlined
                                              : Icons.visibility_off_outlined,
                                          size: 22,
                                          color: AppColors.textSecondary,
                                        ),
                                      ),
                                    ),
                                    validator: (v) {
                                      if (_intent != 'email') return null;
                                      return (v == null || v.isEmpty) ? 'Enter your password' : null;
                                    },
                                    onFieldSubmitted: (_) => _submitEmail(),
                                  ),
                                  const SizedBox(height: 18),
                                  ElevatedButton(
                                    onPressed: auth.busy ? null : _submitEmail,
                                    child: const Text('Sign in with email'),
                                  ),
                                ],
                              )
                            : const SizedBox.shrink(),
                      ),
                      const SizedBox(height: 20),
                      TextButton(
                        onPressed: () => setState(() => _showEmail = !_showEmail),
                        child: Text(
                          _showEmail ? 'Hide email sign in' : 'Use email instead',
                          style: AppTheme.host(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ] else ...[
                      TextFormField(
                        controller: _otp,
                        keyboardType: TextInputType.number,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.oneTimeCode],
                        textAlign: TextAlign.center,
                        maxLength: 6,
                        style: AppTheme.host(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 10,
                          color: AppColors.textPrimary,
                        ),
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        onChanged: (value) {
                          if (value.replaceAll(RegExp(r'\D'), '').length == 6 && !auth.busy) {
                            _verifyCode();
                          }
                        },
                        onFieldSubmitted: (_) => auth.busy ? null : _verifyCode(),
                        decoration: const InputDecoration(
                          labelText: '6-digit code',
                          counterText: '',
                        ),
                        validator: (v) {
                          if (_intent != 'otp') return null;
                          if ((v ?? '').replaceAll(RegExp(r'\D'), '').length != 6) {
                            return 'Enter the 6-digit code';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 18),
                      ElevatedButton(
                        onPressed: auth.busy ? null : _verifyCode,
                        child: auth.busy
                            ? const SizedBox(
                                width: 22,
                                height: 22,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Text('Verify and sign in'),
                      ),
                      const SizedBox(height: 12),
                      TextButton(
                        onPressed: auth.busy || _resendIn > 0
                            ? null
                            : () async {
                                final ok = await context.read<AuthController>().sendPhoneOtp(_phone.text);
                                if (ok) _startResendCooldown();
                              },
                        child: Text(
                          _resendIn > 0 ? 'Resend code in ${_resendIn}s' : 'Resend code',
                          style: AppTheme.host(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: auth.busy ? null : _changeNumber,
                        child: Text(
                          'Use a different number',
                          style: AppTheme.host(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                    if (auth.errorMessage != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        auth.errorMessage!,
                        textAlign: TextAlign.center,
                        style: AppTheme.host(fontSize: 13, color: AppColors.danger, height: 1.4),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _GoogleSignInButton extends StatelessWidget {
  const _GoogleSignInButton({required this.busy, required this.onPressed});

  final bool busy;
  final VoidCallback onPressed;

  static const _border = Color(0xFFDADCE0);
  static const _text = Color(0xFF1F1F1F);

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        onTap: busy ? null : onPressed,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          height: 52,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _border, width: 1),
          ),
          alignment: Alignment.center,
          child: busy
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const GoogleLogo(size: 20),
                    const SizedBox(width: 12),
                    Text(
                      'Continue with Google',
                      style: AppTheme.host(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: _text,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
