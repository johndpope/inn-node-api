const axios = require('axios').default;
const apn = require('apn');
const http = require('https');
const fs = require('fs');
const con = require('../connection/DBconnection');

let isEmpty = (val) => {
    let typeOfVal = typeof val;
    switch(typeOfVal){
        case 'object':
            return (val.length === 0) || !Object.keys(val).length;
            break;
        case 'string':
            let str = val.trim();
            return str === '' || str === undefined;
            break;
        case 'number':
            return val === '';
            break;
        default:
            return val === '' || val === undefined;
    }
};
let getDateTime = () =>{
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();

    var dateTime = date+' '+time;
    return dateTime
};
let rep = 0 ;
exports.send = async (req,res,next) =>{
        console.log("Notification N° :"+rep);
   let platform_id= req.body.sendPushRequest.subscriber.platform_id;
    let firebase_ios = req.body.sendPushRequest.app.firebase_ios;
    let app_id = req.body.sendPushRequest.app.app_id;

    //if the app is in production
    let is_production =req.body.sendPushRequest.app.production;
    let apns_topic = req.body.sendPushRequest.app.apns.apns_topic;

        switch (true)
        {
            case ((firebase_ios==="1") && (platform_id === "1")) :
                send2FcmFirebaseiOS(req,res);
                break;

                    case  ((firebase_ios==="0") && (platform_id === "1")) :
                         send2FCM(req,res);
                        break;

                            case ((firebase_ios==="1") && (platform_id === "1") && (app_id==="213")):
                                 send2iCarros(req,res);
                                break;

                            case ((firebase_ios==="1") && (platform_id === "2")):
                                  send2FcmFirebaseiOS(req,res);
                                break;

                    case ((firebase_ios==="0") && (platform_id === "2") && (is_production==="1")):
                          await send2ApnsProd(req,res,apns_topic);
                        break;

            case ((firebase_ios==="0") && (platform_id === "2") && (is_production==="0")):
                await  send2ApnsDev(req,res,apns_topic);
                break;

        }

};
// exports.send2Fcm = (req,res,next) => {
//     let newBody ;
//     let newTitle ;
//     let p_id  = req.body.sendPushRequest.control_message.notid;
//     let p_subscriber_id  = req.body.sendPushRequest.subscriber.subscriber_id;
//     let p_platform_id  = 1;
//     let p_status_id  = "";
//     let p_status_details  = "";
//     let p_sent_at  = "";
//     let p_control_message_id = req.body.sendPushRequest.control_message.control_message_id;
//     if (!req.res.locals.customizedBody)
//     {
//         newTitle = req.body.sendPushRequest.control_message.title;
//         newBody = req.body.sendPushRequest.control_message.body;
//     }
//     else
//     {
//         newTitle = req.res.locals.customizedTitle;
//         newBody = req.res.locals.customizedBody;
//     }
//
//     let request =   { to:req.body.sendPushRequest.subscriber.registration,
//         priority:"high",
//         data:{
//         provider:"inngage",
//             title: newTitle,
//             body:newBody,
//             message:newBody,
//             id:req.body.sendPushRequest.control_message.notid,
//             notId:req.body.sendPushRequest.control_message.notid,
//             act_class:req.body.sendPushRequest.app.fcm.class_name,
//             act_pkg:req.body.sendPushRequest.app.fcm.package_name,
//             url:req.body.sendPushRequest.control_message.url,
//             style:"picture",
//             summaryText:newBody,
//             image:req.body.sendPushRequest.control_message.image_url,
//             inngage_data:""
//     },
//     notification:{
//         provider:"inngage",
//             title: newTitle,
//             body:newBody,
//             message:newBody,
//             id:req.body.sendPushRequest.control_message.notid,
//             notId:req.body.sendPushRequest.control_message.notid,
//             act_class:req.body.sendPushRequest.app.fcm.class_name,
//             act_pkg:req.body.sendPushRequest.app.fcm.package_name,
//             url:req.body.sendPushRequest.control_message.url,
//             style:"picture",
//             summaryText:newBody,
//             image:req.body.sendPushRequest.control_message.image_url,
//             inngage_data:""
//     }
//     };
//     let message = JSON.stringify(request);
//         //console.log(req.body.sendPushRequest.subscriber.registration);
//     axios.defaults.headers = {
//         'Content-Type': 'application/json',
//         Authorization: "key= "+req.body.sendPushRequest.app.fcm.google_api_key
//     };
//      axios.post('https://fcm.googleapis.com/fcm/send',
//          message
//      )
//       .then(function (response) {
//
//           if(response.data.success===1)
//           {    p_status_id = response.data.success;
//               p_status_details="Mensagem entregue ao provedor FCM com sucesso.";
//               saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
//               //saveResponse2DB(status_id,message_status);
//               res.status(200).json({
//                   SendPushResponse:{
//                       //success : response.data,
//                       //failure : response.data.failure,
//                       status_details:p_status_details
//                   }
//
//
//               });
//
//           } else if (response.data.failure===1 && (response.data.results[0]["error"] ==="NotRegistered" || response.data.results[0]["error"] ==="MismatchSenderId"  )){
//               p_status_id = '3';
//               p_status_details=response.data.results[0]["error"];
//               saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
//               res.status(200).json({
//                   SendPushResponse:{
//
//                       status_details:response.data.results[0]["error"],
//                       status_id : p_status_id
//                   }
//               });
//
//           } else if (response.data.failure===1 && (response.data.results[0]["error"] !=="NotRegistered" || response.data.results[0]["error"] !=="MismatchSenderId"  ))
//               {
//                   p_status_id = '9';
//                   p_status_details=response.data.results[0]["error"];
//                   saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
//                   res.status(200).json({
//                       SendPushResponse:{
//                           status_details:response.data.results[0]["error"],
//                           status_id : p_status_id
//                       }
//                   });
//           }
//                 })
//       .catch(function (err) {
//           p_status_id = '99';
//
//           if(err.message === "Request failed with status code 401")
//           {
//               p_status_details="Request failed with status code 401 , Verify the FCM API key.";
//               saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
//               res.status(200).json({
//                   SendPushResponse:{
//                       Error:err.message,
//                       Reason:'Verify the FCM API key.',
//                       Key:req.body.sendPushRequest.app.fcm.google_api_key,
//                       status_id:p_status_id
//                   }
//               });
//           } else
//           {
//               p_status_details=err.stack;
//               saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
//               res.status(200).json({
//                   SendPushRespnse:{
//                       Error:err.message,
//                       Details:err.stack,
//                       Reason:p_status_details,
//                       status_id:p_status_id
//                   }
//               });
//           }
//           //console.log("log before saving :" + p_control_message_id);
//
//
//         //console.log(err.data);
//
//
//       });
//     };

