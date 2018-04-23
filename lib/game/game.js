function GameContext(gameData, eventData, cardPool) {
	var gameContext = this;

	this.start = (players) => {
		players.forEach((player) => player.enterGame(gameContext));
		//TODO: finish
	}

	const players = [];
	this.pushPlayer = (player) => {
		players.push(player);
	}
	this.makeCard = (id, owner) => cardPool.get(id, owner);
	this.startHP = () => gameData.startHP;
	this.startDraw = () => gameData.startDraw;

	const eventTree = [];
	eventData.forEach((edge) => (eventTree[edge.from] = eventTree[edge.from] || []).push(edge.to));

	//if parentEvent happens, sonEvent happens too; if sonEvent happens, it doesn't mean that parentEvent happens
	this.inherits = (sonEvent, parentEvent) => checkInheritance(parentEvent, sonEvent);
	var checkInheritance = (from, to) => eventTree[from].some((vertex) => vertex == to || checkInheritance(vertex, to));

	this.waitForBind = (bindees, owner, loopFunc, endFunc) => {
		let last = bindees.splice(bindees.length - 1, 1)[0];
		waitForBind(last, owner, (object) => {
			loopFunc(object);
			endFunc(gameContext);
		});
		bindees.forEach((elem) => waitForBind(last, owner, loopFunc));
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
		pushToStack(() => {
			sendEvent(event, sources);
			triggersList.forEach((elem) => elem.tryCall(event, sources, gameContext));
		});
	}
	var sendEvent = (event, sources) => {
		let publicForm = [];
		sources.forEach((source) => publicForm.push(source.publicForm ? source.publicForm(gameContext) : source));
		players.forEach((player) => player.emit(event, sources.includes(player) ? sources : publicForm));
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
		onEmptyStack(() => {
			++actionCombo;
			//mb elements and so on
		});
	}

	this.apply = (func) => {
		pushToStack(() => func(gameContext));
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

	const stack = [];
	var onEmpty = [];
	var pushToStack = (func, lockNeeded) => stack.push(new StackObject(func, lockNeeded));
	var onEmptyStack = (func) => onEmpty.push(func);

	var end = false;
	this.endGame = (player) => {
		players.splice(players.indexOf(player), 1)[0].emit('game lost');
		players.forEach((elem) => elem.emit('game won'));
		end = true;
	}
	this.end = () => end;
}

module.exports = GameContext;

function StackObject(func, lockNeeded) {
	//TODO
}