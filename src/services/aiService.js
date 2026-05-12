import axios from 'axios';
import { tmdbApi } from './tmdb';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const GLM_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

const makeAIRequest = async (prompt) => {
  const provider = import.meta.env.VITE_AI_PROVIDER || 'gemini';

  if (provider === 'gemini') {
    return await makeGeminiRequest(prompt);
  } else if (provider === 'glm') {
    return await makeGLMRequest(prompt);
  }
  return await makeOpenRouterRequest(prompt);
};

const makeGeminiRequest = async (prompt) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.');
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) throw new Error('Empty response from AI');
    return content;
  } catch (error) {
    if (error.response?.status === 429) throw new Error('Gemini rate limit exceeded. Try again in a moment.');
    if (error.code === 'ECONNABORTED') throw new Error('AI request timed out. Try again.');
    throw new Error(error.response?.data?.error?.message || error.message || 'AI request failed');
  }
};

const makeOpenRouterRequest = async (prompt) => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const model = import.meta.env.VITE_OPENROUTER_MODEL || 'google/gemma-3-27b-it';

  if (!apiKey) {
    throw new Error('OpenRouter API key not configured. Add VITE_OPENROUTER_API_KEY to your .env file.');
  }

  try {
    const response = await axios.post(
      OPENROUTER_URL,
      { model, messages: [{ role: 'user', content: prompt }] },
      { 
        headers: { 
          'Authorization': `Bearer ${apiKey}`, 
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://oceanofmovies.com',
          'X-Title': 'Ocean of Movies'
        }, 
        timeout: 30000 
      }
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');
    return content;
  } catch (error) {
    if (error.response?.status === 401) throw new Error('Invalid OpenRouter API key');
    if (error.response?.status === 429) throw new Error('AI rate limit exceeded. Try again in a moment.');
    if (error.code === 'ECONNABORTED') throw new Error('AI request timed out. Try again.');
    throw new Error(error.response?.data?.error?.message || error.message || 'AI request failed');
  }
};

const makeGLMRequest = async (prompt) => {
  const apiKey = import.meta.env.VITE_GLM_API_KEY;
  const model = import.meta.env.VITE_GLM_MODEL || 'GLM-4.5-Flash';

  if (!apiKey) {
    throw new Error('GLM API key not configured. Add VITE_GLM_API_KEY to your .env file.');
  }

  try {
    const response = await axios.post(
      GLM_URL,
      { model, messages: [{ role: 'user', content: prompt }] },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from AI');
    return content;
  } catch (error) {
    if (error.response?.status === 401) throw new Error('Invalid GLM API key');
    if (error.response?.status === 429) throw new Error('GLM rate limit exceeded. Try again in a moment.');
    if (error.code === 'ECONNABORTED') throw new Error('AI request timed out. Try again.');
    throw new Error(error.response?.data?.error?.message || error.message || 'AI request failed');
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

export const getSimilarMovies = async (movie) => {
  const prompt = `Based on the movie "${movie.Title}" (${movie.Year}), which is a ${movie.Genre || 'Drama'} film,
  suggest 5 similar movies that fans of this film would enjoy.

  For each movie, provide just the title and a brief one-line reason why it's similar.
  Format: "Movie Title - Reason"`;

  const response = await makeAIRequest(prompt);

  if (Array.isArray(response)) {
    return response;
  }

  return response.split('\n').filter(line => line.trim()).slice(0, 5);
};

export const getSurpriseMovie = async (movies) => {
  if (!movies || movies.length === 0) {
    return {
      movie: { Title: 'No movies available', Year: '' },
      reason: 'Please search for movies first.',
    };
  }

  await new Promise(resolve => setTimeout(resolve, 800));

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

export const getPersonalizedRecommendations = async (preferences) => {
  const prompt = `Based on these movie preferences: ${preferences},
  recommend 5 movies that would be perfect for this viewer.

  For each recommendation, provide the title and a brief explanation of why it matches their taste.`;

  return await makeAIRequest(prompt);
};

const fetchMovieFromName = async (movieName) => {
  try {
    const result = await tmdbApi.searchMovies(movieName);
    if (result?.results?.length > 0) {
      const m = result.results[0];
      return {
        imdbID: m.id.toString(),
        Title: m.title || m.name,
        Year: (m.release_date || m.first_air_date || '').substring(0, 4),
        Poster: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'N/A',
        Type: m.media_type || 'movie',
      };
    }
  } catch { return null; }
  return null;
};

export const getAIAssistantResponse = async (userMessage, conversationHistory = []) => {
  const context = conversationHistory
    .slice(-5)
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const prompt = `You are a friendly AI movie assistant. Help users discover movies.

Conversation:
${context}

User: ${userMessage}

Respond with a friendly recommendation mentioning 2-3 specific movie titles. Format each movie title EXACTLY like this on its own line:
MOVIE: The Shawshank Redemption
MOVIE: Inception
MOVIE: Interstellar

Use ONLY the "MOVIE: Title" format for movies. Be warm and enthusiastic. Keep it concise.`;

  const aiResponse = await makeAIRequest(prompt);

  if (!aiResponse || typeof aiResponse !== 'string') {
    return { text: 'Sorry, I could not generate a response right now.', movies: [] };
  }

  const movieNames = [];
  const lines = aiResponse.split('\n');
  for (const line of lines) {
    const match = line.match(/MOVIE:\s*(.+)/i);
    if (match) {
      const name = match[1].trim().replace(/[.*_~`]/g, '');
      if (name) movieNames.push(name);
    }
  }

  const movies = [];
  for (const name of movieNames.slice(0, 5)) {
    const movieData = await fetchMovieFromName(name);
    if (movieData) movies.push(movieData);
  }

  const cleanText = aiResponse
    .replace(/MOVIE:\s*.+\n?/gi, '')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return {
    text: cleanText || aiResponse,
    movies: movies,
  };
};
