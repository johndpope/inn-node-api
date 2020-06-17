const express = require('express');
const axios = require('axios');
const router = express.Router();
var con = require('../connection/DBconnection');


const endpoints = [
    'http://ec2-54-166-246-71.compute-1.amazonaws.com:8080/api/message/',
    'http://ec2-3-95-151-234.compute-1.amazonaws.com:8080/api/message/'
];
router.post('/v1',(req,res0,next)=>{

    con.getConnection(function(err99,connection){
        if(err99) throw err99;
        console.log("connected!");

        if(req.body.app_id == null || req.body.control_message_id == null || req.body.notification_id == null || req.body.subscriber_id == null){
            return res0.status(200).json({
                Message:"Invalid JSON. Check for missing or null fields or empty JSON."
            })
        }

        const app_id= req.body.app_id;
        const control_message_id = req.body.control_message_id;
        const notification_id = req.body.notification_id;
        const subscriber_id = req.body.subscriber_id;
        console.log("successfully recived data from JSON");
        let app_config,not_data,user_data,user_customfields;

        con.query(`SELECT ac.class_name, ac.apns_topic,ac.sandbox_cert_pass,ac.sandbox_cert_name,ac.sandbox_cert_file,ac.production_cert_pass, ac.production_cert_file, ac.package_name, ac.production_cert_name, ac.firebase_ios, ac.google_api_key, s.platform_id, s.registration from subscriber s join  app_config ac on s.app_id = ac.app_id where s.id = ${subscriber_id} and ac.app_id = ${app_id};`, (err,res)=>{
            if(err) throw err;
            app_config = res[0];
            user_data = res[0];
            console.log("app_config and user_data successfully selected from database ");

            con.query(`SELECT title, body ,url_push, img_push, url_type, status,silent
            FROM control_message
            WHERE id_control_message = ${control_message_id}`, (err2,res2)=>{
                if(err2) throw err2;
                not_data = res2[0];
                console.log("not_data successfully selected from database");

                con.query(`SELECT  acf.custom_field_name, scf.value 
                FROM subscriber_customfield scf JOIN app_customfield acf ON acf.custom_field_id = scf.app_custom_field_id 
                WHERE subscriber_id = ${subscriber_id};`,(err4,res4)=>{
                    if(err) throw err;
                    user_customfields = res4;
                    console.log("custom_fields successfully selected from database");
                    var custom_fields = {};
                    Object.keys(res4).forEach(function(key){
                        var row = res4[key];
                        var cf_name = "|*" + row.custom_field_name +"*|";
                        var cf_value = row.value
                        custom_fields[cf_name] = cf_value;
                    });

                    con.query(`SELECT aed.event_dado_name,valor FROM app_events_data aed, app_events ae, subscriber_event se , subscriber_event_data sed 
                                WHERE ae.app_id = ${app_id}
                                AND ae.id = aed.event_id
                                AND se.subscriber_id = ${subscriber_id}
                                AND sed.id_event_data = aed.id
                                AND sed.Id_subscriber_event = se.id
                                AND ae.is_active = 1
                                ORDER BY created_in ASC;`, (err5,res5)=>{
                                    if(err5) throw err5;
                                    var events = {};
                                    console.log("Events successfully selected from database");

                                    Object.keys(res5).forEach(function(key){
                                        var row2 = res5[key];
                                        var eve_name =`{{` + row2.event_dado_name +`}}` 
                                        var eve_value = row2.valor;
                                        events[eve_name] = eve_value
                                    });
                                    

                                    con.query(`Select * from control_message where id_control_message = ${control_message_id} 
                                        AND (body LIKE '%|*%*|%'
                                        OR body LIKE '%{{%}}%'
                                        OR title LIKE '%|*%*|%'
                                        OR title LIKE '%{{%}}%');`,  async (err6,res6)=>{
                                        if(err6) throw err6;
                                        console.log("personalyzed_flag successfully setted");
                                        var is_prod = await getIsProd(app_id);
                                        var phone = await getSubPhone(subscriber_id,app_id);
                                        var per_flag = 0;
                                        if(res6.length > 0)per_flag = 1;

                                        per_flag = JSON.stringify(per_flag);

                                            var sendPushRequest = {

                                                control_message: {
                                                    control_message_id: control_message_id,
                                                    title: not_data.title,
                                                    body:  not_data.body,
                                                    message: not_data.body,
                                                    url: not_data.url_push != null ? not_data.url_push:"",
                                                    image_url: not_data.image_url != null ? not_data.image_url:"",
                                                    url_type: not_data.url_type != null ? not_data.url_type:"" ,
                                                    notid: notification_id,
                                                    personalised_flag: per_flag,
                                                    silent:not_data.silent
                                                },
                                                channel: {
                                                    provider_id: "",
                                                    end_point: ""
                                                },
                                                app: {
                                                    app_id: app_id,
                                                    production: JSON.stringify(is_prod),
                                                    firebase_ios:app_config.firebase_ios != null ? JSON.stringify(app_config.firebase_ios) : "",
                                                    apns :{
                                                        prod:{
                                                            apple_prod_cert_file: app_config.production_cert_file != null ? app_config.production_cert_file:"",
                                                            apple_prod_cert_name: app_config.production_cert_name != null ? app_config.production_cert_name:"",
                                                            apple_prod_cert_pass: app_config.production_cert_pass != null ? app_config.production_cert_pass:"",
                                                        },
                                                        sandbox:{
                                                            apple_sandbox_cert_file:app_config.sandbox_cert_file != null ? app_config.sandbox_cert_file:"",
                                                            apple_sandbox_cert_name:app_config.sandbox_cert_name != null ? app_config.sandbox_cert_name:"",
                                                            apple_sandbox_cert_pass:app_config.sandbox_cert_pass != null ? app_config.sandbox_cert_pass:""
                                                        },
                                                        apns_topic:app_config.apns_topic != null ? app_config.apns_topic : "",
                                                    },
                                                    fcm:{
                                                        google_api_key: app_config.google_api_key != null ? app_config.google_api_key:"",
                                                        package_name:app_config.package_name != null ? app_config.package_name:"",
                                                        class_name:app_config.class_name != null ? app_config.class_name:"",
                                                    },
                                                    
                                                },
                                                subscriber: {
                                                    subscriber_id: subscriber_id,
                                                    registration: user_data.registration,
                                                    phone: phone,
                                                    platform_id: JSON.stringify(user_data.platform_id)
                                                },
                                                custom_fields,

                                                events
                                            }
                                        console.log("preparing to update control_message_status from 3 to 4");
                                        var st = await updateStatus3TO4(control_message_id);
                                        var channelsData = await teste(control_message_id,app_id);
                                        if(channelsData.length > 0){
                                            sendPushRequest["channels"] = channelsData;
                                        }
                                        console.log("sendPushRequest JSON")
                                        console.log("%j",{sendPushRequest});
                                        axios.defaults.headers = {
                                            'Content-Type': 'application/json'
                                        };  
                                        console.log("Sending to Dispatcher...");
                                        const endpoint = endpoints[Math.floor(Math.random()*endpoints.length)];
                                        axios.post(endpoint,
                                            {sendPushRequest}
                                        )
                                        .then(response => {
                                                    console.log("Push successfully sent to dispatcher.");
                                                    res0.status(200).json({
                                                        SendPushResponse:response.data
                                                    });
                                                })
                                        .catch( err => {
                                                    console.log("Error sending message to Dispatcher... Details : "+err);
                                                    res0.status(200).json({ 
                                                        teste:err.SendPushResponse,
                                                        error:err
                                                    });
                                                });
                                    });
                    });
                });
            });
        })
        console.log("ending connection");
        connection.release();

    })

});

