const API_BASE_URL = 'http://localhost:3000';
import axios from 'axios';

const personsApi = axios.create({
  baseURL: API_BASE_URL,
});

// añadir interceptor para adjuntar token si existe
personsApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// helper para escoger el prefijo de ruta según la BD
const prefixForDb = (db) => (db === 'postgres' ? '/pg' : '');

export const getPersons = async (db = 'mongodb') => {
  try {
    const prefix = prefixForDb(db);
    const response = await personsApi.get(`${prefix}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching persons:', error);
    throw error;
  }
};

export const createPerson = async (personData, db = 'mongodb') => {
  try {
    const prefix = prefixForDb(db);
    const response = await personsApi.post(`${prefix}`, personData);
    return response.data;
  } catch (error) {
    console.error('Error creating person:', error);
    throw error;
  }
};

export const updatePerson = async (id, personData, db = 'mongodb') => {
  try {
    const prefix = prefixForDb(db);
    const response = await personsApi.put(`${prefix}/${id}`, personData);
    return response.data;
  } catch (error) {
    console.error(`Error updating person ${id}:`, error);
    throw error;
  }
};

export const deletePerson = async (id, db = 'mongodb') => {
  try {
    const prefix = prefixForDb(db);
    const response = await personsApi.delete(`${prefix}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting person ${id}:`, error);
    throw error;
  }
};
