import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 10000
})

export default {
  // Courses
  getCourses: (params = {}) => api.get('/courses', { params }),
  getCourse: (id) => api.get(`/courses/${id}`),
  getCoursesByCategory: (category) => api.get(`/courses/category/${category}`),
  getCategories: () => api.get('/courses/categories'),
  getStatistics: () => api.get('/courses/statistics'),
  
  // Scraper
  startScraping: () => api.post('/scraper/start'),
  getScrapingStatus: () => api.get('/scraper/status')
}