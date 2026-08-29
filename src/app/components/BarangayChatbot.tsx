import { useState, useEffect, useRef } from 'react';
import { Bot, Send, X, Sparkles, ArrowDown, Trash2 } from 'lucide-react';
import { apiService } from '../../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  topic?: string;
  timestamp?: Date;
}

function formatBotText(text: string) {
  // Convert *bold* to <strong>, newlines to <br>, and preserve emoji
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const formatted = line.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: formatted }} />
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

const QUICK_QUESTIONS = [
  '📄 Barangay Clearance requirements?',
  '💉 Free vaccine schedule?',
  '🕐 Office hours?',
  '🏪 Business permit requirements?',
  '🤰 Prenatal care services?',
  '💰 What are the fees?',
  '📝 How to register an account?',
  '🖨️ How to print my document?',
];

const INITIAL_WELCOME: ChatMessage = {
  sender: 'bot',
  text: 'Magandang araw! 👋 I am your *Smart Barangay Assistant*.\n\nI can help you with:\n📄 Document requests & requirements\n🏥 Health center services & schedules\n💉 Free immunization information\n🕐 Office hours & contact info\n\nHow can I assist you today?',
  topic: 'Welcome',
  timestamp: new Date()
};

export default function BarangayChatbot() {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem('barangay_chatbot_open') === 'true';
    } catch {
      return false;
    }
  });

  const toggleOpen = (openState: boolean) => {
    setIsOpen(openState);
    try {
      localStorage.setItem('barangay_chatbot_open', String(openState));
    } catch {}
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('barangay_chat_messages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
        }
      }
    } catch {
      // ignore
    }
    return [INITIAL_WELCOME];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save messages to localStorage on every change
  useEffect(() => {
    if (messages && messages.length > 0) {
      try {
        localStorage.setItem('barangay_chat_messages', JSON.stringify(messages));
      } catch {
        // ignore
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen && messages.length > 1) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.sender === 'bot') {
        setHasNewMessage(true);
      }
    }
  }, [messages]);

  const handleSend = async (questionText?: string) => {
    const query = (questionText || input).replace(/^[📄💉🕐🏪🤰💰📝🖨️]\s*/, '').trim();
    if (!query) return;

    if (!questionText) setInput('');
    setHasNewMessage(false);

    const userMsg: ChatMessage = { sender: 'user', text: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await apiService.askChatbot(query);
      const botMsg: ChatMessage = {
        sender: 'bot',
        text: res.answer || 'Sorry, I could not find an answer to that. Please try rephrasing.',
        topic: res.topic,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment, or contact the Barangay Office directly at (02) 1234-5678.',
        topic: 'Error',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    const freshMessages = [{
      ...INITIAL_WELCOME,
      text: 'Chat cleared! 👋 How can I help you today? Feel free to ask about barangay documents, health services, or office hours.',
      timestamp: new Date()
    }];
    setMessages(freshMessages);
    localStorage.setItem('barangay_chat_messages', JSON.stringify(freshMessages));
  };

  return (
    <>
      {/* Floating Chatbot Toggle Button */}
      <button
        onClick={() => { toggleOpen(!isOpen); setHasNewMessage(false); }}
        className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-4 rounded-full shadow-2xl flex items-center gap-2.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
        aria-label="Open Barangay Assistant"
      >
        <Bot size={22} />
        <span className="text-xs font-bold hidden sm:inline">Barangay Assistant</span>
        <Sparkles size={14} className="text-amber-300 animate-pulse" />
        {hasNewMessage && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white animate-ping" />
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-5 z-50 w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-tight flex items-center gap-1.5">
                  Barangay AI Assistant
                  <Sparkles size={12} className="text-amber-300" />
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-[11px] text-blue-100">Online — 24/7 Support</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={scrollToBottom}
                className="p-1.5 hover:bg-white/20 rounded-lg text-blue-100 transition-colors cursor-pointer"
                title="Scroll to latest message"
              >
                <ArrowDown size={13} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Clear the entire chat conversation? This cannot be undone.')) {
                    handleClear();
                  }
                }}
                className="p-1.5 hover:bg-red-500/30 rounded-lg text-blue-100 transition-colors cursor-pointer"
                title="Clear chat history"
              >
                <Trash2 size={13} />
              </button>
              <button
                onClick={() => toggleOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 dark:bg-slate-950 text-xs scroll-smooth">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.topic && msg.sender === 'bot' && msg.topic !== 'Welcome' && (
                  <Badge className="mb-1 text-[9px] px-1.5 py-0 h-4 bg-indigo-100 text-indigo-700 border-indigo-200 font-semibold">
                    {msg.topic}
                  </Badge>
                )}
                <div className={`p-3 rounded-2xl max-w-[88%] leading-relaxed text-[12px] ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                }`}>
                  {msg.sender === 'bot' ? formatBotText(msg.text) : msg.text}
                </div>
                <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                  {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none p-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Question Pills */}
          <div className="p-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-x-auto shrink-0">
            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Quick Questions</p>
            <div className="flex gap-1.5 pb-1 min-w-max">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="text-[10px] bg-slate-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-600 px-2.5 py-1 rounded-full hover:bg-blue-50 hover:border-blue-300 transition-colors whitespace-nowrap disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0"
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about clearances, health, or hours..."
              className="text-xs h-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              disabled={loading}
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || !input.trim()}
              className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white shrink-0 disabled:opacity-50"
            >
              <Send size={14} />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
