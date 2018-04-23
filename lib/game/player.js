function Player(socket, deck) {
	this.emit = (event, args) => socket.emit(event, ...args);
	this.getDeck = () => deck;
	var player = this;
	this.getOwner = () => player;
	var HP;
	this.getHP = () => HP;
	this.enterGame = (gameContext) => {
		gameContext.pushPlayer(player);
		shuffleDeck();
		HP = gameContext.startHP();
		player.draw(gameContext.startDraw(), gameContext);
	}
	var shuffleDeck = () => {
		var newDeck = [];
		while (deck.length)
			newDeck.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
		deck = newDeck;
	};
	var queues = [];
	this.getQueues = () => queues;
	this.addQueue = () => {
		let newQueue = new CardQueue();
		newQueue.index = queues.push(newQueue) - 1;
		return newQueue;
	}
	var discard = new Discard(player);
	this.draw = (amount, gameContext) => {
		let cnt = 0;
		for (let i = 0; i < amount; ++i)
			cnt += drawCard(gameContext);
		if (cnt) {
			gameContext.endDraw();
			gameContext.tryCall(`player ended draw`, [player]);
		}
		gameContext.waitForBind(repeat(discard, -amount), player, player.applyAction(gameContext), (gameContext) => {
			if (gameContext.getCountDiscard()) {
				gameContext.endDiscard();
				gameContext.tryCall(`player ended discard`, [player]);
			}
		});
	}
	this.applyAction = (gameContext) => (action) => action(gameContext);
	var hand = [];
	this.getHand = () => hand;
	var drawCard = (gameContext) => {
		if (gameContext.end()) return false;
		if (!deck.length) {
			gameContext.endGame(player);
			return false;
		}
		hand.push(deck.splice(0, 1)[0]);
		gameContext.tryCall('card drawn', [player]);
		return true;
	}
	var grave = [];
	this.getGrave = () => grave;
	this.discardCard = (card, gameContext) => {
		if (card === null || gameContext.end())
			return false;
		grave.push(hand.splice(hand.indexOf(card), 1)[0]);
		gameContext.increaseDiscard();
		gameContext.tryCall('card discarded', [player]);
		return true;
	}
	this.changeLife = (amount, gameContext) => {
		if (gameContext.end()) return;
		if ((HP += amount) <= 0) {
			gameContext.endGame(player);
			return;
		}
		gameContext.tryCall('life changed', [amount > 0 ? 1 : -1, player]);
	}
	this.playCard = (cardIndex, queueIndex, gameContext) => {
		gameContext
		    .makeCard(hand.splice(cardIndex, 1)[0], player)
		    .bindTriggerTargets(gameContext, queues[queueIndex]);
	}
}

module.exports = Player;

function repeat(object, times) {
	var ret = [];
	for (let i = 0; i < times; ++i)
		ret.push(object);
	return ret;
}

function Discard(owner) {
	this.string = 'discard';
	this.getOwner = () => owner;
	this.bind = (target, owner) => (gameContext) => owner.discardCard(target, gameContext);
}

function cardQueue() {
	var head, tail, size;
	this.index;
	this.getIndex = () => this.index;
	this.pushNext = (card) => {
		if (head) {
			tail.pushNext(card);
			tail = card;
		} else {
			tail = head = card;
		}
		return size++;
	}
	this.pop = () => {
		if (head.getNext()) {
			head = head.getNext();
			head.setPrev(undefined);
		} else {
			head = tail = undefined;
		}
		--size;
	}
}
