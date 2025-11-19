import api from '../utils/axios';

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  restore: (id) => api.post(`/users/${id}/restore`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`),
};

// Classes API
export const classesAPI = {
  getAll: (params) => api.get('/classes', { params }),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post('/classes', data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  restore: (id) => api.post(`/classes/${id}/restore`),
};

// Enrollments API
export const enrollmentsAPI = {
  getAll: (params) => api.get('/enrollments', { params }),
  getById: (id) => api.get(`/enrollments/${id}`),
  create: (data) => api.post('/enrollments', data),
  update: (id, data) => api.put(`/enrollments/${id}`, data),
  delete: (id) => api.delete(`/enrollments/${id}`),
  restore: (id) => api.post(`/enrollments/${id}/restore`),
};

// Attendance API
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getById: (id) => api.get(`/attendance/${id}`),
  create: (data) => api.post('/attendance', data),
  bulkCreate: (data) => api.post('/attendance/bulk', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  delete: (id) => api.delete(`/attendance/${id}`),
};

// Fees API
export const feesAPI = {
  getAll: (params) => api.get('/fees', { params }),
  getById: (id) => api.get(`/fees/${id}`),
  create: (data) => api.post('/fees', data),
  update: (id, data) => api.put(`/fees/${id}`, data),
  delete: (id) => api.delete(`/fees/${id}`),
};

// Tutes API
export const tutesAPI = {
  getAll: (params) => api.get('/tutes', { params }),
  getById: (id) => api.get(`/tutes/${id}`),
  create: (data) => api.post('/tutes', data),
  bulkCreate: (data) => api.post('/tutes/bulk', data),
  update: (id, data) => api.put(`/tutes/${id}`, data),
  delete: (id) => api.delete(`/tutes/${id}`),
};

// Assignments API
export const assignmentsAPI = {
  getAll: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (data) => api.post('/assignments', data),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  getMarks: (id) => api.get(`/assignments/${id}/marks`),
  createMark: (id, data) => api.post(`/assignments/${id}/marks`, data),
  updateMark: (id, markId, data) => api.put(`/assignments/${id}/marks/${markId}`, data),
  deleteMark: (id, markId) => api.delete(`/assignments/${id}/marks/${markId}`),
};

