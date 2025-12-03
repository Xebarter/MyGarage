import { useState } from 'react';
import { FileText, Upload, Eye, Download, Trash2, Plus, Calendar, AlertCircle, ArrowLeft } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: 'registration' | 'insurance' | 'inspection' | 'manual' | 'other';
  fileName: string;
  uploadDate: string;
  expiryDate?: string;
  size: string;
  status: 'valid' | 'expiring' | 'expired';
}

interface InsurancePolicy {
  id: string;
  provider: string;
  policyNumber: string;
  startDate: string;
  endDate: string;
  coverageType: string;
  premium: number;
  status: 'active' | 'expiring' | 'expired';
}

interface DocumentsAndInsuranceProps {
  onBack?: () => void;
}

export function DocumentsAndInsurance({ onBack }: DocumentsAndInsuranceProps) {
  const [activeTab, setActiveTab] = useState<'documents' | 'insurance'>('documents');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Mock data
  const documents: Document[] = [
    {
      id: '1',
      name: 'Vehicle Registration',
      type: 'registration',
      fileName: 'toyota_camry_registration.pdf',
      uploadDate: '2023-01-15',
      expiryDate: '2024-01-15',
      size: '2.4 MB',
      status: 'valid'
    },
    {
      id: '2',
      name: 'Insurance Policy',
      type: 'insurance',
      fileName: 'insurance_policy_2023.pdf',
      uploadDate: '2023-03-22',
      expiryDate: '2023-09-22',
      size: '1.8 MB',
      status: 'expiring'
    },
    {
      id: '3',
      name: 'Safety Inspection',
      type: 'inspection',
      fileName: 'inspection_certificate.pdf',
      uploadDate: '2023-05-10',
      expiryDate: '2024-05-10',
      size: '1.2 MB',
      status: 'valid'
    },
    {
      id: '4',
      name: 'Owner Manual',
      type: 'manual',
      fileName: 'toyota_camry_manual.pdf',
      uploadDate: '2022-12-01',
      size: '15.7 MB',
      status: 'valid'
    }
  ];

  const insurancePolicies: InsurancePolicy[] = [
    {
      id: '1',
      provider: 'SafeGuard Insurance',
      policyNumber: 'SG-789456123',
      startDate: '2023-03-22',
      endDate: '2023-09-22',
      coverageType: 'Comprehensive',
      premium: 1250.00,
      status: 'expiring'
    },
    {
      id: '2',
      provider: 'AutoProtect Insurance',
      policyNumber: 'AP-456789123',
      startDate: '2022-07-15',
      endDate: '2023-07-15',
      coverageType: 'Liability',
      premium: 850.00,
      status: 'expired'
    }
  ];

  const getTypeIcon = (type: Document['type']) => {
    switch (type) {
      case 'registration': return '🚗';
      case 'insurance': return '🛡️';
      case 'inspection': return '📋';
      case 'manual': return '📖';
      case 'other': return '📄';
      default: return '📄';
    }
  };

  const getStatusColor = (status: Document['status'] | InsurancePolicy['status']) => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800';
      case 'expiring': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would handle file upload
    alert('File uploaded successfully!');
    setShowUploadModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center mb-6">
        {onBack && (
          <button 
            onClick={onBack}
            className="mr-4 p-2 rounded-full hover:bg-gray-100"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">Documents & Insurance</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 mr-8 text-sm font-medium border-b-2 ${
                activeTab === 'documents'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab('insurance')}
              className={`py-4 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'insurance'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              Insurance Policies
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">Vehicle Documents</h2>
                  <p className="text-slate-600 text-sm">
                    Store and manage your vehicle documents securely
                  </p>
                </div>
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Upload Document
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((document) => (
                  <div key={document.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between">
                      <div className="text-2xl">
                        {getTypeIcon(document.type)}
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                        {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                      </span>
                    </div>
                    <h3 className="font-medium text-slate-900 mt-3">{document.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{document.fileName}</p>
                    
                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                      <div className="flex justify-between">
                        <span>Uploaded:</span>
                        <span>{new Date(document.uploadDate).toLocaleDateString()}</span>
                      </div>
                      {document.expiryDate && (
                        <div className="flex justify-between">
                          <span>Expires:</span>
                          <span>{new Date(document.expiryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Size:</span>
                        <span>{document.size}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <button className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </button>
                      <button className="flex-1 inline-flex items-center justify-center px-3 py-1.5 border border-slate-300 text-xs font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Insurance Tab */}
          {activeTab === 'insurance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">Insurance Policies</h2>
                  <p className="text-slate-600 text-sm">
                    Manage your vehicle insurance policies
                  </p>
                </div>
                <button className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Policy
                </button>
              </div>

              <div className="overflow-hidden border border-slate-200 rounded-lg">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Policy Number
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Coverage
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Premium
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {insurancePolicies.map((policy) => (
                      <tr key={policy.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-slate-900">{policy.provider}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{policy.policyNumber}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">{policy.coverageType}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-slate-900">${policy.premium.toFixed(2)}/year</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
                            {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button className="text-orange-600 hover:text-orange-900 mr-3">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-slate-600 hover:text-slate-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Insurance Reminder</h3>
                    <div className="mt-1 text-sm text-blue-700">
                      <p>You have 1 policy expiring soon. Consider renewing your insurance policy to maintain coverage.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Upload Document</h3>
            
            <form onSubmit={handleFileUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Document Type
                </label>
                <select className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
                  <option value="registration">Vehicle Registration</option>
                  <option value="insurance">Insurance Policy</option>
                  <option value="inspection">Safety Inspection</option>
                  <option value="manual">Owner Manual</option>
                  <option value="other">Other Document</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  placeholder="Enter document name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Expiry Date (if applicable)
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Upload File
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600">
                      <label className="relative cursor-pointer bg-white rounded-md font-medium text-orange-600 hover:text-orange-500">
                        <span>Upload a file</span>
                        <input type="file" className="sr-only" />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      PDF, DOC, JPG up to 10MB
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
                >
                  Upload Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}