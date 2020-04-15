const express = require('express');
const app  = express();
const morgan = require('morgan');
const bodyParser = require('body-parser');
//const mongoose = require('mongoose');



const messagingRoutes = require('./v4/message/routes/notifications');

const expandWorkerRoute = require('./v4/message/routes/expandWorker')


app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use((req,res,next) => {
    res.header('Access-Control-Allow-Origin','*');
    res.header('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept');
    if(req.method === 'OPTIONS')
    {
        res.header('Access-Control-Allow-Methods', 'POST,GET');
        return res.status(200).json({});
    }
    next();
});

// Route to handle the request on the messaging.
app.use('/message', messagingRoutes);

// Route to handle the resquest on the ExpandWorker
app.use('/expandWorker',expandWorkerRoute);

app.use((req,res,next) => {
    const error  = new Error('Verify the END-POINT or the request Method (POST)');
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