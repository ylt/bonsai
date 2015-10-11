import * as Rabbit from "./Rabbit";

async function test() {

    var b = new Rabbit.Broadcast();
    await b.listen();

    b.subscribe("room.writhem.chat");
    b.on("room.**", function(msg) {
        console.log("b received chat", msg);
    });

    var c = new Rabbit.Broadcast();
    await c.listen();

    c.subscribe("room.writhem.chat");
    c.on("room.**", function(msg) {
        console.log("c received chat", msg);
    });

    c.broadcast("room.writhem.chat", {abcdef: "def"});
}




test().then(e =>{
    console.log("finished");
}).catch( e=> {
    console.log("exception");
    console.error(e);
});
