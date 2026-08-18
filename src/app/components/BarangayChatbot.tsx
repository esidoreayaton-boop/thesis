import { useState } from 'react';
import { Bot, Send, X, Sparkles, HelpCircle, FileText, Syringe, Clock } from 'lucide-react';
import { apiService } from '../../services/api';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  topic?: string;
}

export default function BarangayChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Magandang araw! 👋 I am your Smart Barangay Assistant. How can I help you today? You can ask me about Barangay Clearance requirements, free infant vaccines, clinic hours, or Business Permits.',
      topic: 'Greeting'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    'How to get Barangay Clearance?',
    'What are Health Center hours?',
    'Free infant immunization schedule?',
    'Business Permit requirements?'
  ];

  const handleSend = async (questionText?: string) => {
    const query = questionText || input;
    if (!query.trim()) return;

    if (!questionText) setInput('');
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setLoading(true);

    try {
      const res = await apiService.askChatbot(query);
      setMessages(prev => [...prev, { sender: 'bot', text: res.answer, topic: res.topic }]);
    } catch (e) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Sorry, I am having trouble connecting right now. Please try again shortly.', topic: 'Error' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Chatbot Widget Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
      >
        <Bot size={24} />
        <span className="text-xs font-bold hidden sm:inline">Smart Assistant</span>
        <Sparkles size={14} className="text-amber-300 animate-bounce" />
      </button>

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 z-50 w-full max-w-sm sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3.5 flex justify-between items-center shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="text-xs font-bold leading-tight flex items-center gap-1">
                  Barangay AI Assistant
                  <Sparkles size={12} className="text-amber-300" />
                </h3>
                <p className="text-[11px] text-blue-100 opacity-90">24/7 Resident Support</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded text-white">
              <X size={16} />
            </button>
          </div>

          {/* Messages List */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950 text-xs">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-xs'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-slate-400 italic py-1 flex items-center gap-1.5">
                <Bot size={14} className="animate-spin text-blue-600" />
                Thinking...
              </div>
            )}
          </div>

          {/* Quick Suggestion Pills */}
          <div className="p-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="text-[10px] bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-slate-700 px-2 py-1 rounded-full hover:bg-blue-50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask a question about clearances or health..."
              className="text-xs h-9 bg-slate-50 border-slate-200"
            />
            <Button type="submit" size="sm" className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white shrink-0">
              <Send size={14} />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
