import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  Image, 
  Video,
  X,
  Check,
  CheckCheck
} from 'lucide-react';
import { supabase, Message, MessageMedia } from '../../lib/supabase';

interface MessageViewProps {
  conversationId: string;
  repairShopId: string;
  onBack: () => void;
}

export function MessageView({ conversationId, repairShopId, onBack }: MessageViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [media, setMedia] = useState<Record<string, MessageMedia[]>>({});
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchMessages() {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      
      // Fetch media for each message
      if (data) {
        const mediaMap: Record<string, MessageMedia[]> = {};
        for (const message of data) {
          const { data: messageMedia, error: mediaError } = await supabase
            .from('message_media')
            .select('*')
            .eq('message_id', message.id);
          
          if (!mediaError && messageMedia) {
            mediaMap[message.id] = messageMedia;
          }
        }
        setMedia(mediaMap);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSend() {
    if ((!newMessage.trim() && attachments.length === 0) || sending) return;
    
    setSending(true);
    try {
      // First create the message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: repairShopId,
          sender_type: 'repair_shop',
          content: newMessage.trim() || null,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (messageError) throw messageError;
      
      // Then upload and attach media if any
      if (attachments.length > 0 && messageData) {
        for (const file of attachments) {
          // In a real implementation, you would upload the file to storage
          // For now, we'll just create a placeholder
          const fileType = file.type.startsWith('image/') ? 'image' : 'video';
          
          // Simulate file upload and get URL
          const mediaUrl = URL.createObjectURL(file);
          const thumbnailUrl = fileType === 'video' ? mediaUrl : null;
          
          await supabase
            .from('message_media')
            .insert([{
              message_id: messageData.id,
              media_type: fileType,
              media_url: mediaUrl,
              thumbnail_url: thumbnailUrl,
              created_at: new Date().toISOString()
            }]);
        }
      }
      
      // Add to local state
      setMessages(prev => [...prev, messageData]);
      setNewMessage('');
      setAttachments([]);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
    }
  }

  function removeAttachment(index: number) {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const isMessageFromRepairShop = (message: Message) => {
    return message.sender_type === 'repair_shop' && message.sender_id === repairShopId;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-center">
        <button
          onClick={onBack}
          className="mr-3 text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`mb-4 flex ${isMessageFromRepairShop(message) ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                isMessageFromRepairShop(message)
                  ? 'bg-orange-600 text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {message.content && (
                <p className="text-sm">{message.content}</p>
              )}
              
              {media[message.id] && media[message.id].length > 0 && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {media[message.id].map((mediaItem, index) => (
                    <div key={index} className="relative">
                      {mediaItem.media_type === 'image' ? (
                        <img 
                          src={mediaItem.media_url} 
                          alt="Attachment" 
                          className="rounded object-cover w-full h-32"
                        />
                      ) : (
                        <div className="relative">
                          {mediaItem.thumbnail_url && (
                            <img 
                              src={mediaItem.thumbnail_url} 
                              alt="Video thumbnail" 
                              className="rounded object-cover w-full h-32"
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded">
                            <Video className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className={`text-xs mt-1 ${isMessageFromRepairShop(message) ? 'text-orange-100' : 'text-gray-500'}`}>
                {formatTime(message.created_at)}
                {isMessageFromRepairShop(message) && (
                  <span className="ml-1">
                    {message.read_at ? <CheckCheck className="inline h-3 w-3" /> : <Check className="inline h-3 w-3" />}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {attachments.length > 0 && (
        <div className="border-t border-gray-200 p-3 bg-white">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="relative">
                <div className="w-16 h-16 rounded border border-gray-300 flex items-center justify-center bg-gray-50">
                  {file.type.startsWith('image/') ? (
                    <Image className="h-6 w-6 text-gray-500" />
                  ) : (
                    <Video className="h-6 w-6 text-gray-500" />
                  )}
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="text-xs text-gray-500 truncate max-w-16">{file.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="border-t border-gray-200 p-3 bg-white">
        <div className="flex items-center">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            multiple
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-gray-100 text-gray-600 border-t border-b border-gray-300 hover:bg-gray-200"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            onClick={handleSend}
            disabled={sending || (!newMessage.trim() && attachments.length === 0)}
            className={`px-4 py-2 rounded-r-md ${
              sending || (!newMessage.trim() && attachments.length === 0)
                ? 'bg-gray-300 text-gray-500'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}