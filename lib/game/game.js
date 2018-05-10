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

	this.waitForBind = (bindees, owner, loopFunc, endFunc) => {
		let n = bindees.length;
		for (let i = 0; i < n - 1; ++i) {
			bindees[i] = new BindeeContainer(bindees[i], bindees[i].owner, loopFunc);
			bindees[i].setNext(bindees[i + 1].apply);
		}
		bindees[n - 1] = new BindeeContainer(bindees[n - 1], bindees[n - 1].owner, loopFunc);
		bindees[n - 1].setNext(() => endFunc(gameContext));

		bindees[0].apply();
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

		if (!triggered.length)
			return appendFunc();

		let n = triggered.length;
		for (let i = 0; i < n - 1; ++i)
			triggered[i].setNext(() => triggered[i + 1].call(gameContext));
		triggered[n - 1].setNext(appendFunc);

		triggered[0].call(gameContext);
	}
	var sendEvent = (event, sources) => {
		let publicForm = [], privateForm = [];
		sources.forEach((source) => {
			publicForm.push(source.publicForm ? source.publicForm(event) : source);
			privateForm.push(source.privateForm ? source.privateForm(event) : source);
		});
		players.forEach((player) => player.emit(event, sources.includes(player) ? privateForm : publicForm));
	}

	this.removeTriggers = (array) => {
		array.forEach((elem) => {
			triggersList.splice(triggersList.indexOf(elem), 1);
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
		++cardCombo;
		//mb elements and so on
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

		let i = players.indexOf(player);

		players.splice(i, 1)[0].emit('game lost');
		players.forEach((pl) => pl.emit('player lost', i));

		if (players.length == 1) {
			players[0].emit('game won');
			end = true;
		}
	}
	this.end = (player) => end || !players.includes(player);
}

module.exports = GameContext;

function BindeeContainer(bindee, owner, func) {
	let next = function() {};
	this.setNext = (nxt) => next = nxt;

	this.apply = () => {
		//TODO
		if (checkLock(bindee.string)) {
			let playerOwner = owner;
			while (playerOwner != playerOwner.getOwner())
				playerOwner = playerOwner.getOwner();

			playerOwner.on('sending targets', () => {
				//TODO: legal(bindee, targets)
				if (!permit || !legal(bindee.string, ...arguments))
					return;
				permit = false;

				func(bindee.bind(...arguments, owner),
				next);
			});

			let permit = true;
			playerOwner.emit('waiting targets', bindee.string);
		} else {
			//TODO: getDefaultTargets
			func(bindee.bind(...getDefaultTargets(bindee.string), owner),
			next);
		}
	}
}
