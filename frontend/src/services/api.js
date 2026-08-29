import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

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

export const getNewsSources = () => {
  return api.get('/news/sources');
};

export const deleteEpisode = (id) => {
  return api.delete(`/episodes/${id}`);
};
