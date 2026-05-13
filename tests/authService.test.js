process.env.JWT_SECRET = "test-secret-key-for-testing";

const { test, describe, mock } = require("node:test");
const assert = require("node:assert/strict");

const userModel = require("../src/models/userModel");
const authService = require("../src/services/authService");

describe("authService", () => {
  describe("register - 입력 검증", () => {
    test("이메일 미입력 → 에러", async () => {
      await assert.rejects(
        () => authService.register("", "password123"),
        /required/
      );
    });

    test("비밀번호 미입력 → 에러", async () => {
      await assert.rejects(
        () => authService.register("test@example.com", ""),
        /required/
      );
    });

    test("잘못된 이메일 형식 → 에러", async () => {
      await assert.rejects(
        () => authService.register("not-an-email", "password123"),
        /Invalid email format/
      );
    });

    test("비밀번호 6자 미만 → 에러", async () => {
      await assert.rejects(
        () => authService.register("test@example.com", "12345"),
        /at least 6/
      );
    });
  });

  describe("register - DB 연동", () => {
    test("이미 존재하는 이메일 → 에러", async () => {
      mock.method(userModel, "findByEmail", async () => ({ id: 1, email: "dup@example.com" }));

      await assert.rejects(
        () => authService.register("dup@example.com", "password123"),
        /already registered/
      );

      userModel.findByEmail.mock.restore();
    });

    test("성공 → token과 email 반환", async () => {
      mock.method(userModel, "findByEmail", async () => null);
      mock.method(userModel, "create", async () => 42);

      const result = await authService.register("new@example.com", "password123");

      assert.equal(typeof result.token, "string");
      assert.ok(result.token.length > 0);
      assert.equal(result.email, "new@example.com");

      userModel.findByEmail.mock.restore();
      userModel.create.mock.restore();
    });
  });

  describe("login", () => {
    test("존재하지 않는 이메일 → 에러", async () => {
      mock.method(userModel, "findByEmail", async () => null);

      await assert.rejects(
        () => authService.login("ghost@example.com", "password123"),
        /Invalid email or password/
      );

      userModel.findByEmail.mock.restore();
    });

    test("비밀번호 불일치 → 에러", async () => {
      mock.method(userModel, "findByEmail", async () => ({
        id: 1,
        email: "test@example.com",
        password_hash: "hashed"
      }));
      mock.method(userModel, "verifyPassword", async () => false);

      await assert.rejects(
        () => authService.login("test@example.com", "wrongpass"),
        /Invalid email or password/
      );

      userModel.findByEmail.mock.restore();
      userModel.verifyPassword.mock.restore();
    });

    test("성공 → token과 email 반환", async () => {
      mock.method(userModel, "findByEmail", async () => ({
        id: 1,
        email: "test@example.com",
        password_hash: "hashed"
      }));
      mock.method(userModel, "verifyPassword", async () => true);

      const result = await authService.login("test@example.com", "correctpass");

      assert.equal(typeof result.token, "string");
      assert.ok(result.token.length > 0);
      assert.equal(result.email, "test@example.com");

      userModel.findByEmail.mock.restore();
      userModel.verifyPassword.mock.restore();
    });
  });

  describe("_sign", () => {
    test("JWT_SECRET 없으면 에러", () => {
      const original = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      assert.throws(
        () => authService._sign(1, "test@example.com"),
        /JWT_SECRET/
      );

      process.env.JWT_SECRET = original;
    });

    test("JWT_SECRET 있으면 유효한 토큰 반환", () => {
      const token = authService._sign(1, "test@example.com");
      assert.equal(typeof token, "string");
      // JWT는 header.payload.signature 형식
      assert.equal(token.split(".").length, 3);
    });
  });
});
