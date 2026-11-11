import axios from 'axios';

const RAW_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const BASE_URL = RAW_API_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');
export const API_URL = `${BASE_URL}/api`;

export const api = axios.create({
  baseURL: API_URL,
});

export const fetchNews = (category = null) => {
  const params = category ? { category } : {};
  return api.get('/news', { params });
};

export const triggerNewsFetch = () => {
  return api.post('/news/fetch');
};

export const generateEpisode = (data) => {
  return api.post('/episodes/generate', data);
};

export const getEpisodes = () => {
  return api.get('/episodes');
};

export const getEpisode = (id) => {
  return api.get(`/episodes/${id}`);
};

export const getVoices = () => {
  return api.get('/voices');
};

export const getHostPairs = () => {
  return api.get('/voices/host-pairs');
};

export const getNewsSources = () => {
  return api.get('/news/sources');
};

export const deleteEpisode = (id) => {
  return api.delete(`/episodes/${id}`);
};

// Shows API
export const getShows = () => {
  return api.get('/shows');
};

export const getShow = (id) => {
  return api.get(`/shows/${id}`);
};

export const createShow = (data) => {
  return api.post('/shows', data);
};

export const updateShow = (id, data) => {
  return api.put(`/shows/${id}`, data);
};

export const deleteShow = (id) => {
  return api.delete(`/shows/${id}`);
};

export const toggleShow = (id) => {
  return api.post(`/shows/${id}/toggle`);
};

export const runShow = (id) => {
  return api.post(`/shows/${id}/run`);
};

// RSS Podcast Feeds & Real-time Server-Sent Events (SSE)
export const getShowFeedUrl = (showId) => {
  return `${API_URL}/shows/${showId}/feed.xml`;
};

export const getGlobalFeedUrl = () => {
  return `${API_URL}/feed.xml`;
};

export const getEpisodeEventsUrl = (episodeId) => {
  return `${API_URL}/episodes/${episodeId}/events`;
};