exports.checkCustomFields = (req,res,next) => {
    const  flag = req.body.sendPushRequest.control_message.personalised_flag ;

    const oldBody = req.body.sendPushRequest.control_message.body;
    const oldTitle = req.body.sendPushRequest.control_message.title;
    let newBody = oldBody;
    let newTitle = oldTitle;

    if (flag === "1")
    {

        var TitleObj = req.body.sendPushRequest.custom_fields;
        for( var Titlekey in TitleObj ) {
            if( TitleObj.hasOwnProperty( Titlekey ) ) {
                newTitle = newTitle.replace( Titlekey , TitleObj[ Titlekey ] );
            }
        }


        var Obj = req.body.sendPushRequest.custom_fields;
        for( var key in Obj ) {
            if( Obj.hasOwnProperty( key ) ) {
                newBody = newBody.replace( key , Obj[ key ] );
            }
        }

        res.locals.customizedTitle = newTitle;
        res.locals.customizedBody = newBody;
        next()
    }
    else
    {

        next()
    }
    
};
exports.checkEvents = (req,res,next) => {
    let newEventTitle;
    let newEventBody;


    if (!req.res.locals.customizedBody && !req.res.locals.customizedTitle)
    {
        newEventTitle = req.body.sendPushRequest.control_message.title;
        newEventBody = req.body.sendPushRequest.control_message.body;
    } else {
        newEventTitle = req.res.locals.customizedTitle;
        newEventBody = req.res.locals.customizedBody;
    }

    if (!isEmpty(req.body.sendPushRequest.events))
    {

    var TitleObj = req.body.sendPushRequest.events;
    for (var Titlekey in TitleObj) {
        if (TitleObj.hasOwnProperty(Titlekey)) {
            newEventTitle = newEventTitle.replace(Titlekey, TitleObj[Titlekey]);
        }
    }


    var Obj = req.body.sendPushRequest.events;
    for (var key in Obj) {
        if (Obj.hasOwnProperty(key)) {
            newEventBody = newEventBody.replace(key, Obj[key]);
        }
    }

    res.locals.customizedTitle = newEventTitle;
    res.locals.customizedBody = newEventBody;
    next()
}
    else {
        req.res.locals.customizedTitle = newEventTitle;
        req.res.locals.customizedBody = newEventBody ;
        next()
    }

};
exports.checkEmojis = (req,res,next) => {
    let newEmojiBody ;
    let newEmojiTitle ;

    if (!req.res.locals.customizedBody && !req.res.locals.customizedTitle )
    {
        newEmojiTitle = req.body.sendPushRequest.control_message.title;
        newEmojiBody = req.body.sendPushRequest.control_message.body;
    }
    else
    {
        newEmojiTitle = req.res.locals.customizedTitle;
        newEmojiBody = req.res.locals.customizedBody;
    }


    let emojis =  newEmojiBody.match(/:(.*?):/g);
    let titleEmojis =  newEmojiTitle.match(/:(.*?):/g);
    let stringMap = fs.readFileSync(__dirname+'/../resources/emoji-map.json','utf8');
    let jsonMap = JSON.parse(stringMap);

    if (emojis != null) {
        emojis.forEach(replaceEmojis);

        function replaceEmojis(emoji, index) {

            newEmojiBody = newEmojiBody.replace(emoji, jsonMap[emoji]);

        }
    }
    if(titleEmojis != null)
    {
        titleEmojis.forEach(replaceTitleEmojis);
        function replaceTitleEmojis(titleEmojis, index) {

            newEmojiTitle =  newEmojiTitle.replace(titleEmojis, jsonMap[titleEmojis]);

        }
    }

     req.res.locals.customizedTitle = newEmojiTitle;
    req.res.locals.customizedBody = newEmojiBody ;
    next();
};
exports.checkRequestFileds = (req,res,next) => {
    let SendPushResponse =  {};
    if (isEmpty(req.body))
        {

           // res.status(400).json({
                SendPushResponse["Request JSON"]="Empty JSON Request is Not Allowed. Check Documentation "
           // });
        }
     if(isEmpty(req.body.sendPushRequest))
        {
            //res.status(400).json({
            SendPushResponse["sendPushRequest"]= "Empty sendPushRequest  is Not Allowed. Check Documentation."

            //});
        }
     if(isEmpty(req.body.sendPushRequest.control_message))
        {
             //res.status(400).json({
            SendPushResponse["Control_message"]= "Empty Control_message Data is Not Allowed. Check Documentation.";
            //SendPushResponse.Control_message["rzeer"]="fsgdfhgs"

            //});
        }
     if(isEmpty(req.body.sendPushRequest.channel))
        {
             //res.status(400).json({
            SendPushResponse["Channel"]= "Empty Channel Data is Not Allowed. Check Documentation."

           // });
        }
     if(isEmpty(req.body.sendPushRequest.app))
    {
             //res.status(400).json({
        SendPushResponse["App"]= "Empty App Data  is Not Allowed. Check Documentation."

          //  });
    }
     if(isEmpty(req.body.sendPushRequest.subscriber))
    {
            // res.status(400).json({
        SendPushResponse["Subscriber"]="Empty subscriber Data is Not Allowed. Check Documentation."

           // });
    }
     if(isEmpty(req.body.sendPushRequest.custom_fields) && req.body.sendPushRequest.control_message.personalised_flag === "1")
    {
             //res.status(400).json({
        SendPushResponse["Custom_fields"]= "Empty Custom_fields Data while personalized_flag = 1 is Not Allowed. Check Documentation."

            //});
     }
        // else
    // {
    //     res.status(200).json({
    //         SendPushResponse:"tanana"
    //     });
    // }
    if(isEmpty(SendPushResponse))
    {
        next();
    }
    else {
        res.status(400).json({
            SendPushResponse
        });
    }


   // console.log(req.body.sendPushRequest.control_message);
    //console.log(req.body.sendPushRequest.channel);
    //console.log(req.body.sendPushRequest.app);
    //console.log(req.body.sendPushRequest.subscriber);
    //console.log(req.body.sendPushRequest.custom_field);

   //next();

    var jj = {
        sendPushRequest: {
            control_message: {
                control_message_id: '2703399',
                title: ':swimming_man:',
                body: ':swimming_man:',
                message: ':swimming_man:',
                url: 'null',
                image_url: 'undefined,',
                url_type: 'null',
                notid: '257361845',
                personalised_flag: '0'
            },
            channel: {
                provider_id: '',
                end_point: ''
            },
            app: {
                app_id: '235',
                apple_token_url: '',
                apple_token_pass: '',
                apple_key: '',
                fcm_key: 'AIzaSyA4t0N9DCISdywTlQ81DbKe3n5kTmXQgjE'
            },
            subscriber: {
                subscriber_id: '8578789',
                registration: 'czw8MZE8eRM:APA91bG3ckEYTcPP0-ThlBQFarOF3cSIPTBPJZz3GhuDJyacQzL7CRL5M9Kaw_b4oMlIxsgGADZd0IXx_fT0ufPY4y2fkS1cwYqO2cmqpcr6k6hJQ5GnyjKb_BmhM2eYoaayts6qcj6f',
                phone: ''
            },
            custom_fields: {},
            events: {}
        }
    }
};

