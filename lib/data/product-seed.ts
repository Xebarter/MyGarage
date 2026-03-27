/**
 * Initial product rows for Supabase (matches former mock catalog).
 * IDs align with in-memory mock orders in `lib/db.ts`.
 */
export type ProductSeedRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  featured: boolean;
  featured_request_pending: boolean;
  category: string;
  brand: string;
  sku: string;
  vendor_id: string;
  created_at: string;
};

export const PRODUCT_SEED_ROWS: ProductSeedRow[] = [
  {
    id: "1",
    name: "Premium Oil Filter",
    description: "High-performance oil filter for all vehicles",
    price: 12.99,
    image: "/products/oil-filter.jpg",
    featured: true,
    featured_request_pending: false,
    category: "Filters",
    brand: "FilterPro",
    sku: "OF-001",
    vendor_id: "1",
    created_at: "2024-01-15T00:00:00.000Z",
  },
  {
    id: "2",
    name: "Brake Pads Set",
    description: "OEM-quality brake pads for smooth braking",
    price: 45.99,
    image: "/products/brake-pads.jpg",
    featured: true,
    featured_request_pending: false,
    category: "Braking",
    brand: "BrakeMaster",
    sku: "BP-002",
    vendor_id: "2",
    created_at: "2024-01-20T00:00:00.000Z",
  },
  {
    id: "3",
    name: "Engine Air Filter",
    description: "Improves air flow and engine efficiency",
    price: 18.5,
    image: "/products/air-filter.jpg",
    featured: true,
    featured_request_pending: false,
    category: "Filters",
    brand: "FilterPro",
    sku: "AF-003",
    vendor_id: "1",
    created_at: "2024-02-01T00:00:00.000Z",
  },
  {
    id: "4",
    name: "Spark Plugs (4-Pack)",
    description: "Precision engineered spark plugs",
    price: 24.99,
    image: "/products/spark-plugs.jpg",
    featured: true,
    featured_request_pending: false,
    category: "Ignition",
    brand: "SparkMax",
    sku: "SP-004",
    vendor_id: "2",
    created_at: "2024-02-05T00:00:00.000Z",
  },
  {
    id: "5",
    name: "Transmission Fluid",
    description: "Premium transmission fluid for smooth shifting",
    price: 35.5,
    image: "/products/transmission-fluid.jpg",
    featured: false,
    featured_request_pending: false,
    category: "Fluids",
    brand: "FluidDynamics",
    sku: "TF-005",
    vendor_id: "1",
    created_at: "2024-02-10T00:00:00.000Z",
  },
  {
    id: "6",
    name: "Car Battery 12V 100Ah",
    description: "Heavy-duty car battery with long lifespan",
    price: 129.99,
    image: "/products/battery.jpg",
    featured: false,
    featured_request_pending: false,
    category: "Electrical",
    brand: "PowerCell",
    sku: "CB-006",
    vendor_id: "2",
    created_at: "2024-02-15T00:00:00.000Z",
  },
];
