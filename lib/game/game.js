function GameContext(gameData, eventData, cardPool) {
	var gameContext = this;

	this.start = (players) => {
		players.forEach((player, i) => {
			player.enterGame(gameContext);

			//TODO
			let oldTurn = player.turn;

			if (i == players.length - 1) i = 0;
			else ++i;

			player.turn = () => {
				oldTurn();
				onEndOfTurn(players[i].turn);
			}
		});
		players[0].turn();
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
		let last = bindees.splice(-1, 1)[0];
		waitForBind(last, owner, (object) => {
			loopFunc(object);
			endFunc(gameContext);
		});
		bindees.forEach((elem) => waitForBind(last, owner, loopFunc));
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
	}
	this.tryCall = (event) => {
		pushToStack(() => {
			sendEvent(event, arguments);
			triggersList.forEach((elem) => elem.tryCall(event, gameContext, ...arguments));
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

	const stack = [], stackOfLockers = [];
	var onEmpty = [], onTurn = [];
	var pushToStack = (func, lockNeeded) => {
		let stackObject = new StackObject(func, lockNeeded);
		stack.push(stackObject);
	}
	var onEmptyStack = (func) => onEmpty.push(func);
	var onEndOfTurn = (func) => onTurn.push(func);

	function StackObject(func, lockNeeded) {
		var stackObject = this;
		if (lockNeeded)
			stackOfLockers.push(stackObject);
		this.apply = () => {
			if (stack[stack.length - 1] != stackObject)
				return;

			if (lockNeeded)
				stackOfLockers.splice(-1, 1);
			stack.splice(-1, 1);

			func();
			if (!stack.length)
				onEmpty.forEach((func) => func());
			if (!stack.length)
				onTurn.forEach((func) => func());
		}
	}

	var end = false;
	this.endGame = (player) => {
		players.splice(players.indexOf(player), 1)[0].emit('game lost');
		players.forEach((elem) => elem.emit('game won'));
		end = true;
	}
	this.end = () => end;
}

module.exports = GameContext;
