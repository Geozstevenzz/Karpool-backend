const express = require("express");
const router = express.Router();

const { userSignup, validateOTP, loginHandler, getUpcomingTrips, getAllTrips, submitReview, getReviewsForUser } = require('../../controllers/userController');
const authenticateUser = require("../../middlewares/authenticateUser");


router.post("/signup", userSignup);
router.post("/validateOtp", validateOTP);
router.post("/login", loginHandler);
router.get("/upcomingTrips", authenticateUser, getUpcomingTrips);
router.get("/allUserTrips", authenticateUser, getAllTrips);
router.post("/submitReview",  authenticateUser, submitReview);
router.get("/getReviews", authenticateUser, getReviewsForUser);

module.exports = router;