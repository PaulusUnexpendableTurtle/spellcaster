const Papa = require('papaparse');

const express = require('express'),
      app = express(),
      server = require('http').Server(app),
      io = require('socket.io')(server);

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
