const express = require('express');
const router = express.Router();
const numeral = require('numeral');
var con = require('../../message/connection/DBconnection');

router.post('/',async (req,res,next)=>{
    var mods = req.body["modules[]"];
    if(mods == undefined) mods = req.body.modules;
    
    const app_token = req.body.app_token;

    if(app_token == undefined)
        return res.status(200).json({
            Message: "App_Token field is undefined, please check app_token field."
        })

    if(mods == undefined)
        return res.status(200).json({
            Message: "Modules array undefined, please check modules field."
        })    
    if(mods.length == 0)
        return res.status(200).json({
            Message: "Modules array empty, please check modules field."
        })

    const id = await getAppId(app_token);
    var updatedMods = []
    updatedMods = await mods.map(async mod =>{
        if(mod==1){
            var notificationChart = await getNotificationChart(id);
            return notificationChart;
        } else if(mod == 2){
            var engagementChart = await getEngagementChart(id);
            return engagementChart;
        } else if(mod == 3){
            var retentionChart = await getRetentionChart(id);
            return retentionChart;
        } else if (mod == 4){
            var activeBaseChart = await getActiveBase(id);
            return activeBaseChart;
        } else if(mod == 5){
            var inngageTip = await getInngageTip();
            return inngageTip;


        } else if (mod == 6){

            var aud = await getAudiences(id);
            var audienceGrowthChart= []

            for(i = 0;i<aud.length;i++){
                var name = aud[i].audience_name;
                var d = await getAudienceSummary(aud[i].audience_id,13)
                audienceGrowthChart[i] = {name : name, summary: d};
            }

            return {audienceGrowthChart};
            

        } else if(mod == 7){
            
            var aut = await getAutomations(id);
            var AutomationPerformanceChart = []
            var i =0;
            while(aut[i]){
                var name = aut[i].name;
                var d = await getAutomationPerformance(aut[i].id)
                AutomationPerformanceChart[i] = {name : name, performance: d};
                ++i;
            }

            return {AutomationPerformanceChart};
        }

    })

    const response = await Promise.all(updatedMods);

    var modules_data = {}
    for(i=0;i<response.length;i++){
        var k = Object.keys(response[i]);
        modules_data[k[0]] = response[i][k[0]];
    }
    
    res.status(200).json({
        message:"Success",
        modules_data
    })
})

async function getNotificationChart(app_id){
    var notificationChart = {};
    var today = getLastDayDate();
    var todayBegin = today + " 00:00:00";
    var todayEnd = today + " 23:59:59";
    var lastW = getLastWeekDate() + " 00:00:00";
    var lastM = getLastMonthDate() + " 00:00:00";
    var lastY = getLastYearDate() + " 00:00:00";


    
    
    notificationChart["today"] = await getPushesTodayGeneralSummary(app_id,todayBegin,todayEnd);
    notificationChart["week"] = await getPushesWeekGeneralSummary(app_id,lastW,todayEnd);
    notificationChart["month"] = await getPushesMonthGeneralSummary(app_id,getBeginMonthDate()+" 00:00:00",todayEnd);
    notificationChart["year"] = await getPushesYearGeneralSummary(app_id,lastY,todayEnd);
    return {notificationChart};
}

