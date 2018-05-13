function GameContext(gameData, eventData, cardPool, subSplitter) {
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
	this.getPlayer = (index) => players[index];

	this.makeCard = (id, owner) => cardPool.get(id, owner, subSplitter);
	this.getSubSplitter = () => subSplitter;

	this.startHP = () => gameData.startHP;
	this.startDraw = () => gameData.startDraw;

	const eventTree = [];
	eventData.forEach((edge) => (eventTree[edge.from] = (eventTree[edge.from] || [])).push(edge.to));

	//if parentEvent happens, sonEvent happens too; if sonEvent happens, it doesn't mean that parentEvent happens
	this.inherits = (sonEvent, parentEvent) => checkInheritance(parentEvent, sonEvent);
	var checkInheritance = (from, to) => from == to || eventTree[from].some((vertex) => checkInheritance(vertex, to));

	this.waitForBind = (bindees, owner, loopFunc, endFunc) => {
		let n = bindees.length;
		if (!n) return;
		for (let i = 0; i < n - 1; ++i) {
			bindees[i] = new BindeeContainer(bindees[i], bindees[i].owner, loopFunc);
			bindees[i].setNext(bindees[i + 1].apply);
		}
		bindees[n - 1] = new BindeeContainer(bindees[n - 1], bindees[n - 1].owner, loopFunc);
		bindees[n - 1].setNext(() => endFunc(gameContext));

		bindees[0].apply();
	}

	this.noAbleTargets = (gameType, bindString, owner) => {
		if (!gameType)
			return true;
		if (gameType == 'player' || gameType == 'trigger' || gameType == 'sign')
			return false;

		let possibilities = players;
		if (bindString.includes('owner'))
			possibilities = [owner];
		if (bindString.includes('opponent'))
			possibilities.splice(possibilities.indexOf(owner), 1);

		if (gameType == 'queue')
			return !possibilities.some((player) => player.getQueue(0));
		if (gameType == 'card')
			return !possibilities.some((player) => player.getQueues().some((queue) => queue.getSize()));
		if (gameType == 'card in hand')
			return !possibilities.some((player) => player.getCardInHand(0));
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
		let reveal = gameContext.inherits(event, 'reveal');
		players.forEach((player) => {
			let res = [];
			sources.forEach((source) => {
				res.push(player === source.getOwner() ?
					source.privateForm(reveal) :
					source.publicForm(reveal));
			});
			player.emit(event, ...res);
		});
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

	this.apply = (gameContext) => {
		if (gameContext.inherits(bindee.string.split(gameContext.getSubSplitter())[0], 'lock')) {
			let playerOwner = finalOwner(owner);

			playerOwner.on('sending targets', (...theArgs) => {
				if (!permit)
					return;

				let targets = [];
				theArgs.forEach((targetData) => targets.push(getTarget(targetData, gameContext)));

				if (!legal(bindee.string, playerOwner, targets, gameContext))
					return;
				permit = false;

				func(bindee.bind(...targets, owner),
				next);
			});

			let permit = true;
			playerOwner.emit('waiting targets', bindee.string);
		} else {
			func(bindee.bind(...getDefaultTargets(bindee.string, playerOwner, gameContext), owner),
			next);
		}
	}
}

let getTarget = (json, gameContext) => {
	if (json.playerIndex) {
		if (json.queueIndex) {
			if (json.cardIndex) {
				return gameContext
				       .getPlayer(json.playerIndex)
				       .getQueue(json.queueIndex)
				       .getCard(json.cardIndex);
			}
			return gameContext
			       .getPlayer(json.playerIndex)
			       .getQueue(json.queueIndex);
		}
		if (json.cardIndex) {
			return gameContext
			       .getPlayer(json.playerIndex)
			       .getCardInHand(json.cardIndex);
		}
		return gameContext
		       .getPlayer(json.playerIndex);
	}
	if (json.triggerName)
		return {
			value: json.triggerName,
			gameType: 'trigger'
		};
	if (json.lifeSign)
		return {
			value: json.lifeSign,
			gameType: 'sign'
		};
}

let legal = (bindString, bindOwner, targets, gameContext) => {
	let strings = bindString.split(gameContext.getSubSplitter());
	return
	monoLegal(strings[0], bindOwner, targets[0], gameContext) &&
	(!strings[0].includes('add trigger') || monoLegal(strings[1], bindOwner, targets[1], gameContext));
}

let monoLegal = (bind, owner, target, gameContext) => {
	let fow = finalOwner(target), tt = getTargetType(bind, gameContext.inherits);
	return
	!target && (
		!gameContext.inherits(bind, 'bindee') ||
		gameContext.noAbleTargets(tt, bind, owner);
	) ||
	target.gameType == tt && (
		bind.includes('opponent') && fow != owner ||
		bind.includes('owner') && fow == owner ||
		!bind.includes('opponent') && !bind.includes('owner')
	);
}

let finalOwner = (obj) => {
	while (obj != obj.getOwner())
		obj = obj.getOwner();
	return obj;
}

let getTargetType = (bind, inherits) => {
	return ['player', 'queue', 'card', 'card in hand', 'trigger', 'sign'].find((elem) => inherits(bind, elem));
}

let getDefaultTargets = (bind, owner, gameContext) => {
	if (gameContext.inherits(bind, 'owner'))
		return owner;
	//if notarget, return undefined
}
