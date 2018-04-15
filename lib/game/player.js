function Player(socket, deck) {
	var player = this;
	this.getOwner = () => player;
	var HP;
	this.enterGame = (gameContext) => {
		//TODO:
		gameContext.pushPlayer(this);
		//TODO:
		shuffleDeck();
		//TODO:
		HP = gameContext.startHP();
		//TODO: startDraw
		this.draw(gameContext.startDraw(), gameContext);
	}
	var queues = [];
	this.addQueue = () => {
		//TODO: CardQueue
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
		if (cnt)
			gameContext.triggersList.tryCall(`player ended draw`, [player]);
		gameContext.waitForBind(repeat(discard, -amount), player, player.applyAction(gameContext), (gameContext) => {
			if (gameContext.countDiscard())
				gameContext.triggersList.tryCall(`player ended discard`, [player]);
		});
	}
	this.applyAction = (gameContext) => (action) => action(gameContext);
	var hand = [];
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
		gameContext.triggersList.tryCall('card drawn', [player]);
		return true;
	}
	var grave = [];
	this.discardCard = (card, gameContext) => {
		if (card === null || gameContext.end())
			return false;
		let index = hand.findIndex((c) => c == card);
		grave.push(hand[index]);
		hand = hand.slice(0, index).push(hand.slice(index + 1));
		gameContext.triggersList.tryCall('card discarded', [player]);
		return true;
	}
	this.changeLife = (amount, gameContext) => {
		if (gameContext.end()) return;
		if (HP + amount <= 0) {
			gameContext.endGame(player);
			return;
		}
		HP += amount;
		gameContext.triggersList.tryCall('life changed', [amount > 0 ? 1 : -1, player]);
	}
	//TODO: this.playCard
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
