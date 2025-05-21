const express = require("express");
const router = express.Router();

const { getTripsHandler, tripJoinReq, getUserActiveRequests, getPassengerUpcomingTrips, getPassengerCompletedTrips, getPassengerOngoingTrips } = require("../../controllers/passengerController");
const authenticateUser = require("../../middlewares/authenticateUser");

router.post("/getTrips", authenticateUser, getTripsHandler );
router.post("/tripJoinReq", authenticateUser, tripJoinReq);
router.get("/getUserActiveRequests", authenticateUser, getUserActiveRequests);
router.get("/trips/upcoming", authenticateUser, getPassengerUpcomingTrips);
router.get("/trips/completed", authenticateUser, getPassengerCompletedTrips);
router.get("/trips/ongoing", authenticateUser, getPassengerOngoingTrips);






module.exports = router;