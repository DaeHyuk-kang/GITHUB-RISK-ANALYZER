const { test, describe, mock } = require("node:test");
const assert = require("node:assert/strict");

describe("emailService", () => {
  describe("sendAlertEmail - SMTP 미설정 시", () => {
    test("에러 없이 스킵됨 (transporter null)", async () => {
      // SMTP 환경변수가 없으면 transporter가 null → 조용히 리턴
      const { sendAlertEmail } = require("../src/services/emailService");

      await assert.doesNotReject(() =>
        sendAlertEmail({
          to: "user@example.com",
          repo: "owner/repo",
          score: 30,
          level: "High Risk",
          threshold: 60
        })
      );
    });

    test("HTML 특수문자 포함 repo도 에러 없음", async () => {
      const { sendAlertEmail } = require("../src/services/emailService");

      await assert.doesNotReject(() =>
        sendAlertEmail({
          to: "user@example.com",
          repo: "<script>alert(1)</script>/repo",
          score: 20,
          level: "<b>Critical</b>",
          threshold: 50
        })
      );
    });
  });

  describe("sendAlertEmail - SMTP 설정 시", () => {
    test("sendMail 호출 시 이메일 내용에 HTML 이스케이프 적용됨", async () => {
      // 모듈 캐시를 우회해 SMTP 설정된 환경 시뮬레이션
      const nodemailer = require("nodemailer");
      const sentEmails = [];
      const mockTransport = {
        sendMail: async (options) => { sentEmails.push(options); }
      };

      // createTransport를 mock해서 fake transporter 반환
      mock.method(nodemailer, "createTransport", () => mockTransport);

      // 모듈 캐시 삭제 후 재로드 (SMTP 설정 있는 척)
      process.env.SMTP_HOST = "smtp.test.com";
      process.env.SMTP_USER = "test@test.com";
      delete require.cache[require.resolve("../src/services/emailService")];
      const { sendAlertEmail } = require("../src/services/emailService");

      await sendAlertEmail({
        to: "user@example.com",
        repo: "<evil>/repo",
        score: 25,
        level: "<b>High</b>",
        threshold: 60
      });

      assert.equal(sentEmails.length, 1);
      const html = sentEmails[0].html;
      assert.ok(html.includes("&lt;evil&gt;"), "repo 이름이 HTML 이스케이프되어야 함");
      assert.ok(html.includes("&lt;b&gt;High&lt;/b&gt;"), "level이 HTML 이스케이프되어야 함");
      assert.ok(!html.includes("<evil>"), "원본 태그가 그대로 포함되면 안 됨");

      // 정리
      nodemailer.createTransport.mock.restore();
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete require.cache[require.resolve("../src/services/emailService")];
    });
  });
});