async function getPushesTodayGeneralSummary(app_id,data1,data2){
    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT * FROM general_summary gs WHERE gs.app_id = ${app_id} and gs.today_date BETWEEN '${data1}' and '${data2}' order by gs.today_date asc;`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var res = await Promise.all(sql);
    
    var labels = getJsonLabelToday();
    var id = [];
    var installed = [];
    var uninstalled = [];
    var sessions = [];
    var uniqueSessions = [];
    var sent = [];
    var receivedArray = [];
    var opened = [];
    var sentNum = 0;
    var openedNum = 0;
    var received = 0;
    var installedNum = 0;
    var unistalledNum = 0;
    var sessionsNum = 0;
    var sessionsUniqueNum = 0;
    if(res.length > 0){
        for(i=0;i<res.length;i++){
            const a = res[i];
            id.push(a.id);
            installed.push(a.installed);
            uninstalled.push(a.uninstalled);
            sessions.push(a.sessions);
            uniqueSessions.push(a.unique_sessions);
            sent.push(a.sent);
            receivedArray.push(a.received);
            opened.push(a.opened);
            sentNum += a.sent;
            openedNum += a.opened;
            received += a.received;
            installedNum += a.installed;
            unistalledNum += a.uninstalled;
            sessionsNum += a.sessions;
            sessionsUniqueNum += a.unique_sessions;
        }
        if(sentNum == 0){
            openedNum = 0;
            received = 0;
        }else{
            openedNum = (openedNum*100)/sentNum;
            received = (received*100)/sentNum;
        }
        numeral.defaultFormat('0,0')
        sentNum = numeral(sentNum).format();
        openedNum = numeral(openedNum).format();
        received = numeral(received).format();
        installedNum = numeral(installedNum).format();
        unistalledNum = numeral(unistalledNum).format();
        sessionsNum = numeral(sessionsNum).format();
        sessionsUniqueNum = numeral(sessionsUniqueNum).format();
    
        return  {
            labels: labels,
            installed: installedNum,
            uninstalled: unistalledNum,
            sessions: sessionsNum,
            unique_sessions: sessionsUniqueNum,
            sent: sent,
            received: received,
            opened: opened,
            sentNum: sentNum,
            openedNum: openedNum
        };
    }
    return  {
        labels: labels,
        installed: installedNum,
        uninstalled: unistalledNum,
        sessions: sessionsNum,
        unique_sessions: sessionsUniqueNum,
        sent: sent,
        received: received,
        opened: opened,
        sentNum: sentNum,
        openedNum: openedNum
    };

} 

async function getPushesWeekGeneralSummary(app_id,data1,data2){

    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT * FROM general_summary gs WHERE gs.app_id = ${app_id} and gs.today_date BETWEEN "${data1}" and "${data2}";`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var res = await Promise.all(sql);
    labels = getJsonLabelWeek();
    id = [];
    installed = [];
    uninstalled = [];
    sessions = [];
    uniqueSessions = [];
    sent = [];
    receivedArray = [];
    opened = [];
    sentNum = 0;
    openedNum = 0;
    received = 0;
    installedNum = 0;
    sessionsNum = 0;
    sessionsUniqueNum = 0;
    unistalledNum = 0;

    if(res.length > 0){

        for(i = 0;i<res.length;i++){
            const a = res[i];
            id.push(a.id);
            installed.push(a.installed);
            uninstalled.push(a.uninstalled);
            sessions.push(a.sessions);
            uniqueSessions.push(a.unique_sessions);
            sent.push(a.sent);
            receivedArray.push(a.received);
            opened.push(a.opened);
            sentNum += a.sent;
            openedNum += a.opened;
            received += a.received;
            installedNum += a.installed;
            unistalledNum += a.uninstalled;
            sessionsNum += a.sessions;
            sessionsUniqueNum += a.unique_sessions;
        }
        if(sentNum == 0){
            openedNum = 0;
            received = 0;
        } else{
            openedNum = (openedNum*100)/sentNum;
            received = (received*100)/sentNum;
        }
        numeral.defaultFormat('0,0')
        sentNum = numeral(sentNum).format();
        openedNum = numeral(openedNum).format();
        received = numeral(received).format();
        installedNum = numeral(installedNum).format();
        unistalledNum = numeral(unistalledNum).format();
        sessionsNum = numeral(sessionsNum).format();
        sessionsUniqueNum = numeral(sessionsUniqueNum).format();

        var auxCont = 0;
        var sentGrup = [];
        var somaSent = 0;
        var aux = 0;

        for(i = 0;i<sent.length;i++){
            if(auxCont <= 23){
                somaSent += sent[i];
                if(auxCont == 23){
                    sentGrup[aux] = somaSent;
                    somaSent = 0;
                    auxCont = 0;
                    aux++;
                }else if(i == (sent.length - 1)){
                    sentGrup[aux] = somaSent;
                }else {
                    auxCont++;
                }
            }
        }

        return {
            labels: labels,
            installed: installedNum,
            uninstalled: unistalledNum,
            sessions: sessionsNum,
            unique_sessions: sessionsUniqueNum,
            sent:sentGrup,
            received: received,
            opened: opened,
            sentNum: sentNum,
            openedNum: openedNum
        }

    }else{
        return {
            labels: labels,
            installed: installedNum,
            uninstalled: unistalledNum,
            sessions: sessionsNum,
            unique_sessions: sessionsUniqueNum,
            sent:sentGrup,
            received: received,
            opened: opened,
            sentNum: sentNum,
            openedNum: openedNum
        }
    }
}

