const nodemailer = require('nodemailer');
require('dotenv').config();

const sendOtp = async (email, mobile_number, otp) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: `${process.env.GMAIL_USERNAME}@gmail.com`,
            pass: `${process.env.GMAIL_PASSWORD}`,
        },
        // can remove tls if required
        tls: {
            rejectUnauthorized: false, // bypass certificate verification
        },
    });

    const message = {
        from: `${process.env.GMAIL_USERNAME}@gmail.com`,
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}`,
    };

    try {
        await transporter.sendMail(message);
        console.log('OTP sent');
    } catch (error) {
        console.error('Error sending OTP:', error);
    }
};

module.exports = sendOtp;