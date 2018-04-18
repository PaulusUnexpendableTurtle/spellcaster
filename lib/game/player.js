function Player(socket, deck) {
	this.getDeck = () => deck;
	var player = this;
	this.getOwner = () => player;
	var HP;
	this.getHP = () => HP;
	this.enterGame = (gameContext) => {
		//TODO:
		gameContext.pushPlayer(player);
		shuffleDeck();
		//TODO:
		HP = gameContext.startHP();
		//TODO: startDraw
		player.draw(gameContext.startDraw(), gameContext);
	}
	var shuffleDeck = () => {
		var newDeck = [];
		while (deck.length) {
			let i = Math.floor(Math.random() * deck.length);
			newDeck.push(deck[i]);
			deck = deck.slice(0, i).push(deck.slice(i + 1));
		}
		deck = newDeck;
	};
	var queues = [];
	this.getQueues = () => queues;
	this.addQueue = () => {
		let newQueue = new CardQueue(),
		    index = queues.push(newQueue) - 1;
		return {
			newQueue: newQueue,
			index: index
		};
	}
	var discard = new Discard(player);
	this.draw = (amount, gameContext) => {
		let cnt = 0;
		for (let i = 0; i < amount; ++i)
			cnt += drawCard(gameContext);
		if (cnt) {
			gameContext.tryCall(`player ended draw`, [player]);
			gameContext.endDraw();
		}
		gameContext.waitForBind(repeat(discard, -amount), player, player.applyAction(gameContext), (gameContext) => {
			if (gameContext.countDiscard()) {
				gameContext.tryCall(`player ended discard`, [player]);
				gameContext.endDiscard();
			}
		});
	}
	this.applyAction = (gameContext) => (action) => action(gameContext);
	var hand = [];
	this.getHand = () => hand;
	var drawCard = (gameContext) => {
		//TODO:
		if (gameContext.end()) return false;
		if (deck.length == 0) {
			//TODO:
			gameContext.endGame(player);
			return false;
		}
		hand.push(deck[0]);
		deck = deck.slice(1);
		gameContext.tryCall('card drawn', [player]);
		return true;
	}
	var grave = [];
	this.getGrave = () => grave;
	this.discardCard = (card, gameContext) => {
		if (card === null || gameContext.end())
			return false;
		let index = hand.findIndex((c) => c == card);
		grave.push(hand[index]);
		hand = hand.slice(0, index).push(hand.slice(index + 1));
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
		let card = hand[cardIndex];
		hand = hand.slice(0, cardIndex).push(hand.slice(cardIndex + 1));
		//TODO: makeCard
		gameContext
		    .makeCard(card, player)
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
	var head, tail;
	this.pushNext = (card) => {
		if (head) {
			tail.pushNext(card);
			tail = card;
		} else {
			tail = head = card;
		}
	}
	this.pop = () => {
		if (head.getNext()) {
			head = head.getNext();
			head.setPrev(undefined);
		} else {
			head = tail = undefined;
		}
	}
}
