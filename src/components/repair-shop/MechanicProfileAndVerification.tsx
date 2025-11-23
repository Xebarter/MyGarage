import { useState } from 'react';
import { CheckCircle, XCircle, Upload, User, Wrench } from 'lucide-react';
import { RepairShop } from '../../lib/supabase';

interface MechanicProfileAndVerificationProps {
  repairShop: RepairShop;
}

export function MechanicProfileAndVerification({ repairShop }: MechanicProfileAndVerificationProps) {
  const [mechanicProfile, setMechanicProfile] = useState({
    fullName: '',
    certifications: [] as string[],
    specializations: [] as string[],
    yearsOfExperience: 0,
    workingHours: '',
  });
  
  const [newCertification, setNewCertification] = useState('');
  const [newSpecialization, setNewSpecialization] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Mechanic Profile & Verification</h2>
        <p className="mt-1 text-sm text-gray-500">Manage your personal details, certifications, and verification documents</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Details */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2 text-orange-600" />
                Personal Details
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
            </div>
          </div>
          
          {/* Certifications */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Certifications</h3>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <div className="flex">
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
                <ul className="mt-4 space-y-2">
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
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No certifications added yet</p>
              )}
            </div>
          </div>
          
          {/* Specializations */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Specializations</h3>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <div className="flex">
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
                <ul className="mt-4 space-y-2">
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
                        className="text-red-600 hover:text-red-800"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-gray-500">No specializations added yet</p>
              )}
            </div>
          </div>
          
          {/* Verification Documents */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-orange-600" />
                Verification Documents
              </h3>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                <div className="flex justify-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                </div>
                <div className="flex text-sm text-gray-600 mt-4 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500 focus-within:outline-none">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">PDF, DOC, JPG, PNG up to 10MB</p>
              </div>
              
              {documents.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Uploaded Documents</h4>
                  <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                    {documents.map((doc, index) => (
                      <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center w-0 flex-1">
                          <svg className="flex-shrink-0 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                          </svg>
                          <span className="ml-2 flex-1 w-0 truncate">document_{index + 1}.pdf</span>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <button className="font-medium text-orange-600 hover:text-orange-500">
                            View
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          
          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="button"
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
            >
              Save Profile
            </button>
          </div>
        </div>

        {/* Verification Status */}
        <div>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Verification Status</h3>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <div className="flex items-center">
                {repairShop.verified ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="ml-2 text-sm font-medium text-gray-900">Verified</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-yellow-500" />
                    <span className="ml-2 text-sm font-medium text-gray-900">Pending Verification</span>
                  </>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {repairShop.verified 
                  ? "Your profile has been verified. This helps build trust with customers." 
                  : "Your profile is pending verification. Submit all required documents to expedite the process."}
              </p>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Shop Information</h3>
            </div>
            <div className="px-4 py-5 sm:px-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Shop Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{repairShop.name}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{repairShop.description || 'No description provided'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm text-gray-900">{repairShop.phone || 'Not provided'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{repairShop.email || 'Not provided'}</dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Website</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {repairShop.website ? (
                      <a href={repairShop.website} className="text-orange-600 hover:text-orange-500">
                        {repairShop.website}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-gray-500">Rating</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {repairShop.rating ? `${repairShop.rating}/5.0` : 'No ratings yet'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Specialties</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {repairShop.specialties || 'No specialties listed'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <div>{repairShop.address}</div>
                    <div>{repairShop.city}, {repairShop.state} {repairShop.zip_code}</div>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Business Hours</dt>
                  <dd className="mt-1 text-sm text-gray-900 whitespace-pre-line">
                    {repairShop.hours || 'Not specified'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg mt-6">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Shop Image</h3>
            </div>
            <div className="px-4 py-5 sm:px-6">
              {repairShop.image_url ? (
                <img 
                  src={repairShop.image_url} 
                  alt={repairShop.name} 
                  className="w-full h-48 object-cover rounded-md"
                />
              ) : (
                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-full h-48 flex items-center justify-center">
                  <span className="text-gray-500">No image</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}