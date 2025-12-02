import { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Calendar, AlertCircle, Eye, Download, Trash2, Plus, ArrowLeft, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import toast, { Toaster } from 'react-hot-toast';

interface Document {
  id: string;
  customer_id: string;
  vehicle_id: string;
  type: 'insurance' | 'inspection_report' | 'logbook' | 'driving_permit' | 'other';
  name: string;
  file_url: string;
  file_path: string; // Store actual path for deletion
  expiry_date: string | null;
  uploaded_at: string;
  notes: string | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
}

interface DocumentsAndInsuranceProps {
  onBack?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Motor Insurance', color: 'blue' },
  { value: 'inspection_report', label: 'Inspection Report', color: 'green' },
  { value: 'logbook', label: 'Logbook', color: 'purple' },
  { value: 'driving_permit', label: 'Driving Permit', color: 'yellow' },
  { value: 'other', label: 'Other Document', color: 'gray' },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export function DocumentsAndInsurance({ onBack }: DocumentsAndInsuranceProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    vehicle_id: '',
    type: 'insurance' as Document['type'],
    name: '',
    expiry_date: '',
    notes: ''
  });

  const customerId = localStorage.getItem('customer_id');

  const fetchVehicles = useCallback(async () => {
    if (!customerId) return;

    const { data, error } = await supabase
      .from('vehicles')
      .select('id, make, model, year, license_plate')
      .eq('customer_id', customerId)
      .order('make');

    if (error) {
      toast.error('Failed to load vehicles');
      console.error(error);
    } else {
      setVehicles(data || []);
      if (data && data.length > 0 && !formData.vehicle_id) {
        setFormData(prev => ({ ...prev, vehicle_id: data[0].id }));
      }
    }
  }, [customerId, formData.vehicle_id]);

  const fetchDocuments = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('customer_id', customerId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      toast.error('Failed to load documents');
      console.error(error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }, [customerId]);

  useEffect(() => {
    fetchVehicles();
    fetchDocuments();
  }, [fetchVehicles, fetchDocuments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      toast.error('Invalid file type. Please upload PDF, JPG, PNG, or Word documents.');
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File too large. Maximum size is 10MB.');
      return;
    }

    setFile(selectedFile);
    // Auto-fill name if empty
    if (!formData.name) {
      const name = selectedFile.name.split('.').slice(0, -1).join('.');
      setFormData(prev => ({ ...prev, name }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !customerId) return;

    if (!formData.vehicle_id) {
      toast.error('Please select a vehicle');
      return;
    }

    setUploading(true);

    try {
      // Generate secure, unique filename
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${customerId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          customer_id: customerId,
          vehicle_id: formData.vehicle_id,
          type: formData.type,
          name: formData.name || file.name,
          file_url: publicUrl,
          file_path: filePath,
          expiry_date: formData.expiry_date || null,
          notes: formData.notes || null
        });

      if (insertError) {
        // Cleanup uploaded file if DB insert fails
        await supabase.storage.from('documents').remove([filePath]);
        throw insertError;
      }

      toast.success('Document uploaded successfully');
      resetForm();
      fetchDocuments();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload document');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setShowUploadForm(false);
    setFormData({
      vehicle_id: vehicles[0]?.id || '',
      type: 'insurance',
      name: '',
      expiry_date: '',
      notes: ''
    });
    // Reset file input
    const input = document.getElementById('file-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const deleteDocument = async (doc: Document) => {
    if (!confirm(`Delete "${doc.name}" permanently?`)) return;

    try {
      // Delete from storage first
      if (doc.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([doc.file_path]);

        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      toast.success('Document deleted');
      fetchDocuments();
    } catch (error: any) {
      toast.error('Failed to delete document');
      console.error(error);
    }
  };

  const getVehicleLabel = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year}) - ${vehicle.license_plate}` : 'Unknown Vehicle';
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days <= 30 && days >= 0;
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'dd MMM yyyy');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  const filteredDocuments = selectedVehicle === 'all'
    ? documents
    : documents.filter(doc => doc.vehicle_id === selectedVehicle);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600"></div>
      </div>
    );
  }

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
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex items-center">
            <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center">
              <FileText className="text-orange-600 w-6 h-6" />
            </div>
            <div className="ml-4">
              <p className="text-gray-600">
                Manage all your vehicle documents in one place. Get notified when insurance or inspection is about to expire.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1 max-w-md">
                <label htmlFor="vehicle-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                  Filter by Vehicle
                </label>
                <select
                  id="vehicle-filter"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                >
                  <option value="all">All Vehicles ({documents.length})</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.license_plate}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md transition-all hover:shadow-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Upload New Document
              </button>
            </div>
          </div>

          {/* Documents Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No documents yet</h3>
                <p className="text-gray-600">Upload your first document to get started</p>
              </div>
            ) : (
              filteredDocuments.map((doc) => {
                const expiringSoon = isExpiringSoon(doc.expiry_date);
                const expired = isExpired(doc.expiry_date);

                return (
                  <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg bg-${DOCUMENT_TYPES.find(t => t.value === doc.type)?.color || 'gray'}-100`}>
                            <FileText className={`h-6 w-6 text-${DOCUMENT_TYPES.find(t => t.value === doc.type)?.color || 'gray'}-600`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                            <p className="text-sm text-gray-500">{getVehicleLabel(doc.vehicle_id)}</p>
                          </div>
                        </div>
                        {expired && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Expired
                          </span>
                        )}
                        {expiringSoon && !expired && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Expiring Soon
                          </span>
                        )}
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        <p className="font-medium text-gray-900">
                          {DOCUMENT_TYPES.find(t => t.value === doc.type)?.label || 'Document'}
                        </p>
                        <p>Uploaded {formatDate(doc.uploaded_at)}</p>
                        {doc.expiry_date && (
                          <p className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Expires {formatDate(doc.expiry_date)}
                          </p>
                        )}
                        {doc.notes && (
                          <p className="text-gray-500 italic text-xs mt-3">"{doc.notes}"</p>
                        )}
                      </div>

                      <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </a>
                        <a
                          href={doc.file_url}
                          download
                          className="flex-1 inline-flex justify-center items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </a>
                        <button
                          onClick={() => deleteDocument(doc)}
                          className="p-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Upload Modal */}
        {showUploadForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Upload Document</h2>
                <button
                  onClick={resetForm}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Vehicle</label>
                    <select
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.make} {v.model} ({v.year}) - {v.license_plate}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Document Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    >
                      {DOCUMENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Document Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g. Comprehensive Insurance 2025"
                    className="w-full rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">File</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition-colors">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    {file ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="text-orange-600 font-medium hover:text-orange-700">
                            Click to upload
                          </span>
                          <span className="text-gray-600"> or drag and drop</span>
                          <input
                            id="file-upload"
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          PDF, JPG, PNG, DOC up to 10MB
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Expiry Date <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      name="expiry_date"
                      value={formData.expiry_date}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notes <span className="text-gray-500 font-normal">(optional)</span>
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="e.g. Covers third-party fire and theft"
                      className="w-full rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={uploading}
                    className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading || !file}
                    className="px-8 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-medium rounded-lg shadow-md transition-all flex items-center gap-2"
                  >
                    {uploading ? (
                      <>Uploading...</>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        Upload Document
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <Toaster position="top-right" />
    </div>
  );
}