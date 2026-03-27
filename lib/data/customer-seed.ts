export type CustomerSeedRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  total_orders: number;
  total_spent: number;
  created_at: string;
};

export const CUSTOMER_SEED_ROWS: CustomerSeedRow[] = [
  {
    id: "1",
    name: "John Smith",
    email: "john@example.com",
    phone: "555-0101",
    address: "123 Main St, Anytown",
    total_orders: 5,
    total_spent: 487.5,
    created_at: "2024-01-10T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: "555-0102",
    address: "456 Oak Ave, Somewhere",
    total_orders: 12,
    total_spent: 1250.75,
    created_at: "2024-01-05T00:00:00.000Z",
  },
  {
    id: "3",
    name: "Mike Wilson",
    email: "mike@example.com",
    phone: "555-0103",
    address: "789 Pine Rd, Elsewhere",
    total_orders: 3,
    total_spent: 245.99,
    created_at: "2024-02-01T00:00:00.000Z",
  },
];
