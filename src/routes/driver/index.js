const express = require("express");
const router = express.Router();

const { createTripHandler, acceptPassengerReq, registerVehicle, rejectPassengerReq } = require("../../controllers/driverController");
const authenticateUser = require("../../middlewares/authenticateUser");

router.post("/createTrip", authenticateUser, createTripHandler );
router.post("/registerVehicle",authenticateUser, registerVehicle);
router.post("/acceptPassengerReq",authenticateUser, acceptPassengerReq)
router.post("/rejectPassengerReq", authenticateUser, rejectPassengerReq);


module.exports = router;