router.post('/v3',(req,ress,next)=>{
   
    con.getConnection(function(err99,connection){
        if(err99) throw err99;
        console.log("connected!");
        axios.defaults.headers = {
            'Content-Type': 'application/json'
        };
        console.log("started v3");
        con.query("SELECT mli.id AS notification_id,mli.subscriber_id,mli.control_message_id,cm.app_id FROM message_log_insert mli JOIN control_message cm ON mli.control_message_id = cm.id_control_message WHERE cm.status = 3 OR cm.status = 4 AND  mli.message_status_id = 0 LIMIT 4999",async (err0,res0)=>{
            if(err0) throw err0;
            console.log("successfully selected messages to send from message_log_insert");
            var ids_updated = []
            var l =[];
            Object.keys(res0).forEach(async function(key){
                await updateStatus0TO9(res0[key].notification_id);
                l.push(res0[key].notification_id);
            });


                Object.keys(res0).forEach(function(key){
                    var row = res0[key];
                    const app_id= row.app_id;
                    const control_message_id = row.control_message_id;
                    const notification_id = row.notification_id;
                    const subscriber_id = row.subscriber_id;
                    let app_config,not_data,user_data,user_customfields;

                    con.query(`SELECT ac.class_name, ac.apns_topic,ac.sandbox_cert_pass,ac.sandbox_cert_name,ac.sandbox_cert_file,ac.production_cert_pass, ac.production_cert_file, ac.package_name, ac.production_cert_name, ac.firebase_ios, ac.google_api_key, s.platform_id, s.registration from subscriber s join  app_config ac on s.app_id = ac.app_id where s.id = ${subscriber_id} and ac.app_id = ${app_id};`, (err,res)=>{
                        if(err) throw err;
                        console.log("app_config successfully selected from database ");

                        app_config = res[0];
                        con.query(`SELECT title, body ,url_push, img_push, url_type, status,silent
                        FROM control_message
                        WHERE id_control_message = ${control_message_id}`, (err2,res2)=>{
                            if(err2) throw err2;
                            not_data = res2[0];
                            user_data = res[0];
                            console.log("not_data and user_data successfully selected from database ");

                            con.query(`SELECT  acf.custom_field_name, scf.value 
                            FROM subscriber_customfield scf JOIN app_customfield acf ON acf.custom_field_id = scf.app_custom_field_id 
                            WHERE subscriber_id = ${subscriber_id};`,(err4,res4)=>{
                                if(err) throw err;
                                user_customfields = res4;
                                var custom_fields = {};
                                console.log("custom_fields successfully selected from database");

                                Object.keys(res4).forEach(function(key){
                                    var row = res4[key];
                                    var cf_name = "|*" + row.custom_field_name +"*|";
                                    var cf_value = row.value
                                    custom_fields[cf_name] = cf_value;
                                });
                
                                
                                con.query(`SELECT aed.event_dado_name,valor FROM app_events_data aed, app_events ae, subscriber_event se , subscriber_event_data sed 
                                            WHERE ae.app_id = ${app_id}
                                            AND ae.id = aed.event_id
                                            AND se.subscriber_id = ${subscriber_id}
                                            AND sed.id_event_data = aed.id
                                            AND sed.Id_subscriber_event = se.id
                                            AND ae.is_active = 1;`,(err5,res5)=>{
                                                if(err5) throw err5;
                                                var events = {};
                                                console.log("events successfully selected from database");

                                                Object.keys(res5).forEach(function(key){
                                                    var row2 = res5[key];
                                                    var eve_name =`{{` + row2.event_dado_name +`}}` 
                                                    var eve_value = row2.valor;
                                                    events[eve_name] = eve_value
                                                });
                                                
                                                con.query(`Select * from control_message where id_control_message = ${control_message_id} 
                                                    AND (body LIKE '%|*%*|%'
                                                    OR body LIKE '%{{%}}%'
                                                    OR title LIKE '%|*%*|%'
                                                    OR title LIKE '%{{%}}%');`, async (err6,res6)=>{
                                                    if(err6) throw err6;
                                                    var is_prod = await getIsProd(app_id);
                                                    console.log("personalyzed_flag successfully setted");

                                                    var per_flag = 0;
                                                    if(res6.length > 0)per_flag = 1;
                                                    per_flag = JSON.stringify(per_flag);
                                                    
                                                    var sendPushRequest = {

                                                        control_message: {
                                                            control_message_id: control_message_id,
                                                            title: not_data.title,
                                                            body:  not_data.body,
                                                            message: not_data.body,
                                                            url: not_data.url_push != null ? not_data.url_push:"",
                                                            image_url: not_data.image_url != null ? not_data.image_url:"",
                                                            url_type: not_data.url_type != null ? not_data.url_type:"" ,
                                                            notid: notification_id,
                                                            personalised_flag: per_flag,
                                                            silent:not_id.silent
                                                        },
                                                        channel: {
                                                            provider_id: "",
                                                            end_point: ""
                                                        },
                                                        app: {
                                                            app_id: app_id,
                                                            production: JSON.stringify(is_prod),
                                                            firebase_ios:app_config.firebase_ios != null ? JSON.stringify(app_config.firebase_ios) : "",
                                                            apns :{
                                                                prod:{
                                                                    apple_prod_cert_file: app_config.production_cert_file != null ? app_config.production_cert_file:"",
                                                                    apple_prod_cert_name: app_config.production_cert_name != null ? app_config.production_cert_name:"",
                                                                    apple_prod_cert_pass: app_config.production_cert_pass != null ? app_config.production_cert_pass:"",
                                                                },
                                                                sandbox:{
                                                                    apple_sandbox_cert_file:app_config.sandbox_cert_file != null ? app_config.sandbox_cert_file:"",
                                                                    apple_sandbox_cert_name:app_config.sandbox_cert_name != null ? app_config.sandbox_cert_name:"",
                                                                    apple_sandbox_cert_pass:app_config.sandbox_cert_pass != null ? app_config.sandbox_cert_pass:""
                                                                },
                                                                apns_topic:app_config.apns_topic != null ? app_config.apns_topic : "",
                                                            },
                                                            fcm:{
                                                                google_api_key: app_config.google_api_key != null ? app_config.google_api_key:"",
                                                                package_name:app_config.package_name != null ? app_config.package_name:"",
                                                                class_name:app_config.class_name != null ? app_config.class_name:"",
                                                            },
                                                            
                                                        },
                                                        subscriber: {
                                                            subscriber_id: subscriber_id,
                                                            registration: user_data.registration,
                                                            phone: "",
                                                            platform_id: JSON.stringify(user_data.platform_id)
                                                        },
                                                        custom_fields,
        
                                                        events
                                                    }
                                                    
                                                    if(!ids_updated.includes(control_message_id)){
                                                        console.log("preparing to update control_message_status from 3 to 4");
                                                        var st = await updateStatus3TO4(control_message_id);
                                                        ids_updated.push(control_message_id);
                                                    }
                                                    console.log("sendPushRequest JSON")
                                                    console.log(sendPushRequest);
                                                    console.log("sending message to dispatcher....");
                                                    axios.post('http://alb-node-api-1101754065.us-east-1.elb.amazonaws.com/api/message',
                                                    {sendPushRequest}
                                                    )
                                                    .then(async response => {
                                                        console.log(response.data);
                                                    })
                                                    .catch( er => {
                                                        console.log("Error on sending to Dispatcher...");
                                                        console.log(er.SendPushResponse);
                                                    });

                                                });
                                        });
                            });
                        });
                    })
                });
            // await updateStatus1TO9All(l);
            // for(i=0;i<l.length;++i){
            //     await updateStatus1TO9(l[i]);
            // }
        })
        console.log("ending connection");
        connection.release();
        console.log("finished v3");


        return ress.status(200).json({
            SendPushResponse:"Messages sent successfullly",
        });

    })
})


