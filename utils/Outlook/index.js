const { keys, urls } = require("../../config");

exports.getURL = () => {
      const params = {
            client_id: keys.outlookOAuthClientId,
            redirect_uri: urls.frontend,
            // redirect_uri: "https://kolabrya.ai/success",
            response_type: "code",
            scope: "offline_access openid email https://graph.microsoft.com/Calendars.Read",
            // prompt: "consent",
            // state: JSON.stringify(state),
      };

      const url = new URL(
            "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
      );
      url.search = new URLSearchParams(params).toString();

      return url.toString();
}

exports.getToken = async (code) => {
      const params = {
            client_id: keys.outlookOAuthClientId,
            client_secret: keys.outlookOAuthSecret,
            redirect_uri: urls.frontend,
            // redirect_uri:
            //       process.env.PUBLIC_URL + "/oauth-callback/microsoft-outlook",
            grant_type: "authorization_code",
            code,
      };
      const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/token");
      const response = await fetch(url.toString(), {
            method: "POST",
            body: new URLSearchParams(params),
      });

      return await response.json();
}
