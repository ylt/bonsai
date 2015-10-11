"use strict";

var _createClass = require("babel-runtime/helpers/create-class")["default"];

var _classCallCheck = require("babel-runtime/helpers/class-call-check")["default"];

var _regeneratorRuntime = require("babel-runtime/regenerator")["default"];

var _Promise = require("babel-runtime/core-js/promise")["default"];

var client = (function () {
    function client(config) {
        _classCallCheck(this, client);

        this.callbacks = {};
        this.config = config;
    }

    _createClass(client, [{
        key: "listen",
        value: function listen() {
            return _regeneratorRuntime.async(function listen$(context$2$0) {
                var _this = this;

                while (1) switch (context$2$0.prev = context$2$0.next) {
                    case 0:
                        context$2$0.next = 2;
                        return _regeneratorRuntime.awrap(amqp.connect(this.config.host));

                    case 2:
                        this.conn = context$2$0.sent;
                        context$2$0.next = 5;
                        return _regeneratorRuntime.awrap(this.conn.createChannel());

                    case 5:
                        this.ch = context$2$0.sent;
                        context$2$0.next = 8;
                        return _regeneratorRuntime.awrap(this.ch.assertQueue('', { exclusive: true }));

                    case 8:
                        this.q = context$2$0.sent;

                        this.ch.consume(this.q.queue, function (msg) {
                            var corr = msg.properties.correlationId;
                            if (corr in _this.callbacks) {
                                var p = _this.callbacks[corr];
                                delete _this.callbacks[corr];

                                p.resolve(msg);
                            }
                        }, { noAck: true });

                    case 10:
                    case "end":
                        return context$2$0.stop();
                }
            }, null, this);
        }
    }, {
        key: "call",
        value: function call(data) {
            var _this2 = this;

            return new _Promise(function (resolve, reject) {
                var corr = generateUuid();

                _this2.callbacks[corr] = {
                    resolve: resolve,
                    reject: reject,
                    time: Date.now()
                };

                _this2.ch.sendToQueue(_this2.config.queue, new Buffer(JSON.stringify(data)), {
                    correlationId: corr, replyTo: _this2.q.queue
                });
            });
        }
    }, {
        key: "prune",
        value: function prune() {
            var timeout = this.config.call_timeout;
            if (!isFinite(timeout) || timeout <= 0) {
                return;
            }

            var now = Date.now();
            for (var key in this.callbacks) {
                if (this.callbacks.hasOwnProperty(key)) {
                    var callback = this.callbacks[key];

                    var diff = now - callback.time;

                    if (diff > timeout) {
                        delete this.callbacks[key];
                        callback.reject("timeout");
                    }
                }
            }
        }
    }]);

    return client;
})();

function test() {
    var c;
    return _regeneratorRuntime.async(function test$(context$1$0) {
        while (1) switch (context$1$0.prev = context$1$0.next) {
            case 0:
                c = new client({ host: "amqp://localhost", queue: "rpc_queue" });

                c.listen().then(function () {
                    c.call({ action: "playlist.add", "data": "test", "auth": {} }).then(function (msg) {
                        console.log("response", msg);
                    });
                });

            case 2:
            case "end":
                return context$1$0.stop();
        }
    }, null, this);
}

console.log("before");
test().then(function () {
    console.log("after2");
});
console.log("after");

