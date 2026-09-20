import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../theme/app_theme.dart';
import '../../widgets/app_menu.dart';
import '../../widgets/ui.dart';

const kSupplierFooterPaths = ['/orders', '/products', '/profile'];

class MainShell extends StatelessWidget {
  const MainShell({
    super.key,
    required this.body,
    required this.onFooterSelected,
    this.footerIndex,
  });

  final Widget body;
  final int? footerIndex;
  final ValueChanged<int> onFooterSelected;

  @override
  Widget build(BuildContext context) {
    return AppMenuScope(
      open: () => showSupplierAppMenu(context),
      child: Scaffold(
        backgroundColor: AppColors.background,
        extendBody: true,
        body: body,
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
              child: SizedBox(
                height: 64,
                child: Row(
                  children: [
                    _FooterTab(
                      selected: footerIndex == 0,
                      icon: Icons.shopping_bag_outlined,
                      selectedIcon: Icons.shopping_bag_rounded,
                      label: 'Orders',
                      onTap: () => onFooterSelected(0),
                    ),
                    _FooterTab(
                      selected: footerIndex == 1,
                      icon: Icons.inventory_2_outlined,
                      selectedIcon: Icons.inventory_2_rounded,
                      label: 'Products',
                      onTap: () => onFooterSelected(1),
                    ),
                    _FooterTab(
                      selected: footerIndex == 2,
                      icon: Icons.person_outline_rounded,
                      selectedIcon: Icons.person_rounded,
                      label: 'Profile',
                      onTap: () => onFooterSelected(2),
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

class _FooterTab extends StatelessWidget {
  const _FooterTab({
    required this.selected,
    required this.icon,
    required this.selectedIcon,
    required this.label,
    required this.onTap,
  });

  final bool selected;
  final IconData icon;
  final IconData selectedIcon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.textMuted;
    return Expanded(
      child: InkWell(
        onTap: () {
          HapticFeedback.selectionClick();
          onTap();
        },
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              curve: Curves.easeOutCubic,
              width: 56,
              height: 32,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: selected ? AppColors.primarySoft : Colors.transparent,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(selected ? selectedIcon : icon, size: 22, color: color),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: AppTheme.host(
                fontSize: 11,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                color: color,
                letterSpacing: 0.1,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shell for hamburger destinations so the pill footer stays visible.
class MenuShell extends StatelessWidget {
  const MenuShell({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return MainShell(
      footerIndex: null,
      onFooterSelected: (index) => context.go(kSupplierFooterPaths[index]),
      body: child,
    );
  }
}

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
