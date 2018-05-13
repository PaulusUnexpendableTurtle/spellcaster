List of possible triggers
-------------------------

+ 'triggered' [trigger, card, queue, player] - when trigger is called
+ 'card added' [card, queue, owner] - when card is added to the queue
+ 'card cast' [card, queue, owner] - when all actions of card are applied
+ 'cast ended' [queue, owner] - when cast queue reached its limit (after last card cast in queue)
+ 'property added' [property, card, queue, owner] - when property is added to the card
+ 'trigger added' [trigger, card, queue, owner] - ... (same)
+ 'action added' [action, card, queue, owner] - ... (same)
+ 'player ended draw' [player] - after each successful attempt of drawing
+ 'player ended discard' [player] - ... (same)
+ 'card drawn' [player] - when single card is drawn
+ 'card discarded' [player] - ... (same)
+ 'turn start' [player] - obvious
+ 'turn end' [player] - obvious
+ 'life changed' [sign, player] - obvious

+ also '... notarget'

Regulating events
-----------------

+ 'reveal' - if event is revealing contents of sources
+ 'lock' - if targets are needed to be chosen

+ 'bindee' - if needs targets

+ 'no target' - obvious

+ 'player' - type of target
+ 'owner' - ... (same)
+ 'queue' - ... (same)
+ 'card' - ... (same)
+ 'card in hand' - ... (same)
+ 'trigger' - ... (same)
+ 'sign' - ... (same)