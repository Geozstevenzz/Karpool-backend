const express = require("express");
const router = express.Router();

router.post("/sendMessage", () => {console.log('Send Message Handler\n')});
router.post("/login", () => {console.log('Login Handler\n')});
router.post("/register", () => {console.log('Register |Handler\n')});

module.exports = router;