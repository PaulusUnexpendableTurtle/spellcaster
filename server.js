const express = require('express'),
      app = express(),
      server = require('http').Server(app),
      io = require('socket.io')(server);

const table_names = [],
      parser = require('./lib/parser')(require('fs'), require('papaparse'), table_names);

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

server.listen(process.env.PORT || 8080);
