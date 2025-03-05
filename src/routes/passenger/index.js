const express = require("express");
const router = express.Router();

const { getTripsHandler, tripJoinReq } = require("../../controllers/passengerController");
const authenticateUser = require("../../middlewares/authenticateUser");

router.post("/getTrips", authenticateUser, getTripsHandler );
router.post("/tripJoinReq", authenticateUser, tripJoinReq);

module.exports = router;