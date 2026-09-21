import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/phone.dart';
import '../providers/auth_controller.dart';
import '../theme/app_theme.dart';
import '../utils/user_facing_error.dart';

/// Name collection after phone sign-in, then a one-shot welcome.
class BuyerSessionHost extends StatelessWidget {
  const BuyerSessionHost({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    if (auth.status != AuthStatus.authenticated) {
      return const SizedBox.shrink();
    }
    if (auth.needsDisplayName) {
      return const _CollectNameOverlay();
    }
    if (auth.shouldShowWelcome) {
      return const _WelcomeOverlay();
    }
    return const SizedBox.shrink();
  }
}

class _CollectNameOverlay extends StatefulWidget {
  const _CollectNameOverlay();

  @override
  State<_CollectNameOverlay> createState() => _CollectNameOverlayState();
}

class _CollectNameOverlayState extends State<_CollectNameOverlay> {
  final _name = TextEditingController();
  final _focus = FocusNode();
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void dispose() {
    _name.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final trimmed = _name.text.trim();
    if (trimmed.length < 2) {
      setState(() => _error = 'Enter your name.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await context.read<AuthController>().saveDisplayName(trimmed);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = userFacingError(e, fallback: 'Could not save your name.'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.45),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 22),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppRadii.xl),
                border: Border.all(color: AppColors.border),
                boxShadow: AppTheme.softShadow,
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(22, 22, 22, 18),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'What’s your name?',
                      style: AppTheme.host(fontSize: 20, fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'We’ll show this on your profile and when we welcome you back.',
                      style: AppTheme.host(fontSize: 13.5, color: AppColors.textSecondary, height: 1.35),
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _name,
                      focusNode: _focus,
                      textCapitalization: TextCapitalization.words,
                      textInputAction: TextInputAction.done,
                      autofillHints: const [AutofillHints.name],
                      enabled: !_busy,
                      onSubmitted: (_) => _save(),
                      decoration: const InputDecoration(labelText: 'Full name'),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _error!,
                        style: AppTheme.host(fontSize: 13, color: AppColors.danger),
                      ),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _busy ? null : _save,
                        child: _busy
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Continue'),
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

class _WelcomeOverlay extends StatefulWidget {
  const _WelcomeOverlay();

  @override
  State<_WelcomeOverlay> createState() => _WelcomeOverlayState();
}

class _WelcomeOverlayState extends State<_WelcomeOverlay> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(seconds: 4), _dismiss);
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _dismiss() {
    if (!mounted) return;
    context.read<AuthController>().markWelcomeShown();
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthController>();
    final first = firstGivenName(auth.displayName);
    final isNew = auth.welcomeIsNewAccount;
    final title = first.isEmpty
        ? (isNew ? 'Welcome to MyGarage' : 'Welcome back')
        : (isNew ? 'Welcome to MyGarage, $first' : 'Welcome back, $first');

    return Material(
      color: Colors.black.withValues(alpha: 0.35),
      child: GestureDetector(
        onTap: _dismiss,
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 380),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 22),
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(AppRadii.xl),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppTheme.softShadow,
                ),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(22, 24, 22, 18),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: AppTheme.host(fontSize: 20, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        isNew
                            ? 'Your account is ready. Shop parts or book a service anytime.'
                            : 'Good to see you again.',
                        textAlign: TextAlign.center,
                        style: AppTheme.host(fontSize: 14, color: AppColors.textSecondary, height: 1.35),
                      ),
                      const SizedBox(height: 16),
                      TextButton(
                        onPressed: _dismiss,
                        child: const Text('Continue'),
                      ),
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
