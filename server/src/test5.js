import io from "socket.io-client";

function call(method, data) {
    return new Promise(function(success, fail) {
        var payload = {path: method, data: data};
        socket.emit("rpc", payload, function(response) {
            if (response.status === "ok") {
                success(response.data);
            }
            else {
                fail(response.status);
            }
        });
    });
}

function send(event, data) {
    return new Promise(function(success, fail) {
        var payload = {event: event, data: data};
        socket.emit("send", payload, function(response) {
            if (response.status === "ok") {
                success(response.data);
            }
            else {
                fail(response.status);
            }
        });
    });
}

process.on('unhandledRejection', function(error, promise) {
    console.error("UNHANDLED REJECTION", error.stack);
});

var socket = io("http://localhost:1337");
socket.on("connect", () => {
    console.log("connected");

    socket.on("broadcast", msg => {
        console.log("broadcast", msg);
    });

    call("Session:joinRoom", {"slug": "writhem"}).then(response => {
        console.log("response", response);
    });

    setTimeout(() => {
        socket.disconnect();
    }, 5000)

});