router.post('/v33',async(req,res,next)=>{

    con.getConnection(async function(err,connection){
        if(err) throw err;
        console.log("["+getDateTime()+"] --- Started V33 ---");
        console.log("["+getDateTime()+"] --- Successfully connected to DataBase!!");
        axios.defaults.headers = {
            'Content-Type': 'application/json'
        };
        var v3messages = await selectFromMLI();
        console.log("["+getDateTime()+"] --- Succesfully selected messages from Message_log_insert table ---");
        var updated_ids = [];
        var cms_data={};
        var l = [];
        v3messages.forEach(async message =>{
            await updateStatus0TO9(message.notification_id);
            await updateMLISentAt(message.notification_id);
            l.push(message.notification_id);
        });

        v3messages.forEach(async message=>{
            const app_id= message.app_id;
            const control_message_id = message.control_message_id;
            const notification_id = message.notification_id;
            const subscriber_id = message.subscriber_id;
            console.log("["+getDateTime()+"]sending => "+notification_id);

            if(!updated_ids.includes(control_message_id)){
                var cmUp = await updateStatus3TO4(control_message_id);
                updated_ids.push(control_message_id);
            }
            var appConfigAndUserData;
            var not_data;
            var per_flag;
            var is_prod;
            var channelsData;
            var custom_fields;
            var events;
            var phone;
            if(cms_data[control_message_id] == undefined || cms_data[control_message_id] == null){

                appConfigAndUserData = await selectAppConfigAndUserData(subscriber_id,app_id);
                not_data = await selectNotificationData(control_message_id);
                per_flag = setPerFlagOptmized(not_data.title,not_data.body);
                is_prod = await getIsProd(app_id);
                channelsData = await teste(control_message_id,app_id);
                cms_data[control_message_id] = {appConfigAndUserData,
                               not_data,
                               per_flag,
                               is_prod,
                               channelsData
                              }
            }else{
                appConfigAndUserData = cms_data[control_message_id].appConfigAndUserData;
                not_data = cms_data[control_message_id].not_data;
                per_flag = cms_data[control_message_id].per_flag;
                is_prod = cms_data[control_message_id].is_prod;
                channelsData = cms_data[control_message_id].channelsData;
            }
            
            // Set extra information due to channels (phone/custom data)
            var phone_flag=0;
            for(i=0;i<channelsData.length;++i){
                if((channelsData[i].channel_id == 2 || channelsData[i].channel_id == 3) && phone_flag == 0){
                    phone = await getSubPhone(subscriber_id,app_id);
                    phone_flag=1;
                }
                if(channelsData[i].per_flag == "true"){
                    per_flag = true;
                }
            }

            if(per_flag == 1){
                custom_fields = await selectCustomFields(subscriber_id);
                events = await selectEvents(subscriber_id,app_id);
                let sendPushRequest = buildPushResponse(app_id,control_message_id,notification_id,subscriber_id,appConfigAndUserData,not_data,appConfigAndUserData,custom_fields,events,per_flag,is_prod,phone);
                if(channelsData.length>0){
                    sendPushRequest["channels"] = channelsData;
                }
                console.log("sendPushRequest JSON")
                console.log("%j",sendPushRequest);
                console.log("["+getDateTime()+"] --- Sending message "+notification_id+" to dispatcher....");
                // const endpoint = endpoints[Math.floor(Math.random()*endpoints.length)];
                // axios.post(endpoint,
                // {sendPushRequest}
                // )
                // .then(async response => {
                //     console.log(response.data);
                // })
                // .catch( er => {
                //     console.log("Error on sending to Dispatcher...");
                //     console.log(er.SendPushResponse);
                // });

            }else{
                let sendPushRequest = buildPushResponse(app_id,control_message_id,notification_id,subscriber_id,appConfigAndUserData,not_data,appConfigAndUserData,{},{},per_flag,is_prod,phone);
                if(channelsData.length>0){
                    sendPushRequest["channels"] = channelsData;
                }
                console.log("sendPushRequest JSON");
                console.log("%j",sendPushRequest);
                console.log("["+getDateTime()+"] --- Sending message "+notification_id+" to dispatcher....");
                // const endpoint = endpoints[Math.floor(Math.random()*endpoints.length)];
                // axios.post(endpoint,
                // {sendPushRequest}
                // )
                // .then(async response => {
                //     console.log(response.data);
                // })
                // .catch( er => {
                //     console.log("Error on sending not_id = "+notification_id+" to Dispatcher...");
                //     console.log(er);
                // });
            }

        });
        console.log("ending connection");
        connection.release();
    });

    return res.status(200).json({
        message:"Success"
    })
});

