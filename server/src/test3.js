import amqp from "amqplib";

class client {
    constructor(config) {
        this.callbacks = {};
        this.config = config;
    }

    async listen() {
        this.conn = await amqp.connect('amqp://localhost');
        this.ch = await this.conn.createChannel();
        this.q = await this.ch.assertQueue('', {exclusive: true});

        this.ch.consume(this.q.queue, msg => {
            var corr = msg.properties.correlationId;
            if (corr in this.callbacks) {
                var p = this.callbacks[corr];
                delete this.callbacks[corr];

                p.resolve(JSON.parse(msg.content.toString()));
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
}
async function test() {
    var c = new client({host: "amqp://localhost", queue: "rpc_queue"});
    c.listen().then(async function() {
        var p = await c.call({
            path: "playlists:create",
            data: {
                name: "qwerty",
                userid: 0
            }}
        );
        console.log(p);


        var m = await c.call({
            path: "playlist.media:add",
            data: {
                playlist_id: 1,
                duration: 1337,
                mediatype: 1,
                medialoc: "qwerty",
                title: "qwerty"
            }}
        );
        console.log(m);

        var m = await c.call({
                path: "playlist.media:add",
                data: {
                    playlist_id: 1,
                    duration: 1337,
                    mediatype: 1,
                    medialoc: "qwerty",
                    title: "qwerty 1"
                }}
        );
        console.log(m);

        var m = await c.call({
                path: "playlist.media:add",
                data: {
                    playlist_id: 1,
                    duration: 1337,
                    mediatype: 1,
                    medialoc: "qwerty",
                    title: "qwerty 2"
                }}
        );
        console.log(m);

        var m = await c.call({
                path: "playlist.media:add",
                data: {
                    playlist_id: 1,
                    duration: 1337,
                    mediatype: 1,
                    medialoc: "qwerty",
                    title: "qwerty 3"
                }}
        );
        console.log(m);

        var m = await c.call({
                path: "playlist.media:add",
                data: {
                    playlist_id: 1,
                    duration: 1337,
                    mediatype: 1,
                    medialoc: "qwerty",
                    title: "qwerty 4",
                    before: 3
                }}
        );
        console.log(m);

        var m = await c.call({
                path: "playlist.media:delete",
                data: {
                    playlist_id: 1,
                    id: 2
                }}
        );
        console.log(m);

        var m = await c.call({
                path: "playlist.media:read",
                data: {
                    playlist_id: 1
                }}
        );

        console.log(m);
    });
}

function generateUuid() {
    return Math.random().toString() +
        Math.random().toString() +
        Math.random().toString();
}

test();