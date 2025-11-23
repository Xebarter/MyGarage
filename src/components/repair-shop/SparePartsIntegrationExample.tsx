import { useState } from 'react';
import { SparePartsOrdering } from './SparePartsOrdering';
import { Wrench, Package } from 'lucide-react';

export function SparePartsIntegrationExample() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  
  // Mock services data for demonstration
  const mockServices = [
    { id: 'svc-001', name: 'Engine Tune-up', description: 'Complete engine tune-up with spark plug replacement' },
    { id: 'svc-002', name: 'Brake Replacement', description: 'Front brake pad and rotor replacement' },
    { id: 'svc-003', name: 'Oil Change', description: 'Standard oil change with filter replacement' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Package className="mr-2 text-orange-500" />
          Spare Parts Integration Example
        </h1>
        <p className="mt-2 text-gray-600">
          Demonstration of how mechanics can order parts directly from the app while working on a job
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Selection Panel */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Wrench className="mr-2" />
            Select Service
          </h2>
          
          <div className="space-y-3">
            {mockServices.map((service) => (
              <div 
                key={service.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedService === service.id 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedService(service.id)}
              >
                <h3 className="font-medium text-gray-900">{service.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                <div className="mt-2 text-xs text-gray-400">ID: {service.id}</div>
              </div>
            ))}
          </div>
          
          {selectedService && (
            <div className="mt-6 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                Selected service: {mockServices.find(s => s.id === selectedService)?.name}
              </p>
            </div>
          )}
        </div>
        
        {/* Parts Ordering Panel */}
        <div className="lg:col-span-2">
          <SparePartsOrdering 
            serviceId={selectedService || undefined}
            onPartsOrdered={(parts) => {
              console.log('Parts ordered:', parts);
              // In a real app, you would handle the ordered parts here
              // For example, updating inventory, notifying suppliers, etc.
            }}
          />
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-800">Implementation Notes</h3>
        <ul className="mt-2 text-sm text-yellow-700 list-disc pl-5 space-y-1">
          <li>This component can be integrated into the service/job management section</li>
          <li>Mechanics can select a service and order parts needed for that specific job</li>
          <li>Parts can be linked to services for tracking and reporting purposes</li>
          <li>Delivery status tracking provides real-time updates on ordered parts</li>
        </ul>
      </div>
    </div>
  );
}