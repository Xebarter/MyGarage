import { useState } from 'react';
import { 
  User, 
  Search, 
  X,
  Send
} from 'lucide-react';
import { supabase, Customer, Conversation } from '../../lib/supabase';

interface NewConversationProps {
  repairShopId: string;
  customers: Customer[];
  onConversationCreated: (conversation: Conversation) => void;
  onCancel: () => void;
}

export function NewConversation({ repairShopId, customers, onConversationCreated, onCancel }: NewConversationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [subject, setSubject] = useState('');
  const [creating, setCreating] = useState(false);

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return customer.name.toLowerCase().includes(term) ||
           customer.email?.toLowerCase().includes(term) ||
           customer.phone?.toLowerCase().includes(term);
  });

  async function handleCreateConversation() {
    if (!selectedCustomer || !subject.trim() || creating) return;
    
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          customer_id: selectedCustomer.id,
          repair_shop_id: repairShopId,
          subject: subject.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        onConversationCreated(data);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
      alert('Failed to create conversation');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center">
        <button
          onClick={onCancel}
          className="mr-3 text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedCustomer ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-md">
              <ul className="divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <li className="px-4 py-6 text-center">
                    <p className="text-gray-500">
                      {searchTerm ? 'No customers found' : 'No customers available'}
                    </p>
                  </li>
                ) : (
                  filteredCustomers.map((customer) => (
                    <li 
                      key={customer.id} 
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="bg-orange-100 rounded-full p-2">
                            <User className="h-5 w-5 text-orange-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">Selected Customer</h3>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="text-sm text-orange-600 hover:text-orange-800"
                >
                  Change
                </button>
              </div>
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="bg-orange-100 rounded-full p-2">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter conversation subject"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Next Steps</h4>
              <p className="text-sm text-blue-700">
                After creating the conversation, you'll be able to send messages and share photos or videos with {selectedCustomer.name}.
              </p>
            </div>
          </>
        )}
      </div>
      
      <div className="border-t border-gray-200 p-4 bg-white">
        {selectedCustomer ? (
          <button
            onClick={handleCreateConversation}
            disabled={creating || !subject.trim()}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              creating || !subject.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
            }`}
          >
            {creating ? 'Creating...' : 'Create Conversation'}
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}