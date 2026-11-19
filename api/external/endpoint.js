const EndPoints = {
    socketCore: {
        Rooms: {
            create: "room",
            getAll: "room",
            updateFrontend: "room/updateFrontEnd"
        }
    },
    localPort: {
        UpdateTranscript: "update-trainscript",
        HistoryChat: "similarity",
        Chat: "chat"
    }
}

module.exports = EndPoints;
