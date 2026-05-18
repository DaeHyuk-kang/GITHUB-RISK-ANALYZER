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

  async verifyEmail(req, res) {
    try {
      const { token } = req.query;
      const result = await authService.verifyEmail(token);
      return res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>인증 완료</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0d1117;color:#c9d1d9"><h2 style="color:#58a6ff">✅ 이메일 인증 완료!</h2><p>${result.message}</p><p>이제 회원가입 페이지로 돌아가서 <strong>회원가입 완료</strong> 버튼을 클릭해주세요.</p></body></html>`);
    } catch (err) {
      return res.status(400).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>오류</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;background:#0d1117;color:#c9d1d9"><h2 style="color:#f85149">❌ 인증 실패</h2><p>${err.message}</p></body></html>`);
    }
  }

  async checkVerified(req, res) {
    try {
      const { email } = req.query;
      const result = await authService.checkVerified(email);
      return res.json({ success: true, ...result });
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
