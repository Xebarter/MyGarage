import { Car, Gauge, Wrench, Battery } from 'lucide-react';

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: React.ReactNode;
  subcategories?: Subcategory[];
}

export const AUTOMOTIVE_CATEGORIES: Category[] = [
  {
    id: 'engine',
    name: 'Engine System',
    icon: <Car className="w-4 h-4" />,
    subcategories: [
      { id: 'engine-core', name: 'Engine Core Components' },
      { id: 'gaskets', name: 'Gaskets, Seals & Fasteners' },
      { id: 'belts-hoses', name: 'Belts, Tensioners & Hoses' },
      { id: 'fuel', name: 'Fuel & Injection System' },
      { id: 'ignition', name: 'Ignition System' },
      { id: 'air-intake', name: 'Air Intake & Forced Induction' },
      { id: 'exhaust', name: 'Exhaust & Emission Control' },
      { id: 'cooling', name: 'Cooling System' },
      { id: 'lubrication', name: 'Lubrication System' },
    ],
  },
  {
    id: 'transmission',
    name: 'Transmission & Drivetrain',
    icon: <Gauge className="w-4 h-4" />,
    subcategories: [
      { id: 'manual', name: 'Manual Transmission & Clutch' },
      { id: 'automatic', name: 'Automatic Transmission' },
      { id: 'cvt-dct', name: 'CVT & Dual-Clutch' },
      { id: 'driveline', name: 'Driveline & Differentials' },
    ],
  },
  {
    id: 'suspension',
    name: 'Suspension & Steering',
    icon: <Wrench className="w-4 h-4" />,
    subcategories: [
      { id: 'front-susp', name: 'Front Suspension' },
      { id: 'rear-susp', name: 'Rear Suspension' },
      { id: 'steering', name: 'Steering System' },
    ],
  },
  {
    id: 'brakes',
    name: 'Braking System',
    icon: <div className="w-4 h-4 rounded-full border-2 border-red-600" />,
    subcategories: [
      { id: 'disc', name: 'Disc Brakes' },
      { id: 'drum', name: 'Drum Brakes' },
      { id: 'brake-control', name: 'Brake Hydraulics & Safety' },
    ],
  },
  {
    id: 'wheels',
    name: 'Wheels & Tyres',
    icon: <div className="w-4 h-4 rounded-full bg-black" />,
    subcategories: [
      { id: 'rims', name: 'Rims & Covers' },
      { id: 'tyres', name: 'Tyres' },
      { id: 'bearings', name: 'Wheel Bearings & Hubs' },
      { id: 'hardware', name: 'Wheel Hardware & TPMS' },
    ],
  },
  {
    id: 'electrical',
    name: 'Electrical & Electronic Systems',
    icon: <Battery className="w-4 h-4" />,
    subcategories: [
      { id: 'starting', name: 'Starting & Charging' },
      { id: 'sensors', name: 'Sensors' },
      { id: 'ecu', name: 'Control Units' },
      { id: 'lighting', name: 'Lighting' },
      { id: 'wiring', name: 'Wiring & Accessories' },
    ],
  },
  {
    id: 'body',
    name: 'Body & Structural Components',
    icon: <div className="w-4 h-4 border border-slate-600 rounded" />,
    subcategories: [
      { id: 'panels', name: 'Body Panels' },
      { id: 'glass', name: 'Glass & Mirrors' },
      { id: 'trim', name: 'Exterior Trim' },
    ],
  },
  {
    id: 'interior',
    name: 'Interior & Cabin Systems',
    icon: <div className="w-4 h-4 bg-slate-300 rounded" />,
    subcategories: [
      { id: 'seating', name: 'Seating & Safety' },
      { id: 'dashboard', name: 'Dashboard & Controls' },
    ],
  },
];