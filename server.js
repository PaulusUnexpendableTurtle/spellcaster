const express = require('express'),
      app = express(),
      server = require('http').Server(app),
      io = require('socket.io')(server);

const Parser = require('./lib/parser'),
      CardPool = require('./lib/game/card'),
      EventHandler = require('./lib/event'),
      Papa = require('papaparse');

const table_names =
	[
		{
			name: 'cardData',
			delimiter: ';',
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

var transport, sourceJSON;
if (process.argv[2]) {
	transport = require('nodemailer').createTransport(sourceJSON = {
		service: process.argv[2],
		auth: {
			user: process.argv[3],
			pass: process.argv[4]
		}
	});
}

var eventHandler;
io.sockets.on('connection', (socket) => {
	console.log('connection');
	if (!parser.complete()) {
		socket.emit('server not ready');
		return;
	}
	if (!eventHandler)
		eventHandler = new EventHandler({
			cardPool: new CardPool(parser.get(table_names[0].name), ','),
			subSplitter: '|',
			cardPoolPoster: (card) => {
				if (!transport)
					return;
				transport.sendMail({
					from: sourceJSON.auth.user,
					to: sourceJSON.auth.user,
					subject: 'Spellcaster: user posted new card',
					text: Papa.unparse([card])
				},
				(error, info) => {
					if (error)
						console.log(error);
					else
						console.log(`Email sent: ${info.response}`);
				});
			},
			Player: require('./lib/game/player'),
			Game: require('./lib/game/game'),
			gameOptions: parser.get(table_names[1].name),
			gameEventTree: parser.get(table_names[2].name),
			sampleDecks: parser.get(table_names[3].name)
		});
	eventHandler.work(socket);
});

server.listen(process.env.PORT || 8000);
