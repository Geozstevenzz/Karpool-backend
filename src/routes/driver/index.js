const express = require("express");
const router = express.Router();

const { createTripHandler } = require("../../controllers/driverController");
const authenticateUser = require("../../middlewares/authenticateUser");
const { registerVehicle } = require("../../controllers/driverController");

router.post("/createTrip", authenticateUser, createTripHandler );
router.post("/registerVehicle",authenticateUser, registerVehicle);


module.exports = router;