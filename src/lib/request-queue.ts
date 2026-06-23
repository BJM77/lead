export class RequestQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxConcurrent = 3;
  private active = 0;

  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.active >= this.maxConcurrent) return;
    if (this.queue.length === 0) return;

    this.processing = true;
    
    while (this.queue.length > 0 && this.active < this.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        this.active++;
        task().finally(() => {
          this.active--;
          this.process();
        });
      }
    }

    this.processing = false;
  }
}

export const requestQueue = new RequestQueue();
