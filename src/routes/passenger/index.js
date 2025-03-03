const express = require("express");
const router = express.Router();

const { getTripsHandler } = require("../../controllers/passengerController");

router.post("/getTrips", getTripsHandler );

module.exports = router;