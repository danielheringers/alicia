import PQueue from "p-queue";

import type { TaskQueuePort } from "../../application/ports/task-queue-port.js";
import { clampConcurrency } from "../../domain/runtime-settings.js";

export class PQueueTaskQueue implements TaskQueuePort {
  private readonly queue: PQueue;

  constructor(concurrency = 4) {
    this.queue = new PQueue({ concurrency });
  }

  async schedule<T>(task: () => Promise<T>): Promise<T> {
    const result = await this.queue.add(task);
    if (result === undefined) {
      throw new Error("Task queue returned no result");
    }
    return result;
  }

  getConcurrency(): number {
    return this.queue.concurrency;
  }

  setConcurrency(value: number): void {
    this.queue.concurrency = clampConcurrency(value);
  }
}
