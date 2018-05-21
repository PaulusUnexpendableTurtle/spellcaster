function EventHandler(options) {
	const cardPool = options.cardPool,
	      gameOptions = options.gameOptions;

	var waiting;

	this.work = (socket) => {
		let cardPoolSent = false;
		socket.on('request cardpool', () => {
			if (cardPoolSent)
				return;
			cardPoolSent = true;
			socket.emit('cardpool', cardPool);
		});
		socket.on('card post', (card) => {
			let len = cardPool.push(card);
			options.cardPoolPoster(card);
			socket.emit('card index', len - 1);
		});

		var json = {
			socket: socket,
			player: undefined,
			game: undefined
		};

		socket.on('game enter', (deck) => {
			if (json.player)
				return;
			json.player = new options.Player(socket, deck);

			if (waiting) {
				json.game = waiting.game = new options.Game({
					gameData: gameOptions[0],
					eventData: options.gameEventTree,
					cardPool: cardPool,
					subSplitter: options.subSplitter
				});
				let other = waiting;
				waiting = undefined;
				json.game.start(json.player, other.player);
			} else waiting = json;
		});
		socket.on('quit', () => {
			console.log('quit');
			quit();
		});
		socket.on('disconnect', () => {
			console.log('disconnect');
			quit();
		});

		socket.emit('connect success', options.sampleDecks);

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
