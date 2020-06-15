const express = require('express');
const axios = require('axios');
const router = express.Router();
var con = require('../connection/DBconnection');

router.post('/',async (req,res,next)=>{
    con.getConnection(async function(err99,connection){
        console.log("connected");
        
        // var f01 = await f1();
        // var f02 = await f2();
        // var f03 = await f3();
        // var f04 = await f4();
        
        return res.status(200).json({
            message:"OK"
        })
    })
})




async function updateStatus4to5(){
    console.log("Started updateStatus4to5");
    con.query(`SELECT * from control_message where status = 4`, (err, row) => {
        if (err) throw err;
        const CMids = row.map(cm => {
            return cm.id_control_message;
        });
        con.query("SELECT control_message_id FROM message_log_insert WHERE message_status_id = 0 GROUP BY control_message_id",(err1,row1)=>{
            const MLIids = row1.map(m => {
                return m.control_message_id;
            });
            const filteredArray = CMids.filter(n => !MLIids.includes(n));
            console.log('selected filtered array');
            console.log(filteredArray)

            filteredArray.forEach(cm_id => {
                console.log("updated cm "+cm_id+" from 4 to 5");
                con.query(`CALL update_cm_status_4_to_5 (?)`,cm_id,(err2,row2)=>{
                    if(err2) throw err2;
                    console.log("Doing updateStatus4to5");
                    console.log(row2);
                });
            });
        })
    });
    console.log("Finished updateStatus4to5");
    return 1;
}

async function messageResponsesV4ToMessageLog(){
    console.log("Started messageResponsesToMessageLog");
    con.getConnection(async function (err99, connection) {
        if(err99) throw err99;
        const sql = await new Promise((res, rej) => {
            
            con.query(`INSERT INTO message_log (id, subscriber_id, msg_title, msg_body, created_in, platform_id, message_status_id, status_details, sent_in, control_message_id) 
                SELECT id, subscriber_id, msg_title, msg_body, sent_at, platform_id, status_id, status_details, sent_at, control_message_id 
                FROM message_responses_v4 
                WHERE status is null
                AND id NOT IN (SELECT id FROM message_log);`, (err, row) => {
                    res(row);
            })
        });
        var resp = await Promise.resolve(sql);
        connection.release();
        console.log("Finished messageResponsesToMessageLog");
        return resp;
    })
}

async function messageConversionToMessageLog(){
    console.log("Started messageConversionToMessageLog");
    con.getConnection(async function (err99, connection) {
        if(err99) throw err99;
        const sql = await new Promise((res, rej) => {
            
            con.query(`UPDATE message_log t2
            JOIN message_conversion t1 ON t1.message_id = t2.id
            SET
                t2.opened_in = t1.date,
                t2.fl_opened = 1,
                t1.status = 1
            WHERE
                t1.status = 0;`, (err, row) => {
                    console.log("Doing messageConversionToMessageLog");
                    res(row);
            })
        });
        var resp = await Promise.resolve(sql);
        connection.release();
        console.log("Finished messageConversionToMessageLog");
        return resp;
    })
}

async function messageResponsesV4ToCMS(){
    const sql = await new Promise((res, rej) => {
        con.query(`INSERT into control_message_summary (id_control_message, sent, received, opened)
            SELECT this.id, this.msent , this.mReceived , this.Mopened
            from
            (select ml.control_message_id as id, count(1) as msent ,
            (SELECT COUNT(*) FROM message_responses_v4 mr WHERE mr.control_message_id = ml.control_message_id AND mr.status_id = 1) as mReceived ,
            (SELECT COUNT(*) FROM message_log m1 WHERE m1.control_message_id = ml.control_message_id AND m1.fl_opened = 1) AS Mopened
            from message_responses_v4 ml
            inner join control_message cm
            on ml.control_message_id = cm.id_control_message
            where cm.id_control_message in
            (SELECT id_control_message FROM control_message cm2 WHERE cm2.status = 5)
            group by ml.control_message_id) as this
            on duplicate key update sent = this.msent, received = this.mReceived , opened = this.Mopened`,(err,row)=>{
                if(err) throw err;
                res(row);
            });
    });
    var resp = await Promise.resolve(sql);
    return resp;
}

async function generateConversionSummary(){
    const sql = await new Promise((res, rej) => {
        con.query(`INSERT INTO message_log_conversion  (id, subscriber_id, control_message_id,converted_in ,converted_value, message_convetion_value_id)
            SELECT ml.id, ml.subscriber_id, ml.control_message_id, mcv.date_in, mcv.value , mcv.id
            FROM message_log ml
            JOIN message_conversion_value mcv
            ON ml.id = mcv.message_id
            WHERE mcv.status = 0 ;`,(err,row)=>{
                if(err) throw err;
                res(row);
            });
    });
    var resp = await Promise.resolve(sql);
    
    const sql2 = await new Promise((res2, rej2) => {
        con.query(`UPDATE message_log_conversion mlc
            JOIN message_conversion_value mcv
            SET mcv.status = 1
            WHERE mlc.message_convetion_value_id = mcv.id ;`,(err,row)=>{
                if(err) throw err;
                res2(row);
            });
    });
    var resp2 = await Promise.resolve(sql2);
    
    return {resp,resp2};
}

