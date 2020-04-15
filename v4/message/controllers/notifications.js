const axios = require('axios').default;
const apn = require('apn');
const https = require('https');
const fs = require('fs');

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

exports.send2Fcm = (req,res,next) => {
    let newBody ;
    let newTitle ;

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
                res.status(200).json({
                    SendPushResponse:response.data
                    });
                })
      .catch(function (err) {
         res.status(200).json({
             err
             });
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


