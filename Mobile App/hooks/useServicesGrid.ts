import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

const HORIZONTAL_PADDING = 16;
const COLUMN_GAP = 12;

export function useServicesGrid() {
  const { width: screenWidth } = useWindowDimensions();

  return useMemo(() => {
    const numColumns = screenWidth >= 720 ? 3 : 2;
    const availableWidth = screenWidth - HORIZONTAL_PADDING * 2 - COLUMN_GAP * (numColumns - 1);
    const cardWidth = Math.floor(availableWidth / numColumns);

    return {
      numColumns,
      cardWidth,
      columnGap: COLUMN_GAP,
      horizontalPadding: HORIZONTAL_PADDING,
      listKey: `services-grid-${numColumns}`,
    };
  }, [screenWidth]);
}
