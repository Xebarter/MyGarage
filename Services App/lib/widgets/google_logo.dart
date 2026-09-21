import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Multicolor Google "G" mark for auth buttons (brand-accurate SVG).
class GoogleLogo extends StatelessWidget {
  const GoogleLogo({super.key, this.size = 20});

  final double size;

  static const _asset = 'assets/images/google_g.svg';

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: SvgPicture.asset(
        _asset,
        width: size,
        height: size,
        fit: BoxFit.contain,
        semanticsLabel: 'Google',
      ),
    );
  }
}
