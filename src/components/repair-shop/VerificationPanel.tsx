import { useState } from 'react';
import { CheckCircle, XCircle, Upload } from 'lucide-react';

interface VerificationPanelProps {
  repairShop: any;
}

export function VerificationPanel({ repairShop }: VerificationPanelProps) {
  const [documents, setDocuments] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      {/* Verification Status */}
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

      {/* Document Upload */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Verification Documents</h3>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
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
    </div>
  );
}