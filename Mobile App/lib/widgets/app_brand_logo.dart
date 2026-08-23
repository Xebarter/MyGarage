import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Compact brand mark for page headers.
class AppBrandLogo extends StatelessWidget {
  const AppBrandLogo({
    super.key,
    this.size = 26,
  });

  final double size;

  static const assetPath = 'assets/images/logo-black.png';

  @override
  Widget build(BuildContext context) {
    final radius = size * 0.22;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: AppColors.borderSoft, width: 0.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.ink.withValues(alpha: 0.06),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Image.asset(
          assetPath,
          width: size,
          height: size,
          fit: BoxFit.cover,
          filterQuality: FilterQuality.high,
          gaplessPlayback: true,
        ),
      ),
    );
  }
}

/// Strip trailing parentheticals for cleaner UI titles, e.g.
/// "Emergency Help (I'm Stuck)" → "Emergency Help".
String cleanDisplayTitle(String title) {
  final cleaned = title
      .replaceAll(RegExp(r'\s*[\(\[][^\)\]]*[\)\]]\s*$'), '')
      .trim();
  return cleaned.isEmpty ? title.trim() : cleaned;
}

/// AppBar / page title: centered brand mark + page label.
class AppBarTitle extends StatelessWidget {
  const AppBarTitle(
    this.label, {
    super.key,
    this.maxLines = 1,
    this.logoSize = 26,
    this.cleanTitle = false,
  });

  final String label;
  final int maxLines;
  final double logoSize;
  /// When true, strips trailing "(…)" from [label].
  final bool cleanTitle;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).appBarTheme.titleTextStyle ??
        AppTheme.host(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          letterSpacing: -0.4,
        );
    final text = cleanTitle ? cleanDisplayTitle(label) : label;

    return Row(
      mainAxisSize: MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        AppBrandLogo(size: logoSize),
        const SizedBox(width: 10),
        ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.sizeOf(context).width * 0.55,
          ),
          child: Text(
            text,
            maxLines: maxLines,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
            style: style.copyWith(
              fontSize: (style.fontSize ?? 22) - 2,
              height: 1.15,
            ),
          ),
        ),
      ],
    );
  }
}

/// In-body page header (scrolls with content): logo + title, both centered.
class PageBrandHeader extends StatelessWidget {
  const PageBrandHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.logoSize = 28,
    this.titleSize = 26,
    this.padding = const EdgeInsets.fromLTRB(20, 16, 20, 8),
  });

  final String title;
  final String? subtitle;
  final double logoSize;
  final double titleSize;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: double.infinity,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                AppBrandLogo(size: logoSize),
                const SizedBox(width: 12),
                Flexible(
                  child: Text(
                    title,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: AppTheme.host(
                      fontSize: titleSize,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
          if (subtitle != null && subtitle!.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              subtitle!,
              textAlign: TextAlign.center,
              style: AppTheme.host(
                fontSize: 14,
                height: 1.4,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
