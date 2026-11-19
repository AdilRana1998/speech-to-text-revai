const { postMethod, getMethod } = require('../../utils/Methods')
const endpoints = require('./endpoint');
const fetch = require("node-fetch");
const localUrl = "http://127.0.0.1:8002/";

exports.updateTranscription = async (obj) => {
    const url = localUrl + endpoints.localPort.UpdateTranscript;
    const header = {
        "Content-Type": "application/json"
    }
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: 'post',
            body: JSON.stringify(obj),
            headers: header,
        })
            .then(res => {
                return  res.text();
            }).then(res=>{
            console.log(res);
            resolve(res);
        }).catch(e => {
            console.log(e);
            resolve(e);
        })
    });
}

exports.getChatHistory = async (obj) => {
    const url = localUrl + endpoints.localPort.HistoryChat;
    const header = {
        "Content-Type": "application/json"
    }
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: 'post',
            body: JSON.stringify(obj),
            headers: header,
        })
            .then(res => {
                return  res.text();
            }).then(res=>{
            console.log(res);
            resolve(res);
        }).catch(e => {
            console.log(e);
            resolve(e);
        })
    });
}

exports.chat = async (obj) => {
    const url = localUrl + endpoints.localPort.Chat;
    const header = {
        "Content-Type": "application/json"
    }
    return new Promise((resolve, reject) => {
        fetch(url, {
            method: 'post',
            body: JSON.stringify(obj),
            headers: header,
        })
            .then(res => {
                return  res.text();
            }).then(res=>{
            console.log(res);
            resolve(res);
        }).catch(e => {
            console.log(e);
            resolve(e);
        })
    });
}
