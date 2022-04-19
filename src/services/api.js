const axios = require('axios');

const api = axios.create({
  baseURL: 'http://https://api-mylms.herokuapp.com/',
});

module.exports = {
  api,
};
