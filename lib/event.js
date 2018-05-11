function EventHandler(options) {
	const cardPool = options.cardPool,
	      Player = options.Player,
	      Game = options.Game,
	      gameOptions = options.gameOptions,
	      gameEventTree = options.gameEventTree,
	      sampleDecks = options.sampleDecks;

	var waiting;

	this.work = (socket) => {
		var json = {
			player: undefined,
			game: undefined
		};
		socket.on('game enter', (deck) => {
			if (json.player)
				return;
			json.player = new Player(socket, deck);
			if (waiting) {
				json.game = waiting.game = new Game(
					gameOptions[0],
					gameEventTree,
					cardPool
				);
				json.game.start([waiting.player, json.player]);
				waiting = undefined;
			} else waiting = json;
		});
		socket.on('quit', quit);
		socket.on('disconnect', quit);

		socket.emit('connect success', sampleDecks);

		function quit() {
			if (!json.player)
				return;
			if (!json.game.end())
				json.game.endGame(json.player);
			json.player = undefined;
			json.game = undefined;
		}
	}
}

module.exports = EventHandler;
