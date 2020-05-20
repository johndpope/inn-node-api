const express = require('express');
const app  = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
//const mongoose = require('mongoose');
//const router = require("routes");
const redis = require("redis");
const client = redis.createClient(6379, 'redis')
client.on('connect', () => console.log('Connected to Redis') )
app.use(cors());

const messagingRoutes = require('./v4/message/routes/notifications');

const expandWorkerRoute = require('./v4/message/routes/expandWorker');

const dashBoardRoutes = require('./v4/analytics/routes/dashBoard');

//app.use('/', router);

//app.use('/api', router);
client.on("error", function(error) {
    console.error(error);
});


client.set("fruta", "maca", 'EX', 3600, redis.print);



app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.all((req,res,next) => {
    res.header('Access-Control-Allow-Origin',"*");
    res.header('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept');
    if(req.method === 'OPTIONS')
    {
        res.header('Access-Control-Allow-Methods', 'POST,GET');
        return res.status(200).json({});
    }
    next();
});

// Route to handle the request on the messaging.
app.use('/api/message', messagingRoutes);

// Route to handle the resquest on the ExpandWorker
app.use('/api/expandWorker',expandWorkerRoute);

// Route to handle the resquest on the dashBoard
app.use('/api/analytics/dashboard',cors(),dashBoardRoutes);

app.use('/api/healthcheck', require('express-healthcheck')());

app.use('/api/cache',(req,res,next) => {
    //var s = client.exists('some_key_not_already_in_db', console.log);
    var s = client.get("fruta", redis.print);

    client.exists("fruta", console.log)

    res.json({
        s
    });
});


app.use((req,res,next) => {
    const error  = new Error('Verify the END-POINT or the request Method (POST)');
    console.log('%O', req);
    error.status=401;
    next(error);
});


app.use((error,req,res,next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message:error.message
        }
    });
});

module.exports = app ;
