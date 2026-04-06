const analyzeQueue = require("../queues/analyzeQueue");

async function createAnalyzeJob(req, res) {
  try {
    const { repo } = req.body;

    if (!repo || !repo.includes("/")) {
      return res.status(400).json({
        success: false,
        message: "repo must be in owner/name format"
      });
    }

    const job = await analyzeQueue.add("analyze", { repo }, {
      removeOnComplete: 100,
      removeOnFail: 100
    });

    return res.status(202).json({
      success: true,
      jobId: job.id,
      status: "PENDING"
    });
  } catch (error) {
    console.error("createAnalyzeJob error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create analysis job"
    });
  }
}

async function getJobStatus(req, res) {
  const { jobId } = req.params;
  try {
    const job = await analyzeQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    const state = await job.getState();
    
    return res.json({
      success: true,
      jobId: job.id,
      status: state.toUpperCase(),
      progress: job.progress,
      result: job.returnvalue || null,
      error: job.failedReason || null
    });
  } catch (error) {
    console.error("getJobStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch job status"
    });
  }
}

async function retryJob(req, res) {
  const { jobId } = req.params;
  try {
    const job = await analyzeQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found"
      });
    }

    await job.retry();
    
    return res.json({
      success: true,
      message: "Job retried successfully",
      jobId: job.id
    });
  } catch (error) {
    console.error("retryJob error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retry job"
    });
  }
}

async function createBulkAnalyzeJobs(req, res) {
  try {
    const { repos } = req.body;

    if (!Array.isArray(repos) || repos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "repos must be a non-empty array"
      });
    }

    const jobs = await Promise.all(
      repos.map(async (repo) => {
        const job = await analyzeQueue.add("analyze", { repo }, {
          removeOnComplete: 100,
          removeOnFail: 100
        });

        return {
          repo,
          jobId: job.id,
          status: "PENDING"
        };
      })
    );

    return res.status(202).json({
      success: true,
      jobs
    });
  } catch (error) {
    console.error("createBulkAnalyzeJobs error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create bulk jobs"
    });
  }
}

module.exports = {
  createAnalyzeJob,
  createBulkAnalyzeJobs,
  getJobStatus,
  retryJob
};
