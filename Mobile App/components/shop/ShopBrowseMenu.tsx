import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchAddItemsCategories, type AddItemsCategoryNode } from '@/lib/api';
import { useAddItemsCategories } from '@/hooks/useAddItemsCategories';

const DRAWER_WIDTH = Math.min(Dimensions.get('window').width * 0.88, 360);

const PREMIUM = {
  bg: '#0B1220',
  bgElevated: '#121C2E',
  bgGlass: 'rgba(255,255,255,0.06)',
  borderGlass: 'rgba(255,255,255,0.12)',
  borderGlow: 'rgba(59,130,246,0.45)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  accent: '#3B82F6',
  accentSoft: '#60A5FA',
  gold: '#FBBF24',
};

type ShopRow = {
  title: string;
  breadcrumb: string;
};

type ShopBrowseMenuProps = {
  visible: boolean;
  selectedCategory?: string | null;
  onClose: () => void;
  onSelectCategory: (category: string | null) => void;
};

function flattenShopRows(nodes: AddItemsCategoryNode[], ancestors: string[] = []): ShopRow[] {
  const rows: ShopRow[] = [];
  for (const node of nodes) {
    rows.push({
      title: node.title,
      breadcrumb: ancestors.join(' › '),
    });
    if (node.children?.length) {
      rows.push(...flattenShopRows(node.children, [...ancestors, node.title]));
    }
  }
  return rows;
}

function filterTreeByQuery(nodes: AddItemsCategoryNode[], query: string): AddItemsCategoryNode[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return nodes;

  const result: AddItemsCategoryNode[] = [];
  for (const node of nodes) {
    const titleMatch = node.title.toLowerCase().includes(needle);
    const filteredChildren = node.children?.length ? filterTreeByQuery(node.children, query) : [];

    if (titleMatch) {
      result.push({ title: node.title, children: node.children });
    } else if (filteredChildren.length > 0) {
      result.push({ title: node.title, children: filteredChildren });
    }
  }
  return result;
}

function sortShopRows(rows: ShopRow[], needle: string): ShopRow[] {
  const n = needle.trim().toLowerCase();
  if (!n) return rows;

  return [...rows].sort((a, b) => {
    const ta = a.title.toLowerCase();
    const tb = b.title.toLowerCase();
    const score = (value: string) => {
      if (value === n) return 0;
      if (value.startsWith(n)) return 1;
      if (value.includes(n)) return 2;
      return 3;
    };
    const rankA = Math.min(score(ta), a.breadcrumb.toLowerCase().includes(n) ? 2 : 4);
    const rankB = Math.min(score(tb), b.breadcrumb.toLowerCase().includes(n) ? 2 : 4);
    if (rankA !== rankB) return rankA - rankB;
    return a.title.localeCompare(b.title);
  });
}

function LoadingSkeleton() {
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.75, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.skeletonWrap}>
      {[88, 72, 94, 66, 80].map((width, index) => (
        <Animated.View
          key={index}
          style={[styles.skeletonLine, { width: `${width}%`, opacity: pulse }]}
        />
      ))}
    </View>
  );
}

