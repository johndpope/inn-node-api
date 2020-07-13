const express = require('express');
const axios = require('../../utils/axios-instance');
const router = express.Router();
const con = require('../connection/DBconnection');
const ip = require('ip');
const SaveLog = require('../../utils/logger').expandWorkerLogging;


const endpoints = [
    'http://'+ip.address()+':8080/api/message/',
    'http://ec2-54-166-246-71.compute-1.amazonaws.com:8080/api/message/',
    'http://ec2-3-95-151-234.compute-1.amazonaws.com:8080/api/message/'
];

async  function recall() {

    SaveLog.info("["+getDateTime()+"]-------------------------[RECALL of 0 PENDING...after 10 seconds]------------------------------------------");
    SaveLog.info("["+getDateTime()+"]              http://"+ip.address()+":8080/api/ew/v11/         ");
    SaveLog.info("["+getDateTime()+"]------------------------------------------------------------------------------");
    console.log('-------------------------[RECALL  of 0 PENDING...after 10 seconds]------------------------------------------');
    console.log('                      http://'+ip.address()+':8080/api/ew/v11/         ');
    console.log('------------------------------------------------------------------------------');
    await new Promise(resolve => setTimeout(resolve, 5000));
    await axios.post('http://'+ip.address()+':8080/api/ew/v11/');

}