// exports.send2APNS = (req,res,next) => {
//     let baseUrl = "https://app.inngage.com.br/resources/uploads/certificates_pem/";
//     let deviceToken = "330b5f77dbd575f9a5786465cde530c03c8ea402421e99ed8b20017604daac6c";
//     let key = __dirname+'/icarros_key.pem';
//     let cert = __dirname+'/icarros.pem';
//
//     const options = {
//         cert:cert,
//         key:cert,
//         passphrase:"icarros123",
//         production: true,
//     };
//
//     let apnProvider = new apn.Provider(options);
//     let notification = new apn.Notification({
//             alert: {
//                 title: 'Eaiii ',
//                 body: 'Click me Please :/ '
//             },
//             "mutable-content": 1,
//             sound: "default",
//             badge: 1,
//             category: "br.com.inngage.Custom-Notification-Interface.notification",
//             //topic: 'br.com.icarros',
//
//         otherCustomURL: "https://www.testufo.com/images/testufo-banner.png",
//         url: "https://youtube.com/",
//         provider: "inngage",
//         id:"",
//         inngage_data:""
//     });
//     notification.topic="br.com.icarros";
//     apnProvider.send(notification, deviceToken).then(response => {
//         if(!isEmpty(response.sent))
//         {
//             res.status(200).json({
//                 SendPushResponse:response.sent,
//                 request : notification
//             });
//             apnProvider.shutdown();
//         }
//         else {
//                 res.status(500).json({
//                 SendPushResponse:response
//                 });
//         }
//             apnProvider.shutdown();
//
//     });
//
//
// };

