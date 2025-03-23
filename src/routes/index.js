const express = require('express');
const router = express.Router();

const driverRoutes = require('./driver/index');
const passengerRoutes = require('./passenger');
const userRoutes = require('./user');


router.use('/driver', driverRoutes);
router.use('/passenger', passengerRoutes);
router.use('/user', userRoutes)

module.exports = router