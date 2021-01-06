const { Client } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
    res.sendFile('index.html', { root: __dirname });
});

const client = new Client({ puppeteer: { headless: true }, session: sessionCfg });
// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.
// This object must include WABrowserId, WASecretBundle, WAToken1 and WAToken2.



client.on('message', msg => {
    if (msg.body == 'halo') {
        msg.reply('halo juga');
    }
});

client.on('message', msg => {
    if (msg.body == 'hai') {
        msg.reply('aposih :v');
    }
});

client.initialize();

//socketIO
io.on('connection', function(socket){
    socket.emit('message', 'connecting...');
    
    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR code diterima, silakan scan!');
        });
    });
    
    client.on('auth_failure', msg => {
        // Fired if session restore was unsuccessfull
        console.error('AUTHENTICATION FAILURE', msg);
        socket.emit('message', 'Gagal! Autentikasi Error!');
    });

    client.on('ready', () => {
        socket.emit('ready', 'Whatsapp terkoneksi! Anda telah siap!');
        socket.emit('message', 'Whatsapp terkoneksi! Anda telah siap!');
    });
    
    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'Terautentikasi!');
        socket.emit('message', 'Terautentikasi!');
        console.log('AUTHENTICATED', session);
        sessionCfg=session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    socket.emit('message', 'Terputus!');
});

//POST POINT
app.post('/send-message', [
    body('number').notEmpty(),
    body('message').notEmpty()
  ], async (req, res) =>  {
    const errors = validationResult(req).formatWith(({ msg }) => {
        return msg;
    })

    if (!errors.isEmpty()) {
        return res.status(422).json({
            status: false,
            message: errors.mapped()
        });
    }
    const number = req.body.number;
    const message = req.body.message;
    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        }).catch(err => {
            res.status(500).json({
                status: false,
                response: err
            });
        });
    });
});

server.listen(8000, function() {
    console.log('app running port:' + 8000);

})