// let saveResponse2DB = async (p_id,p_subscriber_id,p_title,p_body,p_platform_id,p_status_id,p_message_status,p_control_message_id) =>{
//
//     let sent_at = getDateTime();
//     if(p_status_id ==="1"){
//         con.getConnection(function (err,connect) {
//             //if(err) throw err ;$
//             console.log("Entered the save Response !!!!");
//             con.query("INSERT INTO message_responses_v4 (id, subscriber_id, msg_title, msg_body, platform_id, status_id, status_details, sent_at, control_message_id) VALUES ",(p_id,p_subscriber_id,p_title,p_body,p_platform_id,p_status_id,p_message_status,p_control_message_id),(err0,result)=>{
//                 //console.log(res0);
//                 if (err0) throw err0;
//                 console.log('rows inserted: ',  result.affectedRows);
//             });
//
//         });
//     }
//     else if(p_status_id ==="3" && p_message_status ==="NotRegistered"){
//         con.getConnection(function (err,connect) {
//             //if(err) throw err ;$
//             con.query(`INSERT INTO message_responses_v4 (id, subscriber_id, msg_title, msg_body, platform_id, status_id, status_details, sent_at, control_message_id) VALUES (${p_id}, ${p_subscriber_id}, "${p_title}", "${p_body}",${p_platform_id}, ${p_status_id}, "${p_message_status}", "${sent_at}", ${p_control_message_id});`,(err0,result)=>{
//                 //console.log(res0);
//                 if (err0) throw err0;
//                 console.log('rows inserted: ',  result.affectedRows);
//             });
//             con.query(`UPDATE subscriber SET cloud_status = 1,uninstall_date = "${sent_at}" WHERE id = ${p_subscriber_id};`,(err0,result)=>{
//                 //console.log(res0);
//                 if (err0) throw err0;
//                 console.log('rows updated: ',  result.affectedRows);
//             });
//
//         });
//     }
//     else if(p_status_id ==="3" && p_message_status ==="MismatchSenderId")
//             {
//                 con.getConnection(function (err,connect) {
//                     //if(err) throw err ;$
//                     con.query(`INSERT INTO message_responses_v4 (id, subscriber_id, msg_title, msg_body, platform_id, status_id, status_details, sent_at, control_message_id) VALUES (${p_id}, ${p_subscriber_id}, "${p_title}", "${p_body}",${p_platform_id}, ${p_status_id}, "${p_message_status}", "${sent_at}", ${p_control_message_id});`,(err0,result)=>{
//                         //console.log(res0);
//                         if (err0) throw err0;
//                         console.log('rows inserted: ',  result.affectedRows);
//                     });
//                 });
//             }
//     else
//         {
//         con.getConnection(function (err,connect) {
//             //if(err) throw err ;$
//             con.query(`INSERT INTO message_responses_v4 (id, subscriber_id, msg_title, msg_body, platform_id, status_id, status_details, sent_at, control_message_id) VALUES (${p_id}, ${p_subscriber_id}, "${p_title}", "${p_body}",${p_platform_id}, ${p_status_id}, "${p_message_status}", "${sent_at}",${p_control_message_id});`,(err0,result)=>{
//                 //console.log(res0);
//                 if (err0) throw err0;
//                 console.log('rows inserted: ',  result.affectedRows);
//             });
//         });
//     }
//
//
// };

