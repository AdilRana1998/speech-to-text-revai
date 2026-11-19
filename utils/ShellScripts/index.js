const { exec } = require('child_process');

const grepFileContent = (botId) => {
    let todaysDate = getFormateDate();
    todaysDate = todaysDate.replace(/\d{2}$/, '*');
    return new Promise((resolve, reject) => {
        try {
            let cmd = "grep " + "'" + botId + "'" + " /home/flowdigital/main/dev/log/chat-gpt-request-response/" + todaysDate + ".txt";
            exec(cmd, (err, stdout, stderr) => {
                if (err) {
                    //some err occurred
                    console.error(err)
                    resolve(err);
                } else {
                    // the *entire* stdout and stderr (buffered)
                    console.log(`stdout: ${stdout}`);
                    console.log(`stderr: ${stderr}`);
                    resolve(stdout)
                }
            });
        } catch (e) {
            console.log(e.message);
        }

    })

}

const getFormateDate = () => {
    var date = new Date();
    return date.getFullYear() + "-" + (date.getMonth() + 1).padStart(2, "0") + "-" + date.getDate().padStart(2, "0");
}

module.exports = {
    grepFileContent
}
