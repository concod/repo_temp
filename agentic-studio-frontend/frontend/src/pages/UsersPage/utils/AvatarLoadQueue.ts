// In-memory cache for loaded avatars
const avatarCache = new Map<string, string>();

// Queue for managing avatar loading to prevent rate limiting
class AvatarLoadQueue {
  private queue: Array<{ url: string; resolve: (url: string) => void; reject: (error: Error) => void }> = [];
  private isProcessing = false;
  private readonly delay = 100; // Delay between requests in ms
  private readonly maxRetries = 2;

  async add(url: string): Promise<string> {
    // Check cache first
    if (avatarCache.has(url)) {
      return Promise.resolve(avatarCache.get(url)!);
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ url, resolve, reject });
      this.process();
    });
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      try {
        const result = await this.loadWithRetry(item.url);
        avatarCache.set(item.url, result);
        item.resolve(result);
      } catch (error) {
        item.reject(error as Error);
      }

      // Add delay between requests to avoid rate limiting
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
      }
    }

    this.isProcessing = false;
  }

  private async loadWithRetry(url: string, retries = 0): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve(url);
      
      img.onerror = async () => {
        if (retries < this.maxRetries) {
          // Exponential backoff
          const backoffDelay = Math.pow(2, retries) * 1000;
          await new Promise(r => setTimeout(r, backoffDelay));
          
          try {
            const result = await this.loadWithRetry(url, retries + 1);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Failed to load avatar after ${this.maxRetries} retries`));
        }
      };

      img.src = url;
    });
  }

  // Method to clear cache if needed
  static clearCache() {
    avatarCache.clear();
  }
}

export default AvatarLoadQueue;