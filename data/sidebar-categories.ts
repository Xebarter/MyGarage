export type SidebarCategoryNode = {
  title: string
  children?: SidebarCategoryNode[]
}

export const sidebarCategories: SidebarCategoryNode[] = [
  {
    title: 'ENGINE & COMPONENTS',
    children: [
      { title: 'Engine Assembly', children: [{ title: 'Complete Engines' }, { title: 'Rebuilt Engines' }] },
      { title: 'Cylinder Head', children: [{ title: 'Cylinder Heads' }, { title: 'Head Gaskets' }] },
      { title: 'Engine Block', children: [{ title: 'Engine Blocks' }, { title: 'Cylinder Liners/Sleeves' }] },
      { title: 'Pistons, Rings & Liners', children: [{ title: 'Pistons' }, { title: 'Piston Rings' }, { title: 'Piston Pins' }] },
      { title: 'Crankshaft & Camshaft', children: [{ title: 'Crankshaft' }, { title: 'Camshaft' }, { title: 'Bearings (Main & Rod)' }] },
      { title: 'Timing System', children: [{ title: 'Timing Belt' }, { title: 'Timing Chain' }, { title: 'Tensioners & Pulleys' }, { title: 'Timing Covers' }] },
      { title: 'Valves & Valve Train', children: [{ title: 'Valves' }, { title: 'Valve Springs' }, { title: 'Lifters / Tappets' }, { title: 'Rocker Arms' }] },
      { title: 'Gaskets & Seals', children: [{ title: 'Oil Pan Gaskets' }, { title: 'Valve Cover Gaskets' }, { title: 'Seal Kits' }] },
      { title: 'Engine Mounts' },
      { title: 'Oil System', children: [{ title: 'Oil Pumps' }, { title: 'Oil Pans' }, { title: 'Oil Coolers' }] },
    ],
  },
  {
    title: 'FUEL SYSTEM',
    children: [
      { title: 'Fuel Pump', children: [{ title: 'In-Tank Pumps' }, { title: 'Inline Pumps' }, { title: 'High-Pressure Pumps' }] },
      { title: 'Fuel Injectors' },
      { title: 'Fuel Tank' },
      { title: 'Fuel Filters' },
      { title: 'Carburetor (for older vehicles)' },
      { title: 'Fuel Pressure Regulators' },
      { title: 'Fuel Lines & Hoses' },
      { title: 'Fuel Rails' },
      { title: 'Throttle Bodies' },
    ],
  },
  {
    title: 'AIR INTAKE & EXHAUST SYSTEM',
    children: [
      { title: 'Air Filters' },
      { title: 'Intake Manifold' },
      { title: 'Throttle Body' },
      { title: 'Mass Air Flow Sensor (MAF)' },
      { title: 'Exhaust Manifold' },
      { title: 'Catalytic Converter' },
      { title: 'Mufflers & Silencers' },
      { title: 'Exhaust Pipes' },
      { title: 'Headers (Performance)' },
      { title: 'Oxygen (O2) Sensors' },
      { title: 'EGR Valves' },
    ],
  },
  {
    title: 'COOLING SYSTEM',
    children: [
      { title: 'Radiator' },
      { title: 'Water Pump', children: [{ title: 'Mechanical Water Pumps' }, { title: 'Electric Water Pumps' }] },
      { title: 'Thermostat' },
      { title: 'Cooling Fans', children: [{ title: 'Fan Motors' }, { title: 'Fan Clutches' }] },
      { title: 'Radiator Hoses' },
      { title: 'Coolant Reservoir' },
      { title: 'Heater Cores' },
    ],
  },
  {
    title: 'ELECTRICAL & ELECTRONICS',
    children: [
      { title: 'Battery' },
      { title: 'Alternator' },
      { title: 'Starter Motor' },
      { title: 'Spark Plugs' },
      { title: 'Ignition Coils' },
      { title: 'Wiring & Harnesses' },
      { title: 'Fuses & Relays' },
      {
        title: 'Sensors',
        children: [
          { title: 'Oxygen Sensor' },
          { title: 'Temperature Sensor' },
          { title: 'Crankshaft Position Sensor' },
          { title: 'Camshaft Position Sensor' },
          { title: 'Knock Sensors' },
          { title: 'MAP / MAF Sensors' },
        ],
      },
      { title: 'ECU (Engine Control Unit)' },
      { title: 'Ignition Wires' },
      { title: 'Distributors (Older Models)' },
    ],
  },
  {
    title: 'TRANSMISSION & DRIVETRAIN',
    children: [
      { title: 'Gearbox / Transmission', children: [{ title: 'Manual Transmission' }, { title: 'Automatic Transmission' }] },
      { title: 'Clutch System', children: [{ title: 'Clutch Plate' }, { title: 'Pressure Plate' }, { title: 'Release Bearing' }] },
      { title: 'Torque Converter' },
      { title: 'Drive Shafts' },
      { title: 'Differential' },
      { title: 'CV Joints & Axles' },
      { title: 'Transfer Cases (4WD/AWD)' },
      { title: 'U-Joints' },
      { title: 'Transmission Filters & Pans' },
    ],
  },
  {
    title: 'BRAKING SYSTEM',
    children: [
      { title: 'Brake Pads' },
      { title: 'Brake Discs (Rotors)' },
      { title: 'Brake Drums' },
      { title: 'Brake Calipers' },
      { title: 'Brake Master Cylinder' },
      { title: 'Brake Lines & Hoses' },
      { title: 'ABS Components', children: [{ title: 'ABS Sensors' }, { title: 'ABS Module' }] },
      { title: 'Brake Boosters' },
      { title: 'Wheel Cylinders' },
      { title: 'Parking Brake Cables & Shoes' },
    ],
  },
  {
    title: 'SUSPENSION & STEERING',
    children: [
      { title: 'Shock Absorbers' },
      { title: 'Struts' },
      { title: 'Springs', children: [{ title: 'Coil Springs' }, { title: 'Leaf Springs' }] },
      { title: 'Control Arms' },
      { title: 'Ball Joints' },
      { title: 'Bushings' },
      { title: 'Steering Rack' },
      { title: 'Power Steering Pump' },
      { title: 'Tie Rod Ends' },
      { title: 'Sway Bar Links' },
      { title: 'Wheel Bearings & Hub Assemblies' },
    ],
  },
  {
    title: 'WHEELS & TIRES',
    children: [
      { title: 'Tires' },
      { title: 'Rims / Alloy Wheels' },
      { title: 'Wheel Bearings' },
      { title: 'Wheel Nuts & Bolts' },
      { title: 'Hub Assemblies' },
      { title: 'TPMS Sensors' },
      { title: 'Wheel Spacers & Adapters' },
    ],
  },
  {
    title: 'BODY & EXTERIOR PARTS',
    children: [
      { title: 'Bumpers' },
      { title: 'Bonnet / Hood' },
      { title: 'Doors & Panels' },
      { title: 'Side Mirrors' },
      { title: 'Grilles' },
      { title: 'Roof Components' },
      { title: 'Fenders' },
      { title: 'Tailgates / Liftgates' },
      { title: 'Body Trim & Mouldings' },
    ],
  },
  {
    title: 'LIGHTING SYSTEM',
    children: [
      { title: 'Headlights' },
      { title: 'Tail Lights' },
      { title: 'Fog Lights' },
      { title: 'Indicators / Turn Signals' },
      { title: 'Interior Lights' },
      { title: 'Bulbs & LED Units' },
      { title: 'Daytime Running Lights (DRL)' },
    ],
  },
  {
    title: 'INTERIOR PARTS',
    children: [
      { title: 'Seats & Seat Covers' },
      { title: 'Dashboard Components' },
      { title: 'Steering Wheel' },
      { title: 'Gear Knob' },
      { title: 'Floor Mats' },
      { title: 'Door Panels' },
      { title: 'Interior Trim' },
      { title: 'Headliners' },
    ],
  },
  {
    title: 'HVAC (HEATING, VENTILATION & AIR CONDITIONING)',
    children: [
      { title: 'AC Compressor' },
      { title: 'Condenser' },
      { title: 'Evaporator' },
      { title: 'Cabin Air Filter' },
      { title: 'Blower Motor' },
      { title: 'Heater Core' },
      { title: 'Expansion Valves / Orifice Tubes' },
      { title: 'A/C Hoses & Lines' },
    ],
  },
  {
    title: 'SAFETY SYSTEMS',
    children: [
      { title: 'Airbags' },
      { title: 'Seat Belts' },
      { title: 'Sensors (Crash Sensors)' },
      { title: 'Parking Sensors' },
      { title: 'Cameras (Rear View / Dash Cam)' },
    ],
  },
  {
    title: 'FILTERS & FLUIDS',
    children: [
      { title: 'Engine Oil' },
      { title: 'Transmission Fluid' },
      { title: 'Brake Fluid' },
      { title: 'Coolant / Antifreeze' },
      { title: 'Power Steering Fluid' },
      { title: 'Oil Filters' },
      { title: 'Air Filters' },
      { title: 'Fuel Filters' },
      { title: 'Cabin Filters' },
      { title: 'Transmission Filters' },
    ],
  },
  {
    title: 'TOOLS & ACCESSORIES',
    children: [
      { title: 'Car Jacks' },
      { title: 'Spanners & Wrenches' },
      { title: 'Diagnostic Tools (OBD Scanners)' },
      { title: 'Car Care Products', children: [{ title: 'Polish & Wax' }, { title: 'Cleaning Kits' }, { title: 'Additives' }] },
      { title: 'Emergency Kits' },
      { title: 'Battery Chargers' },
      { title: 'Towing Accessories' },
    ],
  },
  {
    title: 'PERFORMANCE & MODIFICATIONS',
    children: [
      { title: 'Turbochargers & Superchargers' },
      { title: 'Performance Exhaust Systems' },
      { title: 'Performance Air Filters' },
      { title: 'ECU Tuning / Programmers' },
      { title: 'Suspension Kits (Lowering / Lift)' },
      { title: 'Performance Brakes' },
      { title: 'Cold Air Intakes' },
      { title: 'Short Shifters' },
    ],
  },
  {
    title: 'TRUCK & HEAVY DUTY PARTS',
    children: [
      { title: 'Trailer Parts' },
      { title: 'Heavy Duty Suspension' },
      { title: 'Air Brake Components' },
      { title: 'Heavy Duty Filters' },
      { title: 'Truck Lighting & Mirrors' },
    ],
  },
  {
    title: 'MOTORBIKE PARTS (OPTIONAL CATEGORY)',
    children: [
      { title: 'Engine Parts' },
      { title: 'Chains & Sprockets' },
      { title: 'Brake Systems' },
      { title: 'Tires & Tubes' },
      { title: 'Exhaust Systems' },
      { title: 'Suspension' },
    ],
  },
  {
    title: 'OEM & BRAND-SPECIFIC PARTS',
    children: [
      { title: 'Toyota Parts' },
      { title: 'Nissan Parts' },
      { title: 'Mercedes-Benz Parts' },
      { title: 'BMW Parts' },
      { title: 'Mitsubishi Parts' },
      { title: 'Honda Parts' },
      { title: 'Isuzu Parts' },
      { title: 'Ford Parts' },
      { title: 'Volkswagen Parts' },
      { title: 'Hyundai / Kia Parts' },
      { title: 'Other Brands' },
    ],
  },
]

