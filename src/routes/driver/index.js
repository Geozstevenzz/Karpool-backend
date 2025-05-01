const express = require("express");
const router = express.Router();

const { createTripHandler, acceptPassengerReq, registerVehicle, rejectPassengerReq, tripCompleted, getTripRequests, tripStart, uploadVehiclePicture, getUserIdhandler } = require("../../controllers/driverController");
const authenticateUser = require("../../middlewares/authenticateUser");
const upload = require('../../middlewares/upload');

router.post("/createTrip", authenticateUser, createTripHandler );
router.post("/registerVehicle",authenticateUser, registerVehicle);
router.post("/acceptPassengerReq",authenticateUser, acceptPassengerReq)
router.post("/rejectPassengerReq", authenticateUser, rejectPassengerReq);
router.post("/trips/:tripId/complete", authenticateUser, tripCompleted);
router.post("/trips/:tripId/start", authenticateUser, tripStart);
router.get("/trips/:tripId/requests", authenticateUser, getTripRequests);
router.post("/vehicle/photo/upload", authenticateUser, upload.single('vehicle_picture'), uploadVehiclePicture);
router.get("/getUserId/:driverId", authenticateUser, getUserIdhandler)


module.exports = router;