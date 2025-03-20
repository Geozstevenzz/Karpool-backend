const express = require("express");
const router = express.Router();

const { userSignup, validateOTP, loginHandler, getUpcomingTrips, getAllTrips, submitReview, getReviewsForUser, createBookmark, deleteBookmark, getAllBookmarks, uploadProfilePicture  } = require('../../controllers/userController');
const authenticateUser = require("../../middlewares/authenticateUser");
const upload = require('../../middlewares/upload');


router.post("/signup", userSignup);
router.post("/validateOtp", validateOTP);
router.post("/login", loginHandler);
router.get("/upcomingTrips", authenticateUser, getUpcomingTrips);
router.get("/allUserTrips", authenticateUser, getAllTrips);
router.post("/submitReview",  authenticateUser, submitReview);
router.get("/getReviews", authenticateUser, getReviewsForUser);
router.post("/bookmark/create", authenticateUser, createBookmark);
router.post("/bookmark/delete", authenticateUser, deleteBookmark);
router.get("/bookmark/all", authenticateUser, getAllBookmarks);
router.post("/profile/photo/upload", authenticateUser, upload.single('profile_picture'), uploadProfilePicture);


module.exports = router;