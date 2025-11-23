import { useState, useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { supabase, Customer, Conversation } from '../../lib/supabase';
import { MessageList } from './MessageList';
import { MessageView } from './MessageView';
import { NewConversation } from './NewConversation';

interface MessagingSystemProps {
  repairShopId: string;
  onClose?: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function MessagingSystem({ repairShopId, onClose, onUnreadCountChange }: MessagingSystemProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Set up real-time subscription for new messages
    const channel = supabase
      .channel('message-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_type=eq.customer`
        },
        (payload) => {
          // Notify parent of potential new unread message
          if (onUnreadCountChange) {
            fetchUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUnreadCount() {
    try {
      // First get conversation IDs for this repair shop
      const { data: conversations, error: conversationsError } = await supabase
        .from('conversations')
        .select('id')
        .eq('repair_shop_id', repairShopId);

      if (conversationsError) throw conversationsError;
      
      if (!conversations || conversations.length === 0) {
        if (onUnreadCountChange) onUnreadCountChange(0);
        return;
      }
      
      const conversationIds = conversations.map(conv => conv.id);
      
      // Then count unread messages in those conversations
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .neq('sender_type', 'repair_shop') // Not sent by repair shop (i.e., sent by customer)
        .is('read_at', null);

      if (error) throw error;
      if (onUnreadCountChange) onUnreadCountChange(count || 0);
    } catch (err) {
      console.error('Error fetching unread messages count:', err);
    }
  }

  function handleConversationSelect(conversation: Conversation) {
    setActiveConversation(conversation);
    // Mark messages as read when opening conversation
    markMessagesAsRead(conversation.id);
  }

  async function markMessagesAsRead(conversationId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .neq('sender_type', 'repair_shop')
        .is('read_at', null)
        .eq('conversation_id', conversationId);

      if (error) throw error;
      
      // Update unread count
      if (onUnreadCountChange) {
        fetchUnreadCount();
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }

  function handleBackToList() {
    setActiveConversation(null);
  }

  function handleCreateConversation() {
    setShowNewConversation(true);
  }

  function handleCancelNewConversation() {
    setShowNewConversation(false);
  }

  function handleConversationCreated(conversation: Conversation) {
    setShowNewConversation(false);
    setActiveConversation(conversation);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {showNewConversation ? (
        <NewConversation
          repairShopId={repairShopId}
          customers={customers}
          onConversationCreated={handleConversationCreated}
          onCancel={handleCancelNewConversation}
        />
      ) : activeConversation ? (
        <MessageView
          conversationId={activeConversation.id}
          repairShopId={repairShopId}
          onBack={handleBackToList}
        />
      ) : (
        <>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <MessageCircle className="mr-2" />
              Messaging
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-hidden">
            <MessageList
              repairShopId={repairShopId}
              onConversationSelect={handleConversationSelect}
              onCreateConversation={handleCreateConversation}
            />
          </div>
        </>
      )}
    </div>
  );
}