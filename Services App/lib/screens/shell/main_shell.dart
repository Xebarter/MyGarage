import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: SafeArea(
        top: false,
        minimum: const EdgeInsets.fromLTRB(16, 0, 16, 12),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface.withValues(alpha: 0.96),
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: AppColors.border.withValues(alpha: 0.95)),
            boxShadow: AppTheme.navShadow,
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(22),
            child: NavigationBar(
              selectedIndex: navigationShell.currentIndex,
              onDestinationSelected: (index) {
                navigationShell.goBranch(
                  index,
                  initialLocation: index == navigationShell.currentIndex,
                );
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.work_outline_rounded),
                  selectedIcon: Icon(Icons.work_rounded),
                  label: 'Jobs',
                ),
                NavigationDestination(
                  icon: Icon(Icons.handyman_outlined),
                  selectedIcon: Icon(Icons.handyman_rounded),
                  label: 'Services',
                ),
                NavigationDestination(
                  icon: Icon(Icons.account_balance_wallet_outlined),
                  selectedIcon: Icon(Icons.account_balance_wallet_rounded),
                  label: 'Funds',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_outline_rounded),
                  selectedIcon: Icon(Icons.person_rounded),
                  label: 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Horizontal paging for the four root tabs.
///
/// Swipe left: Jobs → Services → Funds → Profile.
/// Swipe right reverses. Adjacent tab taps slide; longer jumps snap.
class TabSwipeView extends StatefulWidget {
  const TabSwipeView({
    super.key,
    required this.currentIndex,
    required this.onIndexChanged,
    required this.children,
  });

  final int currentIndex;
  final ValueChanged<int> onIndexChanged;
  final List<Widget> children;

  @override
  State<TabSwipeView> createState() => _TabSwipeViewState();
}

class _TabSwipeViewState extends State<TabSwipeView> {
  static const _adjacentDuration = Duration(milliseconds: 300);

  late final PageController _controller = PageController(
    initialPage: widget.currentIndex,
  );

  @override
  void didUpdateWidget(covariant TabSwipeView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.currentIndex == oldWidget.currentIndex) return;
    _syncToIndex(widget.currentIndex);
  }

  void _syncToIndex(int index) {
    if (!_controller.hasClients) return;
    final current = _controller.page?.round() ?? _controller.initialPage;
    if (current == index) return;

    // Adjacent tabs follow the finger-swipe motion. Skipping tabs jumps so
    // intermediate pages do not flash (Jobs → Profile should not parade Funds).
    if ((current - index).abs() == 1) {
      _controller.animateToPage(
        index,
        duration: _adjacentDuration,
        curve: Curves.easeOutCubic,
      );
    } else {
      _controller.jumpToPage(index);
    }
  }

  void _onPageChanged(int index) {
    if (index == widget.currentIndex) return;
    HapticFeedback.selectionClick();
    widget.onIndexChanged(index);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(
        scrollbars: false,
        overscroll: false,
        dragDevices: {
          PointerDeviceKind.touch,
          PointerDeviceKind.stylus,
          PointerDeviceKind.invertedStylus,
          PointerDeviceKind.trackpad,
          PointerDeviceKind.mouse,
        },
      ),
      child: PageView(
        controller: _controller,
        physics: const PageScrollPhysics(parent: ClampingScrollPhysics()),
        onPageChanged: _onPageChanged,
        children: [
          for (var i = 0; i < widget.children.length; i++)
            _KeepAliveTab(key: ValueKey<int>(i), child: widget.children[i]),
        ],
      ),
    );
  }
}

class _KeepAliveTab extends StatefulWidget {
  const _KeepAliveTab({super.key, required this.child});

  final Widget child;

  @override
  State<_KeepAliveTab> createState() => _KeepAliveTabState();
}

class _KeepAliveTabState extends State<_KeepAliveTab> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}
