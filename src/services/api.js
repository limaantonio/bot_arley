const axios = require('axios');

//const baseURL = 'https://api-mylms.herokuapp.com/'
const baseURL = 'http://localhost:3333/'

const getSubjects = async () => {
  const res = await axios.get(`${baseURL}subject`)
  return res.data;
}

const getTarefa = async id => {
  const resp = await axios.get(`${baseUrl}subject/${id}`)
  return resp.data
}

const getLesson = async subject => {
  const resp = await axios.get(`${baseURL}lesson?subject=${subject}`)
  return resp.data
}

const getLessonByStudent = async student => {
  const resp = await axios.get(`${baseURL}getLessonByStudent?student=${student}`)
  return resp.data
}

//essa deve ser studentTask
const getTask = async lesson => {
  const resp = await axios.get(`${baseURL}tasks?lesson=${lesson}`)
  return resp.data
}

const taskByLessonAndStudent = async (student, lesson) => {
  const resp = await axios.get(`${baseURL}taskByLessonAndStudent?student=${student}&lesson=${lesson}`)
  return resp.data
}

const getTaskById = async task => {
  const resp = await axios.get(`${baseURL}task/${task}`)
  return resp.data
}

//em construcao, deve informar se o estudante finalizou todas as atividades de uma aula
const getStatudentTask = async student => {
  const resp = await axios.get(`${baseURL}student_task?status=CONCLUIDO&student=${student}`)
  return resp.data
}

const getTaskByStudent = async student => {
  const resp = await axios.get(`${baseURL}student_task?status=CONCLUIDO&student=${student}`)
  return resp.data
}

const getTaskByStudentPennding = async student => {
  const resp = await axios.get(`${baseURL}student_task?status=PENDENTE&student=${student}`)
  return resp.data
}

const getStudentTaskPennding = async () => {
  const resp = await axios.get(`${baseURL}student_task?status=PENDENTE`)
  return resp.data
}

const getAction = async task => {
  const resp = await axios.get(`${baseURL}actions_task?task=${task}`)
  return resp.data
}

const getActions = async () => {
  const resp = await axios.get(`${baseURL}action`)
  return resp.data
}

const getActionByLesson = async lesson => {
  const resp = await axios.get(`${baseURL}actions_lesson?lesson=${lesson}`)
  return resp.data
}

const getTaskPenndigByLessonByStudent = async (lesson, student) => {
  const resp = await axios.get(`${baseURL}get_pennding_task_by_student_lesson?student=${student}&lesson=${lesson}`)
  return resp.data
}

const insertCodeAccess = async (data, registration) => {
  const res = await axios.put(`${baseURL}insert_code_access/${registration}`, data);
  return res.data;
}

const createStudent = async (data) => {
  const res = await axios.post(`${baseURL}student`, data);
  return res.data;
}

const getStudents = async () => {
  const res = await axios.get(`${baseURL}student`);
  return res.data;
}

const login = async (matricula) => {
  const res = await axios.get(`${baseURL}login?registration=${matricula}`);
  return res.data;
}

module.exports = {
  getSubjects,
  getActions,
  getTarefa,
  login,
  getLesson,
  getTask,
  getTaskById,
  getTaskByStudent,
  getAction,
  getTaskPenndigByLessonByStudent,
  getActionByLesson,
  getLessonByStudent,
  insertCodeAccess,
  createStudent,
  getStudents,
  getStudentTaskPennding,
  getTaskByStudentPennding,
  taskByLessonAndStudent
};
