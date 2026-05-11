const express = require("express");
const authController = require("../controllers/authController");
const rateLimit = require("../middlewares/rateLimit");

const router = express.Router();

router.post("/register", rateLimit, (req, res) => authController.register(req, res));
router.post("/login", rateLimit, (req, res) => authController.login(req, res));

module.exports = router;
