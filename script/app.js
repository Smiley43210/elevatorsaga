import {getCodeObjFromCode} from '../script/base.js';
import {challenges} from './challenges.js';
import {WorldController, WorldCreator} from './world.js';
import {clearAll, makeDemoFullscreen, presentChallenge, presentCodeStatus, presentFeedback, presentStats, presentWorld} from './presenters.js';

const createEditor = () => {
	const lsKey = 'elevatorCrushCode_v5';

	const cm = CodeMirror.fromTextArea(document.getElementById('code'), {
		lineNumbers: true,
		indentUnit: 4,
		indentWithTabs: false,
		theme: 'solarized light',
		mode: 'javascript',
		autoCloseBrackets: true,
		extraKeys: {
			// the following Tab key mapping is from http://codemirror.net/doc/manual.html#keymaps
			Tab: function (cm) {
				const spaces = new Array(cm.getOption('indentUnit') + 1).join(' ');
				cm.replaceSelection(spaces);
			},
		},
	});

	// reindent on paste (adapted from https://github.com/ahuth/brackets-paste-and-indent/blob/master/main.js)
	cm.on('change', (codeMirror, change) => {
		if (change.origin !== 'paste') {
			return;
		}

		const lineFrom = change.from.line;
		const lineTo = change.from.line + change.text.length;

		function reindentLines() {
			codeMirror.operation(() => {
				codeMirror.eachLine(lineFrom, lineTo, (lineHandle) => {
					codeMirror.indentLine(lineHandle.lineNo(), 'smart');
				});
			});
		}

		reindentLines();
	});

	const reset = function () {
		cm.setValue($('#default-elev-implementation').text().trim());
	};
	const saveCode = function () {
		localStorage.setItem(lsKey, cm.getValue());
		$('#save_message').text(`Code saved ${new Date().toTimeString()}`);
		returnObj.trigger('change');
	};

	const existingCode = localStorage.getItem(lsKey);
	if (existingCode) {
		cm.setValue(existingCode);
	} else {
		reset();
	}

	$('#button_save').click(() => {
		saveCode();
		cm.focus();
	});

	$('#button_reset').click(() => {
		if (confirm('Do you really want to reset to the default implementation?')) {
			localStorage.setItem('develevateBackupCode', cm.getValue());
			reset();
		}
		cm.focus();
	});

	$('#button_resetundo').click(() => {
		if (confirm('Do you want to bring back the code as before the last reset?')) {
			cm.setValue(localStorage.getItem('develevateBackupCode') || '');
		}
		cm.focus();
	});

	const returnObj = new riot.observable();
	const autoSaver = _.debounce(saveCode, 1000);
	cm.on('change', () => {
		autoSaver();
	});

	returnObj.getCodeObj = async function () {
		console.log('Getting code...');
		const code = cm.getValue();
		let obj;
		try {
			obj = await getCodeObjFromCode(code);
			returnObj.trigger('code_success');
		} catch (e) {
			returnObj.trigger('usercode_error', e);
			return null;
		}
		return obj;
	};
	returnObj.setCode = function (code) {
		cm.setValue(code);
	};
	returnObj.getCode = function () {
		return cm.getValue();
	};
	returnObj.setDevTestCode = function () {
		cm.setValue($('#devtest-elev-implementation').text().trim());
	};

	$('#button_apply').click(() => {
		returnObj.trigger('apply_code');
	});
	return returnObj;
};

const createParamsUrl = function (current, overrides) {
	return `#${_.map(_.merge(current, overrides), (val, key) => {
		return `${key}=${val}`;
	}).join(',')}`;
};

