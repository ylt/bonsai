var amqp = require('amqplib');

function sleep(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}

/*
 async function send() {
 let conn = await amqp.connect('amqp://localhost');
 let ch = await conn.createChannel();
 ch.assertExchange("database", "fanout", {durable: true});

 var i = 0;
 while (true) {
 ch.publish("database", "", new Buffer("test "+i));
 console.log("A "+i);
 i++;
 }

 }

 send();

 */

async function server(i) {
    let conn = await amqp.connect('amqp://localhost');
    let ch = await conn.createChannel();
    ch.assertQueue("rpc_queue", {durable: false});
    ch.prefetch(1);
    console.log(' [x] Awaiting RPC requests');
    ch.consume("rpc_queue", function (msg) {
        let data = msg.content.toString();

        console.log("server "+i+":", data);

        let rev = data.split("").reverse().join("");
        sleep(Math.random()*10).then(function() {
            ch.sendToQueue(msg.properties.replyTo, new Buffer(rev+" "+i), {correlationId: msg.properties.correlationId});
            ch.ack(msg);
        });

    });
}

async function client(i) {
    let conn = await amqp.connect('amqp://localhost');
    let ch = await conn.createChannel();
    let q = await ch.assertQueue('', {exclusive: true});

    let corr = generateUuid();
    ch.consume(q.queue, function (msg) {
        if (msg.properties.correlationId == corr) {
            console.log("client: ", msg.content.toString());
            conn.close();
        }
    });


    ch.sendToQueue("rpc_queue", new Buffer("abcdefg"), {
        correlationId: corr, replyTo: q.queue}
    );
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
    while(true) {
        client();
        await sleep(Math.random()*10);
    }
});
