import * as http from 'http';
import * as https from 'https';
import * as debug from 'debug';
import * as fs from 'fs';
import { scheduleJob } from 'node-schedule';

import { fetchServers, init as fetchInit } from './ServerFetcher';
import App from './App';

debug('ts-express:server');

const sslEnabled = !!process.env.SSL_KEY
    && !!process.env.SSL_CERT
    && !!process.env.SSL_CA;

const port = 8000;
const httpsPort = 8443;
App.set('port', port);
App.set('https port', httpsPort);

let server, httpsServer;

server = http.createServer(App);

if (sslEnabled) {
    httpsServer = https.createServer({
        key: fs.readFileSync(process.env.SSL_KEY),
        cert: fs.readFileSync(process.env.SSL_CERT),
        ca: fs.readFileSync(process.env.SSL_CA)
    }, App);
}

fetchInit().then(() => {
   fetchServers();
   scheduleJob('*/1 * * * *', fetchServers);

   if (httpsServer) {
       httpsServer.listen(httpsPort);
       httpsServer.on('error', onError);
       httpsServer.on('listening', onListening);
   }

   server.listen(port);
   server.on('error', onError);
   server.on('listening', onListening);
});

function normalizePort(val: number|string): number|string|boolean {
    let port: number = (typeof val === 'string') ? parseInt(val, 10) : val;
    if (isNaN(port)) return val;
    else if (port >= 0) return port;
    else return false;
}

function onError(error: NodeJS.ErrnoException): void {
    if (error.syscall !== 'listen') throw error;
    let bind = (typeof port === 'string') ? 'Pipe ' + port : 'Port ' + port;
    switch(error.code) {
        case 'EACCES':
            console.error(`${bind} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(`${bind} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
}

function onListening(): void {
    let addr = server.address();
    let bind = (typeof addr === 'string') ? `pipe ${addr}` : `port ${addr.port}`;
    debug(`Listening on ${bind}`);
}