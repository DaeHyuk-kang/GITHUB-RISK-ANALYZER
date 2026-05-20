const analyzeQueue = require("../queues/analyzeQueue");
const scheduleModel = require("../models/scheduleModel");
const analysisModel = require("../models/analysisModel");
const { parseRepo } = require("../utils/parseRepo");
const cronParser = require("cron-parser");
const logger = require("../config/logger");

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
  async addSchedule(userId, repoName, cronPattern = DEFAULT_CRON) {
    repoName = parseRepo(repoName);

    if (!isValidCron(cronPattern)) {
      throw new Error(`Invalid cron pattern: "${cronPattern}". Expected 5 fields (e.g. "0 9 * * 1")`);
    }

    const schedulerId = `schedule:${userId}:${repoName}`;

    await scheduleModel.upsert(userId, repoName, cronPattern);

    await analyzeQueue.upsertJobScheduler(
      schedulerId,
      { pattern: cronPattern, tz: "Asia/Seoul" },
      { name: "analyze", data: { repo: repoName, userId } }
    );

    return { repoName, cronPattern };
  }

  async removeSchedule(userId, repoName) {
    const schedule = await scheduleModel.getByRepo(userId, repoName);
    if (!schedule) throw new Error("Schedule not found");

    const schedulerId = `schedule:${userId}:${repoName}`;
    await analyzeQueue.removeJobScheduler(schedulerId);

    await scheduleModel.delete(userId, repoName);
    return { repoName };
  }

  async listSchedules(userId) {
    const schedules = await scheduleModel.getAll(userId);
    const schedulers = await analyzeQueue.getJobSchedulers();
    const schedulerMap = new Map(schedulers.map(s => [s.key, s]));

    return Promise.all(schedules.map(async s => {
      const schedulerId = `schedule:${userId}:${s.repo_name}`;
      const scheduler = schedulerMap.get(schedulerId);
      const last = await analysisModel.getLatestByRepo(s.repo_name);
      return {
        repoName: s.repo_name,
        cronPattern: s.cron_pattern,
        nextRun: scheduler?.next ? new Date(scheduler.next).toISOString() : null,
        createdAt: s.created_at,
        lastScore: last?.risk_score ?? null,
        lastLevel: last?.risk_level ?? null,
        lastRunAt: last?.created_at ?? null
      };
    }));
  }

  // 서버 재시작 시 DB 스케줄을 BullMQ에 복원
  async restoreSchedules() {
    const schedules = await scheduleModel.getAllForRestore();
    if (schedules.length === 0) return;

    for (const s of schedules) {
      const schedulerId = `schedule:${s.user_id}:${s.repo_name}`;
      await analyzeQueue.upsertJobScheduler(
        schedulerId,
        { pattern: s.cron_pattern, tz: "Asia/Seoul" },
        { name: "analyze", data: { repo: s.repo_name, userId: s.user_id } }
      );
      logger.info(`Schedule restored`, { service: "schedule", repo: s.repo_name, cron: s.cron_pattern });
    }
  }
}

module.exports = new ScheduleService();
