export const limitNumber = function (num, min, max) {
	return Math.min(max, Math.max(num, min));
};

export const epsilonEquals = function (a, b) {
	return Math.abs(a - b) < 0.00000001;
};

// Polyfill from MDN
if (typeof Math.sign === 'undefined') {
	Math.sign = function (x) {
		x = +x; // convert to a number
		if (x === 0 || isNaN(x)) {
			return x;
		}
		return x > 0 ? 1 : -1;
	};
}

export const deprecationWarning = function (name) {
	console.warn(`You are using a deprecated feature scheduled for removal: ${name}`);
};

export const distanceNeededToAchieveSpeed = function (currentSpeed, targetSpeed, acceleration) {
	// v² = u² + 2a * d
	const requiredDistance = (Math.pow(targetSpeed, 2) - Math.pow(currentSpeed, 2)) / (2 * acceleration);
	return requiredDistance;
};
export const accelerationNeededToAchieveChangeDistance = function (currentSpeed, targetSpeed, distance) {
	// v² = u² + 2a * d
	const requiredAcceleration = 0.5 * ((Math.pow(targetSpeed, 2) - Math.pow(currentSpeed, 2)) / distance);
	return requiredAcceleration;
};

// Fake frame requester helper used for testing and fitness simulations
export const createFrameRequester = function (timeStep) {
	let currentCb = null;
	const requester = {};
	requester.currentT = 0.0;
	requester.register = function (cb) {
		currentCb = cb;
	};
	requester.trigger = function () {
		requester.currentT += timeStep; if (currentCb !== null) {
			currentCb(requester.currentT);
		}
	};
	return requester;
};

export const getCodeObjFromCode = async function (code) {
	if (code.trim().substr(0, 1) == '{' && code.trim().substr(-1, 1) == '}') {
		code = `(${code})`;
	}
	const obj = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`);
	if (typeof obj.init !== 'function') {
		throw new Error('Code must export an init function');
	}
	if (typeof obj.update !== 'function') {
		throw new Error('Code must export an update function');
	}
	return obj;
};

