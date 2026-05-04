const scheduleService = require("../services/scheduleService");

class ScheduleController {
  async addSchedule(req, res) {
    try {
      const { repo, cronPattern } = req.body;
      if (!repo) return res.status(400).json({ success: false, message: "repo is required" });

      const result = await scheduleService.addSchedule(repo, cronPattern);
      return res.status(201).json({ success: true, data: result });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async removeSchedule(req, res) {
    try {
      const { repo } = req.params;
      const repoName = decodeURIComponent(repo);
      const result = await scheduleService.removeSchedule(repoName);
      return res.json({ success: true, data: result });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }

  async listSchedules(req, res) {
    try {
      const list = await scheduleService.listSchedules();
      return res.json({ success: true, count: list.length, data: list });
    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = new ScheduleController();
