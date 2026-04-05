import axios from 'axios';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_MODEL = import.meta.env.VITE_OPENROUTER_MODEL || 'qwen/qwen-2.5-coder-32b-instruct'; // Default model
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_PROXY_URL = '/api/ai';

const useClientSideKey = Boolean(import.meta.env.DEV && OPENROUTER_API_KEY);

// Helper function to make AI API calls
const makeAIRequest = async (prompt, model = OPENROUTER_MODEL) => {
  try {
    if (!prompt?.trim()) {
      throw new Error('Prompt is required.');
    }

    if (useClientSideKey) {
      if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY_HERE') {
        throw new Error('OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in your local .env file.');
      }

      const response = await axios.post(
        OPENROUTER_BASE_URL,
        {
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.choices[0].message.content;
    }

    const response = await axios.post(
      AI_PROXY_URL,
      {
        prompt,
        model,
      }
    );

    return response.data.content;
  } catch (error) {
    console.error('AI API Error:', error);
    throw error;
  }
};


export const getAISummary = async (movie) => {
  const prompt = `Generate a compelling and human-like summary for the movie "${movie.Title}" (${movie.Year}). 
  The movie is about: ${movie.Plot || 'A fascinating story'}.
  Genre: ${movie.Genre || 'Drama'}.
  
  Write a 3-4 sentence summary that captures the essence of the film, its themes, and why it's worth watching. 
  Make it engaging and conversational, as if you're recommending it to a friend.`;

  return await makeAIRequest(prompt);
};

// Get AI-powered similar movie recommendations
export const getSimilarMovies = async (movie) => {
  const prompt = `Based on the movie "${movie.Title}" (${movie.Year}), which is a ${movie.Genre || 'Drama'} film, 
  suggest 5 similar movies that fans of this film would enjoy. 
  
  For each movie, provide just the title and a brief one-line reason why it's similar.
  Format: "Movie Title - Reason"`;

  const response = await makeAIRequest(prompt);
  
  // Parse the response into an array
  if (Array.isArray(response)) {
    return response;
  }
  
  // If response is a string, split it into lines
  return response.split('\n').filter(line => line.trim()).slice(0, 5);
};

// Get a surprise movie recommendation with AI explanation
export const getSurpriseMovie = async (movies) => {
  if (!movies || movies.length === 0) {
    return {
      movie: { Title: 'No movies available', Year: '' },
      reason: 'Please search for movies first.',
    };
  }

  // Add artificial delay for demonstration of loading state
  await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay

  // Pick a random movie from the list
  const randomMovie = movies[Math.floor(Math.random() * movies.length)];

  const prompt = `I'm recommending the movie "${randomMovie.Title}" (${randomMovie.Year}) to someone. 
  Genre: ${randomMovie.Genre || 'Drama'}.
  
  Write a compelling 2-3 sentence explanation of why they should watch this movie. 
  Make it enthusiastic and personal, highlighting what makes this film special.`;

  const reason = await makeAIRequest(prompt);

  return {
    movie: randomMovie,
    reason: reason,
  };
};

// Get personalized movie recommendations based on preferences
export const getPersonalizedRecommendations = async (preferences) => {
  const prompt = `Based on these movie preferences: ${preferences}, 
  recommend 5 movies that would be perfect for this viewer. 
  
  For each recommendation, provide the title and a brief explanation of why it matches their taste.`;

  return await makeAIRequest(prompt);
};

// AI Assistant for conversational movie recommendations
export const getAIAssistantResponse = async (userMessage, conversationHistory = []) => {
  // Build conversation context
  const context = conversationHistory
    .slice(-5) // Keep last 5 messages for context
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `You are a friendly and knowledgeable AI movie assistant. Help users discover movies based on their mood, preferences, or what they're thinking about.

Conversation history:
${context}

User: ${userMessage}

Provide a helpful, conversational response. If they mention their mood or what they're thinking about, suggest 2-3 specific movies with brief explanations of why they'd be perfect. Be warm, enthusiastic, and personalized in your recommendations.`;

  return await makeAIRequest(prompt);
};
