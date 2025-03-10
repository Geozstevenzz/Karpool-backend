const express = require("express");
const router = express.Router();

const { createTripHandler, acceptPassengerReq, registerVehicle, rejectPassengerReq, tripCompleted, getTripRequests} = require("../../controllers/driverController");
const authenticateUser = require("../../middlewares/authenticateUser");

router.post("/createTrip", authenticateUser, createTripHandler );
router.post("/registerVehicle",authenticateUser, registerVehicle);
router.post("/acceptPassengerReq",authenticateUser, acceptPassengerReq)
router.post("/rejectPassengerReq", authenticateUser, rejectPassengerReq);
router.post("/trips/:tripId/complete", authenticateUser, tripCompleted)
router.post("/getTripRequests", authenticateUser, getTripRequests);


module.exports = router;