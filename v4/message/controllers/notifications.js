const axios = require('axios').default;
const apn = require('apn');
const https = require('https');
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

exports.send = (req,res,next) =>{

};
exports.send2Fcm = (req,res,next) => {
    let newBody ;
    let newTitle ;
    let p_id  = req.body.sendPushRequest.control_message.notid;
    let p_subscriber_id  = req.body.sendPushRequest.subscriber.subscriber_id;
    let p_platform_id  = 1;
    let p_status_id  = "";
    let p_status_details  = "";
    let p_sent_at  = "";
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

    let request =   { to:req.body.sendPushRequest.subscriber.registration,
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
        //console.log(req.body.sendPushRequest.subscriber.registration);
    axios.defaults.headers = {
        'Content-Type': 'application/json',
        Authorization: "key= "+req.body.sendPushRequest.app.fcm.google_api_key
    };
     axios.post('https://fcm.googleapis.com/fcm/send',
         message
     )
      .then(function (response) {

          if(response.data.success===1)
          {    p_status_id = response.data.success;
              p_status_details="Mensagem entregue ao provedor FCM com sucesso.";
              saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
              //saveResponse2DB(status_id,message_status);
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
              saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
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
                  saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
                  res.status(200).json({
                      SendPushResponse:{
                          status_details:response.data.results[0]["error"],
                          status_id : p_status_id
                      }
                  });
          }
                })
      .catch(function (err) {
          p_status_id = '99';

          if(err.message === "Request failed with status code 401")
          {
              p_status_details="Request failed with status code 401 , Verify the FCM API key.";
              saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
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
              saveResponse2DB(p_id,p_subscriber_id,newTitle,newBody,p_platform_id,p_status_id,p_status_details,p_control_message_id);
              res.status(200).json({
                  SendPushRespnse:{
                      Error:err.message,
                      Details:err.stack,
                      Reason:p_status_details,
                      status_id:p_status_id
                  }
              });
          }
          //console.log("log before saving :" + p_control_message_id);


        //console.log(err.data);


      });
    };

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

exports.send2APNS = (req,res,next) => {
    let baseUrl = "https://app.inngage.com.br/resources/uploads/certificates_pem/";
   // let deviceToken = "25327d23d4c23a1b09199bc079fc72be3b2baa14fbc377963a5638dff0eca0ef";
    let deviceToken = "789ea8e1e3d0398506773e99d0abeabb8292a87204a21d7461508411b4862a56";
    //console.log(__dirname);
    //let kk = __dirname+'/key.pem';
    let kk = __dirname+'/icarros_key.pem';
   // let ff = __dirname+'/inngage_apns.pem';
    let ff = __dirname+'/icarros.pem';
    const i = axios.create({

        httpsAgent: new https.Agent({
            cert: ff,
            key: kk,
            passphrase: 'icarros123',
            rejectUnauthorized: false
        })
    });


    // const options = {
    //     cert:ff,
    //     key:kk,
    //    // passphrase:"t0k3nl@b",
    //     passphrase:"icarros123",
    //     production: true
    // };

    // let apnProvider = new apn.Provider(options);
    // //const deviceTokens = req.body.deviceTokens;
    //
    // let notification = new apn.Notification({
    //
    //     //topic: 'com.nostrostudio.bodytech',
    //     //topic: 'br.com.icarros',
    //     //apns_id:"2568962fgfdfg",
    //
    //     aps:{
    //         alert: {
    //             title: 'Eaiii Leticia',
    //             body: 'Click me Please :/ '
    //         },
    //         "mutable-content":1,
    //         sound:"default",
    //         provider:"inngage",
    //         badge:1,
    //         url:"https://youtube.com/",
    //         category:"br.com.inngage.Custom-Notification-Interface.notification",
    //         otherCustomURL:"https://www.testufo.com/images/testufo-banner.png",
    //         topic: 'br.com.icarros'
    //     }
    //
    //
    //
    //
    //
    // });
    //
    // apnProvider.send(notification, deviceToken).then(response => {
    //     if(!isEmpty(response.sent))
    //     {
    //         res.status(200).json({
    //
    //             SendPushResponse:response.sent,
    //             request : notification
    //
    //
    //         });
    //         apnProvider.shutdown();
    //     }
    //     else {
    //             res.status(500).json({
    //
    //             SendPushResponse:response.failed
    //
    //             });
    //     }
    //         apnProvider.shutdown();
    //
    // });


    i.defaults.headers = {
        'Content-Type': 'application/json',
        //Authorization: 'key = AIzaSyDfrO8W79ZfftYanTffpc2BTxvyydpIlBo'
        //Authorization: req.headers.authorization,
        "apns-topic": "br.com.icarros"
    };
    i.post('https://api.push.apple.com/3/device/789ea8e1e3d0398506773e99d0abeabb8292a87204a21d7461508411b4862a56',
        {
            aps:{
                alert:{
                    body:"body",
                    title:"title"
                },
                "mutable-content" : 1,
                sound:"default",
                provider:"inngage",
                id:"messageID",
                badge:1,
                url:"url",
                inngage_data:"",
                category:"br.com.inngage.Custom-Notification-Interface.notification",
                otherCustomURL:"ImageURL"
            }

                }
    )
        .then(function (response) {
            res.status(200).json({
                SendPushResponse:response

            });
        })
        .catch(function (err) {
            res.status(200).json({
                err
                });
            //console.log(err.data);
            //console.log(err);

        });

}

let saveResponse2DB = (p_id,p_subscriber_id,p_title,p_body,p_platform_id,p_status_id,p_message_status,p_control_message_id) =>{
    // console.log(p_id);
    // console.log(p_subscriber_id);
    // console.log(p_title);
    // console.log(p_body);
    // console.log(p_platform_id);
    // console.log(p_status_id);
    // console.log(p_message_status);
    // console.log(getDateTime());
     //console.log("log inside :"+p_control_message_id);
    let sent_at = getDateTime();
    if(p_status_id ==="1"){
        con.getConnection(function (err,connect) {
            //if(err) throw err ;$
            con.query(`INSERT INTO message_responses_v4 (id, subscriber_id, msg_title, msg_body, platform_id, status_id, status_details, sent_at, control_message_id) VALUES (${p_id}, ${p_subscriber_id}, "${p_title}", "${p_body}",${p_platform_id}, ${p_status_id}, "${p_message_status}", "${sent_at}", ${p_control_message_id});`,(err0,result)=>{
                //console.log(res0);
                if (err0) throw err0;
                console.log('rows inserted: ',  result.affectedRows);
            });
            console.log("connected !!!!");
        });
    }
    else if(p_status_id ==="3" && p_message_status ==="NotRegistered"){
        con.getConnection(function (err,connect) {
            //if(err) throw err ;$
            con.query(`INSERT INTO message_responses_v4 (id, subscriber_id, msg_title, msg_body, platform_id, status_id, status_details, sent_at, control_message_id) VALUES (${p_id}, ${p_subscriber_id}, "${p_title}", "${p_body}",${p_platform_id}, ${p_status_id}, "${p_message_status}", "${sent_at}", ${p_control_message_id});`,(err0,result)=>{
                //console.log(res0);
                if (err0) throw err0;
                console.log('rows inserted: ',  result.affectedRows);
            });
            con.query(`UPDATE subscriber SET cloud_status = 1,uninstall_date = "${sent_at}" WHERE id = ${p_subscriber_id};`,(err0,result)=>{
                //console.log(res0);
                if (err0) throw err0;
                console.log('rows updated: ',  result.affectedRows);
            });

        });
    }
    else if(p_status_id ==="3" && p_message_status ==="MismatchSenderId")
            {
                con.getConnection(function (err,connect) {
                    //if(err) throw err ;$
                    con.query(`INSERT INTO message_responses_v4 (id, subscriber_id, msg_title, msg_body, platform_id, status_id, status_details, sent_at, control_message_id) VALUES (${p_id}, ${p_subscriber_id}, "${p_title}", "${p_body}",${p_platform_id}, ${p_status_id}, "${p_message_status}", "${sent_at}", ${p_control_message_id});`,(err0,result)=>{
                        //console.log(res0);
                        if (err0) throw err0;
                        console.log('rows inserted: ',  result.affectedRows);
                    });
                });
            }
    else
        {
        con.getConnection(function (err,connect) {
            //if(err) throw err ;$
            con.query(`INSERT INTO message_responses_v4 (id, subscriber_id, msg_title, msg_body, platform_id, status_id, status_details, sent_at, control_message_id) VALUES (${p_id}, ${p_subscriber_id}, "${p_title}", "${p_body}",${p_platform_id}, ${p_status_id}, "${p_message_status}", "${sent_at}",${p_control_message_id});`,(err0,result)=>{
                //console.log(res0);
                if (err0) throw err0;
                console.log('rows inserted: ',  result.affectedRows);
            });
        });
    }


};

let send2FCM  =() => {};
let send2FcmFirebaseiOS =() => {};
let send2ApnsDev =() => {};
let send2ApnsProd =() => {};
let send2iCarros =() => {};