async function getIsProd(app_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT is_production FROM app WHERE id = ${app_id};`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });

    var ans = Promise.resolve(sql);
    return sql[0].is_production;
}

async function updateStatus0TO1(not_id){
    const sql = await new Promise((res,rej)=>{
        con.query('CALL update_mli_status_to_1 (?)',not_id,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("message_log_insert "+not_id+" updated from 0 to 1");
    var r = Promise.resolve(sql);
}

async function updateStatus1TO9(not_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`CALL update_mli_status_1_to_9 (?)`,not_id,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("message_log_insert "+not_id+" updated from 1 to 9");
    var r = Promise.resolve(sql);
}

async function updateStatus0TO9(not_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`CALL update_mli_status_0_to_9 (?)`,not_id,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("message_log_insert "+not_id+" updated from 0 to 9");
    var r = await Promise.resolve(sql);
    return r;
}


async function updateStatus3TO4(CM_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`CALL update_cm_status_3_to_4 (?)`,CM_id,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("control_message "+CM_id+" updated");
    var r = await Promise.resolve(sql);
    return r;
}


async function updateMLISentAt(notification_id){
    const sql = await new Promise((res,rej)=>{
        con.query("UPDATE message_log_insert set created_in = NOW() where id = ?;",notification_id ,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("UPDATED CREATED_IN DATE TO NOW OF "+notification_id);
    var r = await Promise.resolve(sql);
}

async function setPerFlag(control_message_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`Select * from control_message where id_control_message = ${control_message_id} 
                    AND (body LIKE '%|*%*|%'
                    OR body LIKE '%{{%}}%'
                    OR title LIKE '%|*%*|%'
                    OR title LIKE '%{{%}}%');`,(err,row)=>{
        
                        if(err) throw err;
                        res(JSON.parse(JSON.stringify(row)));
        })
    });
    var r = await Promise.all(sql);
    console.log("personalized flag for CM_id "+control_message_id+" successfully selected.");
    if(r.length>0){
        return 1;
    }else{
        return 0;
    }
}

function setPerFlagOptmized(title,body){
    var t = (title.includes("|*") || title.includes("*|") || title.includes("{{") || title.includes("}}"));
    var b = (body.includes("|*") || body.includes("*|") || body.includes("{{") || body.includes("}}"));
    return (t || b);
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
    
    var r = await Promise.resolve(sql);
    console.log("Subscriber "+subscriber_id+" custom fields successfully selected");
    return r;
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

async function selectNotificationData(control_message_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT title, body ,url_push, img_push, url_type, status,silent
                    FROM control_message
                    WHERE id_control_message = ${control_message_id}`,(err,row)=>{
                        if(err) throw err;
                        res(row);
        })
    });
    var r = await Promise.all(sql);
    console.log("Notification data successfully selected from database");
    return r[0];
}

