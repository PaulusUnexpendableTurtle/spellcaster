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
	};
};

function Card(triggers, actions, properties, owner) {
	var card = this, next, prev;
	this.getNext = () => next;
	this.setPrev = (pr) => prev = pr;
	this.setNext = (ne) => {
		next = ne;
		if (next)
			next.setPrev(card);
	};
	this.pushNext = (nextCard) => {
		if (next != undefined)
			nextCard.pushNext(next);
		card.setNext(nextCard);
	};

	this.getOwner = () => owner;

	var queue;
	this.bindTriggerTargets = (gameContext, cardQueue) => {
		queue = cardQueue;
		gameContext.waitForBind(triggers, card, card.pushTrueTrigger, card.addToGame);
	};
	const trueTriggers = [];
	this.pushTrueTrigger = (trueTrigger) => trueTriggers.push(trueTrigger);

	var index;
	this.getIndex = () => index;

	this.addToGame = (gameContext) => {
		trueTriggers.forEach((trigger) => {
			trigger.setQueue(queue);
			gameContext.pushTrigger(trigger);
		});
		index = queue.pushNext(card);
		gameContext.tryCall('card added', [card, queue, owner]);
	};

	this.bindActionTargets = (gameContext) => {
		gameContext.removeTriggers(trueTriggers);
		gameContext.waitForBind(actions, owner, card.pushTrueAction, card.apply);
	};
	const trueActions = [];
	this.pushTrueAction = (trueAction) => trueActions.push(trueAction);

	this.apply = (gameContext) => {
		if (card.worksAfter(gameContext)) {
			trueActions.forEach((action) => {
				gameContext.increaseActionCombo();
				gameContext.apply(action);
			});
		}
		gameContext.updateStats(card);
		gameContext.tryCall('card cast', [card, queue, owner]);

		if (prev)
			prev.setNext(next);
		else
			queue.pop();

		if (gameContext.end()) return;

		if (next != undefined && !properties.contains('STOP')) {
			next.bindActionTargets(gameContext);
		} else {
			gameContext.endSpellCast();
			gameContext.tryCall('cast ended', [queue, owner]);
		}
	};

	this.worksAfter = (gameContext) => {
		//maybe include elements, mana and so on
		return true;
	}

	this.addProperty = (property, gameContext, owner) => {
		if (gameContext.end()) return;
		properties += `%${property}`;
		gameContext.tryCall('property added', [property, card, owner]);
	};

	this.addTrigger = (trigger, gameContext, owner, target) => {
		if (gameContext.end()) return;

		trigger.setOwner(owner);
		triggers.push(trigger);

		let trueTrigger = trigger.bind(target, card);
		trueTriggers.push(trueTrigger);

		gameContext.pushTrigger(trueTrigger);
		gameContext.tryCall('trigger added', [trigger.string, card, owner]);
	};

	this.addAction = (action, gameContext, owner) => {
		if (gameContext.end()) return;
		action.setOwner(owner);
		actions.push(action);
		gameContext.tryCall('action added', [action.string, card, owner]);
	};
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
			if (gameContext.inherits(sourceString, eventName) && (eventSource.includes(target) || target === null)) {
				card.bindActionTargets(gameContext);
				gameContext.tryCall('triggered', [sourceString, card, queue, card.getOwner()]);
			}
		}
	};
};

function Action(sourceString) {
	this.string = sourceString;
	var owner = undefined;
	this.setOwner = (o) => owner = o;
	this.getOwner = () => owner;
	this.bind = getFunc(sourceString);
};

const subSplitter = '|';

const functions = [];

functions['life change'] =
functions['life change owner'] =
functions['life change opponent'] =
(param) => (target) => (gameContext) => wrap(target).changeLife(getNumber(param, gameContext), gameContext);

functions['draw or discard'] =
functions['draw or discard owner'] =
functions['draw or discard opponent'] =
(param) => (target) => (gameContext) => wrap(target).draw(getNumber(param, gameContext), gameContext);

functions['add property'] =
functions['add property owner'] =
functions['add property opponent'] =
(param) => (target) => (gameContext) => wrap(target).addProperty(param, gameContext);

functions['add trigger'] =
(param) => (target, owner) => (gameContext) => wrap(target[0]).addTrigger(new Trigger(param), gameContext, owner, target[1]);

functions['add action'] =
(param) => (target, owner) => (gameContext) => wrap(target).addAction(new Action(param), gameContext, owner);

functions['activate'] =
functions['activate opponent'] =
(param) => (target) => (gameContext) => wrap(target).bindActionTargets(gameContext);

function wrap(object) {
	if (object == undefined)
		return {
			changeLife: () => {},
			draw: () => {},
			addProperty: () => {},
			addTrigger: () => {},
			addAction: () => {},
			bindActionTargets: () => {}
		};
	return object;
}

function getNumber(param, gameContext) {
	if (param == '{action combo}')
		return gameContext.getActionCombo();
	if (param == '{card combo}')
		return gameContext.getCardCombo();
	return Number(param);
}

function getFunc(src) {
	var index = src.search(subSplitter), func, param;
	if (index !== undefined) {
		func = src.slice(0, index);
		param = src.slice(index + 1);
	} else {
		func = src;
	}
	return functions[func](param);
};
