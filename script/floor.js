export default class Floor extends riot.observable {
	constructor(floorLevel, yPosition, errorHandler) {
		super();
        
		this.level = floorLevel;
		this.yPosition = yPosition;
		this.errorHandler = errorHandler;
		this.buttonStates = {up: '', down: ''};
	}
	
	tryTrigger(event, ...args) {
		try {
			this.trigger(event, ...args);
		} catch (e) {
			this.errorHandler(e);
		}
	}
	
	pressUpButton() {
		const prev = this.buttonStates.up;
		this.buttonStates.up = 'activated';
		if (prev !== this.buttonStates.up) {
			this.tryTrigger('buttonstate_change', this.buttonStates);
			this.tryTrigger('up_button_pressed', this);
		}
	}

	pressDownButton() {
		const prev = this.buttonStates.down;
		this.buttonStates.down = 'activated';
		if (prev !== this.buttonStates.down) {
			this.tryTrigger('buttonstate_change', this.buttonStates);
			this.tryTrigger('down_button_pressed', this);
		}
	}

	elevatorAvailable(elevator) {
		if (elevator.goingUpIndicator && this.buttonStates.up) {
			this.buttonStates.up = '';
			this.tryTrigger('buttonstate_change', this.buttonStates);
		}
		if (elevator.goingDownIndicator && this.buttonStates.down) {
			this.buttonStates.down = '';
			this.tryTrigger('buttonstate_change', this.buttonStates);
		}
	}

	getSpawnPosY() {
		return this.yPosition + 30;
	}

	floorNum() {
		return this.level;
	}
}
