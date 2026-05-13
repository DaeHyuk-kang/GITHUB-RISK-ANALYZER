const { test, describe, mock } = require("node:test");
const assert = require("node:assert/strict");

// scheduleService가 require하는 외부 의존성을 먼저 require해서 mock 준비
const analyzeQueue = require("../src/queues/analyzeQueue");
const scheduleModel = require("../src/models/scheduleModel");
const analysisModel = require("../src/models/analysisModel");

const scheduleService = require("../src/services/scheduleService");

describe("scheduleService", () => {
  describe("addSchedule - 입력 검증 (외부 의존성 불필요)", () => {
    test("잘못된 저장소 이름 → parseRepo 에러", async () => {
      await assert.rejects(
        () => scheduleService.addSchedule("not-a-repo"),
        /Cannot parse/
      );
    });

    test("빈 저장소 이름 → 에러", async () => {
      await assert.rejects(
        () => scheduleService.addSchedule(""),
        /required/
      );
    });

    test("범위 초과 크론 값 (분 60이상) → 에러", async () => {
      await assert.rejects(
        () => scheduleService.addSchedule("owner/repo", "60 25 32 13 8"),
        /Invalid cron pattern/
      );
    });

    test("알 수 없는 문자 포함 → 에러", async () => {
      await assert.rejects(
        () => scheduleService.addSchedule("owner/repo", "@ @ @ @ @"),
        /Invalid cron pattern/
      );
    });

    test("유효한 크론 패턴 형식은 통과", async () => {
      // 큐/DB 접근 전에 검증만 통과하는지 확인 (이후 mock으로 처리)
      mock.method(analyzeQueue, "getRepeatableJobs", async () => []);
      mock.method(analyzeQueue, "add", async () => ({}));
      mock.method(scheduleModel, "create", async () => {});

      const validPatterns = ["0 9 * * 1", "*/30 * * * *", "0 0 1 * *"];
      for (const pattern of validPatterns) {
        const result = await scheduleService.addSchedule("owner/repo", pattern);
        assert.equal(result.cronPattern, pattern);
      }

      analyzeQueue.getRepeatableJobs.mock.restore();
      analyzeQueue.add.mock.restore();
      scheduleModel.create.mock.restore();
    });
  });

  describe("addSchedule - 성공", () => {
    test("GitHub URL 입력도 정규화되어 저장됨", async () => {
      mock.method(analyzeQueue, "getRepeatableJobs", async () => []);
      mock.method(analyzeQueue, "add", async () => ({}));
      mock.method(scheduleModel, "create", async () => {});

      const result = await scheduleService.addSchedule(
        "https://github.com/owner/repo",
        "0 9 * * 1"
      );

      assert.equal(result.repoName, "owner/repo");
      assert.equal(result.cronPattern, "0 9 * * 1");

      analyzeQueue.getRepeatableJobs.mock.restore();
      analyzeQueue.add.mock.restore();
      scheduleModel.create.mock.restore();
    });

    test("기존 반복작업이 있으면 제거 후 재등록", async () => {
      const existingJob = { id: "schedule:owner/repo", key: "old-key" };
      mock.method(analyzeQueue, "getRepeatableJobs", async () => [existingJob]);
      const removeByKey = mock.method(analyzeQueue, "removeRepeatableByKey", async () => {});
      mock.method(analyzeQueue, "add", async () => ({}));
      mock.method(scheduleModel, "create", async () => {});

      await scheduleService.addSchedule("owner/repo", "0 9 * * 1");

      assert.equal(removeByKey.mock.calls.length, 1);
      assert.equal(removeByKey.mock.calls[0].arguments[0], "old-key");

      analyzeQueue.getRepeatableJobs.mock.restore();
      analyzeQueue.removeRepeatableByKey.mock.restore();
      analyzeQueue.add.mock.restore();
      scheduleModel.create.mock.restore();
    });
  });

  describe("removeSchedule", () => {
    test("존재하지 않는 스케줄 → 에러", async () => {
      mock.method(scheduleModel, "getByRepo", async () => null);

      await assert.rejects(
        () => scheduleService.removeSchedule("owner/repo"),
        /Schedule not found/
      );

      scheduleModel.getByRepo.mock.restore();
    });

    test("성공 → repoName 반환", async () => {
      mock.method(scheduleModel, "getByRepo", async () => ({ repo_name: "owner/repo" }));
      mock.method(analyzeQueue, "getRepeatableJobs", async () => []);
      mock.method(scheduleModel, "delete", async () => {});

      const result = await scheduleService.removeSchedule("owner/repo");

      assert.equal(result.repoName, "owner/repo");

      scheduleModel.getByRepo.mock.restore();
      analyzeQueue.getRepeatableJobs.mock.restore();
      scheduleModel.delete.mock.restore();
    });
  });

  describe("listSchedules", () => {
    test("스케줄 없으면 빈 배열 반환", async () => {
      mock.method(scheduleModel, "getAll", async () => []);
      mock.method(analyzeQueue, "getRepeatableJobs", async () => []);

      const result = await scheduleService.listSchedules();

      assert.deepEqual(result, []);

      scheduleModel.getAll.mock.restore();
      analyzeQueue.getRepeatableJobs.mock.restore();
    });

    test("스케줄 목록에 lastScore/lastLevel/lastRunAt 포함", async () => {
      mock.method(scheduleModel, "getAll", async () => [
        { repo_name: "owner/repo", cron_pattern: "0 9 * * 1", created_at: new Date() }
      ]);
      mock.method(analyzeQueue, "getRepeatableJobs", async () => []);
      mock.method(analysisModel, "getLatestByRepo", async () => ({
        risk_score: 75,
        risk_level: "Medium Risk",
        created_at: new Date("2026-01-01")
      }));

      const result = await scheduleService.listSchedules();

      assert.equal(result.length, 1);
      assert.equal(result[0].repoName, "owner/repo");
      assert.equal(result[0].lastScore, 75);
      assert.equal(result[0].lastLevel, "Medium Risk");
      assert.ok(result[0].lastRunAt !== null);

      scheduleModel.getAll.mock.restore();
      analyzeQueue.getRepeatableJobs.mock.restore();
      analysisModel.getLatestByRepo.mock.restore();
    });

    test("분석 기록 없으면 lastScore null", async () => {
      mock.method(scheduleModel, "getAll", async () => [
        { repo_name: "new/repo", cron_pattern: "0 0 * * *", created_at: new Date() }
      ]);
      mock.method(analyzeQueue, "getRepeatableJobs", async () => []);
      mock.method(analysisModel, "getLatestByRepo", async () => null);

      const result = await scheduleService.listSchedules();

      assert.equal(result[0].lastScore, null);
      assert.equal(result[0].lastLevel, null);
      assert.equal(result[0].lastRunAt, null);

      scheduleModel.getAll.mock.restore();
      analyzeQueue.getRepeatableJobs.mock.restore();
      analysisModel.getLatestByRepo.mock.restore();
    });
  });
});
