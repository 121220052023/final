import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Play, Send, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAIAssistantResponse } from '../services/aiService';
import { useParentalControls } from '../context/ParentalControlContext';
import { useSubscription } from '../context/SubscriptionContext';

export default function AIAssistant() {
  const navigate = useNavigate();
  const { isContentAllowed, isChild } = useParentalControls();
  const { isProOrAbove } = useSubscription();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Tell me what you're in the mood for and I'll suggest movies or series that fit.",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await getAIAssistantResponse(userMessage, messages);
      
      let filteredMovies = response.movies || [];
      if (isChild) {
        filteredMovies = filteredMovies.filter(movie => isContentAllowed(movie));
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.text || response,
          movies: filteredMovies,
        },
      ]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMsg = error?.response?.data?.error || error?.message || 'Unknown error';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Sorry, I could not answer that right now. (${errorMsg})` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleOpen = () => {
    if (!isProOrAbove) {
      navigate('/pricing');
      return;
    }
    setIsOpen((open) => !open);
  };

  return (
    <>
      <motion.button
        className="editorial-panel fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={handleOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </motion.button>

      <AnimatePresence>
        {isOpen && isProOrAbove ? (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="editorial-panel fixed bottom-24 right-6 z-50 flex h-[32rem] w-[23rem] flex-col overflow-hidden rounded-[1.6rem]"
          >
            <div className="border-b border-border bg-card px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="display-font text-lg font-bold text-foreground">AI Guide</h3>
                  <p className="text-sm text-muted-foreground">Quick recommendations from your prompt</p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[90%] rounded-[1.1rem] px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'bg-primary text-white'
                        : 'border border-border bg-card text-foreground'
                    }`}
                  >
                    {message.content}

                    {message.movies?.length ? (
                      <div className="mt-3 space-y-2">
                        {message.movies.map((movie) => (
                          <button
                            key={movie.imdbID}
                            onClick={() => {
                              setIsOpen(false);
                              navigate(`/movie/${movie.imdbID}`);
                            }}
                            className="group flex w-full items-center gap-3 rounded-[1rem] border border-border bg-muted/40 p-2 text-left transition-all hover:bg-muted/60 hover:border-primary/30"
                          >
                            <img
                              src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/40x60'}
                              alt={movie.Title}
                              className="h-14 w-10 rounded-[0.6rem] object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{movie.Title}</div>
                              <div className="text-xs text-muted-foreground">{movie.Year}</div>
                            </div>
                            <Play className="h-4 w-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              ))}

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="rounded-[1rem] border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask for a mood, genre, or similar title..."
                  className="flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors duration-200 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="btn-primary h-12 w-12 rounded-full p-0 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