/** Separates subcategory and category in encoded pick values (titles are not expected to contain this char). */
const CATALOG_PICK_SEP = '\u001e'

export type CatalogPick = {
  department: string
  category: string
  /** Immediate parent node in the tree (the department when the node is a direct child of the root). */
  subcategory: string
  /** Path under the department, e.g. "Oil System › Oil Pumps". */
  label: string
}

let allCatalogPicksCache: CatalogPick[] | null = null

function buildAllCatalogPicks(): CatalogPick[] {
  if (allCatalogPicksCache) return allCatalogPicksCache
  const all: CatalogPick[] = []
  for (const root of sidebarCategories) {
    if (!root.children?.length) continue
    for (const child of root.children) {
      const walk = (node: SidebarCategoryNode, immediateParent: string, trailFromFirst: string[]) => {
        const trail = [...trailFromFirst, node.title]
        all.push({
          department: root.title,
          category: node.title,
          subcategory: immediateParent,
          label: trail.join(' › '),
        })
        if (!node.children?.length) return
        for (const ch of node.children) {
          walk(ch, node.title, trail)
        }
      }
      walk(child, root.title, [])
    }
  }
  allCatalogPicksCache = all
  return all
}

/** Top-level departments (sidebar roots) for the product form. */
export function getDepartmentTitles(): string[] {
  return sidebarCategories.map((r) => r.title)
}

