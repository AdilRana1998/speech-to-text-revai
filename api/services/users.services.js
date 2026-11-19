const UserServices = {};
const { JWT, Functions, Encryption, Payments, Emails, Strings } = require('../../utils')
const { backendBaseUrl, upload_folder_name } = require('../../config')
const JSONs = require('../../utils/Jsons/database');
const {
    UserQueries,
    RoomQueries,
    CalendarQueries,
    MeetingScheduleQueries,
    CaseFilesQueries
} = require('../queries');
const RoomServices = require('./rooms.services')
const OTPServices = require('./otp.services')
const Imap = require('imap');
const ICAL = require('ical.js');
const { simpleParser } = require('mailparser');
const UserPackageServices = require('./userPackages.services');
const { slack } = require('../../utils/Webhook');
const { createActivity } = require('../services/activityLogs.services');
const moment = require('moment');

// IMAP configuration
const imapConfig = {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT,
    tls: true,
    tlsOptions: { rejectUnauthorized: false },
};

UserServices.ImpEmail = async () => {
    // Connect to the IMAP server
    const imap = new Imap(imapConfig);

    // Open the inbox
    function openInbox(callback) {
        imap.openBox('INBOX', false, callback);
    }

    // Search for emails with the specified criteria
    function searchForEmails(criteria, callback) {
        imap.search(criteria, callback);
    }

    // Fetch and process emails
    let data = [];

    function fetchAndProcessEmails(emailIds) {
        emailIds.forEach((emailId) => {
            const fetch = imap.fetch(emailId, { bodies: '' });

            // Mark the email as seen working
            imap.addFlags(emailId, ['\\Seen'], (err) => {
                if (err) {
                    console.error('Error marking email as seen:', err);
                } else {
                    console.log(`Email ${emailId} marked as seen`);
                }
            });

            fetch.on('message', (msg) => {
                msg.on('body', (stream) => {
                    // Parse email
                    simpleParser(stream, (err, parsed) => {
                        if (err) {
                            //handle Error
                            console.log("error stream", err.message);
                        }

                        // Check for calendar attachments
                        if (parsed.attachments && parsed.attachments.length > 0) {
                            var email, endtime, starttime, meetlink, subject;
                            parsed.attachments.forEach((attachment) => {
                                if (attachment.contentType === 'text/calendar') {
                                    //console.log("READING >>>", emailId)
                                    // Parse calendar data
                                    const jcalData = ICAL.parse(attachment.content.toString());
                                    for (const component of jcalData[2]) {
                                        if (component[0] === 'vevent') {
                                            for (const property of component[1]) {
                                                if (property[0] === 'summary') {
                                                    subject = property[3];
                                                }

                                                if (property[0] === 'organizer') {
                                                    const emailRegex = /mailto:(.+@.+)/;
                                                    const from = property[3].match(emailRegex);
                                                    email = from[1]
                                                }

                                                if (property[0] === 'description') {
                                                    const detailText = property[3];
                                                    const meetLinkRegex = /(https:\/\/meet\.google\.com\/[a-zA-Z0-9\-]+)/;
                                                    const skypeLinkRegex = /<([^>]+)>/;
                                                    const zoomLinkRegex = /(https:\/\/[\w\.-]+\/j\/\d+\?pwd=[\w-]+)/;

                                                    const meetLinkMatches = detailText.match(meetLinkRegex);
                                                    const skypeLinkMatches = detailText.match(skypeLinkRegex);
                                                    const zoomLinkMatches = detailText.match(zoomLinkRegex);

                                                    if (meetLinkMatches) {
                                                        meetlink = meetLinkMatches[1];
                                                    }
                                                    else if (skypeLinkMatches) {
                                                        meetlink = skypeLinkMatches[1];
                                                    }
                                                    else if (zoomLinkMatches) {
                                                        meetlink = zoomLinkMatches[1];
                                                    }
                                                    else {
                                                        meetlink = 'Not Found';
                                                    }
                                                }

                                                if (property[0] === 'dtstart') {
                                                    starttime = property[3];
                                                    //console.log('Start Time:', starttime);
                                                }

                                                if (property[0] === 'dtend') {
                                                    endtime = property[3];
                                                    //console.log('End Time:', endtime);
                                                }
                                            }
                                        }
                                    }
                                }
                            });
                            var pushdata = {
                                email_id: emailId,
                                from: email,
                                start_time: starttime,
                                end_time: endtime,
                                meeting_link: meetlink,
                                subject: subject,
                                status: 1,
                            };
                            RoomQueries.createRoomSchedule(pushdata)
                            var jsondata =
                            {
                                "id": emailId,
                                "from": email,
                                "starttime": starttime,
                                "endtime": endtime,
                                "meetlink": meetlink,
                                "subject": subject

                            }
                            data.push(jsondata)
                        }
                    });
                });
            });
            fetch.once('end', () => {
                console.log('*********Running*********');
            });
        });
    }

    // Connect to the IMAP server
    imap.connect();

    // On successful connection
    imap.once('ready', () => {
        openInbox((err, box) => {
            if (err) {
                // console.error(err);
                // return res.status(500).json({ error: 'Error opening inbox' });
                console.log({ error: 'Error opening inbox' })
            }
            searchForEmails(['UNSEEN'], (err, emailIds) => {
                if (err) {
                    // console.error('Error searching for emails:', err);
                    console.log({ error: 'Error searching for emails' })
                    // return res.status(500).json({ error: 'Error searching for emails' });
                }
                if (emailIds.length > 0) {
                    fetchAndProcessEmails(emailIds);
                }
                imap.end();
            });
        });
    });

    // On error
    imap.once('error', (err) => {
        // console.error(err);
        console.log({ error: 'Error in IMAP connection', err })
        // res.status(500).json({ error: 'Error in IMAP connection' });
    });

    // On connection end
    imap.once('end', () => {
        var validatedata = data[0]?.from ? data[0]?.from : '';
        if (validatedata != '') {
            console.log({ success: 'Successfully receiving emails', data })
        }
        else {
            console.log("");
            console.log("******************************")
            console.log(">>> No Data Found In Inbox >>>");
            console.log("******************************")
            console.log("");
        }
    });
}