async function updateV4DataCMS(){
    const sql = await new Promise((res, rej) => {
        con.query(`INSERT INTO control_message_summary (id_control_message, opened)
            select this.id , this.open from
            (SELECT m.control_message_id AS id , count(m.fl_opened) AS open
            FROM message_log m
                JOIN message_conversion mc
                    ON m.id = mc.message_id
            WHERE mc.message_id IN (SELECT id FROM message_responses_v4)
            AND mc.status = 1 GROUP BY m.control_message_id) as this
            ON DUPLICATE KEY UPDATE   opened = this.open;`,(err,row)=>{
                if(err) throw err;
                res(row);
            });
    });
    var resp = await Promise.resolve(sql);
    
    const sql2 = await new Promise((res2, rej2) => {
        con.query(`INSERT INTO control_message_summary (id_control_message, opened)
            select this.id , this.open from
            (SELECT m.control_message_id AS id , count(m.fl_opened) AS open
            FROM message_log m
                JOIN message_conversion mc
                    ON m.id = mc.message_id
            WHERE mc.message_id NOT IN (SELECT id FROM message_responses_v4)
            AND mc.status = 1 GROUP BY m.control_message_id) as this
            ON DUPLICATE KEY UPDATE opened = this.open;`,(err,row)=>{
                if(err) throw err;
                res2(row);
            });
    });
    var resp2 = await Promise.resolve(sql2);
    
    return {resp,resp2};
}

async function updateControlMessageStatusToSix(){
    const sql = await new Promise((res, rej) => {
            
        con.query(`UPDATE control_message SET status = 6 
            WHERE id_control_message in (SELECT id_control_message FROM control_message_summary) 
            AND status = 5;`, (err, row) => {
                if(err)throw err;
                res(row);
        })
    });
    var resp = await Promise.resolve(sql);
    return resp;
}

async function setFailureMessages(){
    const sql = await new Promise((res, rej) => {
            
        con.query(`UPDATE control_message 
            set status = 9 
            where status = 5 
            and id_control_message not in (select control_message_id from message_responses_v4)`,
            (err, row) => {
                if(err) throw err;
                res(row);
        })
    });
    var resp = await Promise.resolve(sql);
    return resp;
}

async function updateMessageResponsesV4(){
    const sql = await new Promise((res, rej) => {
            
        con.query(`UPDATE message_responses_v4 set status = 1 where status is null and 
            id in (select id from message_log);`, (err, row) => {
                if(err) throw err;
                res(row);
        })
    });
    var resp = await Promise.resolve(sql);
    return resp;
}

async function cleanMessageResponsesV4ToProcessLog(){
    const sql = await new Promise((res, rej) => {
            
        con.query(`INSERT INTO process_log (process_name,last_execution) VALUES ('clean_message_responses_v4',NOW());`, (err, row) => {
                if(err) throw err;
                res(row);
        })
    });
    var resp = await Promise.resolve(sql);
    return resp;
}

async function deleteFromMessageResponses(){
    const sql = await new Promise((res, rej) => {
            
        con.query(`DELETE FROM message_conversion
            WHERE status = 1 
            AND  date < date_sub(now(),INTERVAL 2 WEEK)`, (err, row) => {
                if(err) throw err;
                res(row);
        })
    });
    var resp = await Promise.resolve(sql);
    return resp;
}

async function deleteFromMessageConversion(){
    const sql = await new Promise((res, rej) => {
            
        con.query(`DELETE FROM message_conversion WHERE status = 1;`, (err, row) => {
                if(err) throw err;
                res(row);
        })
    });
    var resp = await Promise.resolve(sql);
    return resp;
}

async function cleanMessageConversionToProcessLog(){
    const sql = await new Promise((res, rej) => {
            
        con.query(`INSERT INTO process_log (process_name,last_execution) VALUES ('clean_message_conversion',NOW());`, (err, row) => {
                if(err) throw err;
                res(row);
        })
    });
    var resp = await Promise.resolve(sql);
    return resp;
}

async function f1(){
    console.log("Started f1");
    var ups = await updateStatus4to5();
    ups = await Promise.resolve(ups);
    var resp1 = await messageResponsesV4ToMessageLog();
    resp1 = await Promise.resolve(resp1);
    var resp2 = await messageConversionToMessageLog();
    resp2 = await Promise.resolve(resp2);
    console.log("Finished f1");
}

async function f2(){
    console.log("Started F2");
    
    var r1 = await messageResponsesV4ToCMS();
    r1 = await Promise.resolve(r1);
    var r3 = await generateConversionSummary();
    r3 = await Promise.resolve(r3);
    var r4 = await updateV4DataCMS();
    r4 = await Promise.resolve(r4);

    console.log("Finished F2");
}

async function f3(){
    console.log("Started F3");
    var r1 = await updateControlMessageStatusToSix();
    r1 = await Promise.resolve(r1);
    var r2 = await setFailureMessages();
    r2 = await Promise.resolve(r1);
    
    console.log("Finished F3");
}

async function f4(){
    console.log("Started F4");


    var r2 = await updateMessageResponsesV4();
    r2 = await Promise.resolve(r2);

    var r3 = await cleanMessageResponsesV4ToProcessLog();
    r3 = await Promise.resolve(r3);
    var r4 = await deleteFromMessageResponses();
    r4 = await Promise.resolve(r4);
    
    var r7 = await cleanMessageConversionToProcessLog();
    r7 = await Promise.resolve(r7);
    var r8 = await deleteFromMessageConversion();
    r8 = await Promise.resolve(r8);
}
module.exports = router