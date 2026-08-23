import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Horizontal swipe to neighboring main tabs from shop-related stack pages.
///
/// Aligns with footer's order: Services ← (Shop) → Cart
/// - Swipe right → [leftPath] (Services)
/// - Swipe left  → [rightPath] (Cart)
class NeighborTabSwipe extends StatefulWidget {
  const NeighborTabSwipe({
    super.key,
    required this.child,
    this.leftPath = '/services',
    this.rightPath = '/cart',
    this.minVelocity = 280,
    this.minDistance = 72,
  });

  final Widget child;

  /// Tab to the left of the shop stack (Services).
  final String leftPath;

  /// Tab to the right of the shop stack (Cart).
  final String rightPath;

  final double minVelocity;
  final double minDistance;

  @override
  State<NeighborTabSwipe> createState() => _NeighborTabSwipeState();
}

class _NeighborTabSwipeState extends State<NeighborTabSwipe> {
  double _dragDx = 0;

  void _resetDrag() => _dragDx = 0;

  void _onDragEnd(DragEndDetails details) {
    final velocity = details.primaryVelocity ?? 0;
    final dx = _dragDx;
    _resetDrag();

    // Finger left → reveal page on the right (Cart).
    if (velocity < -widget.minVelocity || dx < -widget.minDistance) {
      context.go(widget.rightPath);
      return;
    }
    // Finger right → reveal page on the left (Services).
    if (velocity > widget.minVelocity || dx > widget.minDistance) {
      context.go(widget.leftPath);
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onHorizontalDragStart: (_) => _resetDrag(),
      onHorizontalDragUpdate: (details) {
        _dragDx += details.delta.dx;
      },
      onHorizontalDragEnd: _onDragEnd,
      onHorizontalDragCancel: _resetDrag,
      child: widget.child,
    );
  }
}
