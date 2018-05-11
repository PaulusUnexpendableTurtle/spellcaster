function Player(socket, deck) {
	var player = this;
	this.getOwner = () => player;

	this.emit = (event, ...theArgs) => socket.emit(event, ...theArgs);
	this.on = (event, callback) => socket.on(event, callback);

	var HP, index;
	this.enterGame = (gameContext, i) => {
		index = i;
		socket.emit('ingame index', index);
		gameContext.pushPlayer(player);
		shuffleDeck();
		HP = gameContext.startHP();
		player.draw(gameContext.startDraw(), gameContext, ()=>{});
	};

	var shuffleDeck = () => {
		var newDeck = [];
		while (deck.length)
			newDeck.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
		deck = newDeck;
	};

	var hand = [], grave = [], queues = [];
	this.getHand = () => hand;
	this.getGrave = () => grave;
	this.getQueues = () => queues;

	this.draw = function(amount, gameContext, appendFunc) {
		drawCard(gameContext, 0, amount, false,
		() => {
			gameContext.tryCall('player ended draw', [player],
			appendFunc);
		});

		let len = hand.length;
		gameContext.waitForBind(repeat(discard, -amount), player, applyAction(gameContext), (gameContext) => {
			if (amount < 0 && len)
				gameContext.tryCall(`player ended discard`, [player],
				appendFunc);
			else
				appendFunc();
		});
	};

	var drawCard = function(gameContext, i, n, succ, appendFunc) {
		if (gameContext.end())
			return;

		if (i >= n) {
			if (succ)
				return appendFunc();
			return;
		}

		if (gameContext.end(player))
			return appendFunc();

		if (!deck.length) {
			gameContext.endGame(player);
			return appendFunc();
		}
		hand.push(deck.splice(0, 1)[0]);
		gameContext.tryCall('card drawn', [player],
		() => {
			drawCard(gameContext, i + 1, n, true,
			appendFunc);
		});
	};

	var discard = new Discard(player);
	this.discardCard = (card, gameContext, appendFunc) => {
		if (gameContext.end())
			return;

		if (card === null || gameContext.end(player))
			return appendFunc();

		grave.push(hand.splice(hand.indexOf(card), 1)[0]);
		gameContext.increaseDiscard();
		gameContext.tryCall('card discarded', [player],
		appendFunc);
		return true;
	};

	var next, prev;

	this.setNext = (player) => next = player;
	this.getNext = () => next;

	this.setPrev = (player) => prev = player;
	this.getPrev = () => prev;

	this.turn = (gameContext) => {
		gameContext.tryCall('turn start', [player],
		() => {
			drawCard(gameContext, 0, 1,
			() => {
				prepareToPlay(gameContext,
				() => {
					gameContext.tryCall('turn end', [player],
					() => next.turn(gameContext));
				});
			});
		});
	};

	var prepareToPlay = function(gameContext, appendFunc) {
		socket.on('play card', (cardID, queueID) => {
			if (hand.length && (!permit || cardID >= hand.length || cardID < 0))
				return;
			permit = false;

			player.playCard(cardID, queueID, gameContext,
			appendFunc);
		});
		let permit = true;
		socket.emit('play card');
	};

	var playCard = function(cardIndex, queueIndex, gameContext, appendFunc) {
		if (queueIndex >= queues.length) {
			queueIndex = queues.length;
			addQueue();
		}

		gameContext
		.makeCard(hand.splice(cardIndex, 1)[0], player)
		.bindTriggerTargets(gameContext, queues[queueIndex], appendFunc);
	};

	var addQueue = () => {
		let newQueue = new CardQueue(queues.length, player);
		queues.push(newQueue);
		return newQueue;
	};

	this.changeLife = function(amount, gameContext, appendFunc) {
		if (gameContext.end())
			return;
		if (gameContext.end(player))
			return appendFunc();

		if ((HP += amount) <= 0) {
			gameContext.endGame(player);
			return appendFunc();
		}

		gameContext.tryCall('life changed', [amount > 0 ? 1 : -1, player], 
		appendFunc);
	};

	this.publicForm = () => {
		return {
			index: index,
			HP: HP,
			queues: getQueueLengths(),
			deck: deck.length,
			hand: hand.length,
			grave: grave
		};
	};

	this.privateForm = (event) => {
		return {
			index: index,
			HP: HP,
			queues: getPrivateQueues(event),
			deck: deck.length,
			hand: hand,
			grave: grave
		};
	};

	var getQueueLengths = () => {
		let result = [];
		queues.forEach((q) => result.push(q.getSize()));
		return result;
	};

	var getPrivateQueues = (event) => {
		let result = [];
		queues.forEach((q) => result.push(q.privateForm(event)));
		return result;
	};
}

module.exports = Player;

let applyAction = (gameContext) => (action, appendFunc) => action(gameContext, appendFunc);

function repeat(object, times) {
	var ret = [];
	for (let i = 0; i < times; ++i)
		ret.push(object);
	return ret;
}

function Discard(owner) {
	this.string = 'discard';
	this.getOwner = () => owner;
	this.bind = (target, owner) => (gameContext, appendFunc) => owner.discardCard(target, gameContext, appendFunc);
}

function cardQueue(index, owner) {
	var head, tail, size = 0;
	this.getIndex = (card) => {
		if (!card)
			return index;
		let p = head, i = 0;
		while (p != card) {
			p = p.getNext();
			++i;
		}
		return i;
	}
	this.getSize = () => size;
	this.pushNext = (card) => {
		if (head) {
			tail.pushNext(card);
			tail = card;
		} else {
			tail = head = card;
		}
		return size++;
	};
	this.getOwner = () => owner;
	this.publicForm = () => {
		return {
			size: size,
			index: index
		};
	};
	this.privateForm = (event) => {
		let p = head, result = [];
		while (p) {
			result.push(p.privateForm(event));
			p = p.getNext();
		}
		return {
			list: result,
			index: index
		};
	};
	this.pop = () => {
		if (head.getNext()) {
			head = head.getNext();
			head.setPrev(undefined);
		} else {
			head = tail = undefined;
		}
		--size;
	};
}