let send2FCM  =(req,res) => {
    let newBody ;
    let newTitle ;
    let p_id  = req.body.sendPushRequest.control_message.notid;
    let p_subscriber_id  = req.body.sendPushRequest.subscriber.subscriber_id;
    let p_platform_id  = 1;
    let p_status_id  = "";
    let p_status_details  = "";
    let p_control_message_id = req.body.sendPushRequest.control_message.control_message_id;


    if (!req.res.locals.customizedBody)
    {
        newTitle = req.body.sendPushRequest.control_message.title;
        newBody = req.body.sendPushRequest.control_message.body;
    }
    else
    {
        newTitle = req.res.locals.customizedTitle;
        newBody = req.res.locals.customizedBody;
    }

    let request =   {
        to:req.body.sendPushRequest.subscriber.registration,
        priority:"high",
        data:{
            provider:"inngage",
            title: newTitle,
            body:newBody,
            message:newBody,
            id:req.body.sendPushRequest.control_message.notid,
            notId:req.body.sendPushRequest.control_message.notid,
            act_class:req.body.sendPushRequest.app.fcm.class_name,
            act_pkg:req.body.sendPushRequest.app.fcm.package_name,
            url:req.body.sendPushRequest.control_message.url,
            style:"picture",
            summaryText:newBody,
            image:req.body.sendPushRequest.control_message.image_url,
            inngage_data:""
        },
        notification:{
            provider:"inngage",
            title: newTitle,
            body:newBody,
            message:newBody,
            id:req.body.sendPushRequest.control_message.notid,
            notId:req.body.sendPushRequest.control_message.notid,
            act_class:req.body.sendPushRequest.app.fcm.class_name,
            act_pkg:req.body.sendPushRequest.app.fcm.package_name,
            url:req.body.sendPushRequest.control_message.url,
            style:"picture",
            summaryText:newBody,
            image:req.body.sendPushRequest.control_message.image_url,
            inngage_data:""
        }
    };
    let message = JSON.stringify(request);

    axios.defaults.headers = {
        'Content-Type': 'application/json',
        Authorization: "key= "+req.body.sendPushRequest.app.fcm.google_api_key
    };
    axios.post('https://fcm.googleapis.com/fcm/send',
        message
    )
        .then( async function (response) {

            if(response.data.success===1)
            {    p_status_id = response.data.success;
                p_status_details="Mensagem entregue ao provedor FCM com sucesso.";
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        //success : response.data,
                        //failure : response.data.failure,
                        status_details:p_status_details
                    }
                });

            } else if (response.data.failure===1 && (response.data.results[0]["error"] ==="NotRegistered" || response.data.results[0]["error"] ==="MismatchSenderId"  )){
                p_status_id = '3';
                p_status_details=response.data.results[0]["error"];
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted '+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{

                        status_details:response.data.results[0]["error"],
                        status_id : p_status_id
                    }
                });

            } else if (response.data.failure===1 && (response.data.results[0]["error"] !=="NotRegistered" || response.data.results[0]["error"] !=="MismatchSenderId"  ))
            {
                p_status_id = '99';
                p_status_details=response.data.results[0]["error"];
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        status_details:response.data.results[0]["error"],
                        status_id : p_status_id
                    }
                });
            }
        })
        .catch( async function (err) {
            p_status_id = '99';

            if(err.message === "Request failed with status code 401")
            {
                p_status_details="Request failed with status code 401 , Verify the FCM API key.";
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        Error:err.message,
                        Reason:'Verify the FCM API key.',
                        Key:req.body.sendPushRequest.app.fcm.google_api_key,
                        status_id:p_status_id
                    }
                });
            } else
            {
                p_status_details=err.stack;
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);
                res.status(200).json({
                    SendPushRespnse:{
                        Error:err.message,
                        Details:err.stack,
                        Reason:p_status_details,
                        status_id:p_status_id
                    }
                });
            }
        });

};
let send2FcmFirebaseiOS = (req,res) => {
    let newBody ;
    let newTitle ;
    let p_id  = req.body.sendPushRequest.control_message.notid;
    let p_subscriber_id  = req.body.sendPushRequest.subscriber.subscriber_id;
    let p_platform_id  = 1;
    let p_status_id  = "";
    let p_status_details  = "";
    let p_control_message_id = req.body.sendPushRequest.control_message.control_message_id;


    if (!req.res.locals.customizedBody)
    {
        newTitle = req.body.sendPushRequest.control_message.title;
        newBody = req.body.sendPushRequest.control_message.body;
    }
    else
    {
        newTitle = req.res.locals.customizedTitle;
        newBody = req.res.locals.customizedBody;
    }

    let request =   {
        to:req.body.sendPushRequest.subscriber.registration,
        priority:"high",
        data:{
            provider:"inngage",
            title: newTitle,
            body:newBody,
            message:newBody,
            id:req.body.sendPushRequest.control_message.notid,
            notId:req.body.sendPushRequest.control_message.notid,
            act_class:req.body.sendPushRequest.app.fcm.class_name,
            act_pkg:req.body.sendPushRequest.app.fcm.package_name,
            url:req.body.sendPushRequest.control_message.url,
            style:"picture",
            summaryText:newBody,
            image:req.body.sendPushRequest.control_message.image_url,
            inngage_data:""
        },
        notification:{
            title: newTitle,
            body:newBody
        }
    };
    let message = JSON.stringify(request);

    axios.defaults.headers = {
        'Content-Type': 'application/json',
        Authorization: "key= "+req.body.sendPushRequest.app.fcm.google_api_key
    };
    axios.post('https://fcm.googleapis.com/fcm/send',
        message
    )
        .then( async function (response) {
            if(response.data.success===1)
            {    p_status_id = response.data.success;
                    p_status_details="Mensagem entregue ao provedor FCM ( Firebase IOS ) com sucesso.";
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        status_details:p_status_details,
                        sql
                    }

                });

            } else if (response.data.failure===1 && (response.data.results[0]["error"] ==="NotRegistered" || response.data.results[0]["error"] ==="MismatchSenderId"  )){
                p_status_id = '3';
                p_status_details=response.data.results[0]["error"];
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{

                        status_details:response.data.results[0]["error"],
                        status_id : p_status_id,
                        sql
                    }
                });

            } else if (response.data.failure===1 && (response.data.results[0]["error"] !=="NotRegistered" || response.data.results[0]["error"] !=="MismatchSenderId"  ))
            {
                p_status_id = '99';
                p_status_details=response.data.results[0]["error"];
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        status_details:response.data.results[0]["error"],
                        status_id : p_status_id
                    }
                });
            }
        })
        .catch(async function (err) {
            p_status_id = '99';

            if(err.message === "Request failed with status code 401")
            {
                p_status_details="Request failed with status code 401 , Verify the FCM API key.";
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        Error:err.message,
                        Reason:'Verify the FCM API key.',
                        Key:req.body.sendPushRequest.app.fcm.google_api_key,
                        status_id:p_status_id
                    }
                });
            } else
            {
                p_status_details=err.stack;
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushRespnse:{
                        Error:err.message,
                        Details:err.stack,
                        Reason:p_status_details,
                        status_id:p_status_id
                    }
                });
            }
        });
};
let send2ApnsDev  = async (req, res, apns_topic) => {

    let newBody ;
    let newTitle ;
    let p_id  = req.body.sendPushRequest.control_message.notid;
    let p_subscriber_id  = req.body.sendPushRequest.subscriber.subscriber_id;
    let p_platform_id  = 2;
    let p_status_id  = "";
    let p_status_details  = "";
    let p_control_message_id = req.body.sendPushRequest.control_message.control_message_id;


    if (!req.res.locals.customizedBody)
    {
        newTitle = req.body.sendPushRequest.control_message.title;
        newBody = req.body.sendPushRequest.control_message.body;
    }
    else
    {
        newTitle = req.res.locals.customizedTitle;
        newBody = req.res.locals.customizedBody;
    }
    // apns sandbox certificate
    let apple_sandbox_cert_file = req.body.sendPushRequest.app.apns.prod.apple_prod_cert_file;
    let apple_sandbox_cert_pass = req.body.sendPushRequest.app.apns.prod.apple_prod_cert_pass;
    let certPath = "https://app.inngage.com.br/resources/uploads/certificates_pem/" + apple_sandbox_cert_file;
    let deviceTokens = "330b5f77dbd575f9a5786465cde530c03c8ea402421e99ed8b20017604daac6c";
    let deviceToken = req.body.sendPushRequest.subscriber.registration;

    if ((isEmpty(apple_sandbox_cert_file)) || (isEmpty(apple_sandbox_cert_pass)) || (isEmpty(apns_topic)))
    {
        p_status_details= "Certification (file or password or apns_topic)  is missing , Verify and Try Again";
        console.log("entering  empty");
        const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
        console.log('Row Inserted'+sql.affectedRows);

        res.status(200).json({
            SendPushResponse:{
                status_details:p_status_details,
                status_id : "99"
            }
        });
    }
    else if (!isEmpty(apple_sandbox_cert_file) && !isEmpty(apple_sandbox_cert_pass) && !(isEmpty(apns_topic))) {
        console.log("entering not empty");

        const certificateRequest = await new Promise((result, rej) => {
            http.get(certPath, (res) => {
                res.setEncoding('utf8');
                res.on('data', function (body) {
                    result(body) ;
                });
            });
        });
        const certificate = await  Promise.resolve(certificateRequest);
        const options = {
            cert: certificate,
            key: certificate,
            passphrase: apple_prod_cert_pass,
            production: true,
        };

        let apnProvider = new apn.Provider(options);
        let notification = new apn.Notification();
        notification.rawPayload = {
            aps: {
                alert: {
                    title: newTitle,
                    body: newBody
                },
                "mutable-content":true,
                sound: "default",
                badge: 1,
                category: "br.com.inngage.Custom-Notification-Interface.notification",
                otherCustomURL:req.body.sendPushRequest.control_message.image_url ,
                url: req.body.sendPushRequest.control_message.url,
                provider: "inngage",
                id:req.body.sendPushRequest.control_message.notid ,
                inngage_data: ""
            }
        };
        notification.topic = apns_topic;
        notification.image=req.body.sendPushRequest.control_message.image_url;
        notification.urlArgs=req.body.sendPushRequest.control_message.url;
        apnProvider.send(notification, deviceToken).then(  async response => {
            if (!isEmpty(response.sent) && (response.sent[0].device === deviceToken) ) {
                p_status_id = "1";
                p_status_details="Mensagem entregue ao provedor APNS com sucesso.";
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        status_id : p_status_id,
                        status_details:p_status_details
                    }
                });
                apnProvider.shutdown();
            }
            else if (!isEmpty(response.failed[0].response)  && (response.failed[0].status!=="200") )
            {
                p_status_id = '3';
                let responseStatus = response.failed[0].status;
                p_status_details= response.failed[0].response.reason;

                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        responseStatus,
                        status_details:p_status_details,
                        status_id : p_status_id
                    }
                });
                apnProvider.shutdown();
            }
            else  if (!isEmpty(response.failed[0].error))
            {
                p_status_id = '99';
                let responseStatus = response.failed[0].error.jse_shortmsg;
                p_status_details= response.failed[0].error.message;

                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        responseStatus,
                        status_details:p_status_details,
                        status_id : p_status_id
                    }
                });
                apnProvider.shutdown();
            } else {
                p_status_id = '99';
                let responseStatus = response;
                p_status_details= response;

                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        responseStatus,
                        status_details:p_status_details,
                        status_id : p_status_id
                    }
                });
                apnProvider.shutdown();
            }
        }).catch( async function (err) {
            p_status_id = '99';
            p_status_details= err;

            const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
            console.log('Row Inserted'+sql.affectedRows);

            res.status(200).json({
                SendPushResponse:{
                    status_details:p_status_details,
                    status_id : p_status_id
                }
            });
            apnProvider.shutdown();
        });
    }
};
let send2ApnsProd = async (req,res,apns_topic) => {
    let newBody ;
    let newTitle ;
    let p_id  = req.body.sendPushRequest.control_message.notid;
    let p_subscriber_id  = req.body.sendPushRequest.subscriber.subscriber_id;
    let p_platform_id  = 2;
    let p_status_id  = "";
    let p_status_details  = "";
    let p_control_message_id = req.body.sendPushRequest.control_message.control_message_id;


    if (!req.res.locals.customizedBody)
    {
        newTitle = req.body.sendPushRequest.control_message.title;
        newBody = req.body.sendPushRequest.control_message.body;
    }
    else
    {
        newTitle = req.res.locals.customizedTitle;
        newBody = req.res.locals.customizedBody;
    }

    // apns prod certificates

    let  apple_prod_cert_file = req.body.sendPushRequest.app.apns.prod.apple_prod_cert_file;
    let  apple_prod_cert_pass = req.body.sendPushRequest.app.apns.prod.apple_prod_cert_pass;
    let certPath = "https://app.inngage.com.br/resources/uploads/certificates_pem/" + apple_prod_cert_file;
    let deviceTokens = "330b5f77dbd575f9a5786465cde530c03c8ea402421e99ed8b20017604daac6c";
    let deviceToken = req.body.sendPushRequest.subscriber.registration;

    if ((isEmpty(apple_prod_cert_file)) || (isEmpty(apple_prod_cert_pass)) || (isEmpty(apns_topic)))
    {
        p_status_details= "Certification (file or password or apns_topic)  is missing , Verify and Try Again";
        console.log("entering  empty");
        const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
        console.log('Row Inserted'+sql.affectedRows);

        res.status(200).json({
            SendPushResponse:{
                status_details:p_status_details,
                status_id : "99"
            }
        });
    }
    else if (!isEmpty(apple_prod_cert_file) && !isEmpty(apple_prod_cert_pass) && !(isEmpty(apns_topic))) {
        console.log("entering not empty");

    const certificateRequest = await new Promise((result, rej) => {
        http.get(certPath, (res) => {
            res.setEncoding('utf8');
            res.on('data', function (body) {
                result(body) ;
            });
        });
    });
    const certificate = await  Promise.resolve(certificateRequest);
    const options = {
        cert: certificate,
        key: certificate,
        passphrase: apple_prod_cert_pass,
        production: true,
    };

    let apnProvider = new apn.Provider(options);
    let notification = new apn.Notification();
         notification.rawPayload = {
            aps: {
                alert: {
                    title: newTitle,
                    body: newBody
                },
                "mutable-content":true,
                sound: "default",
                badge: 1,
                category: "br.com.inngage.Custom-Notification-Interface.notification",
                otherCustomURL:req.body.sendPushRequest.control_message.image_url ,
                url: req.body.sendPushRequest.control_message.url,
                provider: "inngage",
                id:req.body.sendPushRequest.control_message.notid ,
                inngage_data: ""
            }
        };
    notification.topic = apns_topic;
    notification.image=req.body.sendPushRequest.control_message.image_url;
    notification.urlArgs=req.body.sendPushRequest.control_message.url;
    apnProvider.send(notification, deviceToken).then(  async response => {
        if (!isEmpty(response.sent) && (response.sent[0].device === deviceToken) ) {
            p_status_id = "1";
            p_status_details="Mensagem entregue ao provedor APNS com sucesso.";
            const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
            console.log('Row Inserted'+sql.affectedRows);

            res.status(200).json({
                SendPushResponse:{
                    status_id : p_status_id,
                    status_details:p_status_details
                }
            });
            apnProvider.shutdown();
        }
        else if (!isEmpty(response.failed[0].response)  && (response.failed[0].status!=="200") )
            {
                p_status_id = '3';
                let responseStatus = response.failed[0].status;
                    p_status_details= response.failed[0].response.reason;

                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

            res.status(200).json({
                SendPushResponse:{
                    responseStatus,
                    status_details:p_status_details,
                    status_id : p_status_id
                }
            });
                apnProvider.shutdown();
        }
        else  if (!isEmpty(response.failed[0].error))
            {
                p_status_id = '99';
                let responseStatus = response.failed[0].error.jse_shortmsg;
                p_status_details= response.failed[0].error.message;

                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        responseStatus,
                        status_details:p_status_details,
                        status_id : p_status_id
                    }
                });
                apnProvider.shutdown();
              } else {
            p_status_id = '99';
            let responseStatus = response;
            p_status_details= response;

            const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
            console.log('Row Inserted'+sql.affectedRows);

            res.status(200).json({
                SendPushResponse:{
                    responseStatus,
                    status_details:p_status_details,
                    status_id : p_status_id
                }
            });
            apnProvider.shutdown();
        }
    }).catch( async function (err) {
        p_status_id = '99';
        p_status_details= err;

        const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
        console.log('Row Inserted'+sql.affectedRows);

        res.status(200).json({
            SendPushResponse:{
                status_details:p_status_details,
                status_id : p_status_id
            }
        });
        apnProvider.shutdown();
    });
    }
};
let send2iCarros =(req,res) => {
    let newBody ;
    let newTitle ;
    let p_id  = req.body.sendPushRequest.control_message.notid;
    let p_subscriber_id  = req.body.sendPushRequest.subscriber.subscriber_id;
    let p_platform_id  = 1;
    let p_status_id  = "";
    let p_status_details  = "";
    let p_control_message_id = req.body.sendPushRequest.control_message.control_message_id;


    if (!req.res.locals.customizedBody)
    {
        newTitle = req.body.sendPushRequest.control_message.title;
        newBody = req.body.sendPushRequest.control_message.body;
    }
    else
    {
        newTitle = req.res.locals.customizedTitle;
        newBody = req.res.locals.customizedBody;
    }

    let request =   {
        to:req.body.sendPushRequest.subscriber.registration,
        priority:"high",
        data:{
            provider:"inngage",
            title: newTitle,
            body:newBody,
            message:newBody,
            id:req.body.sendPushRequest.control_message.notid,
            notId:req.body.sendPushRequest.control_message.notid,
            act_class:req.body.sendPushRequest.app.fcm.class_name,
            act_pkg:req.body.sendPushRequest.app.fcm.package_name,
            url:req.body.sendPushRequest.control_message.url,
            style:"picture",
            summaryText:newBody,
            image:req.body.sendPushRequest.control_message.image_url,
            inngage_data:""
        }
    };
    let message = JSON.stringify(request);

    axios.defaults.headers = {
        'Content-Type':'application/json',
        Authorization: "key= "+req.body.sendPushRequest.app.fcm.google_api_key
    };
    axios.post('https://fcm.googleapis.com/fcm/send',
        message
    )
        .then( async function (response) {

            if(response.data.success===1)
            {    p_status_id = response.data.success;
                p_status_details="Mensagem entregue ao provedor FCM ( Firebase IOS ( Custom iCarros) ) com sucesso.";
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);
                res.status(200).json({
                    SendPushResponse:{
                        status_details:p_status_details
                    }


                });

            } else if (response.data.failure===1 && (response.data.results[0]["error"] ==="NotRegistered" || response.data.results[0]["error"] ==="MismatchSenderId"  )){
                p_status_id = '3';
                p_status_details=response.data.results[0]["error"];
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);
                res.status(200).json({
                    SendPushResponse:{

                        status_details:response.data.results[0]["error"],
                        status_id : p_status_id
                    }
                });

            } else if (response.data.failure===1 && (response.data.results[0]["error"] !=="NotRegistered" || response.data.results[0]["error"] !=="MismatchSenderId"  ))
            {
                p_status_id = '9';
                p_status_details=response.data.results[0]["error"];
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);
                res.status(200).json({
                    SendPushResponse:{
                        status_details:response.data.results[0]["error"],
                        status_id : p_status_id
                    }
                });
            }
        })
        .catch( async function (err) {
            p_status_id = '99';

            if(err.message === "Request failed with status code 401")
            {
                p_status_details="Request failed with status code 401 , Verify the FCM API key.";
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);

                res.status(200).json({
                    SendPushResponse:{
                        Error:err.message,
                        Reason:'Verify the FCM API key.',
                        Key:req.body.sendPushRequest.app.fcm.google_api_key,
                        status_id:p_status_id
                    }
                });
            } else
            {
                p_status_details=err.stack;
                const  sql = await  saveResponses(p_id, p_subscriber_id, newTitle, newBody, p_platform_id, p_status_id, p_status_details, p_control_message_id);
                console.log('Row Inserted'+sql.affectedRows);
                res.status(200).json({
                    SendPushRespnse:{
                        Error:err.message,
                        Details:err.stack,
                        Reason:p_status_details,
                        status_id:p_status_id
                    }
                });
            }
        });
};

function saveResponses(p_id,p_subscriber_id,p_title,p_body,p_platform_id,p_status_id,p_message_status,p_control_message_id){
    let sent_at = getDateTime();
    return new Promise((resolve,reject)=>{
        con.query('CALL add_message_response_v4 (?,?,?,?,?,?,?,?,?, @ret_code)',[p_id,p_subscriber_id,p_title,p_body,p_platform_id,p_status_id,p_message_status,sent_at,p_control_message_id],(error,response)=>{
            if(error) reject(error);
            resolve(response);
        }
        );
        rep++;
    });
};