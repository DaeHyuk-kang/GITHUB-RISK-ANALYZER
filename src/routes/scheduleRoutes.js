const express = require("express");
const scheduleController = require("../controllers/scheduleController");

const router = express.Router();

router.get("/", (req, res) => scheduleController.listSchedules(req, res));
router.post("/", (req, res) => scheduleController.addSchedule(req, res));
router.delete("/:repo(*)", (req, res) => scheduleController.removeSchedule(req, res));

module.exports = router;