async function selectAppConfigAndUserData(subscriber_id,app_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT ac.class_name, ac.apns_topic,ac.sandbox_cert_pass,ac.sandbox_cert_name,ac.sandbox_cert_file,ac.production_cert_pass, ac.production_cert_file, ac.package_name, ac.production_cert_name, ac.firebase_ios, ac.google_api_key, s.platform_id, s.registration 
                    from subscriber s join  app_config ac on s.app_id = ac.app_id 
                    where s.id = ${subscriber_id} and ac.app_id = ${app_id};`,(err,row)=>{
                        if(err) throw err;
                        res(row);
        })
    });
    var r = await Promise.all(sql);
    console.log("App_config an User_data successfully selected from database");
    return r[0];
}

async function selectFromMLI(){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT mli.id AS notification_id,mli.subscriber_id,mli.control_message_id,cm.app_id FROM message_log_insert mli 
                    JOIN control_message cm ON mli.control_message_id = cm.id_control_message 
                    WHERE (cm.status = 3 OR cm.status = 4) AND 
                    mli.message_status_id = 0 AND
                    cm.silent = 1
                    LIMIT 499`,(err,row)=>{
                        if(err) throw err;
                        res(row);
        })
    });
    var r = await Promise.all(sql);
    console.log("Messages successfully selected from message log insert");
    return r;
}

