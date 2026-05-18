const express = require("express");
const alertController = require("../controllers/alertController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", (req, res) => alertController.getMyAlerts(req, res));
router.post("/", (req, res) => alertController.subscribe(req, res));
router.get("/:owner/:repo", (req, res) => alertController.getRepoAlert(req, res));
router.delete("/:owner/:repo", (req, res) => alertController.unsubscribe(req, res));

module.exports = router;
