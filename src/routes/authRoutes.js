const express = require("express");
const authController = require("../controllers/authController");
const authRateLimit = require("../middlewares/authRateLimit");

const router = express.Router();

router.post("/register", authRateLimit, (req, res) => authController.register(req, res));
router.get("/verify-email", (req, res) => authController.verifyEmail(req, res));
router.get("/check-verified", (req, res) => authController.checkVerified(req, res));
router.post("/login", authRateLimit, (req, res) => authController.login(req, res));

module.exports = router;
