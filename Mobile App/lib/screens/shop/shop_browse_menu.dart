import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../models/models.dart';
import '../../theme/app_theme.dart';

/// Opens the shop category browser — same structure/behavior as the web
/// `AddItemsSidebar` (left panel, expandable tree, search as flat list).
Future<void> showShopBrowseMenu(
  BuildContext context, {
  required List<ShopCategoryNode> tree,
  required Future<List<ShopCategoryNode>> Function()? onReloadTree,
  VoidCallback? onShopAll,
}) {
  return showGeneralDialog<void>(
    context: context,
    barrierDismissible: true,
    barrierLabel: 'Close categories',
    barrierColor: Colors.black.withValues(alpha: 0.20),
    transitionDuration: const Duration(milliseconds: 200),
    pageBuilder: (ctx, animation, secondaryAnimation) {
      return Align(
        alignment: Alignment.centerLeft,
        child: _ShopBrowseSidebar(
          initialTree: tree,
          onReloadTree: onReloadTree,
          onShopAll: onShopAll,
        ),
      );
    },
    transitionBuilder: (ctx, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(-1, 0),
          end: Offset.zero,
        ).animate(curved),
        child: child,
      );
    },
  );
}

class _ShopBrowseSidebar extends StatefulWidget {
  const _ShopBrowseSidebar({
    required this.initialTree,
    this.onReloadTree,
    this.onShopAll,
  });

  final List<ShopCategoryNode> initialTree;
  final Future<List<ShopCategoryNode>> Function()? onReloadTree;
  final VoidCallback? onShopAll;

  @override
  State<_ShopBrowseSidebar> createState() => _ShopBrowseSidebarState();
}

class _ShopBrowseSidebarState extends State<_ShopBrowseSidebar> {
  final _search = TextEditingController();

