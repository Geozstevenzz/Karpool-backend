const express = require("express");
const router = express.Router();

const { userSignup, validateOTP } = require('../../controllers/userController');


router.post("/signup", userSignup);
router.post("/validateOtp", validateOTP);

module.exports = router;