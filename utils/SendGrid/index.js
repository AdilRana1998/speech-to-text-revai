const { urls, keys, debugMode } = require('../../config')
const sgMail = require('@sendgrid/mail')
const email = 'info@kolabrya.com'
const emailTitle = 'Kolabrya AI'
const { templates } = require('./templates')
sgMail.setApiKey(keys.sendGridKey)

const emailVerification = async function (to, uuid) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        template_id: templates.verifyEmail.id,
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                redirectUrl: urls.emailVerification + uuid,
            },
        }],
    }
    return await genFunc(msg)
}


const insuranceEmailVerification = async function (to, uuid) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        },
        template_id: templates.magicLinkTemplate.id, 
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                redirectUrl: urls.insuranceMagicLink + uuid,
            },
        }],
    }
    return await genFunc(msg)
}


const finalSummary = async function (to, title, html) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        subject: 'Final Summary of ' + title,
        html: html
    }
    return await genFunc(msg)
}

const ReportSummary = async function (to, title, html) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        subject: title,
        html: html
    }
    return await genFunc(msg)

}

const newPassword = async function (to) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        template_id: templates.newpasswordAlert.id,
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                redirectUrl: updated_password_url,
            },
        }],
    }
    return await genFunc(msg)
}

const forgotPassword = async function (to, uuid) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        template_id: templates.forgotPassword.id,
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                redirectUrl: urls.frontend + "changePassword/" + uuid,
            },
        }],
    }
    return await genFunc(msg)
}

const paymentSuccess = async function (to, amount) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        template_id: templates.paymentSuccess.id,
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                amount: amount,
                logoUrl: logo_url,
                currency: "$",
                redirectUrl: updated_password_url,
            },
        }],
    }
    return await genFunc(msg)
}

const paymentFailure = async function (to, amount) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        template_id: templates.paymentFails.id,
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                amount: amount,
                logoUrl: logo_url,
                currency: "$",
                redirectUrl: updated_password_url,
            },
        }],
    }
    return await genFunc(msg)
}

const roomEmail = async function (to, uuid) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        template_id: templates.roomEmail.id,
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                redirectUrl: urls.frontend + 'room/' + uuid,
            },
        }],
    }
    return await genFunc(msg)
}

const packageExpired = async function (to, paymentExpiry) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        template_id: templates.packageExpired.id,
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                paymentExpiry: paymentExpiry,
            },
        }],
    }
    return await genFunc(msg)
}

const sendsyncEmail = async function (to) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        },
        template_id: templates.agendaBot.id, // add the template id currently we are using old one
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                redirectUrl: urls.frontend + 'login/',
            },
        }],
    }
    return await genFunc(msg)
}

const agendabotJoin = async function (to, url) {
    const msg = { 
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        }, // Change to your verified sender
        template_id: templates.roomEmail.id, // add the template id currently we are using old one
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                redirectUrl: url,
            },
        }],
    }
    return await genFunc(msg)
}

const genFunc = (msg) => {
    return new Promise(function (resolve, reject) {
        resolve({ status: true })
        sgMail
            .send(msg)
            .then(() => {
                console.log('Email sent')
                resolve({
                    status: true,
                    message: "Email sent"
                })
            })
            .catch((error) => {
                console.error(error)
                if (debugMode) {
                    reject(error)
                } else {
                    resolve(error)
                }

            })
    })
}

const sendOTP = async function (to, title, otpCode) {
     const msg = { 
        to: to,
        from: {
            email: email,
            name: emailTitle, 
        },
        subject: title,
        template_id: templates.otp.id, 
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                code: otpCode,
            },
        }],
    }
    return await genFunc(msg);
}

const sendAttachment = async function (to, title, attachments) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle,
        },
        template_id: templates.insReportAttachment.id,
        attachments: attachments
    }
    return await genFunc(msg)
}

const insReportError = async function (to, title) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        },
        template_id: templates.insReportError.id,
        personalizations: [{
            to: { email: to }
        }],
    }
    return await genFunc(msg)
}

const insReportErrorWithFileName = async function (to, emailErrorText) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        },
        template_id: templates.insReportErrorWithFileName.id,
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                errorText: emailErrorText,
            },
        }],
    }
    return await genFunc(msg)
}

const insReportSuccess = async function (to, title, successText) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        },
        template_id: templates.insReportSuccess.id,
        personalizations: [{
            to: { email: to },
            // dynamic_template_data: {
            //     successText: successText,
            // },
        }],
    }
    return await genFunc(msg)
}

const sendCustomReport = async function (to, title, otpCode) {
     const msg = { 
        to: to,
        from: {
            email: email,
            name: emailTitle, 
        },
        subject: title,
        template_id: templates.sendCustomReport.id, 
        personalizations: [{
            to: { email: to },
            dynamic_template_data: {
                code: otpCode,
            },
        }],
    }
    return await genFunc(msg);
}

const medicalInjuryReport = async function (to) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        },
        template_id: templates.medicalInjuryReport.id,
        personalizations: [{
            to: { email: to },
        }],
    }
    return await genFunc(msg)
}

const medicalDraftReport = async function (to) {
    const msg = {
        to: to, // Change to your recipient
        from: {
            email: email,
            name: emailTitle, 
        },
        template_id: templates.medicalDraftReport.id,
        personalizations: [{
            to: { email: to },
        }],
    }
    return await genFunc(msg)
}

module.exports = {
    medicalDraftReport, medicalInjuryReport, sendCustomReport, sendOTP, emailVerification, packageExpired, paymentFailure, paymentSuccess, forgotPassword, newPassword, finalSummary, ReportSummary, roomEmail, sendsyncEmail, agendabotJoin, sendAttachment, insReportError, insuranceEmailVerification, insReportSuccess, insReportErrorWithFileName
}