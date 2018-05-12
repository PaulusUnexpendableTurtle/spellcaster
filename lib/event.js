function EventHandler(options) {
	const cardPool = options.cardPool,
	      cardPoolPoster = options.cardPoolPoster,
	      Player = options.Player,
	      Game = options.Game,
	      gameOptions = options.gameOptions,
	      gameEventTree = options.gameEventTree,
	      sampleDecks = options.sampleDecks,
	      fileSystem = options.fileSystem;

	var waiting;

	const
	STATE_MAIN = 0,
	STATE_EDITOR = 1,
	STATE_GAME = 2;

	this.work = (socket) => {
		let state = STATE_MAIN;

		socket.on('editor enter', () => {
			if (state != STATE_MAIN)
				return;
			fileSystem.readFile('client/editor.html', 'utf-8', (err, data) => {
				if (err) {
					console.log('error:', err);
					return;
				}
				state = STATE_EDITOR;
				socket.emit('editor kit', data, cardPool);
			});
		});
		socket.on('card post', (card) => {
			cardPool.push(card);
			cardPoolPoster(caster);
			socket.emit('card index', cardPool.length - 1);
		});

		var json = {
			socket: socket,
			player: undefined,
			game: undefined
		};

		socket.on('game enter', (deck) => {
			if (json.player)
				return;
			json.player = new Player(socket, deck);

			fileSystem.readFile('client/game.html', 'utf-8', (err, data) => {
				if (err) {
					console.log('error:', err);
					return;
				}
				socket.emit('game html', data);

				if (waiting) {
					json.game = waiting.game = new Game(
						gameOptions[0],
						gameEventTree,
						cardPool
					);
					let other = waiting;
					waiting = undefined;
					json.game.start([json.player, other.player]);
				} else waiting = json;
			});
		});
		socket.on('quit', () => {
			console.log('quit');
			quit();
		});
		socket.on('disconnect', () => {
			console.log('disconnect');
			quit();
		});

		socket.on('back to main', () => {
			if (state == STATE_MAIN)
				return;
			fileSystem.readFile('client/index.html', 'utf-8', (err, data) => {
				if (err) {
					console.log('error:', err);
					return;
				}
				state = STATE_MAIN;
				socket.emit('index html', data);
			});
		});

		socket.emit('connect success', sampleDecks);

		function quit() {
			if (!json.player)
				return;
			if (!json.game.end())
				json.game.endGame(json.player);
			if (waiting === json)
				waiting = undefined;
			json.player = undefined;
			json.game = undefined;
		};
	};
}

module.exports = EventHandler;
