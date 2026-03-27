export type VendorSeedRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
  total_products: number;
  created_at: string;
};

export const VENDOR_SEED_ROWS: VendorSeedRow[] = [
  {
    id: "1",
    name: "FilterPro Inc",
    email: "sales@filterpro.com",
    phone: "555-1001",
    address: "100 Industrial Blvd",
    rating: 4.8,
    total_products: 3,
    created_at: "2023-06-15T00:00:00.000Z",
  },
  {
    id: "2",
    name: "BrakeMaster Corp",
    email: "contact@brakemaster.com",
    phone: "555-1002",
    address: "200 Tech Drive",
    rating: 4.6,
    total_products: 2,
    created_at: "2023-07-20T00:00:00.000Z",
  },
];
