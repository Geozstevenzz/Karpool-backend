const express = require("express");
const router = express.Router();

const { userSignup, validateOTP, loginHandler } = require('../../controllers/userController');


router.post("/signup", userSignup);
router.post("/validateOtp", validateOTP);
router.get("/login", loginHandler);

module.exports = router;