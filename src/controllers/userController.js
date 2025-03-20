const pool = require('../utils/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sendOtp = require('../utils/otp');
const cloudinary = require('../utils/cloudinaryConfig');
require('dotenv').config();


const userSignup = async (req, res) => {
    console.log("Signup enterd");
    try {
        const { name, email, phone, address, password, gender } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        let otp = Math.random().toFixed(6);
        otp = (otp * 1000000).toString();
        console.log(otp);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 10 minutes

        
        if (!name || !phone || !email || !address || !password || !gender) {
            return res.status(400).json({ error: "Some data is missing." });
        }

        const existingUser = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email already registered" });
        }
        
        const query = `
            INSERT INTO Users (UserName, UserPhone, email, address, password, otp, otp_expiry, gender)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
        `;

        const values = [name, phone, email, address, hashedPassword, otp || null, otpExpiry || null, gender];

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
            'SELECT users.userid, users.username, users.userphone, users.gender, users.userinterests, users.password, users.isdriver, users.profile_photo, users.email, users.address, drivers.driverid, vehicles.vehicleid FROM users LEFT JOIN drivers ON users.userid = drivers.userid LEFT JOIN vehicles ON vehicles.driverid = drivers.driverid WHERE email = $1 AND otp IS NULL',
            [email]
        );

        if (result.rowCount === 0) {
            return res.status(401).send({ error: 'No email found' });
        }

        const user = result.rows[0];
        
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.userid }, process.env.JWT_SECRET, { expiresIn: `${process.env.JWT_EXPIRES_IN}h` });


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

const getUpcomingTrips = async (req, res) => {
    try {
      const userID = req.user;
  
      const query = `
        SELECT t.*, u.username AS driverName
        FROM trips t
        JOIN drivers d ON t.driverid = d.driverid
        JOIN users u ON d.userid = u.userid
        WHERE t.tripdate >= CURRENT_DATE
        AND d.userid = $1
        ORDER BY t.tripdate ASC
      `;
  
      const { rows } = await pool.query(query, [userID]);
      res.status(200).json(rows);
    } catch (error) {
      console.error('Error fetching upcoming trips:', error);
      res.status(500).json({ error: 'An error occurred while fetching upcoming trips' });
    }
  };
  

const getAllTrips = async (req, res) => {
    try {
        const userId = req.user;

        const allTrips = await pool.query(
            `SELECT t.*, u.username AS driverName
            FROM trips t
            JOIN drivers d ON t.driverid = d.driverid
            JOIN users u ON d.userid = u.userid
            WHERE d.userid = $1 AND Status = 'completed'
            ORDER BY t.tripdate DESC`,
            [userId]
        );

        res.json({ allTrips: allTrips.rows });

    } catch (err) {
        console.error("Error fetching all trips:", err);
        res.status(500).json({ message: "Server error" });
    }
};

