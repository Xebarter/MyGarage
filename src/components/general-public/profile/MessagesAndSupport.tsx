import { useState } from 'react';
import { MessageCircle, Headphones, HelpCircle, Send, Paperclip, Smile, ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  read: boolean;
  isUser: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  createdAt: string;
  lastUpdate: string;
  priority: 'low' | 'medium' | 'high';
}

interface MessagesAndSupportProps {
  onBack?: () => void;
}

export function MessagesAndSupport({ onBack }: MessagesAndSupportProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'support'>('messages');
  const [selectedChat, setSelectedChat] = useState<string | null>('1');
  const [message, setMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Mock data
  const chats = [
    { id: '1', name: 'AutoCare Service Center', lastMessage: 'Your appointment is confirmed for tomorrow', timestamp: '2 hours ago', unread: 1 },
    { id: '2', name: 'TireMaster Shop', lastMessage: 'Thanks for your review!', timestamp: '1 day ago', unread: 0 },
    { id: '3', name: 'MyGarage Support', lastMessage: 'We\'ve received your inquiry', timestamp: '2 days ago', unread: 0 },
  ];

  const messages: Record<string, Message[]> = {
    '1': [
      { id: '1', sender: 'AutoCare Service Center', content: 'Hello! This is a reminder that your oil change appointment is confirmed for tomorrow at 10:00 AM.', timestamp: '2023-07-14T09:30:00Z', read: true, isUser: false },
      { id: '2', sender: 'You', content: 'Thank you for the reminder. I\'ll be there on time.', timestamp: '2023-07-14T09:35:00Z', read: true, isUser: true },
      { id: '3', sender: 'AutoCare Service Center', content: 'Great! If you need to reschedule, please let us know at least 24 hours in advance.', timestamp: '2023-07-14T09:37:00Z', read: true, isUser: false },
    ],
    '2': [
      { id: '1', sender: 'TireMaster Shop', content: 'Thank you for your business and for the positive review!', timestamp: '2023-07-13T14:20:00Z', read: true, isUser: false },
      { id: '2', sender: 'You', content: 'You\'re welcome! The service was excellent as always.', timestamp: '2023-07-13T14:25:00Z', read: true, isUser: true },
    ]
  };

  const supportTickets: SupportTicket[] = [
    {
      id: '1',
      subject: 'Issue with appointment scheduling',
      status: 'resolved',
      createdAt: '2023-07-10T09:15:00Z',
      lastUpdate: '2023-07-12T11:30:00Z',
      priority: 'medium'
    },
    {
      id: '2',
      subject: 'Billing discrepancy for oil change',
      status: 'in-progress',
      createdAt: '2023-07-05T14:45:00Z',
      lastUpdate: '2023-07-14T08:20:00Z',
      priority: 'high'
    },
    {
      id: '3',
      subject: 'Feature request: Mobile app notifications',
      status: 'open',
      createdAt: '2023-07-12T16:30:00Z',
      lastUpdate: '2023-07-12T16:30:00Z',
      priority: 'low'
    }
  ];

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: SupportTicket['status']) => {
    switch (status) {
      case 'open': return <Clock className="h-4 w-4 text-blue-500" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'resolved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed': return <XCircle className="h-4 w-4 text-gray-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleSendMessage = () => {
    if (message.trim() && selectedChat) {
      // In a real app, this would send the message
      setMessage('');
    }
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
        <h1 className="text-2xl font-bold text-gray-900">Messages & Support</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="flex px-6">
            <button
              onClick={() => setActiveTab('messages')}
              className={`py-4 px-1 mr-8 text-sm font-medium border-b-2 ${
                activeTab === 'messages'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center">
                <MessageCircle className="h-4 w-4 mr-2" />
                Messages
              </div>
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`py-4 px-1 text-sm font-medium border-b-2 ${
                activeTab === 'support'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center">
                <Headphones className="h-4 w-4 mr-2" />
                Support Tickets
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex h-[500px]">
          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <>
              {/* Chat List */}
              <div className="w-1/3 border-r border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-900">Chats</h2>
                </div>
                <div className="overflow-y-auto h-[calc(100%-60px)]">
                  {chats.map((chat) => (
                    <div 
                      key={chat.id}
                      className={`p-4 border-b border-slate-200 cursor-pointer hover:bg-slate-50 ${
                        selectedChat === chat.id ? 'bg-slate-50' : ''
                      }`}
                      onClick={() => setSelectedChat(chat.id)}
                    >
                      <div className="flex justify-between">
                        <h3 className="font-medium text-slate-900">{chat.name}</h3>
                        <span className="text-xs text-slate-500">{chat.timestamp}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <p className="text-sm text-slate-600 truncate">{chat.lastMessage}</p>
                        {chat.unread > 0 && (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-orange-600 text-white text-xs">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Window */}
              <div className="flex-1 flex flex-col">
                {selectedChat ? (
                  <>
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="font-medium text-slate-900">
                        {chats.find(c => c.id === selectedChat)?.name}
                      </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                      {messages[selectedChat]?.map((msg) => (
                        <div 
                          key={msg.id} 
                          className={`flex mb-4 ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.isUser 
                                ? 'bg-orange-600 text-white' 
                                : 'bg-white border border-slate-200 text-slate-900'
                            }`}
                          >
                            <p>{msg.content}</p>
                            <p 
                              className={`text-xs mt-1 ${
                                msg.isUser ? 'text-orange-100' : 'text-slate-500'
                              }`}
                            >
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="p-4 border-t border-slate-200">
                      <div className="flex">
                        <button className="p-2 text-slate-500 hover:text-slate-700">
                          <Paperclip className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-slate-500 hover:text-slate-700">
                          <Smile className="h-5 w-5" />
                        </button>
                        <input
                          type="text"
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Type a message..."
                          className="flex-1 mx-2 px-4 py-2 border border-slate-300 rounded-full focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <button 
                          onClick={handleSendMessage}
                          className="p-2 bg-orange-600 text-white rounded-full hover:bg-orange-700"
                        >
                          <Send className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="mx-auto h-12 w-12 text-slate-400" />
                      <h3 className="mt-2 text-sm font-medium text-slate-900">No chat selected</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Select a chat to start messaging
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Support Tickets Tab */}
          {activeTab === 'support' && (
            <div className="w-full">
              <div className="p-4 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-slate-900">Support Tickets</h2>
                  <button className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700">
                    <HelpCircle className="h-4 w-4 mr-1" />
                    New Ticket
                  </button>
                </div>
              </div>
              
              {selectedTicket ? (
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{selectedTicket.subject}</h3>
                      <div className="flex items-center mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                          {getStatusIcon(selectedTicket.status)}
                          <span className="ml-1 capitalize">{selectedTicket.status.replace('-', ' ')}</span>
                        </span>
                        <span className="ml-3 text-sm text-slate-500">
                          Created: {new Date(selectedTicket.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedTicket(null)}
                      className="text-slate-400 hover:text-slate-500"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="mt-6 space-y-6">
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <h4 className="font-medium text-slate-900">Issue Description</h4>
                      <p className="mt-2 text-slate-600">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, 
                        nunc nisl aliquam nisl, eget ultricies nisl nunc vel nisl. Nullam auctor, nisl eget ultricies tincidunt, 
                        nunc nisl aliquam nisl, eget ultricies nisl nunc vel nisl.
                      </p>
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                      <h4 className="font-medium text-slate-900">Response</h4>
                      <p className="mt-2 text-slate-600">
                        Thank you for reaching out. Our team is currently investigating this issue and we'll get back to you 
                        within 24 hours with a resolution.
                      </p>
                      <div className="mt-3 text-sm text-slate-500">
                        Posted: {new Date(selectedTicket.lastUpdate).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Subject
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Created
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Last Update
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {supportTickets.map((ticket) => (
                        <tr 
                          key={ticket.id} 
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-slate-900">{ticket.subject}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                              {getStatusIcon(ticket.status)}
                              <span className="ml-1 capitalize">{ticket.status.replace('-', ' ')}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {new Date(ticket.lastUpdate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}