const { postMethod, getMethod } = require('../../utils/Methods')
const endpoints = require('./endpoint');
const socketUrl = process.env.URL_SOCKET_CORE

exports.createRoom = async (obj) => {
    const url = socketUrl + endpoints.socketCore.Rooms.create;
    const header = {
        "Content-Type": "application/json"
    }
    return await postMethod(url, obj, header);
}

exports.getRooms = async () => {
    const url = socketUrl + endpoints.socketCore.Rooms.getAll;
    const header = {
        "Content-Type": "application/json"
    }
    return await getMethod(url, header);
}

exports.updateFrontend = async (obj) => {
    const url = socketUrl + endpoints.socketCore.Rooms.updateFrontend;
    const header = {
        "Content-Type": "application/json"
    }
    return await postMethod(url, obj, header);
}