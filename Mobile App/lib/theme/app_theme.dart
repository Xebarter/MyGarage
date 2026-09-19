import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design tokens — sunlit ivory, jewel emerald, champagne gold.
class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF0E9A6A);
  static const Color primaryDeep = Color(0xFF087A53);
  static const Color primarySoft = Color(0xFFD3F6E6);
  static const Color onPrimary = Color(0xFFFFFBF4);

  static const Color success = Color(0xFF1A9A62);
  static const Color successSoft = Color(0xFFDFF6EA);
  static const Color warning = Color(0xFFD4A017);
  static const Color warningSoft = Color(0xFFF8EFC8);
  static const Color danger = Color(0xFFD4523E);
  static const Color dangerSoft = Color(0xFFF8E4DF);

  /// Sunlit ivory page wash.
  static const Color background = Color(0xFFFFF6EA);
  static const Color backgroundLift = Color(0xFFFFFBF4);
  static const Color surface = Color(0xFFFFFEFB);
  static const Color surfaceHigh = Color(0xFFFFFFFF);
  static const Color surfaceMuted = Color(0xFFF6EDDF);

  static const Color border = Color(0xFFECDCC6);
  static const Color borderSoft = Color(0xFFF4E9D8);
  static const Color borderStrong = Color(0xFFD9C4A6);

  static const Color textPrimary = Color(0xFF1A241F);
  static const Color textSecondary = Color(0xFF4A5C54);
  static const Color textMuted = Color(0xFF7A8B82);

  static const Color glow = Color(0xFFE8C56B);
  static const Color ink = Color(0xFF12241C);
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

  static const SystemUiOverlayStyle systemUi = SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    statusBarBrightness: Brightness.light,
    systemNavigationBarColor: AppColors.background,
    systemNavigationBarIconBrightness: Brightness.dark,
  );

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
          color: AppColors.ink.withValues(alpha: 0.04),
          blurRadius: 28,
          offset: const Offset(0, 12),
          spreadRadius: -4,
        ),
        BoxShadow(
          color: AppColors.ink.withValues(alpha: 0.025),
          blurRadius: 8,
          offset: const Offset(0, 2),
        ),
      ];

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: AppColors.ink.withValues(alpha: 0.04),
          blurRadius: 18,
          offset: const Offset(0, 8),
          spreadRadius: -2,
        ),
      ];

  static List<BoxShadow> get navShadow => [
        BoxShadow(
          color: AppColors.ink.withValues(alpha: 0.06),
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
        onPrimary: AppColors.onPrimary,
        secondary: AppColors.primaryDeep,
        onSecondary: AppColors.onPrimary,
        surface: AppColors.surface,
        onSurface: AppColors.textPrimary,
        surfaceTint: Color(0x00000000),
        error: AppColors.danger,
        onError: AppColors.onPrimary,
        outline: AppColors.border,
      ),
      canvasColor: AppColors.background,
      cardColor: AppColors.surface,
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
        titleSpacing: 16,
        systemOverlayStyle: systemUi,
        titleTextStyle: host(
          fontSize: 22,
          fontWeight: FontWeight.w700,
          color: AppColors.textPrimary,
          letterSpacing: -0.4,
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
          foregroundColor: AppColors.onPrimary,
          elevation: 0,
          shadowColor: AppColors.primary.withValues(alpha: 0.22),
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
        foregroundColor: AppColors.onPrimary,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.transparent,
        elevation: 0,
        height: 64,
        indicatorColor: AppColors.primarySoft,
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
        contentTextStyle: host(color: AppColors.onPrimary, fontSize: 14, fontWeight: FontWeight.w500),
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
