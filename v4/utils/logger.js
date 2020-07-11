/**
 * Configurations of logger.
 */
let getDateTime = () =>{
    let d =  new Date().getDay();
     let y = new Date().getFullYear();
     let m =new Date().getMonth();

     return '['+y+'-'+m+'-'+d+']';

};
const winston = require('winston');
const EwLogs = winston.createLogger({
   // level: 'info',
    format: winston.format.simple(),
   // defaultMeta: { service: 'user-service' },
    transports: [

        new winston.transports.File({
            filename: getDateTime()+'ExpandWorker.log',
            dirname:'v4/logs'
        }),
    ],
});


// EwLogs.add(new winston.transports.Console({
//     'name': 'expand-worker',
//     'level': 'info',
//     'filename': '../logs/expandWorker.log',
//     'json': false,
//     'datePattern': 'yyyy-MM-dd-',
//     'prepend': true
// }));

// const dispatcherLog = createLogger;
// dispatcherLog.add(new winston.transports.Console({
//     'name': 'dispatcher',
//     'level': 'info',
//     'filename': '../logs/dispatcher.log',
//     'json': false,
//     'datePattern': 'yyyy-MM-dd-',
//     'prepend': true
// }));

module.exports = {
    'expandWorkerLogging': EwLogs
    //'dispatcherLogging': dispatcherLog
};