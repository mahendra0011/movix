import { logger } from "./logger.js";

class JobQueue {
  #queue = [];
  #processing = false;
  #concurrency;
  #handlers = new Map();

  constructor({ concurrency = 5 } = {}) {
    this.#concurrency = concurrency;
  }

  register(jobType, handler) {
    this.#handlers.set(jobType, handler);
  }

  add(jobType, payload, { retries = 3 } = {}) {
    this.#queue.push({ jobType, payload, retries, attempts: 0 });
    this.#process();
  }

  async #process() {
    if (this.#processing) return;
    this.#processing = true;

    const runBatch = async () => {
      const batch = this.#queue.splice(0, this.#concurrency);
      if (!batch.length) return;

      await Promise.allSettled(batch.map((job) => this.#execute(job)));
      if (this.#queue.length) await runBatch();
    };

    try {
      await runBatch();
    } finally {
      this.#processing = false;
      if (this.#queue.length) this.#process();
    }
  }

  async #execute(job) {
    const handler = this.#handlers.get(job.jobType);
    if (!handler) {
      logger.warn("No handler for job type: %s", job.jobType);
      return;
    }

    try {
      await handler(job.payload);
    } catch (error) {
      job.attempts++;
      if (job.attempts < job.retries) {
        this.#queue.push(job);
        logger.warn(
          "Job %s failed (attempt %d/%d), requeued: %s",
          job.jobType,
          job.attempts,
          job.retries,
          error.message,
        );
      } else {
        logger.error(
          "Job %s failed after %d attempts: %s",
          job.jobType,
          job.retries,
          error.message,
          { stack: error.stack },
        );
      }
    }
  }

  get pending() {
    return this.#queue.length;
  }
}

const jobQueue = new JobQueue({ concurrency: 5 });

export { jobQueue, JobQueue };