export function ShopBrowseMenu({ visible, selectedCategory, onClose, onSelectCategory }: ShopBrowseMenuProps) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [rendered, setRendered] = useState(visible);
  const [searchFocused, setSearchFocused] = useState(false);
  const { items, loading } = useAddItemsCategories();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 26,
          stiffness: 220,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!rendered) return;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setRendered(false);
    });
  }, [visible, rendered, slideAnim, backdropAnim]);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setExpanded({});
      setSearchFocused(false);
    }
  }, [visible]);

  const shopRows = useMemo(() => (items ? flattenShopRows(items) : []), [items]);
  const trimmedQuery = query.trim();
  const listMode = trimmedQuery.length > 0;

  const filteredRows = useMemo(() => {
    if (!listMode) return [];
    const n = trimmedQuery.toLowerCase();
    return sortShopRows(
      shopRows.filter((row) => row.title.toLowerCase().includes(n) || row.breadcrumb.toLowerCase().includes(n)),
      trimmedQuery,
    );
  }, [listMode, shopRows, trimmedQuery]);

  const browseTree = useMemo(() => {
    if (!items || listMode) return [];
    return filterTreeByQuery(items, '');
  }, [items, listMode]);

  function handleSelectCategory(category: string | null) {
    onSelectCategory(category);
    onClose();
  }

  function toggleExpanded(path: string) {
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  if (!rendered) return null;

  const backdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.58],
  });

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.drawerShell, { transform: [{ translateX: slideAnim }] }]}>
          <KeyboardAvoidingView
            style={[
              styles.drawer,
              {
                paddingTop: insets.top + 6,
                paddingBottom: insets.bottom + 10,
              },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.accentBar} />

            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View style={styles.headerBadge}>
                  <Ionicons name="grid-outline" size={16} color={PREMIUM.accentSoft} />
                </View>
                <View style={styles.headerCopy}>
                  <Text style={styles.title}>Categories</Text>
                  <Text style={styles.subtitle}>Browse departments or search for a part type.</Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}>
                  <Ionicons name="close" size={20} color={PREMIUM.text} />
                </Pressable>
              </View>

              {selectedCategory ? (
                <View style={styles.activeChip}>
                  <Ionicons name="checkmark-circle" size={14} color={PREMIUM.accentSoft} />
                  <Text style={styles.activeChipText} numberOfLines={1}>
                    {selectedCategory}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => handleSelectCategory(null)}
                style={({ pressed }) => [styles.viewAllBtn, pressed && styles.viewAllBtnPressed]}>
                <View style={styles.viewAllIcon}>
                  <Ionicons name="apps-outline" size={16} color={PREMIUM.accentSoft} />
                </View>
                <Text style={styles.viewAllText}>View all products</Text>
                <Ionicons name="chevron-forward" size={16} color={PREMIUM.textMuted} />
              </Pressable>

              <View
                style={[
                  styles.searchWrap,
                  searchFocused && styles.searchWrapFocused,
                ]}>
                <Ionicons name="search" size={17} color={searchFocused ? PREMIUM.accentSoft : PREMIUM.textMuted} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Search categories…"
                  placeholderTextColor={PREMIUM.textMuted}
                  style={styles.searchInput}
                  autoCorrect={false}
                  autoCapitalize="none"
                  returnKeyType="search"
                />
                {query.length > 0 ? (
                  <Pressable onPress={() => setQuery('')} hitSlop={8} style={styles.clearSearchBtn}>
                    <Ionicons name="close-circle" size={18} color={PREMIUM.textMuted} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {listMode ? `${filteredRows.length} result${filteredRows.length === 1 ? '' : 's'}` : 'Departments'}
              </Text>
              {listMode && filteredRows.length > 0 ? (
                <Text style={styles.sectionHint}>Tap to filter the shop</Text>
              ) : null}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}>
              {loading || items === null ? (
                <LoadingSkeleton />
              ) : items.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="folder-open-outline" size={28} color={PREMIUM.textMuted} />
                  <Text style={styles.emptyTitle}>No categories loaded</Text>
                  <Text style={styles.emptyText}>Check your connection and try again.</Text>
                </View>
              ) : listMode ? (
                filteredRows.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="search-outline" size={28} color={PREMIUM.textMuted} />
                    <Text style={styles.emptyTitle}>No matches</Text>
                    <Text style={styles.emptyText}>
                      Nothing matches “{trimmedQuery}”. Try “brake”, “filter”, or “oil”.
                    </Text>
                  </View>
                ) : (
                  filteredRows.map((row, index) => (
                    <SearchResultRow
                      key={`${row.title}-${row.breadcrumb}-${index}`}
                      row={row}
                      selected={selectedCategory === row.title}
                      onPress={() => handleSelectCategory(row.title)}
                    />
                  ))
                )
              ) : (
                <BrowseTree
                  nodes={browseTree}
                  depth={0}
                  pathPrefix=""
                  expanded={expanded}
                  selectedCategory={selectedCategory}
                  onToggleExpanded={toggleExpanded}
                  onSelectCategory={handleSelectCategory}
                />
              )}
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>

        <Pressable style={styles.backdropPressable} onPress={onClose} accessibilityLabel="Close menu">
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>
      </View>
    </Modal>
  );
}

