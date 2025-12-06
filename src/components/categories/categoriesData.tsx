import { Car, Gauge, Wrench, Battery, Snowflake, Shield, Zap } from 'lucide-react';

export interface SubCategory {
  id: string;
  name: string;
  icon: (props: React.SVGProps<SVGSVGElement>) => JSX.Element;
  subs: string[];
}

export const CATEGORIES: SubCategory[] = [
  {
    id: 'engine',
    name: 'Engine System',
    icon: (props) => <Car {...props} />,
    subs: ['Engine Blocks', 'Gaskets & Seals', 'Belts & Hoses', 'Fuel System', 'Ignition', 'Intake & Exhaust', 'Cooling', 'Oil System']
  },
  {
    id: 'transmission',
    name: 'Transmission & Drivetrain',
    icon: (props) => <Gauge {...props} />,
    subs: ['Clutch Kits', 'Automatic Transmission', 'CVT/DCT', 'Driveshafts & Axles']
  },
  {
    id: 'suspension',
    name: 'Suspension & Steering',
    icon: (props) => <Wrench {...props} />,
    subs: ['Shocks & Struts', 'Control Arms', 'Steering Racks', 'Bushings']
  },
  {
    id: 'brakes',
    name: 'Braking System',
    icon: (props) => <Shield {...props} />,
    subs: ['Brake Pads', 'Brake Rotors', 'Brake Calipers', 'Brake Lines', 'ABS Components']
  },
  {
    id: 'electrical',
    name: 'Electrical & Electronics',
    icon: (props) => <Zap {...props} />,
    subs: ['Alternators', 'Starter Motors', 'Batteries', 'Fuses', 'ECU Modules', 'Sensors']
  },
  {
    id: 'ac',
    name: 'Air Conditioning',
    icon: (props) => <Snowflake {...props} />,
    subs: ['Compressors', 'Condensers', 'Evaporators', 'Expansion Valves', 'Refrigerant', 'Hoses & Fittings']
  },
  {
    id: 'battery',
    name: 'Battery & Starting',
    icon: (props) => <Battery {...props} />,
    subs: ['Lead Acid Batteries', 'AGM Batteries', 'Lithium Batteries', 'Jump Starters', 'Battery Chargers']
  }
];