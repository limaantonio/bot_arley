const axios = require('axios');

const api = axios.create({
  baseURL: 'https://api-mylms.herokuapp.com/',
});

module.exports = {
  api,
};
