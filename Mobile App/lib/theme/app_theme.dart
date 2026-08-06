import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens for the provider app — cool slate neutrals, confident blue.
class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF1E4ED8);
  static const Color primaryDeep = Color(0xFF1E3A8A);
  static const Color primarySoft = Color(0xFFDBEAFE);
  static const Color success = Color(0xFF047857);
  static const Color successSoft = Color(0xFFD1FAE5);
  static const Color warning = Color(0xFFB45309);
  static const Color warningSoft = Color(0xFFFEF3C7);
  static const Color danger = Color(0xFFB91C1C);
  static const Color dangerSoft = Color(0xFFFEE2E2);

  /// Atmospheric page wash (not flat white, not cream).
  static const Color background = Color(0xFFF2F4F8);
  static const Color backgroundLift = Color(0xFFFCFCFE);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceHigh = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF8FAFC);

  static const Color border = Color(0xFFE2E8F0);
  static const Color borderSoft = Color(0xFFEEF2F7);
  static const Color borderStrong = Color(0xFFCBD5E1);

  static const Color textPrimary = Color(0xFF0B1220);
  static const Color textSecondary = Color(0xFF475569);
  static const Color textMuted = Color(0xFF8B9BB0);

  static const Color glow = Color(0xFF93C5FD);
  static const Color ink = Color(0xFF0B1220);
}

class AppRadii {
  AppRadii._();

  static const double sm = 10;
  static const double md = 14;
  static const double lg = 18;
  static const double xl = 22;
  static const double xxl = 28;
  static const double pill = 999;
}

class AppTheme {
  AppTheme._();

  static String get fontFamily => GoogleFonts.hostGrotesk().fontFamily!;

  static TextStyle host({
    double? fontSize,
    FontWeight? fontWeight,
    Color? color,
    double? height,
    double? letterSpacing,
  }) {
    return GoogleFonts.hostGrotesk(
      fontSize: fontSize,
      fontWeight: fontWeight,
      color: color,
      height: height,
      letterSpacing: letterSpacing,
    );
  }

  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: AppColors.ink.withValues(alpha: 0.045),
          blurRadius: 28,
          offset: const Offset(0, 12),
          spreadRadius: -4,
        ),
        BoxShadow(
          color: AppColors.ink.withValues(alpha: 0.03),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: AppColors.ink.withValues(alpha: 0.05),
          blurRadius: 20,
          offset: const Offset(0, 8),
          spreadRadius: -2,
        ),
      ];

  static List<BoxShadow> get navShadow => [
        BoxShadow(
          color: AppColors.ink.withValues(alpha: 0.08),
          blurRadius: 24,
          offset: const Offset(0, -4),
        ),
      ];

  /// Primary app theme (light).
  static ThemeData get light {
    final baseText = ThemeData(brightness: Brightness.light).textTheme;
    final textTheme = GoogleFonts.hostGroteskTextTheme(baseText).apply(
      bodyColor: AppColors.textPrimary,
      displayColor: AppColors.textPrimary,
    );

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.light(
        primary: AppColors.primary,
        onPrimary: Colors.white,
        secondary: AppColors.primaryDeep,
        surface: AppColors.surface,
        onSurface: AppColors.textPrimary,
        error: AppColors.danger,
        outline: AppColors.border,
      ),
      fontFamily: fontFamily,
      textTheme: textTheme,
      primaryTextTheme: textTheme,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        titleTextStyle: host(
          fontSize: 26,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          letterSpacing: -0.5,
        ),
        iconTheme: const IconThemeData(color: AppColors.textPrimary, size: 22),
        actionsIconTheme: const IconThemeData(color: AppColors.textSecondary, size: 22),
      ),
      dividerTheme: const DividerThemeData(color: AppColors.borderSoft, thickness: 1, space: 1),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceMuted,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: const BorderSide(color: AppColors.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppRadii.md),
          borderSide: const BorderSide(color: AppColors.danger),
        ),
        labelStyle: host(color: AppColors.textMuted, fontSize: 14),
        hintStyle: host(color: AppColors.textMuted, fontSize: 15),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shadowColor: AppColors.primary.withValues(alpha: 0.28),
          minimumSize: const Size.fromHeight(54),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.md)),
          textStyle: host(fontSize: 15, fontWeight: FontWeight.w600, letterSpacing: -0.1),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.textPrimary,
          minimumSize: const Size.fromHeight(54),
          side: const BorderSide(color: AppColors.borderStrong),
          backgroundColor: AppColors.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.md)),
          textStyle: host(fontSize: 15, fontWeight: FontWeight.w600),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.textSecondary,
          textStyle: host(fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.transparent,
        elevation: 0,
        height: 64,
        indicatorColor: AppColors.primary.withValues(alpha: 0.12),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return host(
            fontSize: 11,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? AppColors.primary : AppColors.textMuted,
            letterSpacing: 0.1,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            size: 22,
            color: selected ? AppColors.primary : AppColors.textMuted,
          );
        }),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: AppColors.ink,
        contentTextStyle: host(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w500),
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.md)),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: AppColors.surfaceHigh,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.xl)),
        titleTextStyle: host(fontSize: 18, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
        contentTextStyle: host(fontSize: 14, color: AppColors.textSecondary, height: 1.45),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: AppColors.surfaceHigh,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadii.xxl)),
        ),
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: AppColors.surface,
        elevation: 8,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadii.md)),
        textStyle: host(fontSize: 14, color: AppColors.textPrimary),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.primary,
        circularTrackColor: AppColors.borderSoft,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) {
          return s.contains(WidgetState.selected) ? AppColors.primary : AppColors.borderStrong;
        }),
        trackColor: WidgetStateProperty.resolveWith((s) {
          return s.contains(WidgetState.selected)
              ? AppColors.primary.withValues(alpha: 0.35)
              : AppColors.borderSoft;
        }),
      ),
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: ZoomPageTransitionsBuilder(),
          TargetPlatform.windows: FadeUpwardsPageTransitionsBuilder(),
          TargetPlatform.macOS: ZoomPageTransitionsBuilder(),
          TargetPlatform.linux: FadeUpwardsPageTransitionsBuilder(),
        },
      ),
    );
  }

  /// Kept for compatibility with older call sites.
  static ThemeData get dark => light;
}