  List<ShopCategoryNode> _tree = [];
  bool _loading = false;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _tree = widget.initialTree;
    if (_tree.isEmpty) {
      // ignore: discarded_futures
      _reload();
    }
    _search.addListener(() {
      setState(() => _query = _search.text);
    });
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    final loader = widget.onReloadTree;
    if (loader == null) {
      setState(() {
        _error = _tree.isEmpty ? 'No categories loaded.' : null;
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final next = await loader();
      if (!mounted) return;
      setState(() {
        _tree = next;
        _loading = false;
        _error = next.isEmpty ? 'No categories loaded.' : null;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = 'No categories loaded.';
      });
    }
  }

  void _close() => Navigator.of(context).pop();

  void _openCategory(String title) {
    final name = title.trim();
    if (name.isEmpty) return;
    final router = GoRouter.of(context);
    _close();
    router.push('/shop/category/${Uri.encodeComponent(name)}');
  }

  void _viewAllProducts() {
    _close();
    widget.onShopAll?.call();
  }

  List<ShopCategorySearchHit> get _flatRows {
    final rows = <ShopCategorySearchHit>[];

    void walk(List<ShopCategoryNode> nodes, List<String> ancestors) {
      for (final n in nodes) {
        final title = n.title.trim();
        if (title.isEmpty) continue;
        rows.add(ShopCategorySearchHit(
          title: title,
          breadcrumb: ancestors.join(' › '),
        ));
        if (n.children.isNotEmpty) {
          walk(n.children, [...ancestors, title]);
        }
      }
    }

    walk(_tree, const []);
    return rows;
  }

  List<ShopCategorySearchHit> _filteredSearchRows(String raw) {
    final n = raw.trim().toLowerCase();
    if (n.isEmpty) return const [];
    final filtered = _flatRows
        .where(
          (r) =>
              r.title.toLowerCase().contains(n) ||
              r.breadcrumb.toLowerCase().contains(n),
        )
        .toList();

    filtered.sort((a, b) {
      int scoreTitle(String t) {
        final s = t.toLowerCase();
        if (s == n) return 0;
        if (s.startsWith(n)) return 1;
        if (s.contains(n)) return 2;
        return 3;
      }

      final ra = [
        scoreTitle(a.title),
        a.breadcrumb.toLowerCase().contains(n) ? 2 : 4,
      ].reduce((x, y) => x < y ? x : y);
      final rb = [
        scoreTitle(b.title),
        b.breadcrumb.toLowerCase().contains(n) ? 2 : 4,
      ].reduce((x, y) => x < y ? x : y);
      if (ra != rb) return ra.compareTo(rb);
      return a.title.toLowerCase().compareTo(b.title.toLowerCase());
    });
    return filtered;
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.sizeOf(context);
    final topPad = MediaQuery.paddingOf(context).top;
    // Web: w-[min(100vw-1rem,340px)] max-w-[86vw], full remaining height under header.
    final panelWidth = (size.width - 16).clamp(0.0, 340.0);
    final maxW = size.width * 0.86;
    final width = panelWidth < maxW ? panelWidth : maxW;

    final trimmed = _query.trim();
    final listMode = trimmed.isNotEmpty;

    return Material(
      color: AppColors.surface,
      elevation: 16,
      shadowColor: AppColors.ink.withValues(alpha: 0.18),
      child: SizedBox(
        width: width,
        height: size.height,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(height: topPad),
            // Header — matches web copy and layout
            Container(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Find parts',
                              style: AppTheme.host(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'Search the menu, then open a category.',
                              style: AppTheme.host(
                                fontSize: 11,
                                height: 1.35,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      TextButton(
                        onPressed: _close,
                        style: TextButton.styleFrom(
                          minimumSize: Size.zero,
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          foregroundColor: AppColors.textMuted,
                        ),
                        child: Text(
                          'Close',
                          style: AppTheme.host(fontSize: 12, color: AppColors.textMuted),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: _viewAllProducts,
                    child: Text(
                      'View all products',
                      style: AppTheme.host(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _search,
                    textInputAction: TextInputAction.search,
                    style: AppTheme.host(fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'e.g. brake pads, oil filter…',
                      hintStyle: AppTheme.host(fontSize: 14, color: AppColors.textMuted),
                      prefixIcon: const Icon(
                        Icons.search_rounded,
                        size: 18,
                        color: AppColors.textMuted,
                      ),
                      isDense: true,
                      filled: true,
                      fillColor: AppColors.background,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: AppColors.border),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: BorderSide(
                          color: AppColors.primary.withValues(alpha: 0.45),
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(child: _buildBody(listMode, trimmed)),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(bool listMode, String trimmedQuery) {
    if (_loading && _tree.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _pulseBar(widthFactor: 0.66),
          const SizedBox(height: 12),
          _pulseBar(widthFactor: 0.75),
          const SizedBox(height: 12),
          _pulseBar(widthFactor: 0.5),
        ],
      );
    }

    if (_error != null && _tree.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _error!,
              style: AppTheme.host(fontSize: 13.5, color: AppColors.textMuted),
            ),
            const SizedBox(height: 12),
            TextButton(onPressed: _reload, child: const Text('Retry')),
          ],
        ),
      );
    }

    if (listMode) {
      final rows = _filteredSearchRows(trimmedQuery);
      if (rows.isEmpty) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            'No categories match “$trimmedQuery”. Try a shorter word (for example “brake” or “filter”).',
            style: AppTheme.host(fontSize: 13.5, color: AppColors.textMuted, height: 1.4),
          ),
        );
      }
      return ListView.builder(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 24),
        itemCount: rows.length,
        itemBuilder: (context, i) {
          final row = rows[i];
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () => _openCategory(row.title),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.transparent),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (row.breadcrumb.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 2),
                          child: Text(
                            row.breadcrumb,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: AppTheme.host(
                              fontSize: 11,
                              height: 1.3,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ),
                      Text(
                        row.title,
                        style: AppTheme.host(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          height: 1.35,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(8, 8, 8, 16),
      child: _BrowseTree(
        nodes: _tree,
        depth: 0,
        onOpenCategory: _openCategory,
      ),
    );
  }

  Widget _pulseBar({required double widthFactor}) {
    return FractionallySizedBox(
      widthFactor: widthFactor,
      alignment: Alignment.centerLeft,
      child: Container(
        height: 14,
        decoration: BoxDecoration(
          color: AppColors.surfaceMuted,
          borderRadius: BorderRadius.circular(4),
        ),
      ),
    );
  }
}

/// Nested expandable tree matching web `BrowseTree` / `<details>`.
/// Chevron toggles expand; title link opens category (same as CategoryLink).
class _BrowseTree extends StatelessWidget {
  const _BrowseTree({
    required this.nodes,
    required this.depth,
    required this.onOpenCategory,
  });

  final List<ShopCategoryNode> nodes;
  final int depth;
  final ValueChanged<String> onOpenCategory;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < nodes.length; i++)
          _BrowseTreeItem(
            node: nodes[i],
            depth: depth,
            onOpenCategory: onOpenCategory,
          ),
      ],
    );
  }
}

class _BrowseTreeItem extends StatefulWidget {
  const _BrowseTreeItem({
    required this.node,
    required this.depth,
    required this.onOpenCategory,
  });

  final ShopCategoryNode node;
  final int depth;
  final ValueChanged<String> onOpenCategory;

  @override
  State<_BrowseTreeItem> createState() => _BrowseTreeItemState();
}

class _BrowseTreeItemState extends State<_BrowseTreeItem> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final node = widget.node;
    final hasKids = node.hasChildren;

    if (!hasKids) {
      // Leaf: indented like web pl-8
      return Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(6),
          onTap: () => widget.onOpenCategory(node.title),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(32, 8, 8, 8),
            child: Text(
              node.title,
              style: AppTheme.host(
                fontSize: 14,
                height: 1.35,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // › rotates when open (web summary chevron)
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(6),
                onTap: () => setState(() => _open = !_open),
                child: SizedBox(
                  width: 24,
                  height: 36,
                  child: Center(
                    child: AnimatedRotation(
                      turns: _open ? 0.25 : 0,
                      duration: const Duration(milliseconds: 160),
                      child: Text(
                        '›',
                        style: AppTheme.host(
                          fontSize: 14,
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            // Title is a CategoryLink — opens category, does not only expand
            Expanded(
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(6),
                  onTap: () => widget.onOpenCategory(node.title),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    child: Text(
                      node.title,
                      style: AppTheme.host(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        height: 1.35,
                        color: AppColors.textPrimary,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
        if (_open)
          Padding(
            padding: const EdgeInsets.only(left: 2, top: 2),
            child: DecoratedBox(
              decoration: const BoxDecoration(
                border: Border(
                  left: BorderSide(color: AppColors.borderSoft, width: 1),
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.only(left: 10),
                child: _BrowseTree(
                  nodes: node.children,
                  depth: widget.depth + 1,
                  onOpenCategory: widget.onOpenCategory,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
