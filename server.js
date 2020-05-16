const http = require('http');
const app = require('./app');
const port = process.env.PORT || 8080;

const server = http.createServer(app);

server.listen(port, "0.0.0.0");
console.log('Server running at http://0.0.0.0:8080/');
