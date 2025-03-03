const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const driverRoutes = require('./driver/index');
const passengerRoutes = require('./passenger');
const userRoutes = require('./user');

//router.use('/auth', authRoutes);
router.use('/driver', driverRoutes);
router.use('/passenger', passengerRoutes);
//router.use('/user', userRoutes)

module.exports = router