function GameContext(gameData, eventTree, cardPool) {
	var gameContext = this;

	const players = [];
	this.pushPlayer = (player) => {
		players.push(player);
	}
	this.makeCard = (id, owner) => cardPool.get(id, owner);
	this.startHP = () => gameData.startHP;
	this.startDraw = () => gameData.startDraw;

	this.inherits = (sonEvent, parentEvent) => checkInheritance(parentEvent, sonEvent);
	var checkInheritance = (from, to) => eventTree[from].some((vertex) => vertex == to || checkInheritance(vertex, to));

	this.waitForBind = (bindees, owner, loopFunc, endFunc) => {
		let last = bindees.splice(bindees.length - 1, 1);
		//TODO: individual waitForBind
		bindees.forEach((elem) => waitForBind(last, owner, loopFunc));
		waitForBind(last, owner, (object) => {
			loopFunc(object);
			endFunc(gameContext);
		});
	}
	var waitForBind = (bindee, owner, func) => {
		//TODO: lock depending on if it's needed
		lockOnDecide(bindee.string);
		//TODO: finish using stack
	}

	const triggersList = [];
	this.pushTrigger = (trigger) => {
		triggersList.push(trigger);
	}
	this.tryCall = (event, sources) => {
		//TODO:
		pushToStack(() => triggersList.forEach((elem) => elem.tryCall(event, sources, gameContext)));
	}
	this.removeTriggers = (array) => {
		array.forEach((elem) => triggersList.splice(triggersList.indexOf(elem), 1));
	}

	var actionCombo = 0, cardCombo = 0, countDiscard = 0;
	this.getActionCombo = () => actionCombo;
	this.getCardCombo = () => cardCombo;
	this.getCountDiscard = () => countDiscard;

	this.increaseActionCombo = () => {
		pushToStack(() => ++actionCombo);
	}
	this.increaseDiscard = () => {
		pushToStack(() => ++countDiscard);
	}
	this.updateStats = (card) => {
		//TODO:
		onEmptyStack(() => ++actionCombo);
	}

	this.endSpellCast = () => {
		onEmptyStack(() => {
			actionCombo = 0;
			cardCombo = 0;
		});
	}
	this.endDraw = () => {
		//What to do?
	}
	this.endDiscard = () => {
		onEmptyStack(() => countDiscard = 0);
	}

	var end = false;
	this.endGame = (player) => {
		players.splice(players.indexOf(player), 1).emit('game lost');
		players.forEach((elem) => elem.emit('game won'));
		end = true;
	}
	this.end = () => end;
}

module.exports = GameContext;