UserServices.FetchEmail = async () => {
    const data = await RoomQueries.fetchEmail();
    console.log("fetchEmailRecords", data.length);
    if (data.length > 0) {
        for (let index = 0; index < data.length; index++) {
            const element = data[index];
            console.log(element.id, element.from)
            // console.log(element)
            try {
                // const user= await UserQueries.getUserByEmail(element.from);
                const user = await UserQueries.getUserById(element.email_id);
                if (user.length > 0) {
                    console.log("");
                    console.log("******** Before Bot Auto Join *********");
                    console.log("******** element.email_id *********", element.email_id);
                    console.log("******** Before Bot Auto Join *********");
                    if (user[0].auto_join == true) {
                        console.log("");
                        console.log("******** In Bot Auto Join *********");
                        console.log("******** user[0].auto_join *********", user[0].auto_join);
                        console.log("******** In Bot Auto Join *********");
                        console.log("");

                        const findMeeting = await RoomQueries.validateRoom(element.meeting_link, element.start_time);
                        if (findMeeting.length > 0) {
                            console.log(">>>> room is created already on this meeting link and start time >>>>");
                        } else {
                            const response = await RoomServices.createEmailBot({
                                title: element.subject,
                                meetingLink: element.meeting_link,
                                agenda: element.subject,
                                otherContext: "",
                                fromEmail: element.from,
                                startTime: element.start_time,
                            })
                            console.log(response)
                            if (response.statusCode === 200) {
                                await RoomQueries.updateRoomSchedule({
                                    json_response: JSON.stringify(response.obj),
                                    status: 0
                                }, element.id);
                            } else {
                                console.log("Email user not found")
                            }
                        }
                    } else {
                        await RoomQueries.updateRoomSchedule({
                            json_response: JSON.stringify({ "auto_join": "false" }),
                            status: 0
                        }, element.id);
                    }
                }
            } catch (error) {
                console.error("CreateEmailBotError ", error.message);
            }
        }
    } else {
        console.log("");
        console.log("******************************")
        console.log(">>>>  No Schedule Data Found In DB >>>>");
        console.log("******************************")
        console.log("");
    }
};

