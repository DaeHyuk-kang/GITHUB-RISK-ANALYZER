const analyzeQueue = require("../queues/analyzeQueue");
const scheduleModel = require("../models/scheduleModel");
const analysisModel = require("../models/analysisModel");
const { parseRepo } = require("../utils/parseRepo");
const cronParser = require("cron-parser");

const DEFAULT_CRON = "0 0 * * *"; // 매일 자정

function isValidCron(pattern) {
  if (!pattern || typeof pattern !== "string") return false;
  try {
    cronParser.parseExpression(pattern);
    return true;
  } catch {
    return false;
  }
}

class ScheduleService {
  async addSchedule(repoName, cronPattern = DEFAULT_CRON) {
    repoName = parseRepo(repoName);

    if (!isValidCron(cronPattern)) {
      throw new Error(`Invalid cron pattern: "${cronPattern}". Expected 5 fields (e.g. "0 9 * * 1")`);
    }

    // 기존 BullMQ 반복 작업이 있으면 제거 후 재등록 (크론 변경 대응)
    const existing = await analyzeQueue.getRepeatableJobs();
    const old = existing.find(j => j.id === `schedule:${repoName}`);
    if (old) await analyzeQueue.removeRepeatableByKey(old.key);

    await scheduleModel.upsert(repoName, cronPattern);

    await analyzeQueue.add(
      "analyze",
      { repo: repoName },
      {
        repeat: { pattern: cronPattern },
        jobId: `schedule:${repoName}`
      }
    );

    return { repoName, cronPattern };
  }

  async removeSchedule(repoName) {
    const schedule = await scheduleModel.getByRepo(repoName);
    if (!schedule) throw new Error("Schedule not found");

    // BullMQ에서 반복 작업 제거
    const repeatableJobs = await analyzeQueue.getRepeatableJobs();
    const job = repeatableJobs.find(j => j.id === `schedule:${repoName}`);
    if (job) {
      await analyzeQueue.removeRepeatableByKey(job.key);
    }

    await scheduleModel.delete(repoName);
    return { repoName };
  }

  async listSchedules() {
    const schedules = await scheduleModel.getAll();
    const repeatableJobs = await analyzeQueue.getRepeatableJobs();
    const jobMap = new Map(repeatableJobs.map(j => [j.id, j]));

    return Promise.all(schedules.map(async s => {
      const bullJob = jobMap.get(`schedule:${s.repo_name}`);
      const last = await analysisModel.getLatestByRepo(s.repo_name);
      return {
        repoName: s.repo_name,
        cronPattern: s.cron_pattern,
        nextRun: bullJob?.next ? new Date(bullJob.next).toISOString() : null,
        createdAt: s.created_at,
        lastScore: last?.risk_score ?? null,
        lastLevel: last?.risk_level ?? null,
        lastRunAt: last?.created_at ?? null
      };
    }));
  }

  // 서버 재시작 시 DB 스케줄을 BullMQ에 복원
  async restoreSchedules() {
    const schedules = await scheduleModel.getAll();
    if (schedules.length === 0) return;

    const existing = await analyzeQueue.getRepeatableJobs();
    const existingIds = new Set(existing.map(j => j.id));

    for (const s of schedules) {
      if (!existingIds.has(`schedule:${s.repo_name}`)) {
        await analyzeQueue.add(
          "analyze",
          { repo: s.repo_name },
          {
            repeat: { pattern: s.cron_pattern },
            jobId: `schedule:${s.repo_name}`
          }
        );
        console.log(`✅ Restored schedule for ${s.repo_name} (${s.cron_pattern})`);
      }
    }
  }
}

module.exports = new ScheduleService();
