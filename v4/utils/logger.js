/**
 * Configurations of logger.
 */
let getDateTime = () =>{

    var today = new Date();
   return today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();


};
const winston = require('winston');
const EwLogs = winston.createLogger({
   // level: 'info',
    format: winston.format.simple(),
   // defaultMeta: { service: 'user-service' },
    transports: [

        new winston.transports.File({
            level: 'info',
            filename: '['+getDateTime()+']ExpandWorker.log',
            dirname:'v4/logs'
        }),
        new winston.transports.File({
            level: 'error',
            filename: '['+getDateTime()+']ExpandWorkerErrors.log',
            dirname:'v4/logs'
        }),
    ],
});




module.exports = {
    'expandWorkerLogging': EwLogs
    //'dispatcherLogging': dispatcherLog
};