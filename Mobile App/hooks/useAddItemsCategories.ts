import { useEffect, useState } from 'react';

import {
  getCachedAddItemsCategories,
  prefetchAddItemsCategories,
  subscribeAddItemsCategories,
  type AddItemsCategoryNode,
} from '@/lib/api';

export function useAddItemsCategories() {
  const [items, setItems] = useState<AddItemsCategoryNode[] | null>(() => getCachedAddItemsCategories());
  const [loading, setLoading] = useState(() => getCachedAddItemsCategories() === null);

  useEffect(() => {
    const sync = () => {
      setItems(getCachedAddItemsCategories());
      setLoading(getCachedAddItemsCategories() === null);
    };

    const unsubscribe = subscribeAddItemsCategories(sync);
    void prefetchAddItemsCategories()
      .catch(() => {})
      .finally(sync);

    return unsubscribe;
  }, []);

  return { items, loading };
}
