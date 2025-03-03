const express = require("express");
const router = express.Router();

const { createTripHandler } = require("../../controllers/driverController");

router.post("/createTrip", createTripHandler );


module.exports = router;