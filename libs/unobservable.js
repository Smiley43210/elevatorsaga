(function (unobservable) {

	// Black magic stuff
	class CustomArray {
		constructor(numPreallocated) {
			this.arr = new Array(numPreallocated);
			this.len = 0;
		}
		
		push(e) {
			this.arr[this.len++] = e;
		}
		
		removeAt(index) {
			for (let j = index + 1; j < this.len; j++) {
				this.arr[j - 1] = this.arr[j];
			}
			// Potential memory leak right here, last element does not get nulled out as it should? Or?
			this.len--;
		}
	}
	
	unobservable.observable = class observable {
		constructor(options = {}) {
			this.options = options;
			
			options.numPreallocatedHandlers = options.numPreallocatedHandlers || 0;
			options.addDataMembers = typeof options.addDataMembers !== 'undefined' ? options.addDataMembers : true;
			if (options.addDataMembers) {
				this.callbacks = {};
			}
		}
		
		on(events, fn) {
			// This function is convoluted because we would like to avoid using split or regex, both which cause an array allocation
			let count = 0;
			for (let i = 0, len = events.length; i < len; ++i) {
				let name = '';
				const i2 = events.indexOf(' ', i);
				if (i2 < 0) {
					if (i < events.length) {
						name = events.slice(i);
						count++;
					}
					i = len;
				} else if (i2 - i > 1) {
					name = events.slice(i, i2);
					count++;
					i = i2;
				}
				if (name.length > 0) {
					(this.callbacks[name] = this.callbacks[name] || new CustomArray()).push(fn);
				}
			}
			fn.typed = count > 1;
		}
		
		off(events, fn) {
			if (events === '*') {
				this.callbacks = {};
			} else if (fn) {
				const fns = this.callbacks[events];
				for (let i = 0, len = fns.len; i < len; ++i) {
					const cb = fns.arr[i];
					if (cb === fn) {
						fns.removeAt(i);
					}
				}
			} else {
				const count = 0;
				for (let i = 0, len = events.length; i < len; ++i) {
					let name = '';
					const i2 = events.indexOf(' ', i);
					if (i2 < 0) {
						if (i < events.length) {
							name = events.slice(i);
						}
						i = len;
					} else if (i2 - i > 1) {
						name = events.slice(i, i2);
						i = i2;
					}
					if (name.length > 0) {
						this.callbacks[name] = undefined;
					}
				}
			}
			return this;
		}
		
		// Only single event supported
		one(name, fn) {
			fn.one = true;
			return this.on(name, fn);
		}

		trigger(name, ...args) {
			const fns = this.callbacks[name];
			if (!fns) {
				return this;
			}

			for (let i = 0; i < fns.len; i++) { // Note: len can change during iteration
				const fn = fns.arr[i];
				if (fn.typed) {
					fn.call(this, name, ...args);
				} else {
					fn.call(this, ...args);
				}
				if (fn.one) {
					fns.removeAt(i, 1); fn.one = false; i--;
				} else if (fns.arr[i] && fns.arr[i] !== fn) {
					i--;
				} // Makes self-removal possible during iteration
			}
			return this;
		}
	};

	unobservable.Observable = class Observable extends unobservable.observable {
		constructor() {
			super({numPreallocatedHandlers: 2, addDataMembers: false});
			
			this.callbacks = {};
		}
	};
	unobservable.asObservable = unobservable.observable;
	unobservable.CustomArray = CustomArray; // Expose for testability
})(typeof window !== 'undefined' ? window.unobservable = {} : typeof exports !== 'undefined' ? exports : self.unobservable = {});
