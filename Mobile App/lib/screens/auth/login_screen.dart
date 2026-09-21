import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../auth/auth_return_to.dart';
import '../../auth/phone.dart';
import '../../providers/auth_controller.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_brand_logo.dart';
import '../../widgets/google_logo.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _register = false;
  bool _obscure = true;
  bool _showEmail = false;
  bool _otpSent = false;
  String _intent = 'phone';
  int _resendIn = 0;
  Timer? _resendTimer;
  AuthController? _auth;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _auth = context.read<AuthController>();
      _auth!.addListener(_onAuthChanged);
      _leaveIfAuthenticated();
    });
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _auth?.removeListener(_onAuthChanged);
    _phone.dispose();
    _otp.dispose();
    _email.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  void _onAuthChanged() => _leaveIfAuthenticated();

  void _leaveIfAuthenticated() {
    if (!mounted) return;
    final auth = context.read<AuthController>();
    if (auth.status != AuthStatus.authenticated) return;
    final fromQuery = GoRouterState.of(context).uri.queryParameters['next'];
    final stored = AuthReturnTo.consumeSync();
    final next = AuthReturnTo.isSafePath(fromQuery) ? fromQuery : stored;
    if (context.canPop()) {
      context.pop();
      return;
    }
    context.go(next ?? '/services');
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
    final auth = context.read<AuthController>();
    if (_register) {
      await auth.signUp(_email.text, _password.text, _name.text);
    } else {
      await auth.signIn(_email.text, _password.text);
    }
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
    final title = _otpSent
        ? 'Enter the code'
        : _register && _showEmail
            ? 'Create your account'
            : 'Welcome back';
    final subtitle = _otpSent
        ? 'Sent to ${formatE164Display(_phone.text)}'
        : _register && _showEmail
            ? 'Save your garage, orders, and service requests in one place.'
            : 'Sign in with your phone number';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        leading: IconButton(
          tooltip: 'Close',
          onPressed: () {
            if (_otpSent) {
              _changeNumber();
              return;
            }
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/services');
            }
          },
          icon: Icon(_otpSent ? Icons.arrow_back_rounded : Icons.close_rounded),
        ),
      ),
      body: SafeArea(
        top: false,
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(28, 8, 28, 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: AppBrandLogo(size: 56))
                        .animate()
                        .fadeIn(duration: 400.ms),
                    const SizedBox(height: 22),
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: AppTheme.host(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.6,
                      ),
                    ).animate().fadeIn(delay: 40.ms, duration: 400.ms),
                    const SizedBox(height: 8),
                    Text(
                      subtitle,
                      textAlign: TextAlign.center,
                      style: AppTheme.host(
                        fontSize: 15,
                        color: AppColors.textSecondary,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 36),
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
                                fontWeight: FontWeight.w600,
                                color: AppColors.textMuted,
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
                      ).animate().fadeIn(delay: 80.ms, duration: 400.ms),
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
                    if (!_otpSent)
                      AnimatedSize(
                        duration: 280.ms,
                        curve: Curves.easeOutCubic,
                        alignment: Alignment.topCenter,
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
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                      ),
                                      const Expanded(child: Divider()),
                                    ],
                                  ),
                                  const SizedBox(height: 20),
                                  if (_register) ...[
                                    TextFormField(
                                      controller: _name,
                                      textCapitalization: TextCapitalization.words,
                                      textInputAction: TextInputAction.next,
                                      decoration: const InputDecoration(labelText: 'Full name'),
                                      validator: (v) {
                                        if (_intent != 'email' || !_register) return null;
                                        return (v == null || v.trim().isEmpty)
                                            ? 'Enter your name'
                                            : null;
                                      },
                                    ),
                                    const SizedBox(height: 12),
                                  ],
                                  TextFormField(
                                    controller: _email,
                                    keyboardType: TextInputType.emailAddress,
                                    autocorrect: false,
                                    textInputAction: TextInputAction.next,
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
                                    textInputAction: TextInputAction.done,
                                    onFieldSubmitted: (_) => _submitEmail(),
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
                                      if (v == null || v.isEmpty) return 'Enter your password';
                                      if (_register && v.length < 6) {
                                        return 'Use at least 6 characters';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 18),
                                  ElevatedButton(
                                    onPressed: auth.busy ? null : _submitEmail,
                                    child: auth.busy
                                        ? const SizedBox(
                                            width: 22,
                                            height: 22,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                              color: Colors.white,
                                            ),
                                          )
                                        : Text(_register ? 'Create account' : 'Sign in with email'),
                                  ),
                                ],
                              )
                            : const SizedBox.shrink(),
                      ),
                    if (!_otpSent) ...[
                      const SizedBox(height: 16),
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
                      TextButton(
                        onPressed: () => setState(() {
                          _register = !_register;
                          _showEmail = true;
                        }),
                        child: Text(
                          _register ? 'Already have an account? Sign in' : 'Need an account? Sign up',
                          style: AppTheme.host(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                    if (auth.errorMessage != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        auth.errorMessage!,
                        textAlign: TextAlign.center,
                        style: AppTheme.host(fontSize: 13, color: AppColors.danger, height: 1.4),
                      ),
                    ],
                    if (!auth.configured)
                      Padding(
                        padding: const EdgeInsets.only(top: 16),
                        child: Text(
                          'Sign-in is not configured on this build.',
                          textAlign: TextAlign.center,
                          style: AppTheme.host(color: AppColors.danger, fontSize: 13),
                        ),
                      ),
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
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: busy ? null : onPressed,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          height: 54,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _border),
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
