import { Ionicons } from '@expo/vector-icons';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

type CategoryScrollerProps = {
  categories: string[];
  selectedCategory: string | null;
  onSelectCategory: (category: string | null) => void;
};

export function ShopCategoryScroller({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryScrollerProps) {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];

  const items = ['All', ...categories];

  return (
    <FlatList
      horizontal
      data={items}
      keyExtractor={(item) => item}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => {
        const active = item === 'All' ? !selectedCategory : selectedCategory === item;
        return (
          <Pressable
            onPress={() => onSelectCategory(item === 'All' ? null : item)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.primary : colors.card,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}>
            <View style={styles.chipContent}>
              <Ionicons
                name={item === 'All' ? 'apps-outline' : 'pricetags-outline'}
                size={14}
                color={active ? '#fff' : colors.textMuted}
              />
              <Text style={[styles.label, { color: active ? '#fff' : colors.text }]}>{item}</Text>
            </View>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 10,
    paddingRight: 16,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
});
