const express = require('express');
const router = express.Router();
const DBSource = require('../dbserver/mysql/db');
const mysql = require('mysql');
const sql = require('../dbserver/mysql/sql');
const md5=require('md5-node');
const server = require('ws').Server;
const ws = new server({port:8000});
const connNum = [];

//函数参数，连接的对象
ws.on("connection",function (socket) {
    connNum.push(socket);
    console.log("连接了"+connNum.length);
    //收到消息发送给每一个人
    socket.on("message",function (msg) {
        //广播给所有人
        for (let i=0; i<connNum.length; i++) {
            connNum[i].send(msg);
        }
    });
    //断开连接
    socket.on("close",function() {
        connNum.splice(connNum.indexOf(this),1);
    });
});

const conn = mysql.createConnection(DBSource.mysql);
conn.connect();

let jsonStr={
    errorCode:"0x0000",
    content:null
};

router.all('*', (req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,username');
    res.setHeader('Content-Type', 'text/plain;charset=UTF-8');
    next();
});
/* GET home page. */
router.get('/Login', function(req, res, next) {
    let request = JSON.parse(req.query.content);
    let UserName = request.UserName;
    let PassWord = request.PassWord;
    if(UserName===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }
    if(PassWord===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }
    let sqsl = sql.user.login + " WHERE Identity = '"  +UserName +"' AND PassWord = '"+md5(PassWord)+"'";
    conn.query(sqsl, function (err, result) {
        if (err) {
            console.log(err);
            jsonStr.errorCode = "0x0001";
            jsonStr.content = "数据库操作失败";
            res.send(jsonStr);
        }else{
            if(result.length>0){
                jsonStr.errorCode = "0x0000";
                jsonStr.content = {
                    Employee_Index: result[0].EmployeeID,
                    UserName: result[0].UserName
                };
                req.session.Employee_Index = result[0].EmployeeID;
                req.session.UserName = result[0].UserName;
                res.send(jsonStr);
            }else {
                jsonStr.errorCode = "0x0012";
                jsonStr.content = "该用户不存在或密码错误！";
                res.send(jsonStr);
            }
        }
    })
});

router.get('/AddConferenceRecord', function(req, res, next) {
    let request = JSON.parse(req.query.content);
    let Employee_Index = request.Employee_Index;
    let Conference_Index = request.Conference_Index;
    let Subject = request.Subject;
    let RecordTime = request.RecordTime;
    let Data = request.Data;
    let sqls = sql.user.add_record;
    let index = 0;
    if(!req.session.UserName){
        jsonStr.errorCode="0x0040";
        jsonStr.content = "session已失效，请重新登录！";
        res.send(jsonStr);
        return false;
    }
    if(Subject===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }
    if(RecordTime===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }
    if(Data===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }
    let callback=function (index) {
        if(Data[index].BeginTime===undefined||Data[index].EndTime===undefined){
            jsonStr.errorCode="0x0020";
            jsonStr.content="时间结构不正确";
            res.send(jsonStr);
            return false;
        }
        let sqld = "SELECT COUNT(*) COUNT FROM CONFERENCERECORD  WHERE `DeleteFlag`='0' AND Conference_Index = '"  +Conference_Index +"' AND RecordTime = '"+RecordTime+"'"+
            " AND BeginTime = '"  +Data[index].BeginTime +"' AND EndTime = '"+Data[index].EndTime+"'";
        conn.query(sqld,function (err, result) {
            if (err) {
                console.log(err);
            } else {
                if (result[0].COUNT === 0){
                    conn.query(sqls,[Employee_Index,Conference_Index,Subject,RecordTime,new Date(),Data[index].BeginTime,Data[index].EndTime,new Date()], function (err, result) {
                        if (err) {
                            console.log(err);
                            jsonStr.errorCode="0x0001";
                            jsonStr.content = "数据库操作失败！";
                            res.send(jsonStr);
                        }else{
                            jsonStr.errorCode="0x0000";
                            jsonStr.content="插入成功";
                            res.send(jsonStr);
                        }
                    })
                }
                if(result[0].COUNT>0){
                    if(index === (Data.length-1)){
                        jsonStr.errorCode = "0x0021";
                        jsonStr.content = "该时间段已有人预约请选择别的时间！";
                        res.send(jsonStr);
                    }else {
                        index ++;
                        callback(index);
                    }
                }
            }
        });
    };
    if(Employee_Index===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }else {
        let sqlA="SELECT COUNT(*) COUNT FROM crearo_erp.cr_erp_employees  WHERE EmployeeID = '"  +Employee_Index +"'";
        conn.query(sqlA,function (err, result) {
            if (err) {
                jsonStr.errorCode="0x0001";
                jsonStr.content = "数据库操作失败！";
                res.send(jsonStr);
                return false;
            } else {
                if (result[0].COUNT === 0){
                    jsonStr.errorCode="0x0022";
                    jsonStr.content = "人员索引错误！";
                    res.send(jsonStr);
                    return false;
                }else {
                    if(Conference_Index===undefined){
                        jsonStr.errorCode="0x0020";
                        jsonStr.content = "数据参数不合法！";
                        res.send(jsonStr);
                        return false;
                    } else {
                        let sqlB="SELECT COUNT(*) COUNT FROM CONFERENCEROOM  WHERE `Index` = '"  +Conference_Index +"'";
                        conn.query(sqlB,function (err, result) {
                            if (err) {
                                jsonStr.errorCode="0x0001";
                                jsonStr.content = "数据库操作失败！";
                                res.send(jsonStr);
                                return false;
                            } else {
                                if (result[0].COUNT === 0){
                                    jsonStr.errorCode="0x0023";
                                    jsonStr.content = "会议室索引错误,没有该会议室！";
                                    res.send(jsonStr);
                                    return false;
                                }else {
                                    callback(index);
                                }
                            }
                        });
                    }
                }
            }
        });
    }
});

