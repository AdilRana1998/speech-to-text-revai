const { google } = require('googleapis');
const { urls, keys } = require('../../config');

const oauth2Client = new google.auth.OAuth2(
    keys.googleOAuthClientId,
    keys.googleOAuthClientSecret,
    urls.frontend
);

const scopes = [
    'https://www.googleapis.com/auth/calendar.events.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
];

// Generate a url that asks permissions for the Drive activity scope
const authorizationUrl = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',
    /** Pass in the scopes array defined above.
      * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
    scope: scopes,
    prompt: 'consent',
    // Enable incremental authorization. Recommended as a best practice.
    include_granted_scopes: true
});

const getToken = async (code) => {
    let { tokens } = await oauth2Client.getToken(code);
    // oauth2Client.setCredentials(tokens);
    return tokens;
}


// exports.getURL = (state) => {
//     const params = {
//         client_id: keys.googleOAuthClientId,
//         redirect_uri: urls.frontend,
//         response_type: "code",
//         scope: [
//             "https://www.googleapis.com/auth/calendar.events.readonly",
//             "https://www.googleapis.com/auth/userinfo.email",
//         ].join(" "),
//         access_type: "offline",
//         prompt: "consent",
//         state: JSON.stringify(state),
//     };

//     const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
//     url.search = new URLSearchParams(params).toString();

//     return url.toString();
// }

// const getToken = async (code) => {
//     const params = {
//         client_id: keys.googleOAuthClientId,
//         client_secret: keys.googleOAuthClientSecret,
//         redirect_uri: urls.frontend,
//         grant_type: "authorization_code",
//         code,
//     };

//     const url = new URL("https://oauth2.googleapis.com/token");
//     const response = await fetch(url.toString(), {
//         method: "POST",
//         body: new URLSearchParams(params),
//     });

//     return await response.json();
// }

const revokeToken = (token) => {
    return new Promise((resolve, reject) => {
        oauth2Client.revokeToken(token, (err, response) => {
            if (err) {
                console.error('Error revoking access token:', err);
                resolve(err)
            } else {
                console.log('Access token revoked', response);
                resolve(response)
            }
        });
    })
}

// revoke()


module.exports = {
    authorizationUrl, getToken, revokeToken
}