UserServices.encryptInformation = async () => {
    const result = await CaseFilesQueries.getAllData();
    result.forEach(async row => {
        console.log(row.fileUuid);
        const encryptedData = {
            fileName: (row.fileName),
            filePath: (row.filePath)
        };
        console.log({ encryptedData });
        await CaseFilesQueries.updateData(encryptedData, row.fileUuid);
    });
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {}
    }
}


UserServices.saveMeetingScheduleList = async (arr, calendar_id, user_id) => {

    const data = []
    console.log("*****Saving Meeting Schedule*****")

    arr.forEach(elem => {
        const obj = {
            start_time: elem.start_time,
            end_time: elem.end_time,
            from: elem?.raw?.creator?.email ? elem?.raw?.creator?.email : elem?.raw?.organizer?.emailAddress?.address,
            subject: elem?.raw?.summary ? elem?.raw?.summary : elem?.raw?.subject,
            meeting_link: elem.meeting_url,
            event_id: elem.id,
            calendar_id,
            email_id: user_id,
            metadata: JSON.stringify(elem)
        }

        delete obj.id

        data.push(obj)
    })

    await MeetingScheduleQueries.bulkCreate(data);

    console.log("SAVED.........")

    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {}
    }
}

UserServices.updateCalendarEvent = async (obj, filter) => {
    const result = await CalendarQueries.update(obj, filter)

    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    }
}

UserServices.getCalendarEvents = async (id) => {

    const result = await CalendarQueries.getAll({ user_id: id });
    // const result = await CalendarQueries.getAll({});
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    }
}

UserServices.getAllCalendarEvents = async (filter = {}) => {

    const result = await CalendarQueries.getAll(filter);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    }
}

UserServices.encryptInformationRooms = async (start, end) => {
    const result = await RoomQueries.getAllRoomsInRange(start, end);

    const updatePromises = result.map(async (row) => {
        try {
            console.log(row.roomId);
            const encryptedData = {
                transcript: (row.transcript),
                actionItem: (row.actionItem),
                summary: (row.summary),
                mindMap: (row.mindMap),
                finalSummary: (row.finalSummary),
            };
            console.log({ encryptedData });
            await RoomQueries.updateRoom(encryptedData, row.roomId);
        } catch (error) {
            console.error(`Error updating room ${row.roomId}:`, error);
        } finally {
            console.log("done");
        }
    });

    await Promise.all(updatePromises);

    console.log("finish");

    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {}
    };
};

UserServices.Encryption = async (start) => {
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {
            lowercase: start.toLowerCase(),
            encrypted: Encryption.encryptSensitiveData(start),
            decrypted: Encryption.decryptSensitiveData(start),
            decrypteddecrypted: Encryption.decryptSensitiveData(Encryption.decryptSensitiveData(start))
        }
    };
};

UserServices.EncryptionCollective = async (start) => {
    const data = []
    for (const element of start) {
        data.push(Encryption.encryptSensitiveData(element))
    }
    if (data.length > 0) {
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                all: `${"email IN('"}` + data.join("', '") + `${"')"}`,
                data: data,
            }
        };

    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        }
    }
};

UserServices.encryptModule = async (obj) => {
    var element = "nothing to encrypt or decrypt";
    if (obj.todo === 'encrypt') {
        element = Encryption.encryptSensitiveData(obj.element)
    } else if (obj.todo === 'decrypt') {
        element = Encryption.decryptSensitiveData(obj.element)
    }
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: element
    }
}

UserServices.getStripeIntent = async (userId) => {
    try {
        const userInfo = await UserQueries.getUser(userId);
        console.log(JSON.stringify(userInfo))
        if (!userInfo.customerStripeId) {
            const registerUser = await Payments.addNewCustomer(userInfo.email);
            await UserQueries.updateUser({ customerStripeId: registerUser.id }, userInfo.userId);
            userInfo.customerStripeId = registerUser.id;
        }
        const intent = await Payments.setupIntent(userInfo.customerStripeId);
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                customerId: userInfo.customerStripeId,
                clientSecret: intent.client_secret,
            }
        };
    } catch (error) {
        return {
            message: error.message,
            statusCode: 400,
            obj: {}
        };
    }
}
UserServices.listPaymentMethods = async (userId) => {
    try {
        const userInfo = await UserQueries.getUser(userId);
        console.log({userInfo})
        if (userInfo.customerStripeId) {
            const list = await Payments.listPaymentMethods(userInfo.customerStripeId);
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: list.data.map(l => {
                    return {
                        exp_year: l.card.exp_year,
                        exp_month: l.card.exp_month,
                        cardNumber: l.card.last4,
                        brand: l.card.brand
                    };
                })
            };
        } else {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: []
            };
        }
    } catch (error) {
        return {
            message: error.message,
            statusCode: 400,
            obj: {}
        };
    }
}


