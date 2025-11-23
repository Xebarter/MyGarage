import { useState } from 'react';
import { MessagingSystem } from './MessagingSystem';
import { MessageCircle, X } from 'lucide-react';

interface MessagingIntegrationExampleProps {
  repairShopId: string;
}

export function MessagingIntegrationExample({ repairShopId }: MessagingIntegrationExampleProps) {
  const [showMessaging, setShowMessaging] = useState(false);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Messaging System Integration</h1>
        <p className="mt-2 text-gray-600">
          Example of how to integrate the messaging system into the repair shop dashboard
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Integration Options</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Full Page Integration</h3>
            <p className="text-sm text-gray-500 mb-3">
              Replace the entire dashboard view with the messaging system
            </p>
            <button
              onClick={() => setShowMessaging(true)}
              className="text-sm text-orange-600 hover:text-orange-800 font-medium"
            >
              Open Messaging System
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Sidebar Integration</h3>
            <p className="text-sm text-gray-500 mb-3">
              Show messaging in a sidebar panel alongside other content
            </p>
            <button
              disabled
              className="text-sm text-gray-400 font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Modal Integration</h3>
            <p className="text-sm text-gray-500 mb-3">
              Open messaging in a modal dialog over the current view
            </p>
            <button
              disabled
              className="text-sm text-gray-400 font-medium cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>

      {showMessaging && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
            <MessagingSystem 
              repairShopId={repairShopId}
              onClose={() => setShowMessaging(false)}
            />
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-2">Implementation Notes</h3>
        <ul className="text-sm text-yellow-700 list-disc pl-5 space-y-1">
          <li>The messaging system allows direct communication between mechanics and customers</li>
          <li>Supports photo and video sharing for vehicle issues</li>
          <li>Real-time messaging with conversation history</li>
          <li>Can be integrated as a full page, sidebar, or modal component</li>
        </ul>
      </div>
    </div>
  );
}