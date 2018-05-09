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

var eventHandler;
io.sockets.on('connection', (socket) => {
	if (!parser.complete())
		return;
	if (!eventHandler)
		eventHandler = require('./lib/event')({
			cardPool: require('./lib/game/card')(parser.get('cardData')),
			Player: require('./lib/game/player'),
			Game: require('./lib/game/game')
		});
	eventHandler.work(socket);
});
