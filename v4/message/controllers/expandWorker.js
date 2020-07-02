const express = require('express');
const axios = require('axios');
const router = express.Router();
const con = require('../connection/DBconnection');
const ip = require('ip');

const endpoints = [
    'http://ec2-54-166-246-71.compute-1.amazonaws.com:8080/api/message/',
    'http://ec2-3-95-151-234.compute-1.amazonaws.com:8080/api/message/',
    'http://'+ip.address()+':8080/api/message/',
    'https://inn-api-pusher.herokuapp.com/api/message/',
    'https://inn-api-pusher2.herokuapp.com/api/message/',
    'https://inn-api-pusher3.herokuapp.com/api/message/',
    'http://send.inngage.com.br/api/message/'
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

            con.query(`SELECT title, body ,url_push, img_push, url_type, status,silent,channel
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
                                                    end_point: "",
                                                    type:not_data.channel
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
                                        var channelsData = await getControlMessageChannels(control_message_id,app_id);
                                        if(Object.keys(channelsData).length > 0){
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
});


router.post('/v33',async(req,res,next)=>{
    try{
        con.getConnection(async function(err,connection){
            if(err) throw err;
            console.log("["+getDateTime()+"] --- Started V33 ---");
            console.log("["+getDateTime()+"] --- Successfully connected to Database!!");
            axios.defaults.headers = {
                'Content-Type': 'application/json'
            };
            let v3messages = await selectFromMLI();
    
    
            var updated_ids = [];
            var cms_data={};
            var l = [];
    
            v3messages.forEach(async message =>{
                await updateStatus0TO9(message.notification_id);
                //await updateMLISentAt(message.notification_id);
                l.push(message.notification_id);
            });
            cms_data = await getCMData(v3messages);
    
            v3messages.forEach(
                async (message,key) => {
                const app_id= message.app_id;
                const control_message_id = message.control_message_id;
                const notification_id = message.notification_id;
                const subscriber_id = message.subscriber_id;
    
                if(!updated_ids.includes(control_message_id)){
                    var cmUp = await updateStatus3TO4(control_message_id);
                    updated_ids.push(control_message_id);
                }
                var appConfigAndUserData = await selectAppConfigAndUserData(subscriber_id,app_id);
                var not_data = cms_data[control_message_id].not_data;
                var per_flag = cms_data[control_message_id].per_flag;
                var is_prod = cms_data[control_message_id].is_prod;
                var channelsData = cms_data[control_message_id].channelsData;
                var custom_fields;
                var events;
                var phone;
    
                // Set extra information due to channels (phone/custom data)
                var phone_flag=0;
                var values = Object.values(channelsData);
                for(i=0;i<values.length;++i){
                    if((values[i].channel_id == 2 || values[i].channel_id == 3) && phone_flag == 0){
                        phone = await getSubPhone(subscriber_id,app_id);
                        phone_flag=1;
                    }
                }
    
                if(per_flag == 1){
                    custom_fields = await selectCustomFields(subscriber_id);
                    events = await selectEvents(subscriber_id,app_id);
                    let sendPushRequest = buildPushResponse(app_id,control_message_id,notification_id,subscriber_id,appConfigAndUserData,not_data,appConfigAndUserData,custom_fields,events,per_flag,is_prod,phone);
                    if(values.length>0){
                        sendPushRequest["channels"] = channelsData;
                    }
                    console.log("["+getDateTime()+"] --- Sending message ["+notification_id+"] to dispatcher....");
                    const endpoint = endpoints[Math.floor(Math.random()*endpoints.length)];
                    axios.post(endpoint ,
                    {sendPushRequest}
                    )
                    .then(async response => {
                        console.log(response.data);
                    })
                    .catch( er => {
                        console.log("Error on sending to Dispatcher...");
                        console.log(er.SendPushResponse);
                    });
    
                }
                else
                    {
                    let sendPushRequest = buildPushResponse(app_id,control_message_id,notification_id,subscriber_id,appConfigAndUserData,not_data,appConfigAndUserData,{},{},per_flag,is_prod);
                    if(values.length>0){
                        sendPushRequest["channels"] = channelsData;
                    }
                    console.log("["+getDateTime()+"] --- Sending message ["+notification_id+"] to dispatcher....");
                    const endpoint = endpoints[Math.floor(Math.random()*endpoints.length)];
    
                    axios.post(endpoint ,
                    {sendPushRequest}
                    )
                    .then(async response => {
                        console.log(response.data);
                    })
                    .catch( er => {
                        console.log("Error on sending not_id = "+notification_id+" to Dispatcher...");
                        console.log(er);
                    });
                }
                    isLast(v3messages,key);
                });
    
            console.log("ending connection...");
            connection.release();
        });
    }catch(e){
        console.log("Error while executing v33 route function... Details : "+e);
    }

    return res.status(200).json({
        message:"Success"
    })
});

async function getCMData(v3m){
    var l = []
    const sql = await new Promise((res,rej)=>{
        const r = v3m.map(async cm =>{
            if(l.includes(cm.control_message_id))return ;
            else l.push(cm.control_message_id);

            const not_pf = await selectNotificationData(cm.control_message_id);
            const is_prod = await getIsProd(cm.app_id);
            const channelsData = await getControlMessageChannels(cm.control_message_id,cm.app_id);
            return {
                control_message_id:cm.control_message_id,
                not_data:not_pf.not_data,
                per_flag:not_pf.not_pf,
                is_prod,
                channelsData
            }
        });
        res(r);
    });

    var ans = await Promise.all(sql);

    var c = {};
    ans.forEach(cm =>{
        if(cm == undefined)return;
        c[cm.control_message_id] = {
            not_data:cm.not_data,
            per_flag:cm.per_flag,
            is_prod:cm.is_prod,
            channelsData:cm.channelsData
        }
    })
    return c;
}

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
    return await Promise.resolve(sql);

}


async function updateStatus3TO4(CM_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`CALL update_cm_status_3_to_4 (?)`,CM_id,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
        console.log("control_message "+CM_id+" updated");
    });
    return await Promise.resolve(sql);
}


async function updateMLISentAt(notification_id){
    const sql = await new Promise((res,rej)=>{
        con.query("CALL update_mli_sent_at (?);",notification_id ,(err,row)=>{
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
        con.query(`SELECT title, body ,url_push, img_push, url_type, status,silent,channel
                    FROM control_message
                    WHERE id_control_message = ${control_message_id}`,(err,row)=>{
                        if(err) throw err;
                        const n = row[0];
                        const pf = setPerFlagOptmized(n.title,n.body); 
                        res({not_data:n,
                             pf
                        });
        })
    });
    var r = await Promise.resolve(sql);
    console.log("Notification data successfully selected from database");
    return r;
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
                    mli.message_status_id = 0 
                    LIMIT 499`,async (err,row)=>{
                        if(err) throw err;
                            if(row.length <= 1){
                                console.log("["+row.length+"]  messages available yet... Selecting from MLI again after 10 seconds.");
                                await new Promise(resolve => setTimeout(resolve, 10000));
                                const r = await selectFromMLI();
                                res(r)
                            }else{
                                console.log("["+getDateTime()+"] --- Succesfully selected ["+row.length+"] messages from Message_log_insert table ---");
                                res(row);
                            }
        })
    });
    return await Promise.resolve(sql);
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
            end_point: "",
            type:not_data.channel
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
    return new Date().toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo'
    })
};

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


function isLast(v3messages,key)
{
    if (Object.is(v3messages.length -1,key)) {
        let recall  =  axios.post('http://'+ip.address()+':8080'+'/api/expandWorker/v33/');
        console.log('-------------------------[Calling The EW AGAIN..]------------------------------------------');
        console.info('                      http://'+ip.address()+':8080/api/expandWorker/v33/         ');
        console.log('-------------------------------------------------------------------------------------------');
    }
}
 async function  noData(res) {
     if (res.length === 0) {
         await new Promise(resolve => setTimeout(resolve, 10000));
        console.log('-------------------------[ [' + res.length + '] messages found.. Calling EW again..]------------');
            await axios.post('http://' + ip.address() + ':8080' + '/api/expandWorker/v33/');
 }
}


module.exports = router;