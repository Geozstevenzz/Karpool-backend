const express = require("express");
const router = express.Router();

const { getTripsHandler } = require("../../controllers/passengerController");
const authenticateUser = require("../../middlewares/authenticateUser");

router.post("/getTrips", authenticateUser, getTripsHandler );

module.exports = router;