function buildPushResponse(app_id,control_message_id,notification_id,subscriber_id,app_config,not_data,user_data,custom_fields,events,per_flag,is_prod,phone){
    var sendPushRequest = {

        control_message: {
            control_message_id: control_message_id,
            title: not_data.title,
            body:  not_data.body,
            message: not_data.body,
            url: not_data.url_push != null ? not_data.url_push:"",
            image_url: not_data.image_url != null ? not_data.image_url:"",
            url_type: not_data.url_type != null ? not_data.url_type:"" ,
            notid: notification_id,
            personalised_flag: JSON.stringify(per_flag),
            silent:JSON.stringify(not_data.silent)
        },
        channel: {
            provider_id: "",
            end_point: ""
        },
        app: {
            app_id: app_id,
            production: JSON.stringify(is_prod),
            firebase_ios:app_config.firebase_ios != null ? JSON.stringify(app_config.firebase_ios) : "",
            apns :{
                prod:{
                    apple_prod_cert_file: app_config.production_cert_file != null ? app_config.production_cert_file:"",
                    apple_prod_cert_name: app_config.production_cert_name != null ? app_config.production_cert_name:"",
                    apple_prod_cert_pass: app_config.production_cert_pass != null ? app_config.production_cert_pass:"",
                },
                sandbox:{
                    apple_sandbox_cert_file:app_config.sandbox_cert_file != null ? app_config.sandbox_cert_file:"",
                    apple_sandbox_cert_name:app_config.sandbox_cert_name != null ? app_config.sandbox_cert_name:"",
                    apple_sandbox_cert_pass:app_config.sandbox_cert_pass != null ? app_config.sandbox_cert_pass:""
                },
                apns_topic:app_config.apns_topic != null ? app_config.apns_topic : "",
            },
            fcm:{
                google_api_key: app_config.google_api_key != null ? app_config.google_api_key:"",
                package_name:app_config.package_name != null ? app_config.package_name:"",
                class_name:app_config.class_name != null ? app_config.class_name:"",
            },
            
        },
        subscriber: {
            subscriber_id: subscriber_id,
            registration: user_data.registration,
            phone: phone != null ? phone: "",
            platform_id: JSON.stringify(user_data.platform_id)
        },
        custom_fields,

        events
    }
    return sendPushRequest
}

