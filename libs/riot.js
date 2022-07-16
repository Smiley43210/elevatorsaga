/* Riot 1.0.2, @license MIT, (c) 2014 Muut Inc + contributors */
(function (riot) {
	riot.observable = class observable {
		constructor() {
			this.callbacks = {};
			this.slice = [].slice;
		}
		
		on(events, fn) {
			if (typeof fn === 'function') {
				events.replace(/[^\s]+/g, (name, pos) => {
					(this.callbacks[name] = this.callbacks[name] || []).push(fn);
					fn.typed = pos > 0;
				});
			}
			return this;
		}

		off(events, fn) {
			if (events === '*') {
				this.callbacks = {};
			} else if (fn) {
				const arr = this.callbacks[events];
				for (let i = 0, cb; cb = arr && arr[i]; ++i) {
					if (cb === fn) {
						arr.splice(i, 1);
					}
				}
			} else {
				events.replace(/[^\s]+/g, (name) => {
					this.callbacks[name] = [];
				});
			}
			return this;
		}

		// only single event supported
		one(name, fn) {
			if (fn) {
				fn.one = true;
			}
			return this.on(name, fn);
		}

		trigger(name) {
			const args = this.slice.call(arguments, 1),
				fns = this.callbacks[name] || [];

			for (let i = 0, fn; fn = fns[i]; ++i) {
				if (!fn.busy) {
					fn.busy = true;
					fn.apply(this, fn.typed ? [name].concat(args) : args);
					if (fn.one) {
						fns.splice(i, 1); i--;
					} else if (fns[i] && fns[i] !== fn) {
						i--;
					} // Makes self-removal possible during iteration
					fn.busy = false;
				}
			}

			return this;
		}
	};

	const FN = {}, // Precompiled templates (JavaScript functions)
		templateEscape = {'\\': '\\\\', '\n': '\\n', '\r': '\\r', "'": "\\'"},
		renderEscape = {'&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;'};

	function defaultEscapeFunction(str, key) {
		return str == null ? '' : `${str}`.replace(/[&"<>]/g, (char) => {
			return renderEscape[char];
		});
	}

	riot.render = function (tmpl, data, escapeFunction) {
		if (escapeFunction === true) {
			escapeFunction = defaultEscapeFunction;
		}
		tmpl = tmpl || '';

		return (FN[tmpl] = FN[tmpl] || new Function('_', 'e', `return '${
			tmpl.replace(/[\\\n\r']/g, (char) => {
				return templateEscape[char];
			}).replace(/{\s*([\w.]+)\s*}/g, "' + (e?e(_.$1,'$1'):_.$1||(_.$1==null?'':_.$1)) + '")}'`)
		)(data, escapeFunction);
	};
	/* Cross browser popstate */
	(function () {
		// for browsers only
		if (typeof window === 'undefined') {
			return;
		}

		let currentHash;
		const pops = new riot.observable();
		const listen = window.addEventListener;
		const doc = document;

		function pop(hash) {
			hash = hash.type ? location.hash : hash;
			if (hash !== currentHash) {
				pops.trigger('pop', hash);
			}
			currentHash = hash;
		}

		/* Always fire pop event upon page load (normalize behaviour across browsers) */

		// standard browsers
		if (listen) {
			listen('popstate', pop, false);
			doc.addEventListener('DOMContentLoaded', pop, false);

			// IE
		} else {
			doc.attachEvent('onreadystatechange', () => {
				if (doc.readyState === 'complete') {
					pop('');
				}
			});
		}

		/* Change the browser URL or listen to changes on the URL */
		riot.route = function (to) {
			// listen
			if (typeof to === 'function') {
				return pops.on('pop', to);
			}

			// fire
			if (history.pushState) {
				history.pushState(0, 0, to);
			}
			pop(to);

		};
	})();
})(typeof window !== 'undefined' ? window.riot = {} : typeof exports !== 'undefined' ? exports : self.riot = {});
