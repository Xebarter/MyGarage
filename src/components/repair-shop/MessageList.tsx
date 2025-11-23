import { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  Search, 
  Plus, 
  User, 
  Car,
  Paperclip,
  Check,
  CheckCheck
} from 'lucide-react';
import { supabase, Conversation, Customer } from '../../lib/supabase';

interface MessageListProps {
  repairShopId: string;
  onConversationSelect: (conversation: Conversation) => void;
  onCreateConversation: () => void;
}

export function MessageList({ repairShopId, onConversationSelect, onCreateConversation }: MessageListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchConversations();
    fetchCustomers();
  }, [repairShopId]);

  async function fetchConversations() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          customers(name),
          messages(content, created_at, sender_type)
        `)
        .eq('repair_shop_id', repairShopId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Get the latest message for each conversation
      const conversationsWithLatestMessage = data?.map(conv => {
        const messages = conv.messages || [];
        const latestMessage = messages.length > 0 
          ? messages[messages.length - 1] 
          : null;
        
        return {
          ...conv,
          latest_message: latestMessage
        };
      }) || [];
      
      setConversations(conversationsWithLatestMessage);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else if (diffInDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const customerName = getCustomerName(conv.customer_id).toLowerCase();
    const subject = conv.subject?.toLowerCase() || '';
    return customerName.includes(searchTerm.toLowerCase()) || 
           subject.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <MessageCircle className="mr-2" />
            Messages
          </h2>
          <button
            onClick={onCreateConversation}
            className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'Start a new conversation'}
            </p>
            <div className="mt-6">
              <button
                onClick={onCreateConversation}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none"
              >
                <Plus className="mr-2 -ml-1 h-5 w-5" />
                New Conversation
              </button>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <li 
                key={conversation.id} 
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => onConversationSelect(conversation)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="bg-orange-100 rounded-full p-2">
                          <User className="h-5 w-5 text-orange-600" />
                        </div>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {getCustomerName(conversation.customer_id)}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {conversation.subject || 'No subject'}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {conversation.latest_message && formatDate(conversation.latest_message.created_at)}
                    </div>
                  </div>
                  
                  {conversation.latest_message && (
                    <div className="mt-2 ml-10 flex items-center">
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.latest_message.sender_type === 'repair_shop' && (
                          <span className="font-medium">You: </span>
                        )}
                        {conversation.latest_message.content}
                      </p>
                      {conversation.latest_message.content && (
                        <span className="ml-1 flex-shrink-0">
                          {conversation.latest_message.sender_type === 'repair_shop' ? (
                            <CheckCheck className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Check className="h-4 w-4 text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}