const submitReview = async (req, res) => {
    const {
      tripid,
      driverid,
      passengerid,
      reviewfrom,
      reviewfor,
      rating,
      review,
    } = req.body;
  
    if (!tripid || !driverid || !passengerid || !reviewfrom || !reviewfor || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
  
    if (!['driver', 'passenger'].includes(reviewfrom) || !['driver', 'passenger'].includes(reviewfor)) {
      return res.status(400).json({ error: 'Invalid reviewfrom or reviewfor value' });
    }
  
    if (reviewfrom === reviewfor) {
      return res.status(400).json({ error: 'reviewfrom and reviewfor cannot be the same' });
    }
  
    try {
      // Check if the trip exists and the driver is assigned to it
      const tripCheck = await pool.query(
        `SELECT driverid 
         FROM trips 
         WHERE tripid = $1 AND driverid = $2 AND status = 'completed'`,
        [tripid, driverid]
      );
  
      if (tripCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Trip not found or driver not assigned to this trip' });
      }
  
      // Check if the passenger is part of the trip
      const passengerCheck = await pool.query(
        `SELECT passengerid 
         FROM trippassengers 
         WHERE tripid = $1 AND passengerid = $2`,
        [tripid, passengerid]
      );
  
      if (passengerCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Passenger not part of this trip' });
      }
  
      // Insert the review into the database
      await pool.query(
        `INSERT INTO reviews ( tripid, passengerid, reviewfrom, reviewfor, rating, review)
         VALUES ($1, $2, $3, $4, $5, $6 )`,
        [ tripid, passengerid, reviewfrom, reviewfor, rating, review]
      );
  
      res.status(201).json({ message: 'Review submitted successfully.' });
    } catch (error) {
      console.error('Error submitting review:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

const getReviewsForUser = async (req, res) => {
    const userid = 21;

    try {
        
        // Get all reviews where the user is the one being reviewed
        const reviews = await pool.query(
            `
            SELECT 
                r.reviewid,
                r.tripid,
                r.reviewfrom,
                r.rating,
                r.review
            FROM reviews r
            JOIN trips t ON r.tripid = t.tripid
            WHERE 
                (r.reviewfor = 'driver' AND t.driverid = $1) OR
                (r.reviewfor = 'passenger' AND r.passengerid = $1)
            ORDER BY r.reviewid DESC
            `,
            [userid]
        );

        res.status(200).json({
            userid,
            reviews: reviews.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Internal server error" });
    }
};

const createBookmark =  async (req, res) => {
    const { userid, location, coordinates } = req.body;

    console.log("Inside createBookmark Function.")
    console.log("UserID:",userid);
    console.log("Location:",location);
    console.log("Coordinates:",coordinates);
    console.log('\n\n');
  
    // Validation
    if (!userid || !location || !coordinates.longitude || ! coordinates.latitude) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }
  
    try {
      // Insert bookmark
      const result = await pool.query(
        `INSERT INTO bookmarks (userid, location, coordinates) 
         VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326)) 
         RETURNING bookmarkid`,
        [userid, location, coordinates.longitude, coordinates.latitude]
      );
  
      if (result.rowCount === 0) {
        return res.status(409).json({ error: 'Something went wrong!!' });
      }
  
      return res.status(201).json({ message: 'Bookmark added successfully.' });
    } catch (error) {
      console.error('Error adding bookmark:', error);
      return res.status(500).json({ error: 'Database/server error' });
    }
  };
  
  
  const deleteBookmark = async (req, res) => {
    const { bookmarkid } = req.body;
    const userid = req.user;
  
    // Validation
    if (!bookmarkid) {
      return res.status(400).json({ error: 'Invalid request payload' });
    }
  
    try {
      const result = await pool.query(
        `DELETE FROM bookmarks WHERE bookmarkid = $1 AND userid = $2 RETURNING bookmarkid`,
        [bookmarkid, userid]
      );
  
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Bookmark does not exist' });
      }
  
      return res.status(200).json({ message: 'Bookmark removed successfully.' });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      return res.status(500).json({ error: 'Database/server error' });
    }
  };
  
  
const getAllBookmarks = async (req, res) => {
    const userid  = req.user;
  
    // Validation
    if (!userid) {
        return res.status(400).json({ error: 'Invalid userid' });
    }
  
    try {
        const result = await pool.query(
            `SELECT location, bookmarkid, ST_X(coordinates) AS longitude, ST_Y(coordinates) AS latitude FROM bookmarks WHERE userid = $1`,
            [userid]
        );
    
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No bookmarks found for user' });
        }
    
        return res.status(200).json({ userid, bookmarks: result.rows });
    } catch (error) {
        console.error('Error retrieving bookmarks:', error);
        return res.status(500).json({ error: 'Database/server error' });
    }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.user;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Wrap cloudinary upload_stream in a Promise
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'profile_pictures' },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      // Send the buffer to Cloudinary
      uploadStream.end(req.file.buffer);
    });

    // Store the image URL in Postgres
    const query = `UPDATE users SET profile_photo = $1 WHERE userid = $2`;
    await pool.query(query, [result.secure_url, userId]);

    console.log(result.secure_url);

    return res.status(200).json({ message: 'Profile picture updated', url: result.secure_url });

  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
};




module.exports = { userSignup, validateOTP, loginHandler, getUpcomingTrips, getAllTrips, submitReview, getReviewsForUser, createBookmark, deleteBookmark, getAllBookmarks, uploadProfilePicture }