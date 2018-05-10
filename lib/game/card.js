function CardPool(cardData) {
	const cardPool = [];
	cardData.forEach((elem, index) => cardPool[index] = new CardContainer(elem));
	this.get = (index, owner) => cardPool[(index < 0 || index >= cardPool.length) ? 0 : index].makeCard(owner);
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
	this.bindTriggerTargets = function(gameContext, cardQueue, appendFunc) {
		queue = cardQueue;
		gameContext.waitForBind(triggers, card, card.pushTrueTrigger, (gameContext) => {
			card.addToGame(gameContext,
			appendFunc);
		});
	};
	const trueTriggers = [];
	this.pushTrueTrigger = function(trueTrigger, appendFunc) {
		trueTriggers.push(trueTrigger);
		appendFunc();
	};

	var index;
	this.getIndex = () => index;

	this.addToGame = function(gameContext, appendFunc) {
		trueTriggers.forEach((trigger) => {
			trigger.setQueue(queue);
			gameContext.pushTrigger(trigger);
		});
		index = queue.pushNext(card);

		gameContext.tryCall('card added', [card, queue, owner],
		appendFunc);
	};

	this.bindActionTargets = function(gameContext, appendFunc) {
		gameContext.removeTriggers(trueTriggers);
		gameContext.waitForBind(actions, owner, card.pushTrueAction, (gameContext) => {
			card.apply(gameContext,
			appendFunc);
		});
	};
	const trueActions = [];
	this.pushTrueAction = function(trueAction, appendFunc) {
		trueActions.push(trueAction);
		appendFunc();
	}

	this.apply = function(gameContext, appendFunc) {
		if (gameContext.end())
			return;

		if (gameContext.end(owner)) {
			appendFunc();
			return;
		}

		if (prev)
			prev.setNext(next);
		else
			queue.pop();

		if (card.worksAfter(gameContext)) {
			let n = trueActions.length;
			for (let i = 0; i < n - 1; ++i)
				trueActions[i].appendFunc = () => trueActions[i + 1].call(gameContext);
			trueActions[n - 1].appendFunc = () => {
				gameContext.updateStats(card);
				gameContext.tryCall('card cast', [card, queue, owner],
				() => {
					if (next != undefined && !properties.contains('STOP')) {
						next.bindActionTargets(gameContext,
						appendFunc);
					} else {
						gameContext.endSpellCast();
						gameContext.tryCall('cast ended', [queue, owner],
						appendFunc);
					}
				});
			}
			trueActions[0].call(gameContext);
		} else {
			if (next != undefined && !properties.contains('STOP')) {
				next.bindActionTargets(gameContext,
				appendFunc);
			} else {
				gameContext.endSpellCast();
				gameContext.tryCall('cast ended', [queue, owner],
				appendFunc);
			}
		}
	};

	this.worksAfter = (gameContext) => {
		//maybe include elements, mana and so on
		return true;
	}

	this.addProperty = function(property, gameContext, owner, appendFunc) {
		if (gameContext.end())
			return;

		if (gameContext.end(card.getOwner())) {
			appendFunc();
			return;
		}

		properties += `%${property}`;

		gameContext.tryCall('property added', [property, card, owner],
		appendFunc);
	};

	this.addTrigger = function(trigger, gameContext, owner, target, appendFunc) {
		if (gameContext.end())
			return;

		if (gameContext.end(card.getOwner())) {
			appendFunc();
			return;
		}

		trigger.setOwner(owner);
		triggers.push(trigger);

		let trueTrigger = trigger.bind(target, card);
		trueTriggers.push(trueTrigger);

		gameContext.pushTrigger(trueTrigger);

		gameContext.tryCall('trigger added', [trigger.string, card, owner],
		appendFunc);
	};

	this.addAction = function(action, gameContext, owner, appendFunc) {
		if (gameContext.end())
			return;

		if (gameContext.end(card.getOwner())) {
			appendFunc();
			return;
		}

		action.setOwner(owner);
		actions.push(action);

		gameContext.tryCall('action added', [action.string, card, owner],
		appendFunc);
	};
};

function Trigger(sourceString) {
	this.string = sourceString;
	var queue, owner, func;
	this.setOwner = (o) => owner = o;
	this.getOwner = () => owner;
	this.bind = function(target, card) {
		return {
			setQueue: (q) => queue = q,
			inList: false,
			triggers: (eventName, gameContext) =>
				gameContext.inherits(sourceString, eventName) && ((...arguments).includes(target) || target === null),
			setNext: (f) => func = f,
			call: (gameContext) => {
				if (inList) {
					card.bindActionTargets(gameContext,
					() => {
						gameContext
						.tryCall('triggered', [sourceString, card, queue, card.getOwner()],
						func);
					});
				} else
					func();
			}
		};
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
(param) => (target) => {
	return {
		appendFunc: function() {},
		call: (gameContext) => {
			if (!target)
				appendFunc();
			else
				target.changeLife(getNumber(param, gameContext), gameContext,
				appendFunc);
		}
	}
}

functions['draw or discard'] =
functions['draw or discard owner'] =
functions['draw or discard opponent'] =
(param) => (target) => {
	return {
		appendFunc: function() {},
		call: (gameContext) => {
			if (!target)
				appendFunc();
			else
				target.draw(getNumber(param, gameContext), gameContext,
				appendFunc);
		}
	}
}

functions['add property'] =
functions['add property owner'] =
functions['add property opponent'] =
(param) => (target) => {
	return {
		appendFunc: function() {},
		call: (gameContext) => {
			if (!target)
				appendFunc();
			else
				target.addProperty(param, gameContext,
				appendFunc);
		}
	}
}

functions['add trigger'] =
(param) => (target, owner) => {
	return {
		appendFunc: function() {},
		call: (gameContext) => {
			if (!target)
				appendFunc();
			else
				target.addTrigger(new Trigger(param), gameContext, owner, target[1],
				appendFunc);
		}
	}
}

functions['add action'] =
(param) => (target, owner) => {
	return {
		appendFunc: function() {},
		call: (gameContext) => {
			if (!target)
				appendFunc();
			else
				target.addAction(new Action(param), gameContext, owner,
				appendFunc);
		}
	}
}

functions['activate'] =
functions['activate opponent'] =
() => (target) => {
	return {
		appendFunc: function() {},
		call: (gameContext) => {
			if (!target)
				appendFunc();
			else
				target.bindActionTargets(gameContext,
				appendFunc);
		}
	}
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
