var amqp = require('amqplib');

function sleep(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}


class server {
    constructor() {
        this.actions = {};
    }

    async listen() {
        this.conn = await amqp.connect('amqp://localhost');
        this.ch = await this.conn.createChannel();
        this.ch.assertQueue("rpc_queue", {durable: false});
        this.ch.prefetch(1);

        this.ch.consume("rpc_queue", async function (msg) {
            let data = JSON.parse(msg);
            var response = {data:[], status: ""};

            if (data.actionName in this.actions && data.actionType in this.actions[data.actionName]) {

                this.actions[data.actionName][data.actionType](data.data).then(function(rdata) {
                    response.data = rdata;
                    response.status = "ok";
                    this.ch.ack(msg);
                }).catch(function(err) {
                    response.status = err;
                    //ch.sendToQueue(msg.properties.replyTo, new Buffer(rev+" "+i), {correlationId: msg.properties.correlationId});
                    //TODO: error
                    this.ch.ack(msg);
                });
            }
            else {
                //TODO: error
                this.ch.ack(msg);
            }
        });
    }

    //func must be async (promise) based.
    addAction(actionName, actionType, func) {
        if (!(actionName in this.actions)) {
            this.actions[actionName] = {};
        }
        this.actions[actionName][actionType] = func;
    }
}
/*
async function server(i) {
    let conn = await amqp.connect('amqp://localhost');
    let ch = await conn.createChannel();
    ch.assertQueue("rpc_queue", {durable: false});
    ch.prefetch(1);

    ch.consume("rpc_queue", function (msg) {
        var data = msg.content.toString();

        console.log("server "+i+":", data);

        var rev = data.split("").reverse().join("");
        //sleep(1).then(function() {
            ch.sendToQueue(msg.properties.replyTo, new Buffer(rev+" "+i), {correlationId: msg.properties.correlationId});
            ch.ack(msg);
        //});

    });
}*/

class client {
    constructor(config) {
        this.callbacks = {};
        this.config = config;
    }

    async listen() {
        this.conn = await amqp.connect(this.config.host);
        this.ch = await this.conn.createChannel();
        this.q = await this.ch.assertQueue('', {exclusive: true});

        this.ch.consume(this.q.queue, msg => {
            var corr = msg.properties.correlationId;
            if (corr in this.callbacks) {
                var p = this.callbacks[corr];
                delete this.callbacks[corr];

                p.resolve(msg);
            }
        }, {noAck: true});
    }


    call(data) {
        return new Promise((resolve, reject) => {
            var corr = generateUuid();

            this.callbacks[corr] = {
                resolve: resolve,
                reject: reject,
                time: Date.now()
            };

            this.ch.sendToQueue(this.config.queue, new Buffer(JSON.stringify(data)), {
                correlationId: corr, replyTo: this.q.queue
            });
        });
    }

    prune() {
        let timeout = this.config.call_timeout;
        if (!isFinite(timeout) || timeout <= 0) {
            return;
        }

        var now = Date.now();
        for(var key in this.callbacks) {
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
}

function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}

var servers = [];
for(var i = 0; i < 10; i++) {
    servers.push(server(i));
}

Promise.all(servers).then(async function() {

    var c = new client({host:"amqp://localhost", queue: "rpc_queue"});
    await c.listen();

    c.call(["ehye "+i+"a"]).then(msg => {
        console.log("response", msg);
    });


});