UserServices.postUser = async (obj = {}) => {
    obj.userTypeId = 2;
    obj.expiryToken = Functions.getTokenExpiry();
    obj.refreshTokenExpiry = Functions.getTokenExpiry();
    obj.email = obj.email.toLowerCase()
    obj.isRemoved = true //comment this line to enable access grant logic
    var response = await UserQueries.getUsersByEmail(obj.email);
    if (response.length === 0) {
        try {
            slack.webhook(JSON.stringify({ action: "Signed Up", timestamp: new Date(), email: obj.email }));
        } catch (e) {
            console.log("slackPostError", e.message);
        }
        const hardcodedDateTime = new Date(2024, 11, 30); // December 31, 2024
        hardcodedDateTime.setHours(23, 59, 59, 999);
        // const sevenDaysLater = new Date(new Date().setDate(new Date().getDate() + 7));
        // obj.paymentExpiry = sevenDaysLater.toISOString().split('T')[0];
        obj.auto_join = 1;
        // obj.paymentExpiry = hardcodedDateTime.toISOString(); 
        obj.password = await Encryption.sha256(obj.password);
        var result = await UserQueries.createUser(obj);
        const user_id = result.userId;
        const tokenDetails = JWT.data.generate(user_id)
        const refreshTokenDetails = JWT.data.refreshToken(user_id)
        const updateToken = {
            token: tokenDetails.token,
            tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
            refreshToken: refreshTokenDetails.token,
            refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
        }

        Emails.emailVerification(obj.email, result.userUuid);
        //token will update here
        await UserQueries.updateUser(updateToken, user_id);
        //For Every User we need to create a default entry
        await UserPackageServices.create({
            packageId: process.env.DEFAULT_PACKAGE_ID,
        }, user_id);
        result = {
            email: result.email,
            token: updateToken.token,
            tokenExpiry: updateToken.tokenExpiry,
            refreshToken: updateToken.refreshToken,
            refreshTokenExpiry: updateToken.refreshTokenExpiry
        }
        return {
            message: Strings.SUCCESS_MESSAGES.SIGNED_UP,
            statusCode: 200,
            obj: result
        };
    } else {
        if (!response[0].isVerified) {
            Emails.emailVerification(obj.email, response.userUuid);
            return {
                message: Strings.ERROR.VERIFICATION_EMAIL,
                statusCode: 400,
                obj: {}
            };
        } else {
            return {
                message: Strings.ERROR.EMAIL_EXIST,
                statusCode: 400,
                obj: {}
            };
        }
    }
}
UserServices.ResendEmail = async (email) => {
    const user = await UserQueries.getUserByEmail(email);
    if (user.length > 0) {
        Emails.emailVerification(user[0].email, user[0].userUuid);
        return {
            message: Strings.ERROR.VERIFICATION_EMAIL,
            statusCode: 200,
            obj: {}
        };
    }
    else {
        return {
            statusCode: 400,
            message: Strings.ERROR.EMAIL_NOT_EXISTS,
            obj: {}
        }
    }
}
UserServices.login = async (obj = {}) => {
    const result = await UserQueries.login(obj);
    if (result.length > 0) {
        if (!result[0].isVerified) {
            Emails.emailVerification(obj.email.toLowerCase(), result[0].userUuid);
            return {
                message: Strings.ERROR.VERIFICATION_EMAIL,
                statusCode: 400,
                obj: {}
            };
        }
        if (result[0].isRemoved == true) {
            return {
                message: Strings.ERROR.ACCESS_NOT_GRANTED,
                statusCode: 400,
                obj: {}
            };
        }
        const otpData = {
            email: obj.email.toLowerCase(),
            otpType: 1
        }
        return await OTPServices.post(otpData)
    } else {
        return {
            message: Strings.ERROR.INVALID_CREDS,
            statusCode: 400,
            obj: {}
        };
    }
}

