import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export type ShopSortOption = 'featured' | 'newest' | 'price-low' | 'price-high' | 'name';
export type ShopPriceRange = 'all' | 'budget' | 'mid' | 'premium';

export type ShopFilters = {
  category: string | null;
  brand: string | null;
  priceRange: ShopPriceRange;
  sortBy: ShopSortOption;
  dealsOnly: boolean;
  inStockOnly: boolean;
};

type ShopFilterSheetProps = {
  visible: boolean;
  categories: string[];
  brands: string[];
  filters: ShopFilters;
  onClose: () => void;
  onChange: (next: ShopFilters) => void;
  onReset: () => void;
};

const SORT_OPTIONS: Array<{ value: ShopSortOption; label: string }> = [
  { value: 'featured', label: 'Featured first' },
  { value: 'newest', label: 'Newest arrivals' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'name', label: 'Name: A to Z' },
];

const PRICE_OPTIONS: Array<{ value: ShopPriceRange; label: string }> = [
  { value: 'all', label: 'All prices' },
  { value: 'budget', label: 'Below UGX 100,000' },
  { value: 'mid', label: 'UGX 100,000 - 500,000' },
  { value: 'premium', label: 'Above UGX 500,000' },
];

export function ShopFilterSheet({
  visible,
  categories,
  brands,
  filters,
  onClose,
  onChange,
  onReset,
}: ShopFilterSheetProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const setFilter = <K extends keyof ShopFilters>(key: K, value: ShopFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Filter and sort</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <FilterGroup title="Sort by">
              {SORT_OPTIONS.map((option) => (
                <SelectChip
                  key={option.value}
                  label={option.label}
                  active={filters.sortBy === option.value}
                  onPress={() => setFilter('sortBy', option.value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Category">
              <SelectChip label="All categories" active={!filters.category} onPress={() => setFilter('category', null)} />
              {categories.map((category) => (
                <SelectChip
                  key={category}
                  label={category}
                  active={filters.category === category}
                  onPress={() => setFilter('category', category)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Brand">
              <SelectChip label="All brands" active={!filters.brand} onPress={() => setFilter('brand', null)} />
              {brands.map((brand) => (
                <SelectChip
                  key={brand}
                  label={brand}
                  active={filters.brand === brand}
                  onPress={() => setFilter('brand', brand)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Price">
              {PRICE_OPTIONS.map((option) => (
                <SelectChip
                  key={option.value}
                  label={option.label}
                  active={filters.priceRange === option.value}
                  onPress={() => setFilter('priceRange', option.value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup title="Inventory">
              <ToggleRow
                label="Deals only"
                active={filters.dealsOnly}
                onPress={() => setFilter('dealsOnly', !filters.dealsOnly)}
              />
              <ToggleRow
                label="In stock only"
                active={filters.inStockOnly}
                onPress={() => setFilter('inStockOnly', !filters.inStockOnly)}
              />
            </FilterGroup>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              onPress={onReset}
              style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.secondaryText, { color: colors.text }]}>Reset</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.primaryText}>Apply</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function SelectChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}>
      <Text style={[styles.chipText, { color: active ? '#fff' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  return (
    <Pressable
      onPress={onPress}
      style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.toggleLabel, { color: colors.text }]}>{label}</Text>
      <View
        style={[
          styles.toggle,
          { backgroundColor: active ? colors.primary : colors.border, alignItems: active ? 'flex-end' : 'flex-start' },
        ]}>
        <View style={styles.toggleThumb} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '86%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  content: {
    gap: 20,
    paddingBottom: 8,
  },
  group: {
    gap: 10,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  groupBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleRow: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 999,
    padding: 3,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtn: {
    flex: 1.2,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
  primaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
