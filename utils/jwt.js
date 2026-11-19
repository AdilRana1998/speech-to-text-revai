const jwt = require('jsonwebtoken');
const token = {}
const secret_key = process.env.JWT_SECRET_KEY
const refresh_key = process.env.JWT_REFRESH_KEY
const expiry = "1h"
const refreshTokenExpiryTime = "30d"
const oss = "oss.kolabrya.ai"

token.generate = function (id) {
    const user = { id: id }
    const token = jwt.sign({ user }, secret_key, {
        expiresIn: expiry,
        issuer: oss,
        audience: id.toString()
    })
    const decoded = jwt.decode(token);
    const tokenExpiry = new Date(decoded.exp * 1000).toISOString();
    return { 
        token,
        tokenExpiry 
    }
}

token.refreshToken = function (id) {
    const user = { id: id }
    const token = jwt.sign({ user }, refresh_key, {
        expiresIn: refreshTokenExpiryTime,
        issuer: oss,
        audience: id.toString()
    })
    // Get expiry time from token
    const decoded = jwt.decode(token);
    const refreshTokenExpiry = new Date(decoded.exp * 1000).toISOString();
    return { 
        token,
        refreshTokenExpiry 
    }
}

token.verifyRefreshToken = function (token) {
    return new Promise((resolve, reject) => {
        jwt.verify(token, refresh_key, (err, payload) => {
            if (err) return reject(err)
            const user = payload.aud
            resolve(user)
        })
    })
}

token.getIdFromToken = function (bearertoken) {
    return new Promise((resolve, reject) => {
        if (!bearertoken) {
            return resolve({ status: false, message: "No token provided" });
        }
        const bearer = bearertoken.split(' ');
        if (bearer.length !== 2 || bearer[0] !== 'Bearer') {
            return resolve({ status: false, message: "Invalid token format" });
        }
        const token = bearer[1];
        jwt.verify(token, secret_key, {
            algorithms: ['HS256'],
            ignoreExpiration: false
        }, (err, decodedToken) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    return resolve({ status: false, message: "Token expired" });
                }
                return resolve({ status: false, message: "Invalid token" });
            }
            if (!decodedToken.user || !decodedToken.user.id) {
                return resolve({ status: false, message: "Invalid token payload" });
            }
            resolve({ status: true, id: decodedToken.user.id });
        });
    });
}

exports.data = token;