UserServices.guestLogin = async (obj = {}) => {
    const result = await UserQueries.login(obj);
    if (result.length > 0) {
        const user_id = result[0].userId;
        const tokenDetails = JWT.data.generate(user_id)
        const refreshTokenDetails = JWT.data.refreshToken(user_id)
        const updateToken = {
            token: tokenDetails.token,
            tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
            refreshToken: refreshTokenDetails.token,
            refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
        }
        await UserQueries.updateUser(updateToken, user_id);
        //token updated
        //For Every User we need to create a default entry
        // await UserPackageServices.create({
        //     packageId: process.env.DEFAULT_PACKAGE_ID,
        // }, user_id);
        result[0].token = updateToken.token;
        result[0].tokenExpiry = updateToken.tokenExpiry;
        result[0].refreshToken = updateToken.refreshToken;
        result[0].refreshTokenExpiry = updateToken.refreshTokenExpiry;
        return {
            message: Strings.SUCCESS_MESSAGES.LOGGED_IN,
            statusCode: 200,
            obj: result[0]
        };
    } else {
        return {
            message: Strings.ERROR.INVALID_CREDS,
            statusCode: 400,
            obj: {}
        };
    }
}

const checkSocialLogin = (iss = "") => {
    if (iss.includes("google")) {
        return "google"
    } else if (iss.includes("microsoft")) {
        return "microsoft"
    } else {
        return "unknown"
    }
}

UserServices.socialLogin = async (obj = {}) => {
    const socialLogin = checkSocialLogin(obj.iss);
    let result = await UserQueries.socialLogin(obj.email, socialLogin);
    if (result.length > 0) {
        if (result[0].isRemoved == true) {
            return {
                message: Strings.ERROR.ACCESS_NOT_GRANTED,
                statusCode: 400,
                obj: {}
            };
        }
        const user_id = result[0].userId;
        const tokenDetails = JWT.data.generate(user_id)
        const refreshTokenDetails = JWT.data.refreshToken(user_id)
        const updateToken = {
            token: tokenDetails.token,
            tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
            refreshToken: refreshTokenDetails.token,
            refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
        }
        await UserQueries.updateUser(updateToken, user_id);
        //token updated
        result[0].token = updateToken.token;
        result[0].tokenExpiry = updateToken.tokenExpiry;
        result[0].refreshToken = updateToken.refreshToken;
        result[0].refreshTokenExpiry = updateToken.refreshTokenExpiry;
        result[0].email = Encryption.decryptSensitiveData(result[0].email)
        //Subscription type
        if (result[0].subscription == 1) {
            result[0].subscription = true
        }
        else {
            result[0].subscription = false
        }
        return {
            message: Strings.SUCCESS_MESSAGES.LOGGED_IN,
            statusCode: 200,
            obj: result[0]
        };
    } else {
        //sign up the user here
        let socialObj = {}
        var response = await UserQueries.getUsersByEmail(obj.email);
        if (response.length === 0) {
            socialObj.socialLogin = socialLogin;
            socialObj.userTypeId = 2;
            socialObj.subscriptionType = obj.subscriptionType;
            socialObj.email = obj.email
            socialObj.firstName = obj.family_name
            socialObj.lastName = obj.given_name
            socialObj.isVerified = obj.email_verified
            socialObj.profilePic = obj.picture
            socialObj.expiryToken = Functions.getTokenExpiry();
            socialObj.refreshTokenExpiry = Functions.getTokenExpiry();
            const stripeCustomer = await Payments.addNewCustomer(obj.email);
            socialObj.customerStripeId = stripeCustomer.id;
            var createResult = await UserQueries.createUser(socialObj);
            const user_id = createResult.userId;

            //For Every User we need to create a default entry
            await UserPackageServices.create({
                packageId: process.env.DEFAULT_PACKAGE_ID,
            }, user_id);
            const tokenDetails = JWT.data.generate(user_id)
            const refreshTokenDetails = JWT.data.refreshToken(user_id)
            const updateToken = {
                token: tokenDetails.token,
                tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
                refreshToken: refreshTokenDetails.token,
                refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
            }
            //
            await UserQueries.updateUser(updateToken, user_id);
            const result = await UserQueries.getUser(user_id)
            createResult = {
                firstName: socialObj.firstName,
                lastName: socialObj.lastName,
                email: createResult.email,
                token: updateToken.token,
                tokenExpiry: updateToken.tokenExpiry,
                refreshToken: updateToken.refreshToken,
                refreshTokenExpiry: updateToken.refreshTokenExpiry,
                subscription: result.subscription == 1 ? true : false,
                subscriptionType: result.subscriptionType
            }
            slack.webhook(JSON.stringify({ action: "Social Signed Up", timestamp: new Date(), email: obj.email, userId: user_id }));
            return {
                message: Strings.SUCCESS_MESSAGES.SIGNED_UP,
                statusCode: 200,
                obj: createResult
            };
        } else {
            return {
                message: "This user has already been registered",
                statusCode: 400,
                obj: {}
            };
        }

    }
}

