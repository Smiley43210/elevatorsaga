export function clearAll($elems) {
	_.each($elems, ($elem) => {
		$elem.empty();
	});
}

function setTransformPos(elem, x, y) {
	const style = `translate(${x}px,${y}px) translateZ(0)`;
	elem.style.transform = style;
	elem.style['-ms-transform'] = style;
	elem.style['-webkit-transform'] = style;
}

function updateUserState($user, elem_user, user) {
	setTransformPos(elem_user, user.worldX, user.worldY);
	if (user.done) {
		$user.addClass('leaving');
	}
}

export function presentStats($parent, world) {

	const elem_transportedcounter = $parent.find('.transportedcounter').get(0),
		elem_elapsedtime = $parent.find('.elapsedtime').get(0),
		elem_transportedpersec = $parent.find('.transportedpersec').get(0),
		elem_avgwaittime = $parent.find('.avgwaittime').get(0),
		elem_maxwaittime = $parent.find('.maxwaittime').get(0),
		elem_movecount = $parent.find('.movecount').get(0);

	world.on('stats_display_changed', () => {
		elem_transportedcounter.textContent = world.transportedCounter;
		elem_elapsedtime.textContent = `${world.elapsedTime.toFixed(0)}s`;
		elem_transportedpersec.textContent = world.transportedPerSec.toPrecision(3);
		elem_avgwaittime.textContent = `${world.avgWaitTime.toFixed(1)}s`;
		elem_maxwaittime.textContent = `${world.maxWaitTime.toFixed(1)}s`;
		elem_movecount.textContent = world.moveCount;
	});
	world.trigger('stats_display_changed');
}

export function presentChallenge($parent, challenge, app, world, worldController, challengeNum, challengeTempl) {
	const $challenge = $(riot.render(challengeTempl, {
		challenge: challenge,
		num: challengeNum,
		timeScale: `${worldController.timeScale.toFixed(0)}x`,
		startButtonText: world.challengeEnded ? "<i class='fa fa-repeat'></i> Restart" : worldController.isPaused ? 'Start' : 'Pause',
	}));
	$parent.html($challenge);

	$parent.find('.startstop').on('click', () => {
		app.startStopOrRestart();
	});
	$parent.find('.timescale_increase').on('click', (e) => {
		e.preventDefault();
		if (worldController.timeScale < 40) {
			const timeScale = Math.round(worldController.timeScale * 1.618);
			worldController.setTimeScale(timeScale);
		}
	});
	$parent.find('.timescale_decrease').on('click', (e) => {
		e.preventDefault();
		const timeScale = Math.round(worldController.timeScale / 1.618);
		worldController.setTimeScale(timeScale);
	});
}

export function presentFeedback($parent, feedbackTempl, world, title, message, url) {
	$parent.html(riot.render(feedbackTempl, {title: title, message: message, url: url, paddingTop: world.floors.length * world.floorHeight * 0.2}));
	if (!url) {
		$parent.find('a').remove();
	}
}

export function presentWorld($world, world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl) {
	$world.css('height', world.floorHeight * world.floors.length);

	$world.append(_.map(world.floors, (f) => {
		const $floor = $(riot.render(floorTempl, f));
		const $up = $floor.find('.up');
		const $down = $floor.find('.down');
		f.on('buttonstate_change', (buttonStates) => {
			$up.toggleClass('activated', buttonStates.up !== '');
			$down.toggleClass('activated', buttonStates.down !== '');
		});
		$up.on('click', () => {
			f.pressUpButton();
		});
		$down.on('click', () => {
			f.pressDownButton();
		});
		return $floor;
	}));
	$world.find('.floor').first().find('.down').addClass('invisible');
	$world.find('.floor').last().find('.up').addClass('invisible');

	function renderElevatorButtons(states) {
		// This is a rarely executed inner-inner loop, does not need efficiency
		return _.map(states, (b, i) => {
			return riot.render(elevatorButtonTempl, {floorNum: i});
		}).join('');
	}

	function setUpElevator(e) {
		const $elevator = $(riot.render(elevatorTempl, {e: e}));
		const elem_elevator = $elevator.get(0);
		$elevator.find('.buttonindicator').html(renderElevatorButtons(e.buttonStates));
		const $buttons = _.map($elevator.find('.buttonindicator').children(), (c) => {
			return $(c);
		});
		const elem_floorindicator = $elevator.find('.floorindicator > span').get(0);

		$elevator.on('click', '.buttonpress', function () {
			e.pressFloorButton(parseInt($(this).text()));
		});
		e.on('new_display_state', () => {
			setTransformPos(elem_elevator, e.worldX, e.worldY);
		});
		e.on('new_current_floor', (floor) => {
			elem_floorindicator.textContent = floor;
		});
		e.on('floor_buttons_changed', (states, indexChanged) => {
			$buttons[indexChanged].toggleClass('activated', states[indexChanged]);
		});
		e.on('indicatorstate_change', (indicatorStates) => {
			$elevator.find('.up').toggleClass('activated', indicatorStates.up);
			$elevator.find('.down').toggleClass('activated', indicatorStates.down);
		});
		e.trigger('new_state', e);
		e.trigger('new_display_state', e);
		e.trigger('new_current_floor', e.currentFloor);
		return $elevator;
	}

	$world.append(_.map(world.elevators, (e) => {
		return setUpElevator(e);
	}));

	world.on('new_user', (user) => {
		const $user = $(riot.render(userTempl, {u: user, state: user.done ? 'leaving' : ''}));
		const elem_user = $user.get(0);

		user.on('new_display_state', () => {
			updateUserState($user, elem_user, user);
		});
		user.on('removed', () => {
			$user.remove();
		});
		$world.append($user);
	});
}

export function presentCodeStatus($parent, templ, error) {
	console.log(error);
	const errorDisplay = error ? 'block' : 'none';
	const successDisplay = error ? 'none' : 'block';
	let errorMessage = error;
	if (error && error.stack) {
		errorMessage = error.stack;
		errorMessage = errorMessage.replace(/\n/g, '<br>');
	}
	const status = riot.render(templ, {errorMessage: errorMessage, errorDisplay: errorDisplay, successDisplay: successDisplay});
	$parent.html(status);
}

export function makeDemoFullscreen() {
	$('body .container > *').not('.world').css('visibility', 'hidden');
	$('html, body, body .container, .world').css({width: '100%', margin: '0', 'padding': 0});
}
