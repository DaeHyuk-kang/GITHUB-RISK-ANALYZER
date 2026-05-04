const authService = require("../services/authService");

class AuthController {
  async register(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.register(email, password);
      return res.status(201).json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(401).json({ success: false, message: err.message });
    }
  }
}

module.exports = new AuthController();
