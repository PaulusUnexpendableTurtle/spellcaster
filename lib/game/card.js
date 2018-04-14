//TODO: cardData table
function CardPool(cardData) {
	const cardPool = [];
	cardData.forEach((elem, index) => cardPool[index] = new CardContainer(elem));
	this.get = (index, owner) => cardPool[index].makeCard(owner);
};

module.exports = CardPool;

const baseSplitter = ',';

function CardContainer(cardInfo) {
	var triggerStrings = cardInfo.triggers.split(baseSplitter),
	    actionStrings = cardInfo.actions.split(baseSplitter),
	    properties = cardInfo.properties;

	var triggers = [], actions = [];
	triggerStrings.forEach((triggerString) => triggers.push(new Trigger(triggerString)));
	actionStrings.forEach((actionString) => actions.push(new Action(actionString)));

	this.makeCard = (owner) => new Card(triggers, actions, properties, owner);
};

function Card(triggers, actions, properties, owner) {
	var card = this, next;
	this.getNext = () => next;
	this.pushNext = (card) => {
		if (next != undefined)
			card.pushNext(next);
		next = card;
	};

	this.getOwner = () => owner;

	this.bindTriggerTargets = (gameContext) => {
		//TODO: hard lock
		//TODO: ...waitForBind(trigger/action, card, [target chooser]). locks after each call, unlocks after another bind is finished
		triggers.forEach((trigger) => gameContext.waitForBind(trigger, card));
		//TODO: hard unlock, addToGame after last bind
	};
	const trueTriggers = [];
	this.pushTrueTrigger = (trueTrigger) => trueTriggers.push(trueTrigger);
	this.checkTriggerBindProcess = () => trueTriggers.length == triggers.length;

	var queue;
	this.addToGame = (gameContext, cardQueue) => {
		//TODO: triggersList is an array
		trueTriggers.forEach((trigger) => {
			trigger.setQueue(cardQueue);
			gameContext.triggersList.push(trigger);
		});
		//TODO:
		cardQueue.pushNext(card);
		queue = cardQueue;
		//TODO: ...tryCall(event, array of sources)
		gameContext.triggersList.tryCall('card added', [card, queue, owner]);
	};

	this.bindActionTargets = (gameContext) => {
		//TODO: hard lock here
		actions.forEach((action) => gameContext.waitForBind(action, card));
		//TODO: hard unlock and apply after bind
	}
	const trueActions = [];
	this.pushTrueAction = (trueAction) => trueActions.push(trueAction);
	this.checkActionBindProcess = () => trueActions.length == actions.length;

	this.apply = (gameContext) => {
		//TODO: triggersList.remove(array of triggers)
		gameContext.triggersList.remove(trueTriggers);
		trueActions.forEach((action) => {
			action(gameContext);
			++gameContext.actionCombo;
		});
		gameContext.triggersList.tryCall('card cast', [card, queue, owner]);
		++gameContext.cardCombo;
		if (next != undefined && !properties.contains('STOP')) {
			next.bindActionTargets(gameContext);
			copyNext();
		} else {
			if (next == undefined)
				//TODO: (fast way is to have reversed links in queue)
				queue.pop();
			else
				copyNext();
			//TODO:
			gameContext.flushCombos();
			gameContext.triggersList.tryCall('cast ended', [queue, owner]);
		}
	};

	function copyNext() {
		properties = next.getProperties();
		card = next;
		trueTriggers = next.getTrueTriggers();
		trueActions = next.getTrueActions();
		next = next.getNext();
	};

	this.getProperties = () => properties;
	this.getTrueTriggers = () => trueTriggers;
	this.getTrueActions = () => trueActions;

	this.addProperty = (property, gameContext, owner) => {
		properties += `%${property}`;
		gameContext.triggersList.tryCall('property added', [property, card, owner]);
	};

	this.addTrigger = (trigger, gameContext, owner) => {
		triggers.push(trigger);
		gameContext.waitForBind(trigger, card, owner);
		gameContext.triggersList.tryCall('trigger added', [trigger.string, card, owner]);
	}

	this.addAction = (action, gameContext, owner) => {
		actions.push(action);
		gameContext.waitForBind(action, card, owner);
		gameContext.triggersList.tryCall('action added', [action.string, card, owner]);
	}
};

function Trigger(sourceString) {
	this.string = sourceString;
	var queue = undefined;
	this.bind = (target, card) =>
	{
		setQueue: (q) => queue = q,
		tryCall: (eventName, eventSource, gameContext) => {
			//TODO: gameContext.inherits(event-son, event-father)
			if (gameContext.inherits(sourceString, eventName) && eventSource.includes(target)) {
				card.bindActionTargets(gameContext);
				gameContext.triggersList.tryCall('triggered', [sourceString, card, queue, owner]);
			}
		}
	};
};

function Action(sourceString) {
	this.string = sourceString;
	this.bind = (target, owner) => getFunc(sourceString, target, owner);
};

const subSplitter = '|';

function getFunc(src, target, owner) {
	var index = src.search(subSplitter), func, param;
	if (index !== undefined) {
		func = src.slice(0, index - 1);
		param = src.slice(-index + 1);
	} else {
		func = src;
	}

	if (param == '{action combo}')
		param = gameContext.actionCombo;
	if (param == '{card combo}')
		param = gameContext.cardCombo;

	switch (func) {
		case 'life change':
		case 'life change owner':
		case 'life change opponent':
			//TODO: player.changeLife(amount, context)
			return (gameContext) => target.changeLife(Number(param), gameContext);
		case 'draw or discard':
		case 'draw or discard owner':
		case 'draw or discard opponent':
			//TODO: player.draw(amount, context)
			//TODO: in case of discard game should be locked until bind is complete
			return (gameContext) => target.draw(Number(param), gameContext);
		case 'add property':
		case 'add property owner':
		case 'add property next':
			return (gameContext) => target.addProperty(param, gameContext);
		case 'add trigger':
			return (gameContext) => target.addTrigger(new Trigger(param), gameContext, owner);
		case 'add action':
			return (gameContext) => target.addAction(new Action(param), gameContext, owner);
		case 'activate':
		case 'activate opponent':
			return (gameContext) => target.bindActionTargets(gameContext);
	}
};
