const { Server } = require("socket.io");
const http = require('http');
const express = require("express");
const app = express();
const serve = http.createServer(app);
const io = new Server(serve, {
    cors: {
        origin: "*",
        credentials: true,
    },
});

module.exports = {
    app, serve, io
}