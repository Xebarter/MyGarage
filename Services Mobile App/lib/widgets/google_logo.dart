import 'package:flutter/material.dart';

/// Official multicolor Google "G" mark for auth buttons.
class GoogleLogo extends StatelessWidget {
  const GoogleLogo({super.key, this.size = 20});

  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _GoogleLogoPainter()),
    );
  }
}

class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = size.width * 0.18
      ..strokeCap = StrokeCap.butt;

    final c = Offset(size.width / 2, size.height / 2);
    final r = size.width * 0.36;
    final rect = Rect.fromCircle(center: c, radius: r);

    stroke.color = const Color(0xFF4285F4);
    canvas.drawArc(rect, -0.55, 1.7, false, stroke);
    stroke.color = const Color(0xFF34A853);
    canvas.drawArc(rect, 1.15, 1.25, false, stroke);
    stroke.color = const Color(0xFFFBBC05);
    canvas.drawArc(rect, 2.4, 0.95, false, stroke);
    stroke.color = const Color(0xFFEA4335);
    canvas.drawArc(rect, 3.35, 1.05, false, stroke);

    final bar = Paint()..color = const Color(0xFF4285F4);
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(size.width * 0.48, size.height * 0.42, size.width * 0.38, size.height * 0.16),
        const Radius.circular(1.5),
      ),
      bar,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
