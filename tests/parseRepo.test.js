const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { parseRepo } = require("../src/utils/parseRepo");

describe("parseRepo", () => {
  test("owner/repo 형식 그대로 반환", () => {
    assert.equal(parseRepo("facebook/react"), "facebook/react");
  });

  test("https GitHub URL 파싱", () => {
    assert.equal(parseRepo("https://github.com/facebook/react"), "facebook/react");
  });

  test("URL 끝 슬래시 무시", () => {
    assert.equal(parseRepo("https://github.com/facebook/react/"), "facebook/react");
  });

  test(".git 접미사 제거", () => {
    assert.equal(parseRepo("https://github.com/facebook/react.git"), "facebook/react");
  });

  test("SSH URL 파싱", () => {
    assert.equal(parseRepo("git@github.com:facebook/react.git"), "facebook/react");
  });

  test("앞뒤 공백 무시", () => {
    assert.equal(parseRepo("  facebook/react  "), "facebook/react");
  });

  test("빈 문자열이면 에러", () => {
    assert.throws(() => parseRepo(""), /required/);
  });

  test("null이면 에러", () => {
    assert.throws(() => parseRepo(null), /required/);
  });

  test("파싱 불가능한 문자열이면 에러", () => {
    assert.throws(() => parseRepo("not-a-repo"), /Cannot parse/);
  });
});
