const pool = require('../utils/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendOtp = require('../utils/otp');
require('dotenv').config();


const userSignup = async (req, res) => {
    console.log("Signup enterd");
    try {
        const { name, email, phone, address, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        let otp = Math.random().toFixed(6);
        otp = (otp * 1000000).toString();
        console.log(otp);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 10 minutes

        
        if (!name || !phone || !email || !address || !password) {
            return res.status(400).json({ error: "Some data is missing." });
        }

        const existingUser = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered" });
        }
        
        const query = `
            INSERT INTO Users (UserName, UserPhone, email, address, password, otp, otp_expiry)
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
        `;

        const values = [name, phone, email, address, hashedPassword, otp || null, otpExpiry || null];

        const { rows } = await pool.query(query, values);
        await sendOtp(email, phone, otp);

        res.status(201).json({ message: "User registered successfully", user: rows[0] });
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const validateOTP = async (req, res) => {
    const { email, phone, otp } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE (email = $1 OR userphone = $2) AND otp = $3 AND otp_expiry > NOW()',
            [email, phone, otp]
        );

        if (result.rowCount === 0) {
            return res.status(400).send({ error: 'Invalid or expired OTP' });
        }

        await pool.query(
            'UPDATE users SET otp = NULL, otp_expiry = NULL WHERE email = $1 OR userphone = $2',
            [email, phone]
        );

        res.send({ message: 'OTP validated successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error during OTP validation' });
    }
};

const loginHandler = async (req, res) => {
    const { email, password, platform } = req.body;

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (result.rowCount === 0) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: `${process.env.JWT_EXPIRES_IN}h` });


        if (platform === 'web') {
            // Web: Set the token in an HTTP-only cookie
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Enable in production (HTTPS only)
                sameSite: 'strict', // Prevent CSRF attacks
                maxAge: 3600000, // 1 hour
            });
            res.send({ user });
        } else {
            // Mobile: Return the token in the response body
            res.send({ user,token });
        }

    } catch (error) {
        console.log(error)
        res.status(500).send({ error: 'Error during login' });
    }
};



module.exports = { userSignup, validateOTP, loginHandler }