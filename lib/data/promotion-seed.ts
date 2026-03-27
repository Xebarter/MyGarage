export type PromotionSeedRow = {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number;
  current_uses: number;
  valid_from: string;
  valid_until: string;
  active: boolean;
};

export const PROMOTION_SEED_ROWS: PromotionSeedRow[] = [
  {
    id: "1",
    code: "SAVE10",
    description: "10% off all products",
    discount_type: "percentage",
    discount_value: 10,
    max_uses: 100,
    current_uses: 45,
    valid_from: "2024-03-01T00:00:00.000Z",
    valid_until: "2024-03-31T00:00:00.000Z",
    active: true,
  },
  {
    id: "2",
    code: "FLAT20",
    description: "$20 off orders over $100",
    discount_type: "fixed",
    discount_value: 20,
    max_uses: 50,
    current_uses: 28,
    valid_from: "2024-03-01T00:00:00.000Z",
    valid_until: "2024-03-31T00:00:00.000Z",
    active: true,
  },
];
