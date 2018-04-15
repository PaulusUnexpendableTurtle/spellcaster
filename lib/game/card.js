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

	this.makeCard = (owner) => {
		let triggers = [], actions = [];
		triggerStrings.forEach((triggerString) => {
			let trigger = new Trigger(triggerString);
			trigger.setOwner(owner);
			triggers.push(trigger);
		});
		actionStrings.forEach((actionString) => {
			let action = new Action(actionString);
			action.setOwner(owner);
			actions.push(action);
		});
		return new Card(triggers, actions, properties, owner);
	}
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

	var queue;
	this.bindTriggerTargets = (gameContext, cardQueue) => {
		queue = cardQueue;
		//TODO: lock
		//TODO: ...waitForBind(array of bindings, card here (owner in discard & action) in bind, call in loop, call in the end). sequences bindings
		gameContext.waitForBind(triggers, card, card.pushTrueTrigger, card.addToGame);
		//TODO: unlock, addToGame after last bind
	};
	const trueTriggers = [];
	this.pushTrueTrigger = (trueTrigger) => trueTriggers.push(trueTrigger);

	this.addToGame = (gameContext) => {
		//TODO: triggersList is an array
		trueTriggers.forEach((trigger) => {
			trigger.setQueue(queue);
			gameContext.triggersList.push(trigger);
		});
		//TODO:
		queue.pushNext(card);
		//TODO: ...tryCall(event, array of sources)
		gameContext.triggersList.tryCall('card added', [card, queue, owner]);
	};

	this.bindActionTargets = (gameContext) => {
		//TODO: lock here
		gameContext.waitForBind(actions, owner, card.pushTrueAction, card.apply);
		//TODO: unlock and apply after bind
	}
	const trueActions = [];
	this.pushTrueAction = (trueAction) => trueActions.push(trueAction);

	this.apply = (gameContext) => {
		//TODO: triggersList.remove(array of triggers)
		gameContext.triggersList.remove(trueTriggers);
		trueActions.forEach((action) => {
			++gameContext.actionCombo;
			action(gameContext);
		});
		//TODO: (e.g. ++gameContext.cardCombo)
		gameContext.updateStats(card);
		if (gameContext.end) return;
		gameContext.triggersList.tryCall('card cast', [card, queue, owner]);
		if (next != undefined && !properties.contains('STOP')) {
			next.bindActionTargets(gameContext);
			copyNext();
		} else {
			if (next == undefined)
				//TODO: (fast way is to have reversed links in queue)
				queue.pop();
			else
				copyNext();
			//TODO: (e.g. combos = 0)
			gameContext.endSpellCast();
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
		if (gameContext.end) return;
		properties += `%${property}`;
		gameContext.triggersList.tryCall('property added', [property, card, owner]);
	};

	this.addTrigger = (trigger, gameContext, owner) => {
		if (gameContext.end) return;
		trigger.setOwner(owner);
		triggers.push(trigger);
		gameContext.waitForBind([trigger], card, card.pushTrueTrigger, ()=>{});
		gameContext.triggersList.tryCall('trigger added', [trigger.string, card, owner]);
	}

	this.addAction = (action, gameContext, owner) => {
		if (gameContext.end) return;
		action.setOwner(owner);
		actions.push(action);
		gameContext.triggersList.tryCall('action added', [action.string, card, owner]);
	}
};

function Trigger(sourceString) {
	this.string = sourceString;
	var queue, owner;
	this.setOwner = (o) => owner = o;
	this.getOwner = () => owner;
	this.bind = (target, card) =>
	{
		setQueue: (q) => queue = q,
		tryCall: (eventName, eventSource, gameContext) => {
			//TODO: gameContext.inherits(event-son, event-father)
			if (gameContext.inherits(sourceString, eventName) && eventSource.includes(target)) {
				card.bindActionTargets(gameContext);
				gameContext.triggersList.tryCall('triggered', [sourceString, card, queue, card.getOwner()]);
			}
		}
	};
};

function Action(sourceString) {
	this.string = sourceString;
	var owner = undefined;
	this.setOwner = (o) => owner = o;
	this.getOwner = () => owner;
	this.bind = (target, owner) => getFunc(sourceString, target, owner);
};

const subSplitter = '|';

function getFunc(src, target, owner) {
	if (target == undefined) return (gameContext) => {};

	var index = src.search(subSplitter), func, param;
	if (index !== undefined) {
		func = src.slice(0, index);
		param = src.slice(index + 1);
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
			return (gameContext) => target.changeLife(Number(param), gameContext);
		case 'draw or discard':
		case 'draw or discard owner':
		case 'draw or discard opponent':
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
