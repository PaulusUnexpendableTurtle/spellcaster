const express = require('express'),
      app = express(),
      server = require('http').Server(app),
      io = require('socket.io')(server);

const table_names =
	[
		{
			name: 'cardData',
			header: true
		},
		{
			name: 'gameData',
			header: true
		},
		{
			name: 'eventData',
			header: true
		},
		{
			name: 'sampleDecks'
		}
	],
	parser = require('./lib/parser')(require('fs'), require('papaparse'), table_names);

app.get('/', (req, res) => {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

var eventHandler;
io.sockets.on('connection', (socket) => {
	console.log('connection');
	if (!parser.complete())
		return;
	if (!eventHandler)
		eventHandler = require('./lib/event')({
			cardPool: require('./lib/game/card')(parser.get('cardData')),
			Player: require('./lib/game/player'),
			Game: require('./lib/game/game'),
			gameOptions: parser.get('gameData'),
			gameEventTree: parser.get('eventData'),
			sampleDecks: parser.get('sampleDecks')
		});
	eventHandler.work(socket);
});

server.listen(process.env.PORT || 8000);