function SearchResultRow({
  row,
  selected,
  onPress,
}: {
  row: ShopRow;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.searchResult,
        selected && styles.searchResultSelected,
        pressed && styles.rowPressed,
      ]}>
      <View style={styles.searchResultBody}>
        {row.breadcrumb ? (
          <Text style={styles.breadcrumb} numberOfLines={2}>
            {row.breadcrumb}
          </Text>
        ) : null}
        <Text style={[styles.resultTitle, selected && styles.resultTitleSelected]} numberOfLines={2}>
          {row.title}
        </Text>
      </View>
      <View style={[styles.resultArrow, selected && styles.resultArrowSelected]}>
        <Ionicons name="chevron-forward" size={14} color={selected ? PREMIUM.accentSoft : PREMIUM.textMuted} />
      </View>
    </Pressable>
  );
}

function BrowseTree({
  nodes,
  depth,
  pathPrefix,
  expanded,
  selectedCategory,
  onToggleExpanded,
  onSelectCategory,
}: {
  nodes: AddItemsCategoryNode[];
  depth: number;
  pathPrefix: string;
  expanded: Record<string, boolean>;
  selectedCategory?: string | null;
  onToggleExpanded: (path: string) => void;
  onSelectCategory: (category: string) => void;
}) {
  return (
    <View style={[styles.treeLevel, depth > 0 && styles.treeLevelNested]}>
      {nodes.map((node, index) => {
        const path = pathPrefix ? `${pathPrefix}/${node.title}` : node.title;
        const hasChildren = Boolean(node.children?.length);
        const isOpen = expanded[path] ?? depth < 1;
        const isSelected = selectedCategory === node.title;
        const childCount = node.children?.length ?? 0;

        return (
          <View key={`${path}-${index}`} style={styles.treeBlock}>
            <View style={styles.treeRow}>
              {hasChildren ? (
                <Pressable
                  onPress={() => onToggleExpanded(path)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.expandBtn, pressed && styles.expandBtnPressed]}>
                  <Ionicons
                    name={isOpen ? 'chevron-down' : 'chevron-forward'}
                    size={13}
                    color={isOpen ? PREMIUM.accentSoft : PREMIUM.textMuted}
                  />
                </Pressable>
              ) : (
                <View style={styles.leafDot} />
              )}

              <Pressable
                onPress={() => onSelectCategory(node.title)}
                style={({ pressed }) => [
                  styles.treeLink,
                  depth === 0 && styles.treeLinkRoot,
                  isSelected && styles.treeLinkSelected,
                  pressed && styles.rowPressed,
                ]}>
                {isSelected ? <View style={styles.selectedBar} /> : null}
                <View style={styles.treeLinkInner}>
                  {depth === 0 ? (
                    <Ionicons
                      name={hasChildren ? 'folder-outline' : 'pricetag-outline'}
                      size={15}
                      color={isSelected ? PREMIUM.accentSoft : PREMIUM.textMuted}
                      style={styles.treeIcon}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.treeTitle,
                      depth === 0 && styles.treeTitleRoot,
                      isSelected && styles.treeTitleSelected,
                    ]}
                    numberOfLines={2}>
                    {node.title}
                  </Text>
                  {hasChildren ? (
                    <View style={styles.childCountBadge}>
                      <Text style={styles.childCountText}>{childCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={isSelected ? PREMIUM.accentSoft : PREMIUM.textMuted}
                  style={styles.treeChevron}
                />
              </Pressable>
            </View>

            {hasChildren && isOpen ? (
              <BrowseTree
                nodes={node.children!}
                depth={depth + 1}
                pathPrefix={path}
                expanded={expanded}
                selectedCategory={selectedCategory}
                onToggleExpanded={onToggleExpanded}
                onSelectCategory={onSelectCategory}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdropPressable: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: '#020617',
  },
  drawerShell: {
    width: DRAWER_WIDTH,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
  },
  drawer: {
    flex: 1,
    backgroundColor: PREMIUM.bg,
    borderRightWidth: 1,
    borderRightColor: PREMIUM.borderGlass,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: PREMIUM.accent,
    opacity: 0.9,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: PREMIUM.borderGlass,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  headerCopy: {
    flex: 1,
    gap: 3,
    paddingTop: 1,
  },
  title: {
    color: PREMIUM.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: PREMIUM.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  closeBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.14)',
    borderWidth: 1,
    borderColor: PREMIUM.borderGlow,
  },
  activeChipText: {
    color: PREMIUM.accentSoft,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: PREMIUM.bgElevated,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  viewAllBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  viewAllIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  viewAllText: {
    flex: 1,
    color: PREMIUM.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  searchWrap: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PREMIUM.bgGlass,
    borderColor: PREMIUM.borderGlass,
  },
  searchWrapFocused: {
    borderColor: PREMIUM.borderGlow,
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
    color: PREMIUM.text,
    fontWeight: '500',
  },
  clearSearchBtn: {
    padding: 2,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    color: PREMIUM.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  sectionHint: {
    color: PREMIUM.textMuted,
    fontSize: 11,
  },
  content: {
    paddingHorizontal: 12,
    paddingBottom: 28,
  },
  skeletonWrap: {
    paddingHorizontal: 4,
    paddingTop: 8,
    gap: 10,
  },
  skeletonLine: {
    height: 44,
    borderRadius: 12,
    backgroundColor: PREMIUM.bgElevated,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
    gap: 8,
  },
  emptyTitle: {
    color: PREMIUM.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyText: {
    color: PREMIUM.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 8,
    backgroundColor: PREMIUM.bgElevated,
    borderColor: PREMIUM.borderGlass,
  },
  searchResultSelected: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: PREMIUM.borderGlow,
  },
  searchResultBody: {
    flex: 1,
    minWidth: 0,
  },
  breadcrumb: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 3,
    color: PREMIUM.textMuted,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
    color: PREMIUM.text,
  },
  resultTitleSelected: {
    color: PREMIUM.accentSoft,
  },
  resultArrow: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  resultArrowSelected: {
    borderColor: PREMIUM.borderGlow,
    backgroundColor: 'rgba(59,130,246,0.16)',
  },
  treeLevel: {
    gap: 4,
    paddingTop: 2,
  },
  treeLevelNested: {
    marginLeft: 14,
    marginTop: 2,
    paddingLeft: 10,
    borderLeftWidth: 1,
    borderLeftColor: PREMIUM.borderGlass,
  },
  treeBlock: {
    gap: 2,
  },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  expandBtn: {
    width: 28,
    height: 44,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
    alignSelf: 'center',
  },
  expandBtnPressed: {
    opacity: 0.8,
  },
  leafDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: PREMIUM.textMuted,
    marginLeft: 11,
    marginRight: 11,
    alignSelf: 'center',
  },
  treeLink: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: PREMIUM.bgElevated,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
    overflow: 'hidden',
  },
  treeLinkRoot: {
    backgroundColor: PREMIUM.bgGlass,
  },
  treeLinkSelected: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: PREMIUM.borderGlow,
  },
  selectedBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 999,
    backgroundColor: PREMIUM.accent,
  },
  treeLinkInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
    paddingLeft: 2,
  },
  treeIcon: {
    flexShrink: 0,
  },
  treeTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: PREMIUM.text,
  },
  treeTitleRoot: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  treeTitleSelected: {
    color: PREMIUM.accentSoft,
    fontWeight: '800',
  },
  childCountBadge: {
    minWidth: 22,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PREMIUM.bgGlass,
    borderWidth: 1,
    borderColor: PREMIUM.borderGlass,
  },
  childCountText: {
    color: PREMIUM.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  treeChevron: {
    marginLeft: 4,
    flexShrink: 0,
  },
  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
