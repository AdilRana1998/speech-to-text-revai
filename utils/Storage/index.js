let roomsCall = [];

const storage = {

    store(roomId) {
        roomsCall.push(roomId);
        return;
    },

    isStored(roomId) {
        return roomsCall.includes(roomId);
    },

    deleteRow(roomId) {
        const index = roomsCall.findIndex(id => id === roomId);
        if (index !== -1) {
            roomsCall.splice(index, 1);
        }
        return;
    },

    getList() {
        return roomsCall;
    }
}

module.exports = storage;