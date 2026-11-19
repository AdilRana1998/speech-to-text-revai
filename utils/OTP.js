const crypto = require('crypto');

// Function to generate a random 6-digit OTP
function generateOTP() {
    const otp = Math.floor(1000 + Math.random() * 9000); // Generate a random 4-digit number
    return otp.toString(); // Convert to string to ensure it's 4 digits
}

// Function to hash an OTP using SHA-256
function hashOTP(otp) {
    const hash = crypto.createHash('sha256');
    hash.update(otp);
    return hash.digest('hex');
}

module.exports = {
    hashOTP, generateOTP
}