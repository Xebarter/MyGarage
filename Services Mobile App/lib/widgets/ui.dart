import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

import '../theme/app_theme.dart';

/// Solid page background (no gradients).
class AmbientBackground extends StatelessWidget {
  const AmbientBackground({super.key, required this.child, this.accent});

  final Widget child;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.background,
      child: child,
    );
  }
}

class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.onTap,
    this.highlight = false,
  });

  final Widget child;
  final EdgeInsets padding;
  final VoidCallback? onTap;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final card = AnimatedContainer(
      duration: 200.ms,
      curve: Curves.easeOutCubic,
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadii.xl),
        color: highlight ? AppColors.surface : AppColors.surface,
        border: Border.all(
          color: highlight
              ? AppColors.primary.withValues(alpha: 0.22)
              : AppColors.border.withValues(alpha: 0.95),
        ),
        boxShadow: highlight ? AppTheme.softShadow : AppTheme.cardShadow,
      ),
      child: child,
    );

    if (onTap == null) return card;
    return PressableScale(onTap: onTap!, child: card);
  }
}

class PressableScale extends StatefulWidget {
  const PressableScale({super.key, required this.child, required this.onTap});

  final Widget child;
  final VoidCallback onTap;

  @override
  State<PressableScale> createState() => _PressableScaleState();
}

class _PressableScaleState extends State<PressableScale> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      onTap: widget.onTap,
      child: AnimatedScale(
        scale: _pressed ? 0.978 : 1,
        duration: 140.ms,
        curve: Curves.easeOutCubic,
        child: widget.child,
      ),
    );
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    this.subtitle,
    this.action,
    this.icon = Icons.inbox_outlined,
  });

  final String title;
  final String? subtitle;
  final Widget? action;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 56),
      child: Column(
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: AppColors.primarySoft,
              border: Border.all(color: AppColors.border),
            ),
            child: Icon(icon, color: AppColors.primary, size: 30),
          ),
          const SizedBox(height: 22),
          Text(
            title,
            textAlign: TextAlign.center,
            style: AppTheme.host(
              fontSize: 19,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
              letterSpacing: -0.3,
            ),
          ),
          if (subtitle != null) ...[
            const SizedBox(height: 8),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: AppTheme.host(fontSize: 14, color: AppColors.textMuted, height: 1.5),
            ),
          ],
          if (action != null) ...[
            const SizedBox(height: 24),
            action!,
          ],
        ],
      ),
    ).animate().fadeIn(duration: 360.ms);
  }
}

class PageScaffold extends StatelessWidget {
  const PageScaffold({
    super.key,
    required this.title,
    required this.body,
    this.actions,
    this.floatingActionButton,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final Widget body;
  final List<Widget>? actions;
  final Widget? floatingActionButton;

  @override
  Widget build(BuildContext context) {
    return AmbientBackground(
      child: Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          titleSpacing: 20,
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: AppTheme.host(
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.55,
                ),
              ),
              if (subtitle != null) ...[
                const SizedBox(height: 2),
                Text(
                  subtitle!,
                  style: AppTheme.host(
                    fontSize: 13,
                    color: AppColors.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ],
          ),
          actions: actions
              ?.map(
                (a) => Padding(
                  padding: const EdgeInsets.only(right: 4),
                  child: a,
                ),
              )
              .toList(),
        ),
        floatingActionButton: floatingActionButton,
        body: body,
      ),
    );
  }
}

class QuietRow extends StatelessWidget {
  const QuietRow({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final row = Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: AppTheme.host(
                    fontSize: 15.5,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.15,
                  ),
                ),
                if (subtitle != null && subtitle!.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle!,
                    style: AppTheme.host(fontSize: 13, color: AppColors.textMuted, height: 1.4),
                  ),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 12),
            trailing!,
          ],
        ],
      ),
    );

    if (onTap == null) return row;
    return PressableScale(onTap: onTap!, child: row);
  }
}

class SectionLabel extends StatelessWidget {
  const SectionLabel(this.label, {super.key});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 26, bottom: 12),
      child: Row(
        children: [
          Text(
            label.toUpperCase(),
            style: AppTheme.host(
              fontSize: 11.5,
              fontWeight: FontWeight.w700,
              color: AppColors.textMuted,
              letterSpacing: 1.1,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Container(
              height: 1,
              color: AppColors.borderSoft,
            ),
          ),
        ],
      ),
    );
  }
}

class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.label, this.color = AppColors.primary});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadii.pill),
        border: Border.all(color: color.withValues(alpha: 0.16)),
      ),
      child: Text(
        label,
        style: AppTheme.host(fontSize: 11, fontWeight: FontWeight.w700, color: color, letterSpacing: 0.15),
      ),
    );
  }
}

/// Compact icon action for app bars — soft circular hit target.
class SoftIconButton extends StatelessWidget {
  const SoftIconButton({
    super.key,
    required this.icon,
    required this.onPressed,
    this.tooltip,
  });

  final IconData icon;
  final VoidCallback onPressed;
  final String? tooltip;

  @override
  Widget build(BuildContext context) {
    final btn = Material(
      color: AppColors.surface,
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: Container(
          width: 40,
          height: 40,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.border),
          ),
          child: Icon(icon, size: 20, color: AppColors.textSecondary),
        ),
      ),
    );
    if (tooltip == null) return btn;
    return Tooltip(message: tooltip!, child: btn);
  }
}
