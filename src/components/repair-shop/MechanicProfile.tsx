import { useState } from 'react';
import { User, Wrench } from 'lucide-react';

interface MechanicProfileProps {
  repairShop: any;
}

export function MechanicProfile({ repairShop }: MechanicProfileProps) {
  const [mechanicProfile, setMechanicProfile] = useState({
    fullName: '',
    certifications: [] as string[],
    specializations: [] as string[],
    yearsOfExperience: 0,
    workingHours: '',
  });
  
  const [newCertification, setNewCertification] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
          <User className="h-5 w-5 mr-2 text-orange-600" />
          Mechanic Profile
        </h3>
      </div>
      <div className="px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={mechanicProfile.fullName}
              onChange={(e) => setMechanicProfile({...mechanicProfile, fullName: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="yearsOfExperience" className="block text-sm font-medium text-gray-700">
              Years of Experience
            </label>
            <input
              type="number"
              id="yearsOfExperience"
              min="0"
              value={mechanicProfile.yearsOfExperience}
              onChange={(e) => setMechanicProfile({...mechanicProfile, yearsOfExperience: parseInt(e.target.value) || 0})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="workingHours" className="block text-sm font-medium text-gray-700">
              Working Hours
            </label>
            <input
              type="text"
              id="workingHours"
              placeholder="e.g., Mon-Fri 8AM-6PM"
              value={mechanicProfile.workingHours}
              onChange={(e) => setMechanicProfile({...mechanicProfile, workingHours: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
          </div>
        </div>
        
        {/* Certifications */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-900">Certifications</h4>
          </div>
          <div className="mt-2 flex">
            <input
              type="text"
              value={newCertification}
              onChange={(e) => setNewCertification(e.target.value)}
              placeholder="Add a certification"
              className="flex-1 border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
            <button
              onClick={() => {
                if (newCertification.trim() && !mechanicProfile.certifications.includes(newCertification.trim())) {
                  setMechanicProfile({
                    ...mechanicProfile,
                    certifications: [...mechanicProfile.certifications, newCertification.trim()]
                  });
                  setNewCertification('');
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
            >
              Add
            </button>
          </div>
          
          {mechanicProfile.certifications.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {mechanicProfile.certifications.map((cert, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-sm font-medium text-gray-900">{cert}</span>
                  <button
                    onClick={() => {
                      setMechanicProfile({
                        ...mechanicProfile,
                        certifications: mechanicProfile.certifications.filter((_, i) => i !== index)
                      });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No certifications added yet</p>
          )}
        </div>
        
        {/* Specializations */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-medium text-gray-900">Specializations</h4>
          </div>
          <div className="mt-2 flex">
            <input
              type="text"
              value={newSpecialization}
              onChange={(e) => setNewSpecialization(e.target.value)}
              placeholder="Add a specialization"
              className="flex-1 border border-gray-300 rounded-l-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            />
            <button
              onClick={() => {
                if (newSpecialization.trim() && !mechanicProfile.specializations.includes(newSpecialization.trim())) {
                  setMechanicProfile({
                    ...mechanicProfile,
                    specializations: [...mechanicProfile.specializations, newSpecialization.trim()]
                  });
                  setNewSpecialization('');
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
            >
              Add
            </button>
          </div>
          
          {mechanicProfile.specializations.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {mechanicProfile.specializations.map((spec, index) => (
                <li key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                  <span className="text-sm font-medium text-gray-900">{spec}</span>
                  <button
                    onClick={() => {
                      setMechanicProfile({
                        ...mechanicProfile,
                        specializations: mechanicProfile.specializations.filter((_, i) => i !== index)
                      });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No specializations added yet</p>
          )}
        </div>
        
        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}