router.get('/DeleteConferenceRecord', function(req, res, next) {
    let request = JSON.parse(req.query.content);
    let Index = request.Index;
    if(!req.session.UserName){
        jsonStr.errorCode="0x0040";
        jsonStr.content = "session已失效，请重新登录！";
        res.send(jsonStr);
        return false;
    }
    if(Index===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }
    let sqlD="UPDATE conferencerecord SET DeleteFlag = '1' where "
        +"`Index` = '"  +Index +"'"+" AND `Employee_Index` = '"  +req.session.Employee_Index +"' ";
    conn.query(sqlD, function (err, result) {
        if (err) {
            console.log(err);
            jsonStr.errorCode = "0x0001";
            jsonStr.content = "数据库操作失败";
            res.send(jsonStr);
        }else{
            if(result.affectedRows>0) {
                jsonStr.errorCode = "0x0000";
                jsonStr.content = "删除成功";
                res.send(jsonStr);
            }else{
                jsonStr.errorCode = "0x0050";
                jsonStr.content = "操作失败！不可以删除除自己以外的记录。";
                res.send(jsonStr);
            }
        }
    })
});

router.get('/QueryConferenceRecord', function(req, res, next) {
    let request = JSON.parse(req.query.content);
    let RecordTime = request.RecordTime;
    let Conference_Index = request.Conference_Index;
    if(!req.session.UserName){
        jsonStr.errorCode="0x0040";
        jsonStr.content = "session已失效，请重新登录！";
        res.send(jsonStr);
        return false;
    }
    if(RecordTime===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }
    if(Conference_Index===undefined){
        jsonStr.errorCode="0x0020";
        jsonStr.content = "数据参数不合法！";
        res.send(jsonStr);
        return false;
    }
    let sqlQ="SELECT rd.`Index`,Conference_Index,rm.`Name` ConferenceName,CONVERT (unhex(hex(CONVERT(em.`Name` USING latin1))) USING utf8) as UserName,`Subject`,BeginTime,EndTime from cr_custom_conference.conferencerecord rd inner join cr_custom_conference.conferenceroom rm on rd.Conference_Index=rm.`Index` inner join crearo_erp.cr_erp_employees em on em.employeeID=rd.Employee_Index where rd.`DeleteFlag` = '0' AND "
    +"`Conference_Index` = '"  +Conference_Index +"' AND "+"`RecordTime` = '"  +RecordTime +"'";
    conn.query(sqlQ, function (err, result) {
        if (err) {
            console.log(err);
            jsonStr.errorCode = "0x0001";
            jsonStr.content = "数据库操作失败";
            res.send(jsonStr);
        }else{
            jsonStr.errorCode = "0x0000";
            jsonStr.content = result;
            res.send(jsonStr);
        }
    })
});

module.exports = router;