UserServices.adminLogin = async (obj = {}) => {
    const result = await UserQueries.adminLogin(obj);
    if (result.length > 0) {
        const user_id = result[0].userId;
        const tokenDetails = JWT.data.generate(user_id)
        const refreshTokenDetails = JWT.data.refreshToken(user_id)
        const updateToken = {
            token: tokenDetails.token,
            tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
            refreshToken: refreshTokenDetails.token,
            refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
        }
        await UserQueries.updateUser(updateToken, user_id);
        //token updated
        result[0].token = updateToken.token;
        result[0].tokenExpiry = updateToken.tokenExpiry;
        result[0].refreshToken = updateToken.refreshToken;
        result[0].refreshTokenExpiry = updateToken.refreshTokenExpiry;
        return {
            message: Strings.SUCCESS_MESSAGES.LOGGED_IN,
            statusCode: 200,
            obj: result[0]
        };
    } else {
        return {
            message: Strings.ERROR.INVALID_CREDS,
            statusCode: 400,
            obj: {}
        };
    }
}

UserServices.getUsers = async () => {
    const result = await UserQueries.getUsers();
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserServices.getUser = async (userId) => {
    const result = await UserQueries.getUser(userId);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserServices.getUsageInfo = async (userId) => {
    const result = await RoomServices.SendReportDaily(userId);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserServices.getAllPrompt = async () => {
    const result = await UserQueries.getAllPrompts();
    if (result.length > 0) {
        const tableHeader = '<tr><th>' + Object.keys(result[0]).join('</th><th>') + '</th></tr>';
        const tableRows = result.map(obj => '<tr><td>' + Object.values(obj).join('</td><td>') + '</td></tr>');
        const table = '<table border="1">' + tableHeader + tableRows.join('') + '</table>';
        const emails = process.env.USER_PROMPTS_RECEIVER.split(',');
        console.log(emails);
        emails.forEach(e => {
            Emails.ReportSummary(e, 'Daily Prompt Usage of All User', table);
        })
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
        };
    } else {
        return {
            message: Strings.ROOM.EMPTY,
            statusCode: 200,
            obj: {}
        };
    }
}


UserServices.updateUser = async (obj, userId) => {
    await UserQueries.updateUser(obj, userId);
    const result = await UserQueries.getUser(userId);
    return {
        message: Strings.SUCCESS_MESSAGES.INFORAMATION_UPDATED,
        statusCode: 200,
        obj: result
    };
}

UserServices.deActivateUser = async (data) => {
    try {
        if (data.enable == true || data.enable == false && data.email) {
            const obj = {
                isRemoved: data.enable == true ? false : data.enable == false ? true : ""
            }
            const details = await UserQueries.deActivateUser(obj, data.email);
            if (details[0] == '1') {
                return {
                    message: data.enable == true ? Strings.USER.ACTIVATION_SUCCESSFULLY : Strings.USER.DEACTIVATION_SUCCESSFULLY,
                    statusCode: 200,
                    obj: {}
                };
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                };
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error while deactivation or activation of user", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

UserServices.subscription = async (data) => {
    try {
        if (data.subscription == true || data.subscription == false && data.email) {
            const obj = {
                subscription: data.subscription
            }
            const details = await UserQueries.deActivateUser(obj, data.email);
            if (details[0] == '1') {
                return {
                    message: data.subscription == true ? Strings.USER.USER_TIER_CONVERTED_SUCCESSFULLY : Strings.USER.USER_TIER_FREE,
                    statusCode: 200,
                    obj: {}
                };
            } else {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {}
                };
            }
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error while updating subscription of user", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

UserServices.verifyUser = async (userId) => {
    await UserQueries.updateUserByUUID({ isVerified: true }, userId);
    return {
        message: Strings.SUCCESS_MESSAGES.VERIFIED,
        statusCode: 200,
        obj: {}
    };
}

UserServices.passwordUpdated = async (obj, userId) => {
    const result = await UserQueries.checkUserIdAndPassword(userId, await Encryption.sha256(obj.currPassword));
    if (result.length > 0) {
        await UserQueries.updateUser({ password: await Encryption.sha256(obj.newPassword) }, userId);
        // Emails.newPassword(validation[0].email);
        return {
            message: Strings.SUCCESS_MESSAGES.PASSWORD_UPDATED,
            statusCode: 200,
            obj: result[0]
        };
    } else {
        return {
            message: Strings.ERROR.CURR_PASSWORD_WRONG,
            statusCode: 400,
            obj: {}
        };
    }
}

UserServices.openPasswordUpdated = async (obj, email) => {
    const p = await Encryption.sha256(obj.password);
    // console.log("");
    // console.log("obj.password", obj.password);
    // console.log("password encryption", p);
    // console.log("email", email);
    // console.log("");
    const updateData = await UserQueries.updateUserByEmail({ password: p }, email);
    // console.log("updateData");
    // console.log("updateData",updateData);
    // console.log("updateData");
    //Emails.newPassword(obj.email);
    return {
        message: Strings.SUCCESS_MESSAGES.PASSWORD_UPDATED,
        statusCode: 200,
        obj: {}
    };
}

UserServices.uploadImage = async (userId, file) => {
    const obj = {}
    obj.profilePic = file.filename;
    await UserQueries.updateUser(obj, userId);
    const result = await UserQueries.getUser(userId)
    return {
        message: Strings.SUCCESS_MESSAGES.IMAGE_UPLOADED,
        statusCode: 200,
        obj: result
    };
}

UserServices.createPrompt = async (obj) => {
    const json = (await JSONs()).prompts
    await UserQueries.createPrompt(json);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {}
    };
}

UserServices.createSinglePrompt = async (obj) => {
    await UserQueries.createSinglePrompt(obj);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: {}
    };
}

UserServices.getPrompts = async () => {
    const prompts = await UserQueries.getPrompts();
    const json = (await JSONs()).promptType
    prompts.forEach(p => {
        const promptType = json.find(t => t.id === p.type);
        p.promptType = promptType.type;
    })
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: prompts
    };
}

const makeRequest = (value, data) => {
    try {
        let message = data.prompt.replace("<value_goes_here>", value);
        message = message.replace(/\n/g, '\\n');
        // message = JSON.stringify(message);
        message = JSON.parse(message);
        let request = JSON.parse(data.request);
        request.messages = message;
        return request;
    } catch (e) {
        console.log(e.message);
        console.log({ request, exception: e.message, botId }, "makeRequest: " + data.request);
        Logger.data.chatGPTException({ request, exception: e.message, botId }, "makeRequest: " + data.request);
        return null
    }
}

const sortRequests = (lists = [], transcript = "") => {
    const requests = []
    lists.forEach(item => {
        requests.push({
            requests: makeRequest(transcript, item),
            type: item.type
        });
    });

    return requests;
}

UserServices.getPromptsRequest = async () => {
    const prompts = await UserQueries.getPrompts();
    const promptRequests = sortRequests(prompts, " [Transcript]\n\n[Fatima Zohra]: They told me I had to call, but I think it's better to communicate openly during the pandemic. I hope we can be consistent. I had a fight with my dad after waking up and finding out my mom left the house. We had to search for her and discovered she made the biggest decision of her life - getting a divorce. It was shocking, but we had to accept it. Three months later, instead of feeling defeated, I felt motivated to do what I needed to do. We need to be efficient going forward. Can we please set a date? I struggle to speak English, but I'm willing to make an effort. I think this experience has motivated me to improve. So, moving forward, I apologize for any inconvenience caused. I suggested meeting in three days to discuss our goals. I want everyone to be on the same page.");
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: promptRequests
    };
}

UserServices.getPromptType = async () => {
    const json = (await JSONs()).promptType
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: json
    };
}

UserServices.uploadStandAloneImage = async (file) => {
    const obj = {}
    obj.profilePic = file.filename;
    return {
        message: Strings.SUCCESS_MESSAGES.IMAGE_UPLOADED,
        statusCode: 200,
        obj: {
            image: file.filename,
            url: backendBaseUrl + upload_folder_name + file.filename
        }
    };
}


UserServices.getPopup = async (userId) => {
    const result = await UserQueries.getPopup(userId);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserServices.setPopup = async (userId, status) => {
    if (status == false) {
        const obj = {}
        obj.popup = 0;
        const result = await UserQueries.setPopup(userId, obj);
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: result
        };
    } else {
        return {
            message: Strings.UNVALID_STATUS,
            statusCode: 200,
        };
    }
}

UserServices.botName = async (userId, botName) => {
    const obj = {
        botName: botName
    }
    const result = await UserQueries.updateBotNameByID(obj, userId);
    if (result.length > 0) {
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {
                message: Strings.BOT.BOT_NAME
            }
        };
    } else {
        return {
            message: Strings.SUCCESS,
            statusCode: 200,
            obj: {}
        };
    }
}

UserServices.retrivebotName = async (userId) => {
    const result = await UserQueries.getBotName(userId);
    return {
        message: Strings.SUCCESS,
        statusCode: 200,
        obj: result
    };
}

UserServices.fetchPrompt = async (type) => {
    try {
        const data = await UserQueries.getPromptByType(type)
        if (data.length > 0) {
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: data
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting prompts based on type's", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }

}

UserServices.getLLMPrompt = async (type) => {
    try {
        const data = await UserQueries.getPromptByType(type)
        if (data.length > 0) {
            return {
                statusCode: 200,
                message: Strings.SUCCESS,
                obj: JSON.parse(data[0]?.prompt)
            }
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            }
        }
    } catch (error) {
        console.log("error in getting LLM prompts based on type's", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

UserServices.postCitation = async (data, userId) => {
    try {
        const obj = {
            isCitation: data.enable === true ? true : data.enable === false ? false : ''
        }
        const result = await UserQueries.updateCitation(obj, userId);
        if (result[0] == '1') {
            return {
                message: Strings.RECORD_UPDATE_SUCCESS,
                statusCode: 200,
                obj: {}
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("error in updating citation record", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

UserServices.getCitation = async (userId) => {
    try {
        const result = await UserQueries.getCitation(userId);
        if (result.length > 0) {
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: result
            };
        } else {
            return {
                message: Strings.ROOM.EMPTY,
                statusCode: 200,
                obj: {}
            };
        }
    } catch (error) {
        console.log("error in getting citation record", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        }
    }
}

UserServices.refreshToken = async (refreshToken) => {
    try {
        if (refreshToken) {
            const decoded = await JWT.data.verifyRefreshToken(refreshToken);
            if (!decoded) {
                return {
                    message: Strings.ERROR.SOME_THING_WENT_WRONG,
                    statusCode: 400,
                    obj: {
                        message: Strings.JWT.INVALID_JWT_TOKEN
                    }
                };
            }
            const user = await UserQueries.getUser(decoded);
            if (!user) {
                return {
                    message: Strings.ROOM.EMPTY,
                    statusCode: 200,
                    obj: {},
                };
            }
            const tokenDetails = JWT.data.generate(user.userId)
            const refreshTokenDetails = JWT.data.refreshToken(user.userId)
            const updateToken = {
                token: tokenDetails.token,
                tokenExpiry: moment(tokenDetails.tokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
                refreshToken: refreshTokenDetails.token,
                refreshTokenExpiry: moment(refreshTokenDetails.refreshTokenExpiry).format('YYYY-MM-DD HH:mm:ss'),
            }
            await UserQueries.updateUser(updateToken, user.userId);
            return {
                message: Strings.SUCCESS,
                statusCode: 200,
                obj: updateToken
            };
        } else {
            return {
                message: Strings.UNVALID_STATUS,
                statusCode: 400,
                obj: {}
            }
        }
    } catch (error) {
        console.log("Error refreshing token:", error);
        return {
            message: Strings.ERROR.SOME_THING_WENT_WRONG,
            statusCode: 400,
            obj: {
                error: error.message
            }
        };
    }
}

module.exports = UserServices;