const express = require("express");
const router = express.Router();

const { getTripsHandler, tripJoinReq, getUserActiveRequests } = require("../../controllers/passengerController");
const authenticateUser = require("../../middlewares/authenticateUser");

router.post("/getTrips", authenticateUser, getTripsHandler );
router.post("/tripJoinReq", authenticateUser, tripJoinReq);
router.get("/getUserActiveRequests", authenticateUser, getUserActiveRequests)

module.exports = router;