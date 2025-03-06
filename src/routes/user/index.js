const express = require("express");
const router = express.Router();

const { userSignup, validateOTP, loginHandler, getUpcomingTrips, getAllTrips } = require('../../controllers/userController');
const authenticateUser = require("../../middlewares/authenticateUser");


router.post("/signup", userSignup);
router.post("/validateOtp", validateOTP);
router.get("/login", loginHandler);
router.get("/upcomingTrips", authenticateUser, getUpcomingTrips);
router.get("/allUserTrips", authenticateUser, getAllTrips)

module.exports = router;