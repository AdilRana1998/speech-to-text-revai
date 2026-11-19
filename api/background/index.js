const Rooms = require('./room.background');
const cron = require("node-cron");
let flags = {
    revTranscript: true
}

if (process.env.BP_MEETING_SCHEDULE === 'true') {
    cron.schedule("*/15 * * * * *", async function () {
        try {
            if (flags.revTranscript) {
                flags.revTranscript = false; 
                await Rooms.revTranscript();
                flags.revTranscript = true;
            } else {
                console.log("process is still running for rev Transcript");
                flags.revTranscript = true;
            }
        } catch (e) {
            flags.revTranscript = true;
            console.log("process failed for rev Transcript", e.message);
        }
    });
} else {
    console.log("not running for rev Transcript");
}