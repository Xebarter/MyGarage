import type {
  ServiceHistoryStatus,
  ServiceHistoryType,
  VehicleBodyType,
  VehicleDriveType,
  VehicleFuelType,
  VehicleStatus,
  VehicleTransmission,
} from '@/lib/garage';

export type BuyerGarageLastService = {
  id: string;
  serviceName: string;
  serviceDate: string;
  providerName: string;
  notes: string;
} | null;

export type BuyerGarageVehicle = {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string | null;
  imageUrl: string | null;
  nickname: string | null;
  isPrimary: boolean;
  vin: string | null;
  color: string | null;
  mileageKm: number | null;
  fuelType: VehicleFuelType | null;
  transmission: VehicleTransmission | null;
  trim: string | null;
  engine: string | null;
  driveType: VehicleDriveType | null;
  bodyType: VehicleBodyType | null;
  tyreSize: string | null;
  vehicleStatus: VehicleStatus;
  nextServiceDate: string | null;
  statusUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastService?: BuyerGarageLastService;
};

export type GarageServiceHistoryEntry = {
  id: string;
  vehicleId: string;
  serviceType: ServiceHistoryType;
  serviceName: string;
  serviceDate: string;
  providerId: string | null;
  providerName: string;
  notes: string;
  findings?: string;
  recommendations?: string;
  partsUsed?: string;
  odometerKm?: number | null;
  photoUrls?: string[];
  laborHours?: number | null;
  status: ServiceHistoryStatus;
  serviceRequestId?: string | null;
  linkedRequest?: {
    id: string;
    category: string;
    location: string;
    requestStatus: string;
  } | null;
};

export type GarageVehicleForm = {
  make: string;
  model: string;
  year: string;
  licensePlate: string;
  imageUrl: string;
  nickname: string;
  isPrimary: boolean;
  vin: string;
  color: string;
  mileageKm: string;
  fuelType: string;
  transmission: string;
  trim: string;
  engine: string;
  driveType: string;
  bodyType: string;
  tyreSize: string;
};

export const EMPTY_GARAGE_VEHICLE_FORM: GarageVehicleForm = {
  make: '',
  model: '',
  year: String(new Date().getFullYear()),
  licensePlate: '',
  imageUrl: '',
  nickname: '',
  isPrimary: false,
  vin: '',
  color: '',
  mileageKm: '',
  fuelType: '',
  transmission: '',
  trim: '',
  engine: '',
  driveType: '',
  bodyType: '',
  tyreSize: '',
};

export type GarageVehicleDocument = {
  id: string;
  vehicleId: string;
  documentType: 'logbook' | 'insurance' | 'inspection' | 'registration' | 'warranty' | 'other';
  name: string;
  fileUrl: string | null;
  expiresAt: string | null;
};
