import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Shield, Activity, RefreshCw } from 'lucide-react';
import { apiService } from '../../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface SystemMessengerProps {
  currentUserRole: 'superadmin' | 'admin' | 'staff' | 'bhw';
  currentUserName: string;
}

export default function SystemMessenger({ currentUserRole, currentUserName }: SystemMessengerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const data = await apiService.getMessages();
      setMessages(data || []);
    } catch (e) {
      console.warn('Failed to fetch messages');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msgText = newMessage;
    setNewMessage('');
    try {
      const sent = await apiService.sendMessage({
        sender_name: currentUserName,
        sender_role: currentUserRole,
        recipient_role: (currentUserRole === 'admin' || currentUserRole === 'superadmin' || currentUserRole === 'staff') ? 'bhw' : 'admin',
        message: msgText
      });
      setMessages(prev => [...prev, sent]);
    } catch (err) {
      toast.error('Could not send message');
    }
  };

  return (
    <>
      {/* Floating Messenger Toggle Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
      >
        <MessageSquare size={22} />
        <span className="text-xs font-bold hidden sm:inline">System Messenger</span>
        {messages.length > 0 && (
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute -top-1 -right-1" />
        )}
      </button>

      {/* Chat Messenger Popup Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[480px]">
          {/* Header */}
          <div className="bg-indigo-600 text-white p-3.5 flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                {currentUserRole === 'admin' ? <Shield size={18} /> : <Activity size={18} />}
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight">Barangay ↔ BHW Messenger</h3>
                <p className="text-[11px] text-indigo-100 opacity-90">Internal Chat Channel</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={fetchMessages} className="p-1 hover:bg-indigo-500 rounded text-indigo-100">
                <RefreshCw size={14} />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-indigo-500 rounded text-indigo-100">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950 text-xs">
            {messages.length === 0 ? (
              <div className="text-center text-slate-400 py-12">No messages yet. Send a memo or inquiry below!</div>
            ) : (
              messages.map((msg, index) => {
                const isMe = msg.sender_role === currentUserRole;
                return (
                  <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-semibold text-slate-500">{msg.sender_name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                      {msg.sender_role === 'superadmin' ? 'Super Admin' : msg.sender_role === 'admin' ? 'Admin' : msg.sender_role === 'staff' ? 'Staff' : 'BHW'}
                      </Badge>
                    </div>
                    <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                      isMe 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs' 
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-xs'
                    }`}>
                      {msg.message}
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 font-mono">{msg.timestamp || 'Just now'}</span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input Footer */}
          <form onSubmit={handleSend} className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={`Message ${(currentUserRole === 'admin' || currentUserRole === 'superadmin' || currentUserRole === 'staff') ? 'BHW Health Staff' : 'Barangay Admin'}...`}
              className="text-xs h-9 bg-slate-50 border-slate-200"
            />
            <Button type="submit" size="sm" className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0">
              <Send size={14} />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
