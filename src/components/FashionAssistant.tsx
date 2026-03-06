import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Sparkles, User, Bot } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { vibrate, cn, withRetry } from '../lib/utils';
import { ChatMessage } from '../types';

export default function FashionAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I'm your MirrorFit AI assistant. Ask me anything about style, sizing, or how to use the app!" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    vibrate();
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I'm currently offline as the AI service is not configured." }]);
        setIsTyping(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: "You are a helpful fashion assistant for MirrorFit. You give style advice, explain how the virtual try-on works, and help users find their best look. Keep responses concise and friendly."
        }
      });

      const response = await withRetry(() => chat.sendMessage({ message: userMsg }));
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm not sure how to answer that." }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button
        onClick={() => { vibrate(); setIsOpen(true); }}
        className="fixed bottom-24 right-6 w-14 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center z-40"
      >
        <MessageSquare className="w-6 h-6 text-white" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed inset-x-4 bottom-24 top-20 z-50 glass rounded-3xl overflow-hidden flex flex-col shadow-2xl border-indigo-500/20"
          >
            <header className="p-4 bg-indigo-600 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-xl">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Fashion Assistant</h3>
                  <p className="text-indigo-200 text-xs">Always active</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 text-white" />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/20">
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl flex items-start space-x-2",
                    msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white/10 text-gray-200 rounded-tl-none"
                  )}>
                    {msg.role === 'model' && <Bot className="w-4 h-4 mt-1 flex-shrink-0" />}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    {msg.role === 'user' && <User className="w-4 h-4 mt-1 flex-shrink-0" />}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none flex space-x-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-black/40 border-t border-white/10">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask for style advice..."
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="absolute right-2 top-1.5 p-1.5 bg-indigo-600 rounded-full disabled:opacity-50 transition-opacity"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