async function getPendingToSend() {

    const sql = await new Promise(async (res,rej)=>{
        await   con.query(`SELECT id_control_message AS control_message_id 
                                FROM control_message 
                                WHERE (status = 3 OR status = 4) 
                                AND (schedule IS NULL OR schedule <= NOW())`,async (err,row)=> {
            if(err) throw err;
            if(row.length !== 0)
            {
                SaveLog.info("["+getDateTime()+"] Selected [" + row.length + "] CMs pending ");
                console.log("Selected [" + row.length + "] CMs pending ");
                res(row);
            }
            else {
                SaveLog.info("["+getDateTime()+"] Selected [" + row.length + "] CMs pending...Ending Connection");
                console.log("["+getDateTime()+"] Selected [" + row.length + "] CMs pending...");
                res(row);

            }


        })
});
    return await Promise.resolve(sql);
}
async function getMaxId(controlMessageId) {

    const sql = await new Promise(async (res, rej) => {

        await con.query(`SELECT id 
                                FROM message_log_insert 
                                WHERE control_message_id = ?
                                AND message_status_id = 0 
                                ORDER BY id ASC LIMIT 499,1`, [controlMessageId], async (err, row) => {
            if (err) throw err;
            if (row.length !== 0)
            {
                SaveLog.info("["+getDateTime()+"] Selected 500 from CM ["+controlMessageId+"] ...");
                console.log("Selected 500 from CM ["+controlMessageId+"]...");
                res(row[0].id)
            }
            else
            {
                SaveLog.info("["+getDateTime()+"] Less than 500 , let's get less from CM ["+controlMessageId+"]");
                console.log("Less than 500 , let's get less from CM ["+controlMessageId+"]");
                await con.query(`SELECT id
                                        FROM message_log_insert
                                        WHERE control_message_id = ?
                                        AND message_status_id = 0
                                        ORDER BY id
                                        DESC LIMIT 1`, [controlMessageId], async (err, row1) => {
                    if (err) throw err;

                    if (row1.length !== 0)
                    {
                        SaveLog.info("["+getDateTime()+"] Got a Record ["+row1[0].id+"] for this CM ["+controlMessageId+"]");
                        console.log("Got a Record ["+row1[0].id+"] for this CM ["+controlMessageId+"]");
                        res(row1[0].id)
                    }
                    else
                    {
                        SaveLog.info("["+getDateTime()+"] no Records in MLI for this CM ["+controlMessageId+"]");
                        console.log("no Records in MLI for this CM ["+controlMessageId+"]");
                        res(0)
                    }

                })
            }
        });



    });
    return await Promise.resolve(sql);
}
async function getControlMessageData(controlMessageId) {
    const sql = await new Promise(async (res, rej) => {
        await con.query(`SELECT 
                    app_id, title, body, channel,url_push, img_push, meta_data, send_until,status,silent
                FROM
                    control_message
                WHERE
                    id_control_message = ?`, [controlMessageId], async (err, row) => {
            if (err) throw err;
            SaveLog.info("["+getDateTime()+"] Selected CM ["+controlMessageId+"] Data");
            console.log("Selected CM ["+controlMessageId+"] Data ");
            res(row[0]);

        })
    });
    return await Promise.resolve(sql);
}
async function handleControlMessage(controlMessageId) {

     let cmData =  await getControlMessageData(controlMessageId) ;
    cmData["per_flag"] = await setPerFlagOptmized(cmData.title, cmData.body) ;
    return cmData ;
}
async function getAppConfigData(app_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT 
                    google_api_key,
                    sandbox_cert_file,
                    sandbox_cert_pass,
                    production_cert_file,
                    production_cert_pass,
                    apns_topic,
                    package_name,
                    class_name,
                    firebase_ios
                FROM
                    app_config
                WHERE
                    app_id = ?`,[app_id],(err,row)=>{
            if(err) throw err;
            SaveLog.info("["+getDateTime()+"] ["+getDateTime()+"] ["+app_id+"] App_config an User_data successfully selected from database");
            console.log("App_config an User_data successfully selected from database");
            res(row[0]);
        })
    });
    return await Promise.resolve(sql);


}
async function handlePlatformData(app_id) {
    let isProduction =await getAppIsProduction(app_id);


    let  appConfigData =await getAppConfigData(app_id);
    appConfigData["isProduction"] = isProduction;

    return appConfigData ;
}
async function getRecipients(controlMessageId, maxInsertId,status) {
    let q =`SELECT mli.id as not_id, mli.subscriber_id, s.platform_id, s.identifier, s.registration, sp.phone 
            FROM message_log_insert mli 
            JOIN subscriber s ON mli.subscriber_id = s.id 
            LEFT JOIN subscriber_phone sp  ON s.id = sp.subscriber_id 
            WHERE mli.control_message_id = ?  
            AND mli.id <= ? 
            AND mli.message_status_id = 0 
            ORDER BY mli.id ASC`;
    const sql = await new Promise(async (res, rej) => {
        await con.query(q, [controlMessageId,maxInsertId], async (err, row) => {
            if (err) throw err;
            if (row.length !== 0)
            {
                SaveLog.info("["+getDateTime()+"] Selected the recipients "+ row.length);
                console.log("Selected the recipients "+ row.length);
                res(row);
            }
            else
            {
                SaveLog.info("["+getDateTime()+"] ["+row.length+"] Recipients for this CM["+controlMessageId+"]");
                console.log("["+row.length+"] Recipients for this CM["+controlMessageId+"]");
                return await handleRecipients(controlMessageId,status);
            }


        })
    });
    return await Promise.resolve(sql);
}
async function checkPendingPushes(controlMessageId) {
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT 
                    COUNT(1) as pendings
                FROM
                    message_log_insert
                WHERE
                    control_message_id = ?
                        AND message_status_id = 0`,[controlMessageId],(err,row)=>{
            if(err) throw err;
            SaveLog.info("["+getDateTime()+"] Got ["+row[0].pendings+"] Pending pushes for this CM ["+controlMessageId+"]");
            console.log("Got ["+row[0].pendings+"] Pending pushes for this CM ["+controlMessageId+"]");
            res(row[0]);
        })
    });
    return await Promise.resolve(sql);

}
async function countResponses(controlMessageId) {
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT 
                    COUNT(1) AS mr_total,
                    (SELECT 
                            COUNT(1)
                        FROM
                            message_log_insert
                        WHERE
                            control_message_id = ?) AS mli_total
                FROM
                    message_responses
                WHERE
                    control_message_id = ?`,[controlMessageId,controlMessageId],(err,row)=>{
            if(err) throw err;
            if (row.length !== 0)
            {
                SaveLog.info("["+getDateTime()+"] Got ["+row[0].mr_total+"] Responses out of ["+row[0].mli_total+"] for this CM ["+controlMessageId+"]");
                console.log("Got ["+row[0].mr_total+"] Responses out of ["+row[0].mli_total+"] for this CM ["+controlMessageId+"]");
                res(row[0]);
            }

        })
    });
    return await Promise.resolve(sql);

}
async function checkPending(controlMessageId) {
    SaveLog.info("["+getDateTime()+"] Verifying pending pushes for CMId: " + controlMessageId);
    console.log("Verifying pending pushes for CMId: " + controlMessageId);
    let pending = await checkPendingPushes(controlMessageId);

    if(pending.pendings === 0) {
        SaveLog.info("["+getDateTime()+"] Verifying responses for CMId: " +controlMessageId);
        console.log("Verifying responses for CMId: " +controlMessageId);
       let  messages = await countResponses(controlMessageId);
        if(messages["mr_total"] >= (0.98*messages["mli_total"])) {
            await updateCMStatus(controlMessageId,5);
            SaveLog.info("["+getDateTime()+"] Completed sending CMId " +controlMessageId+"... Updating to 5");
            console.log("Completed sending CMId " +controlMessageId+"... Updating to 5");
        }

    }
}
async function updateCMStatus(controlMessageId,status) {
    const sql = await new Promise((res,rej)=>{
        con.query(`CALL update_cm_status (?,?)`,[controlMessageId, status],(err,row)=>{
            if(err) throw err;
            if(row !== undefined)
            {
                SaveLog.info("["+getDateTime()+"] updating ["+controlMessageId+"] to status ["+status+"]");
                console.log("updating ["+controlMessageId+"] to status ["+status+"]");
                res(JSON.parse(JSON.stringify(row)));
            }

        })
    });

    return await Promise.resolve(sql);

}
async function handleRecipients(controlMessageId,cm_status) {

        // Verify if control_message isn't being send before changing its status

        if(cm_status === 3) {
           await  updateCMStatus(controlMessageId,9);
           SaveLog.info("["+getDateTime()+"] ERROR: control message " +controlMessageId+ " has no recipients");
            console.log("ERROR: control message " +controlMessageId+ " has no recipients");

        } else {
            await checkPending(controlMessageId);
        }
    }
async function getAppIsProduction(app_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT is_production FROM app WHERE id = ${app_id};`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row[0].is_production)));
        })
    });

    return await Promise.resolve(sql);

}
async function updateMessageLogInsertStatus(not_id){
    const sql = await new Promise( async (res,rej)=>{
        await con.query(`UPDATE message_log_insert 
                  SET message_status_id = 9 
              WHERE id = ?`,[not_id],(err,row)=>{
            if(err) throw err;
            if (row !== undefined || row !== null )
            {
                SaveLog.info("["+getDateTime()+"] updating ["+not_id+"]  from 0 to 9");
                console.log("updating ["+not_id+"]  from 0 to 9  ");
                res(row);
            } else
            {
                SaveLog.error("["+getDateTime()+"] ERROR updating ["+not_id+"]  from 0 to 9 :"+JSON.stringify(row));
                console.log("ERROR updating ["+not_id+"]  from 0 to 9 :");
            }

        })

    });

    return await Promise.resolve(sql);

}
async function setPerFlagOptmized(title,body){
    var t = (title.includes("|*") || title.includes("*|") || title.includes("{{") || title.includes("}}"));
    var b = (body.includes("|*") || body.includes("*|") || body.includes("{{") || body.includes("}}"));
    return (t || b) ? 1:0;
}
async function selectCustomFields(subscriber_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT  acf.custom_field_name, scf.value 
                    FROM subscriber_customfield scf JOIN app_customfield acf ON acf.custom_field_id = scf.app_custom_field_id 
                    WHERE subscriber_id = ${subscriber_id};`,(err,row)=>{
            if(err) throw err;

            var custom_fields = {};
            Object.keys(row).forEach(function(key){
                var row2 = row[key];
                var cf_name = "|*" + row2.custom_field_name +"*|";
                var cf_value = row2.value
                custom_fields[cf_name] = cf_value;
            });
            res(custom_fields);
        })
    });

   return await Promise.resolve(sql);


}
async function selectEvents(subscriber_id,app_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT aed.event_dado_name,valor FROM app_events_data aed, app_events ae, subscriber_event se , subscriber_event_data sed 
                    WHERE ae.app_id = ${app_id}
                    AND ae.id = aed.event_id
                    AND se.subscriber_id = ${subscriber_id}
                    AND sed.id_event_data = aed.id
                    AND sed.Id_subscriber_event = se.id
                    AND ae.is_active = 1
                    ORDER BY created_in ASC;`,(err,row)=>{
            if(err) throw err;

            var events = {};
            Object.keys(row).forEach(function(key){
                var row2 = row[key];
                var eve_name =`{{` + row2.event_dado_name +`}}`
                var eve_value = row2.valor;
                events[eve_name] = eve_value
            });
            res(events);
        })
    });

    var r = await Promise.resolve(sql);
    console.log("Subscriber "+subscriber_id+" events for app "+app_id+" successfully selected from database");
    return r;
}
async function getControlMessageChannels(cm_id,app_id){

    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT cmc.custom_title,cmc.custom_body,c.id,c.name,cp.endpoint,cp.id AS channel_provider_id,cp.provider_name,acc.user,acc.password,acc.key,acc.certificate,acc.package_name,acc.class_name,acc.apns_topic 
            FROM app_channel_config acc, channel_provider cp, channel c, control_message_channel cmc
            WHERE acc.app_id = ${app_id}
            AND cmc.channel_provider_id = cp.id
            AND acc.channel_provider_id = cp.id
            AND c.id = cp.channel_id
            AND cmc.control_message_id = ${cm_id};`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)))
        })
    });

    var ans = await Promise.resolve(sql);
    var c= {};

    ans.forEach(channel =>{
        if(channel.id == 1)return;
        const pf = setPerFlagOptmized(channel.custom_title,channel.custom_body);
        c[channel.name] = {
            channel_id : channel.id,
            url:channel.endpoint,
            per_flag: JSON.stringify(pf),
            custom_title: channel.custom_title,
            custom_body: channel.custom_body,
            provider_data:{
                user:channel.user,
                password: channel.password,
                key: channel.key,
                certificate: channel.certificate,
                package_name: channel.package_name,
                class_name: channel.class_name,
                apns_topic: channel.apns_topic,
                channel_provider_id: channel.channel_provider_id
            }

        }
    })
    return c;
}
async function isLast(recipients,key) {
    if (Object.is(recipients.length -1,key) || (recipients.length === 1)) {
        SaveLog.info("["+getDateTime()+"]-------------------------[RECALL of LAST RECORD...in 10 seconds]------------------------------------------");
        SaveLog.info("["+getDateTime()+"]              http://"+ip.address()+":8080/api/ew/v11/         ");
        SaveLog.info("["+getDateTime()+"]------------------------------------------------------------------------------");
        console.log('-------------------------[RECALL...in 10 seconds]------------------------------------------');
        console.log('                      http://'+ip.address()+':8080/api/ew/v11/         ');
        console.log('------------------------------------------------------------------------------');
        await new Promise(resolve => setTimeout(resolve, 5000));
        await axios.post('http://'+ip.address()+':8080/api/ew/v11/');

    }
}
let getDateTime = () =>{
    return new Date().toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo'
    })
};

router.post('/v11',(req,res0,next)=>{

    con.getConnection(async  function(err99,connection){
        if(err99) throw err99;
        console.log("connected!");
        let   readyToSend = await getPendingToSend();

        if(readyToSend.length == 0 )
        {
            console.log("No Pending CMs ... ending connection...");
            connection.release();
            res0.status(200).json({
                SendPushResponse:'No Pending CMs'
            });
        }


        readyToSend.forEach(async (controlMessage,key) =>{
            // CM_id
             const controlMessageId  = controlMessage.control_message_id ;
             // MaxID to control the select
             const maxInsertId =  await getMaxId(controlMessageId);
             //CM data
             const cmData = await handleControlMessage(controlMessageId);
             //Platform Data {AppConfig..}
             const platformData = await  handlePlatformData(cmData.app_id);
           // List of Subscribers who should receive
             let recipients = await  getRecipients(controlMessageId, maxInsertId,cmData.status);


             let initialControlMessageStatus = cmData.status;

             if(initialControlMessageStatus === 3 )
             {
                 await updateCMStatus(controlMessageId,4);

             }

               recipients.forEach(async recipient =>{
                  let updated = await updateMessageLogInsertStatus(recipient.not_id);
                   let  sendPushRequest =  await buildPushResponse(controlMessageId, cmData,platformData,recipient);
                   let endpoint = endpoints[Math.floor(Math.random()*endpoints.length)];
                   axios.post(endpoint ,
                       {sendPushRequest}
                   )
                       .then(async response => {
                           console.log(response.data);
                           SaveLog.info("["+getDateTime()+"][CM:]["+controlMessageId+"][NotId]["+recipient.not_id+"]"+JSON.stringify(response.data));
                       })
                       .catch( async er => {
                           console.log("Error on sending  to Dispatcher...");
                           SaveLog.error("["+getDateTime()+"] Error on sending  to Dispatcher .. [CM:]["+controlMessageId+"][NotId]["+recipient.not_id+"] "+JSON.parse(JSON.stringify(er)));
                           console.log(er);

                       });


               });


            //await isLast(readyToSend,key);
        });
        console.log("ending connection...");
        connection.release();
        res0.status(200).json({
            SendPushResponse:'success'
        });

    });

});



/**
 * cmData {app_id, title, body, channel,url_push, img_push, meta_data, send_until, per_flag, silent}
 * platformData {google_api_key, sandbox_cert_file, sandbox_cert_pass, production_cert_file, production_cert_pass, apns_topic, package_name, class_name, firebase_ios, isProduction}
 * recipient { not_id, subscriber_id, platform_id, identifier, registration, phone}
**/
async function buildPushResponse(controlMessageId, cmData,platformData,recipient){
    let customfields,events,channelsData;
    if (cmData.per_flag === 1 )
    {
         customfields = await selectCustomFields(recipient.subscriber_id);
         events = await selectEvents(recipient.subscriber_id,cmData.app_id);
    }
            if(cmData.channel !== null || cmData.channel !== 0 || cmData.channel !== undefined)
            {
                channelsData = await getControlMessageChannels(controlMessageId,cmData.app_id);
            }


    let sendPushRequest = {

        control_message: {
            control_message_id: JSON.stringify(controlMessageId),
            title: cmData.title,
            body:  cmData.body,
            message: cmData.body,
            url: cmData.url_push != null ? cmData.url_push:"",
            image_url: cmData.image_url != null ? cmData.image_url:"",
            url_type: cmData.url_type != null ? cmData.url_type:"" ,
            notid: JSON.stringify(recipient.not_id),
            personalised_flag: JSON.stringify(cmData.per_flag),
            silent:JSON.stringify(cmData.silent)
        },
        channel: {
            provider_id: "",
            end_point: "",
            type:JSON.stringify(cmData.channel)
        },
        app: {
            app_id: JSON.stringify(cmData.app_id),
            production: JSON.stringify(platformData.isProduction),
            firebase_ios:platformData.firebase_ios != null ? JSON.stringify(platformData.firebase_ios) : "",
            apns :{
                prod:{
                    apple_prod_cert_file: platformData.production_cert_file != null ? platformData.production_cert_file:"",
                    apple_prod_cert_name: platformData.production_cert_name != null ? platformData.production_cert_name:"",
                    apple_prod_cert_pass: platformData.production_cert_pass != null ? platformData.production_cert_pass:"",
                },
                sandbox:{
                    apple_sandbox_cert_file:platformData.sandbox_cert_file != null ? platformData.sandbox_cert_file:"",
                    apple_sandbox_cert_name:platformData.sandbox_cert_name != null ? platformData.sandbox_cert_name:"",
                    apple_sandbox_cert_pass:platformData.sandbox_cert_pass != null ? platformData.sandbox_cert_pass:""
                },
                apns_topic:platformData.apns_topic != null ? platformData.apns_topic : "",
            },
            fcm:{
                google_api_key: platformData.google_api_key != null ? platformData.google_api_key:"",
                package_name:platformData.package_name != null ? platformData.package_name:"",
                class_name:platformData.class_name != null ? platformData.class_name:"",
            },

        },
        subscriber: {
            subscriber_id: recipient.subscriber_id,
            registration: recipient.registration,
            phone: recipient.phone != null ? recipient.phone: "",
            platform_id: JSON.stringify(recipient.platform_id)
        } ,
        customfields,
        events
    };
    sendPushRequest["channels"] = channelsData;
    return sendPushRequest
}





module.exports = router;