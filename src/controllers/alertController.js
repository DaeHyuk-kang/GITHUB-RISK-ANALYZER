const alertSubscriptionModel = require("../models/alertSubscriptionModel");
const { parseRepo } = require("../utils/parseRepo");

class AlertController {
  async subscribe(req, res) {
    try {
      const { repo, threshold } = req.body;
      const repoName = parseRepo(repo);
      const t = parseInt(threshold);
      if (!t || t < 1 || t > 100) throw new Error("Threshold must be between 1 and 100");

      await alertSubscriptionModel.upsert(req.user.userId, repoName, t);
      return res.json({ success: true, data: { repoName, threshold: t } });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async unsubscribe(req, res) {
    try {
      const repoName = parseRepo(`${req.params.owner}/${req.params.repo}`);
      await alertSubscriptionModel.delete(req.user.userId, repoName);
      return res.json({ success: true });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async getMyAlerts(req, res) {
    try {
      const subs = await alertSubscriptionModel.getByUser(req.user.userId);
      return res.json({ success: true, data: subs });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getRepoAlert(req, res) {
    try {
      const repoName = `${req.params.owner}/${req.params.repo}`;
      const sub = await alertSubscriptionModel.getForUser(req.user.userId, repoName);
      return res.json({ success: true, data: sub });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AlertController();
