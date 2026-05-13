const express = require("express");
const authController = require("../controllers/authController");
const authRateLimit = require("../middlewares/authRateLimit");

const router = express.Router();

router.post("/register", authRateLimit, (req, res) => authController.register(req, res));
router.post("/login", authRateLimit, (req, res) => authController.login(req, res));

module.exports = router;