document.addEventListener('DOMContentLoaded', () => {
	const tsKey = 'elevatorTimeScale';
	const editor = createEditor();

	let params = {};

	const $world = $('.innerworld');
	const $stats = $('.statscontainer');
	const $feedback = $('.feedbackcontainer');
	const $challenge = $('.challenge');
	const $codestatus = $('.codestatus');

	const floorTempl = document.getElementById('floor-template').innerHTML.trim();
	const elevatorTempl = document.getElementById('elevator-template').innerHTML.trim();
	const elevatorButtonTempl = document.getElementById('elevatorbutton-template').innerHTML.trim();
	const userTempl = document.getElementById('user-template').innerHTML.trim();
	const challengeTempl = document.getElementById('challenge-template').innerHTML.trim();
	const feedbackTempl = document.getElementById('feedback-template').innerHTML.trim();
	const codeStatusTempl = document.getElementById('codestatus-template').innerHTML.trim();

	const app = new riot.observable();
	app.worldController = new WorldController(1.0 / 60.0);
	app.worldController.on('usercode_error', (e) => {
		console.log('World raised code error', e);
		editor.trigger('usercode_error', e);
	});

	console.log(app.worldController);
	app.worldCreator = new WorldCreator();
	app.world = undefined;

	app.currentChallengeIndex = 0;

	app.startStopOrRestart = function () {
		if (app.world.challengeEnded) {
			app.startChallenge(app.currentChallengeIndex);
		} else {
			app.worldController.setPaused(!app.worldController.isPaused);
		}
	};

	app.startChallenge = async function (challengeIndex, autoStart) {
		if (typeof app.world !== 'undefined') {
			app.world.unWind();
			// TODO: Investigate if memory leaks happen here
		}
		app.currentChallengeIndex = challengeIndex;
		app.world = app.worldCreator.createWorld(challenges[challengeIndex].options);
		window.world = app.world;

		clearAll([$world, $feedback]);
		presentStats($stats, app.world);
		presentChallenge($challenge, challenges[challengeIndex], app, app.world, app.worldController, challengeIndex + 1, challengeTempl);
		presentWorld($world, app.world, floorTempl, elevatorTempl, elevatorButtonTempl, userTempl);

		app.worldController.on('timescale_changed', () => {
			localStorage.setItem(tsKey, app.worldController.timeScale);
			presentChallenge($challenge, challenges[challengeIndex], app, app.world, app.worldController, challengeIndex + 1, challengeTempl);
		});

		app.world.on('stats_changed', () => {
			const challengeStatus = challenges[challengeIndex].condition.evaluate(app.world);
			if (challengeStatus !== null) {
				app.world.challengeEnded = true;
				app.worldController.setPaused(true);
				if (challengeStatus) {
					presentFeedback($feedback, feedbackTempl, app.world, 'Success!', 'Challenge completed', createParamsUrl(params, {challenge: challengeIndex + 2}));
				} else {
					presentFeedback($feedback, feedbackTempl, app.world, 'Challenge failed', 'Maybe your program needs an improvement?', '');
				}
			}
		});

		const codeObj = await editor.getCodeObj();
		console.log('Starting...');
		app.worldController.start(app.world, codeObj, window.requestAnimationFrame, autoStart);
	};

	editor.on('apply_code', () => {
		app.startChallenge(app.currentChallengeIndex, true);
	});
	editor.on('code_success', () => {
		presentCodeStatus($codestatus, codeStatusTempl);
	});
	editor.on('usercode_error', (error) => {
		presentCodeStatus($codestatus, codeStatusTempl, error);
	});
	editor.on('change', () => {
		$('#fitness_message').addClass('faded');
		const codeStr = editor.getCode();
		// fitnessSuite(codeStr, true, function(results) {
		//     var message = "";
		//     if(!results.error) {
		//         message = "Fitness avg wait times: " + _.map(results, function(r){ return r.options.description + ": " + r.result.avgWaitTime.toPrecision(3) + "s" }).join("&nbsp&nbsp&nbsp");
		//     } else {
		//         message = "Could not compute fitness due to error: " + results.error;
		//     }
		//     $("#fitness_message").html(message).removeClass("faded");
		// });
	});
	editor.trigger('change');

	riot.route((path) => {
		params = _.reduce(path.split(','), (result, p) => {
			const match = p.match(/(\w+)=(\w+$)/);
			if (match) {
				result[match[1]] = match[2];
			} return result;
		}, {});
		let requestedChallenge = 0;
		let autoStart = false;
		let timeScale = parseFloat(localStorage.getItem(tsKey)) || 2.0;
		_.each(params, (val, key) => {
			if (key === 'challenge') {
				requestedChallenge = _.parseInt(val) - 1;
				if (requestedChallenge < 0 || requestedChallenge >= challenges.length) {
					console.log('Invalid challenge index', requestedChallenge);
					console.log('Defaulting to first challenge');
					requestedChallenge = 0;
				}
			} else if (key === 'autostart') {
				autoStart = val === 'false' ? false : true;
			} else if (key === 'timescale') {
				timeScale = parseFloat(val);
			} else if (key === 'devtest') {
				editor.setDevTestCode();
			} else if (key === 'fullscreen') {
				makeDemoFullscreen();
			}
		});
		app.worldController.setTimeScale(timeScale);
		app.startChallenge(requestedChallenge, autoStart);
	});
	
	// Trigger route function above
	// Not needed when used in a synchronous context (without ES6+ import/export)
	riot.route('/');
});
