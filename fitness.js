const requireNothing = function () {
	return {
		description: 'No requirement',
		evaluate: function () {
			return null;
		},
	};
};

const fitnessChallenges = [
	{options: {description: 'Small scenario', floorCount: 4, elevatorCount: 2, spawnRate: 0.6}, condition: requireNothing()},
	{options: {description: 'Medium scenario', floorCount: 6, elevatorCount: 3, spawnRate: 1.5, elevatorCapacities: [5]}, condition: requireNothing()},
	{options: {description: 'Large scenario', floorCount: 18, elevatorCount: 6, spawnRate: 1.9, elevatorCapacities: [8]}, condition: requireNothing()},
];

// Simulation without visualisation
function calculateFitness(challenge, codeObj, stepSize, stepsToSimulate) {
	const controller = createWorldController(stepSize);
	const result = {};

	const worldCreator = createWorldCreator();
	const world = worldCreator.createWorld(challenge.options);
	const frameRequester = createFrameRequester(stepSize);

	controller.on('usercode_error', (e) => {
		result.error = e;
	});
	world.on('stats_changed', () => {
		result.transportedPerSec = world.transportedPerSec;
		result.avgWaitTime = world.avgWaitTime;
		result.transportedCount = world.transportedCounter;
	});

	controller.start(world, codeObj, frameRequester.register, true);

	for (let stepCount = 0; stepCount < stepsToSimulate && !controller.isPaused; stepCount++) {
		frameRequester.trigger();
	}
	return result;
}

function makeAverageResult(results) {
	const averagedResult = {};
	_.forOwn(results[0].result, (value, resultProperty) => {
		const sum = _.sum(_.pluck(_.pluck(results, 'result'), resultProperty));
		averagedResult[resultProperty] = sum / results.length;

	});
	return {options: results[0].options, result: averagedResult};
}

function doFitnessSuite(codeStr, runCount) {
	try {
		var codeObj = getCodeObjFromCode(codeStr);
	} catch (e) {
		return {error: `${e}`};
	}
	console.log('Fitness testing code', codeObj);
	let error = null;

	const testruns = [];
	_.times(runCount, () => {
		const results = _.map(fitnessChallenges, (challenge) => {
			const fitness = calculateFitness(challenge, codeObj, 1000.0 / 60.0, 12000);
			if (fitness.error) {
				error = fitness.error; return;
			}
			return {options: challenge.options, result: fitness};
		});
		if (error) {
			return;
		}
		testruns.push(results);
	});
	if (error) {
		return {error: `${error}`};
	}

	// Now do averaging over all properties for each challenge's test runs
	const averagedResults = _.map(_.range(testruns[0].length), (n) => {
		return makeAverageResult(_.pluck(testruns, n));
	});
    
	return averagedResults;
}

function fitnessSuite(codeStr, preferWorker, callback) {
	if (!!Worker && preferWorker) {
		// Web workers are available, neat.
		try {
			const w = new Worker('fitnessworker.js');
			w.postMessage(codeStr);
			w.onmessage = function (msg) {
				console.log('Got message from fitness worker', msg);
				const results = msg.data;
				callback(results);
			};
			return;
		} catch (e) {
			console.log('Fitness worker creation failed, falling back to normal', e);
		}
	}
	// Fall back do synch calculation without web worker
	const results = doFitnessSuite(codeStr, 2);
	callback(results);
}
