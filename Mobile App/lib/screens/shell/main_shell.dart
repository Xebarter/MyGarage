import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Swipeable tab body — footer is provided by [AppShell] for all app routes.
///
/// Order: Services → Shop → Cart → Profile (and the reverse when swiping back).
class MainShell extends StatefulWidget {
  const MainShell({
    super.key,
    required this.navigationShell,
    required this.children,
  });

  final StatefulNavigationShell navigationShell;
  final List<Widget> children;

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  late final PageController _pageController = PageController(
    initialPage: widget.navigationShell.currentIndex,
  );

  @override
  void didUpdateWidget(covariant MainShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    final index = widget.navigationShell.currentIndex;
    if (!_pageController.hasClients) return;
    final current = _pageController.page?.round() ?? _pageController.initialPage;
    if (current == index) return;
    // Jump so bottom-nav skips intermediate tabs (e.g. Services → Profile).
    _pageController.jumpToPage(index);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _onPageChanged(int index) {
    if (index == widget.navigationShell.currentIndex) return;
    widget.navigationShell.goBranch(index);
  }

  @override
  Widget build(BuildContext context) {
    return PageView(
      controller: _pageController,
      onPageChanged: _onPageChanged,
      physics: const ClampingScrollPhysics(),
      children: widget.children,
    );
  }
}
