const axios = require('axios');

const baseURL = 'https://api-mylms.herokuapp.com/'

const getTarefas = async () => {
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

const getTask = async lesson => {
  const resp = await axios.get(`${baseURL}tasks?lesson=${lesson}`)
  return resp.data
}

const getTaskById = async task => {
  const resp = await axios.get(`${baseURL}task/${task}`)
  return resp.data
}

const login = async (name, matricula) => {
  const res = await axios.get(`${baseURL}login?name=${name}&registration=${matricula}`);
  return res.data;
}

module.exports = {
  getTarefas,
  getTarefa,
  login,
  getLesson,
  getTask,
  getTaskById
};
