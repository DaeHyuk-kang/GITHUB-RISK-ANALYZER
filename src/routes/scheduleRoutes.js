const express = require("express");
const scheduleController = require("../controllers/scheduleController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/", (req, res) => scheduleController.listSchedules(req, res));
router.post("/", (req, res) => scheduleController.addSchedule(req, res));
router.delete("/:owner/:repo", (req, res) => scheduleController.removeSchedule(req, res));

module.exports = router;
