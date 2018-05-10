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
		waitForBind(last, owner, (object, appendFunc) => {
			loopFunc(object);
			endFunc(gameContext);
		});
		bindees.forEach((elem) => waitForBind(elem, owner, loopFunc));
	}

	const triggersList = [];
	this.pushTrigger = (trigger) => {
		triggersList.push(trigger);
		trigger.inList = true;
	}

	this.tryCall = function(event, args, appendFunc) {
		sendEvent(event, args);

		let triggered = [];
		triggersList.forEach((elem) => {
			if (elem.triggers(event, gameContext, args))
				triggered.push(elem);
		});

		if (!triggered.length) {
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
	this.apply = (func) => {}

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

function BindeeContainer(bindee, owner, func) {
	let next = {};
	this.setNext = (nxt) => next = nxt;

	this.apply = () => {
		if (checkLock(bindee.string)) {
			let playerOwner = owner;
			while (playerOwner != playerOwner.getOwner())
				playerOwner = playerOwner.getOwner();

			playerOwner.on('sending targets', () => {
				if (!permit || !legal(bindee.string, ...arguments))
					return;
				permit = false;

				func(bindee.bind(...arguments, owner),
				next.apply ? next.apply : next);
			});

			let permit = true;
			playerOwner.emit('waiting targets', bindee.string);
		} else {
			func(bindee.bind(...getDefaultTargets(bindee.string), owner),
			next.apply ? next.apply : next);
		}
	}
}
