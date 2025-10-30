import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, ChatConversation, GeminiChatModel } from '../types';
import { Author } from '../types';
import { geminiService } from '../services/geminiService';
import { dbService } from '../services/dbService';
import SpinnerIcon from './icons/SpinnerIcon';
import RecallIcon from './icons/RecallIcon';

interface ChatWindowProps {
  conversationId: string | null;
  onConversationCreated: (id: string) => void;
  onViewImage: (url: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ conversationId, onConversationCreated }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState<GeminiChatModel>('gemini-2.5-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentConversationIdRef = useRef<string | null>(conversationId);

  useEffect(() => {
    currentConversationIdRef.current = conversationId;
    const loadConversation = async () => {
      if (conversationId) {
        const convo = await dbService.getConversation(conversationId);
        if (convo && convo.type === 'chat') {
            setMessages(convo.messages);
            setModel(convo.modelUsed);
        } else {
            setMessages([]);
            setModel('gemini-2.5-flash');
        }
      } else {
        setMessages([{
            id: 'initial',
            author: Author.MODEL,
            content: "Hello! I'm Gemini. How can I assist you today? You can ask me anything!"
        }]);
        setModel('gemini-2.5-flash');
      }
    };
    loadConversation();
  }, [conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      author: Author.USER,
      content: userInput,
    };
    
    const currentMessages = messages.filter(m => m.id !== 'initial');
    const updatedMessages = [...currentMessages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    let convoId = currentConversationIdRef.current;
    if (!convoId) {
      convoId = Date.now().toString();
      currentConversationIdRef.current = convoId;
      const newConversation: ChatConversation = {
        id: convoId,
        title: userInput.substring(0, 40) + (userInput.length > 40 ? '...' : ''),
        messages: [userMessage],
        createdAt: Date.now(),
        modelUsed: model,
        isFavorite: false,
        type: 'chat',
      };
      await dbService.addOrUpdateConversation(newConversation);
      onConversationCreated(convoId);
    } else {
      const existingConvo = await dbService.getConversation(convoId);
      if (existingConvo && existingConvo.type === 'chat') {
        existingConvo.messages.push(userMessage);
        await dbService.addOrUpdateConversation(existingConvo);
      }
    }

    const response = await geminiService.getChatResponse(updatedMessages, model);
    
    const modelMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      author: Author.MODEL,
      content: response,
    };

    setMessages(prev => [...prev, modelMessage]);
    setIsLoading(false);

    const finalConvo = await dbService.getConversation(currentConversationIdRef.current!);
    if (finalConvo && finalConvo.type === 'chat') {
        finalConvo.messages.push(modelMessage);
        await dbService.addOrUpdateConversation(finalConvo);
    }
  };

  return (
    <div className="flex flex-col h-full bg-component-bg rounded-lg overflow-hidden border border-border-color">
      <div className="p-4 border-b border-border-color flex items-center gap-4">
        <label htmlFor="model-select" className="font-semibold text-text-secondary">Model:</label>
        <select 
          id="model-select"
          value={model}
          onChange={e => setModel(e.target.value as GeminiChatModel)}
          disabled={messages.length > 1 && messages.some(m => m.id !== 'initial')}
          className="bg-base-bg border border-border-color rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-accent-yellow disabled:opacity-70"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
        </select>
      </div>
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${
              msg.author === Author.USER ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.author === Author.MODEL && (
              <div className="w-8 h-8 rounded-full bg-accent-khaki flex-shrink-0"></div>
            )}
            
            {msg.author === Author.USER ? (
                <div className="relative group">
                    <div className="max-w-xl p-3 rounded-lg shadow-md bg-accent-yellow text-gray-900">
                        {typeof msg.content === 'string' ? <p className="whitespace-pre-wrap">{msg.content}</p> : msg.content}
                    </div>
                    <button
                        onClick={() => typeof msg.content === 'string' && setInput(msg.content)}
                        className="absolute top-1/2 -translate-y-1/2 left-0 -translate-x-full p-1 rounded-full text-text-secondary hover:bg-border-color opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Recall this message"
                        title="Recall this message"
                    >
                        <RecallIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="max-w-xl p-3 rounded-lg shadow-md bg-base-bg text-text-primary">
                    {typeof msg.content === 'string' ? <p className="whitespace-pre-wrap">{msg.content}</p> : msg.content}
                </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-khaki flex-shrink-0"></div>
            <div className="bg-base-bg text-text-primary p-3 rounded-lg">
                <SpinnerIcon className="w-5 h-5 text-accent-yellow" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-border-color">
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-base-bg border border-border-color rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-accent-yellow"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-accent-khaki text-white rounded-full p-2 disabled:opacity-50 hover:bg-opacity-90 transition-colors"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
