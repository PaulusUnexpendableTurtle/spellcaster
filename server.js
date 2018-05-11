const express = require('express'),
      app = express(),
      server = require('http').Server(app),
      io = require('socket.io')(server);

const Parser = require('./lib/parser'),
      CardPool = require('./lib/game/card'),
      EventHandler = require('./lib/event');

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
	];
const parser = new Parser(require('fs'), require('papaparse'), table_names);

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
		eventHandler = new EventHandler({
			cardPool: new CardPool(parser.get(table_names[0].name)),
			Player: require('./lib/game/player'),
			Game: require('./lib/game/game'),
			gameOptions: parser.get(table_names[1].name),
			gameEventTree: parser.get(table_names[2].name),
			sampleDecks: parser.get(table_names[3].name)
		});
	eventHandler.work(socket);
});

server.listen(process.env.PORT || 8000);
