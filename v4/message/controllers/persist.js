const express = require('express');
const axios = require('axios');
const router = express.Router();
var con = require('../connection/DBconnection');

router.post('/persist',async (req,res,next)=>{

    let sent_in = getDateTime();
    let appToken = req.body.appToken;
    let msgType=req.body.msgType;
    let msgTitle=req.body.msgTitle;
    let msgBody=req.body.msgBody;
    let campaign=req.body.campaignId;
    let msgUrl=req.body.msgUrl;
    let typeUrl=req.body.typeUrl;
    let imgUrl=req.body.imgUrl;
    let status=req.body.status;
    let identifierList = req.body.identifier;
    con.getConnection(async function (err,connect) {
        //if(err) throw err ;$
        console.log("connected !!");
        var appId= await getAppIdByToken(appToken);
        var control_message_id = await saveControlMessage(sent_in,appId,msgType,msgTitle,msgBody,campaign,msgUrl,typeUrl,imgUrl,status);
        
        var resps = []
        var identifiersInfo = []
        
        identifiersInfo = await identifierList.map(async indentif =>{
            
            const ids = await getIds(indentif,appId);
            console.log("ids do "+indentif+ " : *"+ids+"*")
            if(ids != null && ids != ""){

                subInfo = await ids.map(async subId =>{
                    console.log("Entrou no subscriber de ID = "+subId)
                    const noti_id = await saveMLI(subId,control_message_id);
                    const ewRes = await sendToEW(control_message_id,noti_id,subId,appId);
                    return({
                        statusCode: ewRes.statusCode,
                        statusDescription: ewRes.statusDescription,
                        noti_id:noti_id,
                    })

                })
                const subInfoResponse = await Promise.all(subInfo);
                for(j=0;j<subInfoResponse.length;++j){
                    resps.push(subInfoResponse[j]);
                }
            }else{
                var fails = [indentif];
                var failInfo = fails.map(async identifier =>{
                    var f = await saveFail(control_message_id,identifier);
                    return({
                        statusCode: "0",
                        statusDescription: "Identifier inválido... Envio de Push falhou",
                        identifier:identifier,
                        message_log_fail_id:f
                    })
                })
                const failInfoResponse = await Promise.all(failInfo);
                for(j=0;j<failInfoResponse.length;++j){
                    resps.push(failInfoResponse[j]);
                }
            }
        })

        var identifiersInfoResponse = await Promise.all(identifiersInfo);

        console.log("FINAL RESPS")
        console.log(resps)
        

        res.status(200).json({
            SendPushResponse:resps
        })
    })

})



async function prepareIdentifiers(identifierList,appId){
    var identifs = []
    var l = []
    identifs = await identifierList.map(async id =>{
        var aux = await getIds(id,appId);
        
        return aux;
    })
    const response = await Promise.all(identifs);
    for(i=0;i<response.length;++i){
        for(j=0;j<response[i].length;++j){
            l.push(response[i][j]);
        }
    }
    return l;
}

async function getIds(id,appId){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT id FROM subscriber WHERE identifier = "${id}" AND app_id = ${appId};`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var res = await Promise.all(sql);
    var l = [];
    for(i=0;i<sql.length;++i){
        l.push(sql[i].id)
    }
    return l;
}

async function getAppIdByToken(appToken){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT id from app where token = "${appToken}"`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var res = await Promise.all(sql);
    return sql[0].id;
}

async function saveControlMessage(sent_in,appId,msgType,msgTitle,msgBody,campaign,msgUrl,typeUrl,imgUrl,status){
    const sql = await new Promise((res,rej)=>{
        con.query(`INSERT INTO control_message (sent_in, app_id, message_type_id, title,body, campaign_id, url_push, url_type, img_push, status) VALUES ("${sent_in}","${appId}", "${msgType}", "${msgTitle}", "${msgBody}", "${campaign}", "${msgUrl}", "${typeUrl}", "${imgUrl}", "${status}")`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var res = await Promise.resolve(sql);
    return res.insertId;
}

async function saveMLI(subId,cm_id){
    const sql = await new Promise((res,rej)=>{
        con.query(`INSERT INTO message_log_insert (subscriber_id,created_in,platform_id,message_status_id,scheduled_to,sent_in,control_message_id,fl_opened,opened_in) values (${subId},"0000-00-00 00:00:00",null,9,null,null,${cm_id},0,null)`,async (err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    
    const resp = await Promise.resolve(sql);
    return sql.insertId;
}

async function saveFail(control_message_id,identifier){
    const sql = await new Promise((res,rej)=>{
        con.query(`INSERT INTO message_log_failure (control_message_id,subscriber_identifier,status) values (${control_message_id},"${identifier}",0)`,async (err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    
    const resp = await Promise.resolve(sql);
    return sql.insertId;
}

async function sendToEW(control_message_id,notId,subId,appId){
    
    const sql = await new Promise((res,rej)=>{
        axios.defaults.headers = {
            'Content-Type': 'application/json'
        };
        var retu = axios.post('http://ec2-54-146-3-28.compute-1.amazonaws.com:8080/api/expandWorker/v1',
        {
            control_message_id: control_message_id,
            notification_id:notId,
            subscriber_id:subId,
            app_id:appId
        })
        res(retu)
    });

    const resposta = await Promise.resolve(sql);
    return{
        statusDescription: resposta.data.SendPushResponse.SendPushResponse.status_details,
        statusCode: resposta.status == 200 ? "1":"0"
    };
}


let getDateTime = () =>{
    var today = new Date();
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    return dateTime
};




module.exports = router;