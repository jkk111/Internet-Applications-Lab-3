/*// Inter-node comms handled via websockets for convienience.
let io = require("socket.io");
let client = require("socket.io-client");

let nodes = [];
let locks = {};

let random_id = () => {
	return crypto.randomBytes(16).toString('hex');
}

let forward = (sender, message) => {
	if(sender) {
		if(!message.sender) {
			message.sender = sender.node_id;
		}
	}

	for(var node of nodes) {
		if(node !== sender) {
			node.emit('message', message)
		}
	}
}

let on_lock = (file) => {
	forward(null, { id: random_id(), file, type: 'lock' });
}

let on_release = (file, lock_id) => {
	forward(null, { id: lock_id, file, type: 'release' })
}

// Handles a new server connection on the lock service
let on_connect = (socket, init_msg) => {
	socket.node_id = init_msg.id;
	forward(null, { id: random_id(), node: init_msg.id, type: 'join'})
}


// On Instantiate, connect to bootstrapping nodes, define an identifier and set up
let on_init = (bootstrap) => {
	let id = random_id(); // Just a random base64 string, fine for a node identifier.
	for(var node of bootstrap) {
		// connection magic
		// Assume these are all already connected, handle connections at the root level
		node.emit('connect', { id }, (msg) => {
			for(var lock of msg.locks) {
				if(!locks[lock.id]) {
					locks[lock.id] = lock // Construct here
				}
			}
		});
		// Each node explains its view of the network lock topology
	}
}

const MAX_MISSED_DEADLINES = 6;
const DEADLINE_TIME = 1000;

let notify_node = (node, file, type) => {
	return new Promise((resolve) => {
		node.emit("lock", { file, type }, (resp) => {
			if(resp.type === "ack") {
				resolve();
			}
		})
	})
}

let notify_nodes = async(file, type) => {
	for(var node of nodes) {
		await notify_node(node, file, type);
	}
}

class Lock {
	constructor(file) {
		this._queue = [];
		this.file = file;
		locks[file] = this;
	}

	init_lock() {
		if(this._timer) {
			clearInterval(this._timer);
		}

		let missed = 0;
		let renewed = false;
		let released = false;
		let interval_id = 0;
		this._timer = interval_id = setInterval(() => {
			if(renewed) {
				missed = 0;
				renewed = false;
			} else if(++missed > MAX_MISSED_DEADLINES) {
				released = true;
				this.release();
			}

      if(!renewed) {
        console.log("Missed Deadline %d", missed)
      }

			if(released) {
				clearInterval(this._timer)
			}
		}, DEADLINE_TIME)

		let renew = () => {
			renewed = true;
		}

		let release = () => {
			if(!released && this._timer === interval_id) {
				this.release();
			}
			released = true;
		}

		return { renew, release }
	}

	release() {
		if(this._queue.length) {
			let next = this._queue.shift();
			next(this.init_lock());
		} else {
			if(this._timer)
				clearInterval(this._timer);
			locks[this.file] = null;
		}
	}

	async request(callback) {
		await notify_nodes(this.file, "lock")
		this._queue.push(callback)
	}
}

let lock = async(file, callback) => {
	if(locks[file]){
		locks[file].request(callback);
	} else {
		await notify_nodes(file, "lock");
		callback(new Lock(file).init_lock());
	}
}

let initialize_lock_service = (node_list, http_server) => {
	if(!node_list) {
		throw new Error("You must specify an array of connected nodes!");
	}
	nodes = node_list
	return { lock }
}

// No need to complplicate the exports,
// We only need to be able to obtain a lock.
module.exports = initialize_lock_service;
*/

let router = null;

let lock_message = (id) => {
	let m = { id: router.random_id(), type: 'lock', lock_id: id };
}

let unlock_message = (id) => {
	let m = { id: router.random_id(), type: 'unlock', lock_id: id };
}

let pending = {};
let locks = {};
let lock_items = {};

let _lock = id => {
	locks[id] = true;

	let timeout = null
	let released = false;
	let release = (notify = true) => {
		if(released) return;
		released = true;
		clearTimeout(timeout)
		unlock_message(id);
		if(pending[id] && pending[id].length) {
			let next = pending[id].shift();
			next(_lock(id));
		} else {
			locks[id] = false;
		}
	}

	lock_items[id] = release;

	setTimeout(release, 30000);
	return release;
}

let _unlock = (id) => {
	lock_items[id](false); // release the lock
}

let _queue = (id, cb) => {
	if(!pending[id])
		pending[id] = [ cb ];
	else
		pending[id].push(cb);
}

let lock = (id, cb, emit = true) => {
	if(!locks[id]) {
		cb(_lock(id));
	} else {
		_queue(id, cb);
	}
	if(emit) {
		router.send(lock_message());
	}
}

module.exports = (r) => {
	r.on('lock', (m) => {
		let id = m.lock_id
		lock(id, () => {}, false);
	})

	r.on('unlock', (m) => {
		let id = m.lock_id
		_unlock(id);
	})

	router = r;
	return lock;
};