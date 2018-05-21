function CardPool(cardData, baseSplitter) {
	const cardPool = [];
	cardData.forEach((elem, index) => cardPool[index] = new CardContainer(elem, baseSplitter));
	this.get = (index, owner, subSplitter) => cardPool[index = ((index < 0 || index >= cardPool.length) ? 0 : index)].makeCard(owner, index, subSplitter);
	this.push = (card) => cardPool.push(card);
};

module.exports = CardPool;

function CardContainer(cardInfo, baseSplitter) {
	var triggerStrings = cardInfo.triggers.split(baseSplitter),
	    actionStrings = cardInfo.actions.split(baseSplitter),
	    properties = cardInfo.properties;

	this.makeCard = (owner, id, subSplitter) => {
		let triggers = [], actions = [];
		triggerStrings.forEach((triggerString) => {
			let trigger = new Trigger(triggerString);
			trigger.setOwner(owner);
			triggers.push(trigger);
		});
		actionStrings.forEach((actionString) => {
			let action = new Action(actionString, subSplitter);
			action.setOwner(owner);
			actions.push(action);
		});
		return new Card(triggers, actions, properties, owner, id);
	};
};

function Card(triggers, actions, properties, owner, id) {
	this.gameType = 'card in hand';
	this.getID = () => id;

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

	this.addToGame = function(gameContext, appendFunc) {
		trueTriggers.forEach((trigger) => {
			trigger.setQueue(queue);
			gameContext.pushTrigger(trigger);
		});
		queue.pushNext(card);
		card.gameType = 'card';

		gameContext.tryCall('card added', [card.getID(), card, queue, owner],
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
		if (gameContext.end(owner))
			return appendFunc();

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
				gameContext.tryCall('card cast', [card.getID(), card, queue, owner],
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

	var decoProps = [];
	let t = properties.split('%');
	t.forEach((elem) => decoProps.push(new Property(elem, card.getOwner())));

	this.addProperty = function(property, gameContext, owner, appendFunc) {
		if (gameContext.end())
			return;
		if (gameContext.end(card.getOwner()) || gameContext.end(owner))
			return appendFunc();

		properties += `%${property}`;

		let prop = new Property(property, owner);
		decoProps.push(prop);

		gameContext.tryCall('property added', [prop, card.getID(), card, queue, owner],
		appendFunc);
	};

	this.addTrigger = function(trigger, gameContext, owner, target, appendFunc) {
		if (gameContext.end())
			return;
		if (gameContext.end(card.getOwner()) || gameContext.end(owner))
			return appendFunc();

		trigger.setOwner(owner);
		triggers.push(trigger);

		let trueTrigger = trigger.bind(target, card);
		trueTriggers.push(trueTrigger);

		gameContext.pushTrigger(trueTrigger);

		gameContext.tryCall('trigger added', [trigger, card.getID(), card, queue, owner],
		appendFunc);
	};

	this.addAction = function(action, gameContext, owner, appendFunc) {
		if (gameContext.end())
			return;
		if (gameContext.end(card.getOwner()) || gameContext.end(owner))
			return appendFunc();

		action.setOwner(owner);
		actions.push(action);

		gameContext.tryCall('action added', [action, card.getID(), card, queue, owner],
		appendFunc);
	};

	this.publicForm = (reveal) => {
		let prepare = { index: queue.getIndex(card) };
		if (reveal) {
			prepare.id = id;
			prepare.triggers = filter(triggers, (a) => a.privateForm());
			prepare.actions = filter(actions, (a) => a.privateForm());
			prepare.properties = properties;
		}
		return prepare;
	};

	this.privateForm = (reveal) => {
		return {
			id: id,
			index: queue.getIndex(card),
			triggers: reveal ? filter(triggers, (a) => a.privateForm) : privateParts(triggers),
			actions: reveal ? filter(actions, (a) => a.privateForm) : privateParts(actions),
			properties: reveal ? properties : privateParts(decoProps)
		};
	}

	var privateParts = (arr) => {
		let res = [];
		arr.forEach((a) => {
			if (a.getOwner() === card.getOwner())
				res.push(a.privateForm());
		});
		return res;
	}
};

let filter = (arr, callback) => {
	let res = [];
	arr.forEach((elem) => res.push(callback(elem)));
	return res;
}

function Property(src, owner) {
	this.getOwner = () => owner;
	this.publicForm = () => {
		return {};
	};
	this.privateForm = () => {
		return {
			string: src
		};
	};
}

function Trigger(sourceString) {
	var trigger = this;
	this.string = sourceString;
	var queue, owner, func;
	this.setOwner = (o) => owner = o;
	this.getOwner = () => owner;
	this.bind = function(target, card) {
		return {
			setQueue: (q) => queue = q,
			inList: false,
			triggers: (eventName, gameContext, ...theArgs) =>
				gameContext.inherits(sourceString, eventName) && (theArgs.includes(target) || !target),
			setNext: (f) => func = f,
			getSources: () => [trigger, card, queue, card.getOwner()],
			call: (gameContext) => {
				if (inList)
					card.bindActionTargets(gameContext, func);
				else
					func();
			}
		};
	};
	this.publicForm = () => {
		return {};
	};
	this.privateForm = () => {
		return {
			string: sourceString
		};
	};
};

function Action(sourceString, subSplitter) {
	this.string = sourceString;
	var owner = undefined;
	this.setOwner = (o) => owner = o;
	this.getOwner = () => owner;
	this.bind = getFunc(sourceString, subSplitter);
	this.publicForm = () => {
		return {};
	};
	this.privateForm = () => {
		return {
			string: sourceString
		};
	};
};

const functions = [];

//mb add 'notarget'

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
				target[0].addTrigger(new Trigger(param), gameContext, owner, target[1],
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
				target.addAction(new Action(param, gameContext.getSubSplitter()), gameContext, owner,
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
	if (param == '{trigger combo}')
		return gameContext.getTriggerCombo();
	return Number(param);
}

function getFunc(src, subSplitter) {
	var index = src.search(subSplitter), func, param;
	if (index !== undefined) {
		func = src.slice(0, index);
		param = src.slice(index + 1);
	} else {
		func = src;
	}
	return functions[func](param);
};