async function getPushesMonthGeneralSummary(app_id,data1,data2){

    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT * FROM general_summary gs WHERE gs.app_id = ${app_id} and gs.today_date BETWEEN "${data1}" and "${data2}";`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var res = await Promise.all(sql);

    labels = getJsonLabelMonth();
    id = [];
    installed = [];
    uninstalled = [];
    sessions = [];
    uniqueSessions = [];
    sent = [];
    receivedArray = [];
    opened = [];
    sentNum = 0;
    openedNum = 0;
    received = 0;
    installedNum = 0;
    sessionsNum = 0;
    sessionsUniqueNum = 0;
    unistalledNum = 0;
    if(res.length > 0){

        for(i = 0;i<res.length;i++){
            const a = res[i];
            id.push(a.id);
            installed.push(a.installed);
            uninstalled.push(a.uninstalled);
            sessions.push(a.sessions);
            uniqueSessions.push(a.unique_sessions);
            sent.push(a.sent);
            receivedArray.push(a.received);
            opened.push(a.opened);
            sentNum += a.sent;
            openedNum += a.opened;
            received += a.received;
            installedNum += a.installed;
            unistalledNum += a.uninstalled;
            sessionsNum += a.sessions;
            sessionsUniqueNum += a.unique_sessions;
        }
        if(sentNum == 0){
            openedNum = 0;
            received = 0;
        } else{
            openedNum = (openedNum*100)/sentNum;
            received = (received*100)/sentNum;
        }
        numeral.defaultFormat('0,0')
        sentNum = numeral(sentNum).format();
        openedNum = numeral(openedNum).format();
        received = numeral(received).format();
        installedNum = numeral(installedNum).format();
        unistalledNum = numeral(unistalledNum).format();
        sessionsNum = numeral(sessionsNum).format();
        sessionsUniqueNum = numeral(sessionsUniqueNum).format();

        var auxCont = 0;
        var sentGrup = [];
        var somaSent = 0;
        var aux = 0;

        for(i = 0;i<sent.length;i++){
            if(auxCont <= 23){
                somaSent += sent[i];
                if(auxCont == 23){
                    sentGrup[aux] = somaSent;
                    somaSent = 0;
                    auxCont = 0;
                    aux++;
                }else if(i == (sent.length - 1)){
                    sentGrup[aux] = somaSent;
                }else {
                    auxCont++;
                }
            }
        }

        return {
            labels: labels,
            installed: installedNum,
            uninstalled: unistalledNum,
            sessions: sessionsNum,
            unique_sessions: sessionsUniqueNum,
            sent:sentGrup,
            received: received,
            opened: opened,
            sentNum: sentNum,
            openedNum: openedNum
        }

    }else{
        return {
            labels: labels,
            installed: installedNum,
            uninstalled: unistalledNum,
            sessions: sessionsNum,
            unique_sessions: sessionsUniqueNum,
            sent:sentGrup,
            received: received,
            opened: opened,
            sentNum: sentNum,
            openedNum: openedNum
        }
    }
}

async function getPushesYearGeneralSummary(app_id,data1,data2){

    const sql = await new Promise((res,rej)=>{
        con.query(`SELECT * FROM general_summary gs WHERE gs.app_id = ${app_id} and gs.today_date BETWEEN "${data1}" and "${data2}";`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        })
    });
    var res = await Promise.all(sql);

    labels = getJsonLabelYear();
    id = [];
    installed = [];
    uninstalled = [];
    sessions = [];
    uniqueSessions = [];
    sent = [];
    receivedArray = [];
    opened = [];
    sentNum = 0;
    openedNum = 0;
    received = 0;
    installedNum = 0;
    sessionsNum = 0;
    sessionsUniqueNum = 0;
    unistalledNum = 0;
    var sendGrup = [];
    var finalSend = [];
    for(i=0;i<12;++i)sendGrup.push(0);
    if(res.length > 0){
        var todayAux = new Date(data2);
        var mesRep = 0;
        for(i = 0;i<res.length;i++){
            const a = res[i];
            id.push(a.id);
            installed.push(a.installed);
            uninstalled.push(a.uninstalled);
            sessions.push(a.sessions);
            uniqueSessions.push(a.unique_sessions);
            sent.push(a.sent);
            receivedArray.push(a.received);
            opened.push(a.opened);
            sentNum += a.sent;
            openedNum += a.opened;
            received += a.received;
            installedNum += a.installed;
            unistalledNum += a.uninstalled;
            sessionsNum += a.sessions;
            sessionsUniqueNum += a.unique_sessions;

            var auxD = new Date(a.today_date);
            if(todayAux.getMonth() == auxD.getMonth() && todayAux.getFullYear() == auxD.getFullYear()){
                mesRep += a.sent;
            }
            else 
                sendGrup[(auxD.getMonth())] +=a.sent; 
            
        }
        if(sentNum == 0){
            openedNum = 0;
            received = 0;
        } else{
            openedNum = (openedNum*100)/sentNum;
            received = (received*100)/sentNum;
        }

        for(i=todayAux.getMonth();i<12;i++)finalSend.push(sendGrup[i]);
        for(i=0;i<todayAux.getMonth();i++)finalSend.push(sendGrup[i]);
        finalSend.push(mesRep);


        numeral.defaultFormat('0,0')
        sentNum = numeral(sentNum).format();
        openedNum = numeral(openedNum).format();
        received = numeral(received).format();
        installedNum = numeral(installedNum).format();
        unistalledNum = numeral(unistalledNum).format();
        sessionsNum = numeral(sessionsNum).format();
        sessionsUniqueNum = numeral(sessionsUniqueNum).format();

        return {
            labels: labels,
            installed: installedNum,
            uninstalled: unistalledNum,
            sessions: sessionsNum,
            unique_sessions: sessionsUniqueNum,
            sent:finalSend,
            received: received,
            opened: opened,
            sentNum: sentNum,
            openedNum: openedNum
        }
    }

    return {
        labels: labels,
        installed: installedNum,
        uninstalled: unistalledNum,
        sessions: sessionsNum,
        unique_sessions: sessionsUniqueNum,
        sent:sendGrup,
        received: received,
        opened: opened,
        sentNum: sentNum,
        openedNum: openedNum
    }

}

function getJsonLabelToday(){
    var label = [];
    for(i = 0;i<=23;i++){
        label[i] = i; 
    }
    return label;
}

function getJsonLabelWeek(){

    var min = new Date();
    var x = min.setDate(min.getDate() - 7);  
    min = new Date(x);
    min = min.getDay();

    var max = new Date();
    var y = max.setDate(max.getDate() - 1);  
    max = new Date(y);
    max = max.getDay();

    const sem = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
    var s = [];
    for(i=min;i<7;i++){
        s.push(sem[i]);
    }
    for(i=0;i<min;i++){
        s.push(sem[i]);
    }
    return s;
}

function getJsonLabelMonth(){
    var min = new Date();
    var x = min.setDate(min.getDate() - 1);  
    min = new Date(x);
    min = min.getDate();

    var l =[];
    for(i=1;i<=min;i++)l.push(i);
    return l;
}

function getJsonLabelYear(){
    const m = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
    var ms = [];
    var mes = new Date();
    mes = mes.getMonth();

    for(i=mes;i<12;i++){
        ms.push(m[i]);
    }
    for(i=0;i<=mes;i++){
        ms.push(m[i]);
    }
    return ms;
}

async function getRetentionChart(app_id){

    const today = getTodayDate();

    const DAU = await new Promise((res,rej) => {
        con.query(`SELECT  DATE_FORMAT(summary_date, '%d') AS day , active_users
        FROM retention_summary 
        WHERE period_type = 1 and app_id = ${app_id} and summary_date > DATE_ADD("${today}", INTERVAL -11 DAY);`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });

    const WAU = await new Promise((res,rej) => {
        con.query(`SELECT  DATE_FORMAT(summary_date, '%d') AS day , active_users
        FROM retention_summary 
        WHERE period_type = 2 and app_id = ${app_id} and summary_date > DATE_ADD("${today}", INTERVAL -11 DAY);`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });

    const MAU = await new Promise((res,rej) => {
        con.query(`SELECT  DATE_FORMAT(summary_date, '%d') AS day , active_users
        FROM retention_summary 
        WHERE period_type = 3 and app_id = ${app_id} and summary_date > DATE_ADD("${today}", INTERVAL -11 DAY);`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });

    const retentionChart = {  
        DAU: DAU,
        WAU:WAU,
        MAU: MAU  
    }

    return {retentionChart};
}

async function getEngagementChart(app_id){

    var today = getTodayDate();

    const active_users = await new Promise((res,rej) => {
        con.query(`SELECT active_users as n_users, DAY(summary_date) as day, MONTH(summary_date) as month 
        FROM  retention_summary 
        WHERE app_id = ${app_id} AND period_type = 1
        and summary_date BETWEEN  DATE_SUB("${today}", INTERVAL 7 DAY) AND DATE_SUB("${today}", INTERVAL 1 HOUR);`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });


    const sessions = await new Promise((res,rej) => {
        con.query(`select sum(sessions) as n_session
        from general_summary
        where app_id = ${app_id} and today_date BETWEEN  DATE_SUB("${today}", INTERVAL 7 DAY) AND DATE_SUB("${today}", INTERVAL 1 HOUR)
        GROUP BY YEAR(today_date), MONTH(today_date), DAY (today_date);`,(err,row)=>{
            if(err) throw err;
            res( JSON.parse(JSON.stringify(row)));
        });
    });

    const totalActiveUsers = await new Promise((res,rej) => {
        con.query(`select active_users from retention_summary 
        where period_type = 2 and app_id = ${app_id}
        and summary_date = DATE_FORMAT(DATE_ADD("${today}", INTERVAL -1 DAY), '%Y/%m/%d')`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });

    const engagementChart = {
        engagementChart:{
            active_users: active_users,
            sessions : sessions,
            totalActiveUsers : totalActiveUsers
        }
    }

    return engagementChart;
}

async function getActiveBase(app_id){
    const active_users = await new Promise((res,rej) => {
        con.query(`select count(last_update) as total
        from subscriber
        where app_id = ${app_id} and last_update >= DATE_SUB(NOW(), INTERVAL 7 DAY);`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });

    const total_users = await new Promise((res,rej) => {
        con.query(`SELECT count(id) as total from subscriber WHERE app_id = ${app_id} AND cloud_status = 0`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });
    
    var activeBase_number = parseInt((active_users[0].total/total_users[0].total)*100);

    var activeBaseChart = {
        active_base: activeBase_number
    }
    return {activeBaseChart};
}

async function getAutomations(app_id){
    const automations = await new Promise((res,rej) => {
        con.query(`SELECT a.id AS id, a.name AS name
        FROM automations a
        WHERE a.app_id = ${app_id}
        AND a.status_id <> 3
        GROUP BY a.id, a.name
        ORDER BY a.id DESC`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });


    return automations;
}

async function getAudiences(app_id){
    const audiences = await new Promise((res,rej) => {
        con.query(`SELECT
        a.id AS audience_id,
        a.name AS audience_name,
        a.description AS audience_description,
        DATE_FORMAT(a.created_in,'%d/%m/%Y') AS audience_creation,
        DATE_FORMAT(a.last_modified_in,'%d/%m/%Y') AS audience_modified,
        a.status_id AS status_id,
        a.query as audience_query,
        IFNULL(a.audience_range, '-') as audience_range,
        IFNULL(a.last_range_update, '-') as last_range_update
    FROM audience a
    WHERE a.app_id = ${app_id}
        and a.status_id <> 2
        -- IN PRODUTION == 1
        and a.description != 'Temp Audience'
    ORDER BY a.created_in DESC`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });


    return audiences;
}

async function getAudienceSummary(id_audi,number_days){
    const audience_summary = await new Promise((res,rej) => {
        con.query(`SELECT summary.total_user_audience, DAY(summary.date_in) as day, MONTH(summary.date_in) as month, YEAR(summary.date_in) as year 
        FROM audience_summary AS summary
        WHERE summary.id_audience = ${id_audi} 
        and date_in BETWEEN  DATE_SUB(CURDATE(), INTERVAL ${number_days} DAY) AND CURDATE()`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });


    return audience_summary;
}

async function getAutomationPerformance(automation_id){

    const today = getTodayDate();
    const automationPerf = await new Promise((res,rej) => {
        con.query(`SELECT DATE_FORMAT(c.sent_in, '%d-%m') AS d, sum(cs.sent) AS sent, sum(cs.opened) AS opened
        FROM control_message c
        JOIN control_message_summary cs ON cs.id_control_message = c.id_control_message
        WHERE c.automation_id = ${automation_id}
        AND c.sent_in >= DATE_ADD("${today}", INTERVAL -12 DAY)
        AND DATE_FORMAT(c.sent_in, '%Y-%m-%d') != "${today}"
        GROUP BY d`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });

    return automationPerf;
}

async function getAppId(app_token){
    const id = await new Promise((res,rej) => {
        con.query(`SELECT id FROM app WHERE token = "${app_token}"`,(err,row)=>{
            if(err) throw err;
            res(row);
        });
    });
    return id[0].id;
}

async function getInngageTip(){

    const inngage_tip = await new Promise((res,rej) => {
        con.query(`SELECT * FROM dashboard_tips
                    ORDER BY RAND()
                    LIMIT 1`,(err,row)=>{
            if(err) throw err;
            res(JSON.parse(JSON.stringify(row)));
        });
    });

    var tip = {
        DashBoard_tip: inngage_tip
    }
    return tip;
}

function getLastWeekDate(){
    var todayDate = new Date();
    var x = todayDate.setDate(todayDate.getDate() - 7);  
    var todayDate = new Date(x);
    var dia = todayDate.getDate() < 10 ? "0"+todayDate.getDate() : todayDate.getDate();
    var mes = todayDate.getMonth()+1 < 10 ? "0"+(todayDate.getMonth()+1) : todayDate.getMonth()+1;
    var ano = todayDate.getFullYear();

    yesDate = ano+"-"+mes+"-"+dia;
    return yesDate;

}

function getBeginMonthDate(){
    var todayDate = new Date();
    var mes = todayDate.getMonth()+1 < 10 ? "0"+(todayDate.getMonth()+1) : todayDate.getMonth()+1;
    var ano = todayDate.getFullYear();

    yesDate = ano+"-"+mes+"-01";
    return yesDate;
}

function getLastMonthDate(){
    var todayDate = new Date();
    var x = todayDate.setMonth(todayDate.getMonth() - 1);  
    var todayDate = new Date(x);
    var dia = todayDate.getDate() < 10 ? "0"+todayDate.getDate() : todayDate.getDate();
    var mes = todayDate.getMonth()+1 < 10 ? "0"+(todayDate.getMonth()+1) : todayDate.getMonth()+1;
    var ano = todayDate.getFullYear();

    yesDate = ano+"-"+mes+"-"+dia;
    return yesDate;

}

function getLastYearDate(){
    var todayDate = new Date();
    var x = todayDate.setFullYear(todayDate.getFullYear() - 1);  
    var todayDate = new Date(x);
    var dia = todayDate.getDate() < 10 ? "0"+todayDate.getDate() : todayDate.getDate();
    var mes = todayDate.getMonth()+1 < 10 ? "0"+(todayDate.getMonth()+1) : todayDate.getMonth()+1;
    var ano = todayDate.getFullYear();

    yesDate = ano+"-"+mes+"-"+dia;
    return yesDate;

}

function getLastDayDate(){
    var todayDate = new Date();
    var x = todayDate.setDate(todayDate.getDate() - 1);  
    var todayDate = new Date(x);
    var dia = todayDate.getDate() < 10 ? "0"+todayDate.getDate() : todayDate.getDate();
    var mes = todayDate.getMonth()+1 < 10 ? "0"+(todayDate.getMonth()+1) : todayDate.getMonth()+1;
    var ano = todayDate.getFullYear();

    yesDate = ano+"-"+mes+"-"+dia;
    return yesDate;
}

function getTodayDate(){
    
    var todayDate = new Date();
    // var x = todayDate.setDate(todayDate.getDate() - 1);  
    // var todayDate = new Date(x);
    var dia = todayDate.getDate() < 10 ? "0"+todayDate.getDate() : todayDate.getDate();
    var mes = todayDate.getMonth()+1 < 10 ? "0"+(todayDate.getMonth()+1) : todayDate.getMonth()+1;
    var ano = todayDate.getFullYear();

    yesDate = ano+"-"+mes+"-"+dia;
    return yesDate;
}

module.exports = router;