// Rate limiter: ensures max N requests per second
export class RateLimiter {
  private queue: Array<() => void> = [];
  private lastExecution: number = 0;
  private interval: number;

  constructor(requestsPerSecond: number) {
    this.interval = 1000 / requestsPerSecond;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const executeTask = async () => {
        const now = Date.now();
        const timeSinceLastExecution = now - this.lastExecution;

        if (timeSinceLastExecution < this.interval) {
          await new Promise(r => setTimeout(r, this.interval - timeSinceLastExecution));
        }

        this.lastExecution = Date.now();
        
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }

        // Execute next task in queue
        if (this.queue.length > 0) {
          const nextTask = this.queue.shift();
          nextTask?.();
        }
      };

      this.queue.push(executeTask);
      
      // Start execution if this is the only task
      if (this.queue.length === 1) {
        executeTask();
      }
    });
  }
}

// Concurrency limiter: ensures max N concurrent requests
export class ConcurrencyLimiter {
  private running: number = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrency: number) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.running >= this.maxConcurrency) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }

    this.running++;
    
    try {
      return await fn();
    } finally {
      this.running--;
      const resolve = this.queue.shift();
      if (resolve) resolve();
    }
  }
}

