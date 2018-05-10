function GameContext(gameData, eventData, cardPool) {
	var gameContext = this;

	this.start = (players) => {
		players.forEach((player, i) => {
			player.enterGame(gameContext, i);

			let j = i + 1;
			if (i == players.length - 1) j = 0;

			player.setNext(players[j]);
			players[j].setPrev(player);
		});
		sendEvent('game started', [players.length]);
		players[0].turn(gameContext);
	}

	const players = [];
	this.pushPlayer = (player) => {
		players.push(player);
	}
	this.makeCard = (id, owner) => cardPool.get(id, owner);
	this.startHP = () => gameData.startHP;
	this.startDraw = () => gameData.startDraw;

	const eventTree = [];
	eventData.forEach((edge) => (eventTree[edge.from] = (eventTree[edge.from] || [])).push(edge.to));

	//if parentEvent happens, sonEvent happens too; if sonEvent happens, it doesn't mean that parentEvent happens
	this.inherits = (sonEvent, parentEvent) => checkInheritance(parentEvent, sonEvent);
	var checkInheritance = (from, to) => eventTree[from].some((vertex) => vertex == to || checkInheritance(vertex, to));

	//TODO
	this.waitForBind = (bindees, owner, loopFunc, endFunc) => {
		let last = bindees.splice(-1, 1)[0];
		waitForBind(last, owner, (object) => {
			loopFunc(object);
			endFunc(gameContext);
		});
		bindees.forEach((elem) => waitForBind(elem, owner, loopFunc));
	}
	var waitForBind = (bindee, owner, func) => {
		//sth's wrong
		let lock = checkLock(bindee.string);
		var packOfTargets;
		pushToStack(() => func(bindee.bind(...packOfTargets, owner)), lock);
		if (lock) {
			while (owner != owner.getOwner())
				owner = owner.getOwner();
			let id = owner.actionID++;
			owner.emit('waiting targets', bindee.string, id);
			owner.on('sending targets', (parcelID) => {
				if (id == parcelID) {
					packOfTargets = ...arguments;
					//TODO: try to apply
				}
			});
		} else {
			packOfTargets = getDefaultTargets(bindee.string);
			//TODO: try to apply
		}
	}

	const triggersList = [];
	this.pushTrigger = (trigger) => {
		triggersList.push(trigger);
		trigger.inList = true;
	}

	this.tryCall = function(event) {
		let appendFunc = function(){};
		this.andThen = (func) => appendFunc = func;

		sendEvent(event, arguments);

		let triggered = [];
		triggersList.forEach((elem) => {
			if (elem.triggers(event, gameContext, ...arguments))
				triggered.push(elem);
		});

		if (triggered.length) {
			appendFunc();
			return;
		}

		let n = triggered.length;
		for (let i = 0; i < n - 1; ++i)
			triggered[i].setNext(() => triggered[i + 1].call(gameContext));
		triggered[n - 1].setNext(appendFunc);

		triggered[0].call(gameContext);
	}
	var sendEvent = (event, sources) => {
		let publicForm = [];
		sources.forEach((source) => publicForm.push(source.publicForm ? source.publicForm(gameContext) : source));
		players.forEach((player) => player.emit(event, sources.includes(player) ? sources : publicForm));
	}

	this.removeTriggers = (array) => {
		array.forEach((elem) => {
			triggersList.splice(triggersList.indexOf(elem), 1)
			elem.inList = false;
		});
	}

	var actionCombo = 0, cardCombo = 0, countDiscard = 0;
	this.getActionCombo = () => actionCombo;
	this.getCardCombo = () => cardCombo;
	this.getCountDiscard = () => countDiscard;

	this.increaseActionCombo = () => {
		++actionCombo;
	}
	this.increaseDiscard = () => {
		++countDiscard;
	}
	this.updateStats = (card) => {
		++actionCombo;
		//mb elements and so on
	}

	//TODO
	this.apply = (func) => {
		pushToStack(() => func(gameContext));
	}

	this.endSpellCast = () => {
		actionCombo = 0;
		cardCombo = 0;
	}

	this.endDiscard = () => {
		countDiscard = 0;
	}

	var end = false;
	this.endGame = (player) => {
		player.getPrev().setNext(player.getNext());
		player.getNext().setPrev(player.getPrev());

		players.splice(players.indexOf(player), 1)[0].emit('game lost');

		if (players.length == 1) {
			players[0].emit('game won');
			end = true;
		}
	}
	this.end = (player) => end || !players.includes(player);
}

module.exports = GameContext;