let getDateTime = () =>{
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

    var dateTime = date+' '+time;
    return dateTime
};

async function teste(cm_id,app_id){
    var l = [];
    var ids = await getChannelProviderIds(cm_id);

    var channel_data = [];
    channel_data = await ids.map(async obj  =>{
        return await getChannelInfo(obj.channel_provider_id,app_id);
    })
    
    const response = await Promise.all(channel_data);

    for(i=0;i<response.length;i++){
        var c = {};
        var x = await getChannelId(ids[i].channel_provider_id);
        if(x.channel_id == 1) continue; // ignore push notification channel

        var custom_per_flag = setPerFlagOptmized(ids[i].custom_title,ids[i].custom_body);
        c = {channel_name:x.name,channel_id:x.channel_id,url:x.endpoint,per_flag:JSON.stringify(custom_per_flag),custom_title:ids[i].custom_title,custom_body:ids[i].custom_body,provider_data:response[i][0]};
        l.push(c);
    }

    return l;
}

async function getChannelInfo(channel_id,app_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT acc.user,acc.password,acc.key,acc.certificate,acc.package_name,acc.class_name,acc.apns_topic,acc.channel_id as channel_provider_id 
        FROM app_channel_config acc
        WHERE acc.app_id = ${app_id}
        and acc.channel_id = ${channel_id};`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var ans = await Promise.resolve(sql);
    return sql;
}

async function getChannelProviderIds(cm_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT channel_provider_id,custom_title,custom_body FROM control_message_channel WHERE control_message_id = ${cm_id};`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var ans = Promise.resolve(sql);
    return ans;
}

async function getChannelId(channel_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT c.name,cp.channel_id as channel_id,cp.endpoint,cp.provider_name FROM channel_provider cp JOIN channel c on c.id = cp.channel_id WHERE cp.id = ${channel_id};`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var ans = Promise.resolve(sql);
    return sql[0];
}

async function getSubPhone(sub_id, app_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`select phone from subscriber_phone where app_id = ${app_id} and subscriber_id = ${sub_id}`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var r = await Promise.resolve(sql);
    
    if(r.length == 0) return "";
    else {
        return r[0].phone
    }
}


module.exports = router;