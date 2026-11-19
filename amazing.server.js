const express = require('express');
const dotenv = require('dotenv');
const fs = require('fs')
dotenv.config();
const { server: serverConfig, keys } = require('./config')
const http = require(serverConfig.protocol);
const { sendStatus } = require('./utils')
const bodyparser = require('body-parser');
const maxPayloadSize = parseInt(process.env.MAX_PAY_LOAD_SIZE,10)+'mb'
const app = express();
const router = require('./api/routes');
require('./api/background');
var server;
app.set('view engine', 'hbs');
app.set('views', 'views');
app.set('trust proxy', true);

app.use('/api/payments/stripe/webhook', bodyparser.raw({ type: 'application/json' }))
app.use(express.json({ limit: maxPayloadSize })); //Used to parse JSON bodie
app.use(bodyparser.urlencoded({ limit: maxPayloadSize, extended: true }));
app.use(bodyparser.json({ limit: maxPayloadSize }));
app.use(express.static('public'));
// app.use("/uploads", express.static("uploads"));
// app.use('/videos', express.static(process.env.VIDEO_READ_WRITE));
app.use('/transcription', express.static(process.env.PDF_READ_WRITE));
app.use('/report', express.static(process.env.CASE_REPORT_DIRECTORY));
app.use('/download-file', express.static(process.env.CASE_FILE_DOWNLOAD));
// app.use('/ins-report', express.static(process.env.INS_CASE_READ_WRITE));
app.use('/doc-inhance', express.static(process.env.DOCUMENT_ENHANCE_READ_WRITE));
app.use(process.env.REV_DIRECTORY_PATH, express.static(process.env.REV_FILE_PATH));

process.env.TZ = "Canada/Eastern";
 
app.use((req, res, next) => {
    //Click jacking fix
    res.header('X-Frame-Options', 'DENY');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Content-Security-Policy', 'frame-ancestors "none"');
    //Click jacking fix
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept, Authorization, Session-Id");
    try {
        const userAgent = req.headers['user-agent'];
        const isSafari = userAgent.includes('Safari');

        // Set the keepalive_disabled header for Safari
        if (isSafari) {
            res.setHeader('Connection', 'close');
        }
    } catch (e) {
        // console.log(e.message);
    }

    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, PATCH')
        // fix for error ERR_HTTP_HEADERS_SENT
        // res.status(200).json({})
    }
    next();
})
app.use(router);

app.use((error, req, res, next) => {
    console.log({ serverError: error });
    sendStatus.data.badRequestStatus(res, req, {
        message: "Something went wrong..",
        codeMessage: error.message,
        code: 400,
    }, "Something went wrong")
});
if (serverConfig.protocol == "https" && keys.ssl && keys.ssl.key && keys.ssl.cert) {
    server = new http.createServer({
        key: fs.readFileSync(keys.ssl.key),
        cert: fs.readFileSync(keys.ssl.cert),
        requestCert: false,
        rejectUnauthorized: false
    }, app);
} else {
    server = http.createServer(app);;
}
server.listen(process.env.PORT || serverConfig.port, () => {
    console.log("Server is running on port : " + serverConfig.port)
});