/** All catalog rows under one department, sorted by label. */
export function getCatalogPicksForDepartment(departmentTitle: string): CatalogPick[] {
  return buildAllCatalogPicks()
    .filter((p) => p.department === departmentTitle)
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function encodeCatalogPick(p: Pick<CatalogPick, 'subcategory' | 'category'>): string {
  return `${p.subcategory}${CATALOG_PICK_SEP}${p.category}`
}

export function decodeCatalogPick(raw: string): { subcategory: string; category: string } | null {
  const i = raw.indexOf(CATALOG_PICK_SEP)
  if (i === -1) return null
  return { subcategory: raw.slice(0, i), category: raw.slice(i + CATALOG_PICK_SEP.length) }
}

/**
 * Find a catalog row for a saved product; resolves ambiguous titles using subcategory or department hint.
 */
export function findCatalogPickMatch(category: string, subcategoryHint?: string): CatalogPick | null {
  const cat = category.trim()
  if (!cat) return null
  const hint = (subcategoryHint ?? '').trim()
  const matches = buildAllCatalogPicks().filter((p) => p.category === cat)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]
  const bySub = matches.find((m) => m.subcategory === hint)
  if (bySub) return bySub
  const byDept = hint ? matches.find((m) => m.department === hint) : undefined
  if (byDept) return byDept
  return matches[0]
}

/** All category titles from the home header parts sidebar tree (for product listing pickers). */
export function getProductCategorySelectOptions(): string[] {
  const seen = new Set<string>();
  const walk = (nodes: SidebarCategoryNode[]) => {
    for (const n of nodes) {
      const t = n.title.trim();
      if (t) seen.add(t);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(sidebarCategories);
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}
