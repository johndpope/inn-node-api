const express = require('express');
const axios = require('axios');
const router = express.Router();
var con = require('../connection/DBconnection');

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

        let app_config,not_data,user_data,user_customfields;

        con.query(`SELECT ac.class_name, ac.apns_topic,ac.sandbox_cert_pass,ac.sandbox_cert_name,ac.sandbox_cert_file,ac.production_cert_pass, ac.production_cert_file, ac.package_name, ac.production_cert_name, ac.firebase_ios, ac.google_api_key, s.platform_id, s.registration from subscriber s join  app_config ac on s.app_id = ac.app_id where s.id = ${subscriber_id} and ac.app_id = ${app_id};`, (err,res)=>{
            if(err) throw err;
            app_config = res[0];
            user_data = res[0];

            con.query(`SELECT title, body ,url_push, img_push, url_type, status
            FROM control_message
            WHERE id_control_message = ${control_message_id}`, (err2,res2)=>{
                if(err2) throw err2;
                not_data = res2[0];
                
                con.query(`SELECT  acf.custom_field_name, scf.value 
                FROM subscriber_customfield scf JOIN app_customfield acf ON acf.custom_field_id = scf.app_custom_field_id 
                WHERE subscriber_id = ${subscriber_id};`,(err4,res4)=>{
                    if(err) throw err;
                    user_customfields = res4;
                    
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

                                        var is_prod = await getIsProd(app_id);

                                        var per_flag = 0;
                                        if(res6.length > 0)per_flag = 1;

                                        per_flag = JSON.stringify(per_flag);
                                        var sendPushRequest2 = {
                                                            control_message: {
                                                                                            control_message_id: control_message_id,
                                                                                            title :not_data.title,
                                                                                            body :not_data.body,
                                                                                            message: not_data.body,
                                                                                            url: not_data.url_push != null ? not_data.url_push : "",
                                                                                            image_url: not_data.img_url != null ? not_data.img_url : "",
                                                                                            url_type: not_data.url_type != null ? not_data.url_type : "",
                                                                                            notid: notification_id,
                                                                                            personalised_flag: per_flag
                                                },
                                                            channel: {
                                                                                            provider_id: "",
                                                                                            end_point: ""
                                                },
                                                            app: {
                                                                                            app_id: app_id,
                                                                                            apple_token_url: app_config.sandbox_cert_file != null ? app_config.sandbox_cert_file : "", 
                                                                                            apple_token_pass: app_config.production_cert_pass != null ? app_config.production_cert_pass : "",
                                                                                            apple_key: "", // nao lembro oque seria isso
                                                                                            fcm_key: app_config.google_api_key
                                                },
                                                            subscriber: {
                                                                                            subscriber_id: subscriber_id,
                                                                                            registration: user_data.registration,
                                                                                            phone: ""
                                                },
                                                            custom_fields
                                                ,
                                                            events
                                            };

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
                                                    personalised_flag: per_flag
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
                                            
                                            await updateStatus3TO4(control_message_id);
                                            console.log("json = %j",sendPushRequest);
                                        axios.defaults.headers = {
                                            'Content-Type': 'application/json'
                                        };
                                        console.log("Sending to Dispatcher...");
                                        axios.post('http://ec2-54-146-3-28.compute-1.amazonaws.com:8080/api/message',
                                            {sendPushRequest}
                                        )
                                        .then(response => {
                                                    
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
   
    con.getConnection(async function(err99,connection){
        if(err99) throw err99;
        console.log("connected!");

        axios.defaults.headers = {
            'Content-Type': 'application/json'
        };
        console.log("started v3");
        const ff = await new Promise(async (res70,rej) => {
            con.query("SELECT mli.id AS notification_id,mli.subscriber_id,mli.control_message_id,cm.app_id FROM message_log_insert mli JOIN control_message cm ON mli.control_message_id = cm.id_control_message WHERE cm.status = 3 OR cm.status = 4 AND  mli.message_status_id = 0 LIMIT 4999",async (err0,res0)=>{

                if(err0) throw err0;
                var l =[];
                Object.keys(res0).forEach(async function(key){
                    l.push(res0[key].notification_id);
                });
                if(l.length == 0){
                    return ress.status(200).json({
                        SendPushResponse: "There are no messages available to be sent"
                    })
                }
                await updateStatus0TO1All(l);
                const rf = await new Promise((res80,rej) => {
                    var rList = []
                    Object.keys(res0).forEach(async function(key,idx,array){
                        var row = res0[key];
                        // const app_id= "161";
                        const app_id= row.app_id;
                        const control_message_id = row.control_message_id;
                        const notification_id = row.notification_id;
                        // const subscriber_id = "9130114";
                        const subscriber_id = row.subscriber_id;
                        let app_config,not_data,user_data,user_customfields;
                        const resps = await new Promise((res90,rej) => {
                            con.query(`SELECT ac.class_name, ac.apns_topic,ac.sandbox_cert_pass,ac.sandbox_cert_name,ac.sandbox_cert_file,ac.production_cert_pass, ac.production_cert_file, ac.package_name, ac.production_cert_name, ac.firebase_ios, ac.google_api_key, s.platform_id, s.registration from subscriber s join  app_config ac on s.app_id = ac.app_id where s.id = ${subscriber_id} and ac.app_id = ${app_id};`, (err,res)=>{
                                if(err) throw err;
                                app_config = res[0];
                                con.query(`SELECT title, body ,url_push, img_push, url_type, status
                                FROM control_message
                                WHERE id_control_message = ${control_message_id}`, (err2,res2)=>{
                                    if(err2) throw err2;
                                    not_data = res2[0];
                                    user_data = res[0];
                                    con.query(`SELECT  acf.custom_field_name, scf.value 
                                    FROM subscriber_customfield scf JOIN app_customfield acf ON acf.custom_field_id = scf.app_custom_field_id 
                                    WHERE subscriber_id = ${subscriber_id};`,(err4,res4)=>{
                                        if(err) throw err;
                                        user_customfields = res4;
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
                                                    AND ae.is_active = 1;`,(err5,res5)=>{
                                                        if(err5) throw err5;
                                                        var events = {};
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
                                                                    personalised_flag: per_flag
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
                                                            
                                                             await updateStatus3TO4(control_message_id);
                                                             console.log("json = %j ",sendPushRequest);
                                                            console.log("sending message to dispatcher....");
                                                            var z = await axios.post('https://inn-api-new.herokuapp.com/api/message',
                                                            {sendPushRequest}
                                                            )
                                                            .then(async response => {
                                                                    return  response.data;
                                                            })
                                                            .catch( er => {
                                                                console.log(er.SendPushResponse);
                                                                return  er.SendPushResponse;
                                                            });
                                                            res90(z)
                                                        });
                                        });
                                    });
                                });
                            })
                        })
                        rList.push(resps);
                        if(idx == array.length - 1)
                            res80(rList)
                    });
                })
                await updateStatus1TO9All(l);
                res70(rf)
            })
        })
        console.log("ending connection");
        connection.release();
        console.log("finished v3");
        ress.status(200).json({
            SendPushResponse:"Messages sent successfullly",
            responses:ff
        });
    })


})

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
        con.query(`UPDATE message_log_insert set message_status_id = 1 where message_status_id = 0 AND id = ${not_id}`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("message_log_insert "+not_id+" updated from 0 to 1");
    var r = Promise.resolve(sql);
}

async function updateStatus1TO9(not_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`UPDATE message_log_insert set message_status_id = 9 where message_status_id = 1 AND id = ${not_id}`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("message_log_insert "+not_id+" updated from 1 to 9");
    var r = Promise.resolve(sql);
}


async function updateStatus3TO4(CM_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`UPDATE control_message set status = 4 where status = 3 AND id_control_message = ${CM_id}`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("control_message "+CM_id+" updated");
    var r = Promise.resolve(sql);
}

async function updateStatus0TO1All(list){
    const sql = await new Promise((res,rej)=>{
        con.query(`UPDATE message_log_insert set message_status_id = 1 where message_status_id = 0 AND id IN (${list})`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("UPDATED STATUS TO 1 OF "+list);
    var r = Promise.resolve(sql);
}

async function updateStatus1TO9All(list){
    const sql = await new Promise((res,rej)=>{
        con.query(`UPDATE message_log_insert set message_status_id = 9 where message_status_id = 1 AND id IN (${list})`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    console.log("UPDATED STATUS TO 9 OF "+list);
    var r = Promise.resolve(sql);
}
module.exports = router;