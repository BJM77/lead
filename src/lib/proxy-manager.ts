import { logger } from './logger';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import fetch from 'node-fetch';

export interface Proxy {
  host: string;
  port: number;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
  username?: string;
  password?: string;
  health: {
    score: number;
    lastCheck: number;
    failures: number;
    successes: number;
    latency: number;
    lastFailureReason?: string;
  };
}

class ProxyManager {
  private static instance: ProxyManager;
  private proxies: Proxy[] = [];
  private currentIndex = 0;
  private maxFailures = 3;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializePool();
    // Start background health checking every 60 seconds
    if (this.proxies.length > 0) {
      this.healthCheckInterval = setInterval(() => this.healthCheck(), 60000);
      // Run initial check asynchronously
      this.healthCheck().catch((err) => logger.error(`[ProxyManager] Initial health check failed: ${err.message}`));
    }
  }

  static getInstance(): ProxyManager {
    if (!ProxyManager.instance) {
      ProxyManager.instance = new ProxyManager();
    }
    return ProxyManager.instance;
  }

  /**
   * Cleans up background timers.
   */
  public destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  private initializePool() {
    const rawList = process.env.PROXY_LIST;
    if (!rawList) {
      logger.info('[ProxyManager] No PROXY_LIST environment variable set. Running without proxies.');
      return;
    }

    const lines = rawList.split(',').map((l) => l.trim()).filter(Boolean);
    this.proxies = lines.map((line) => {
      // Support formats:
      // protocol://user:pass@host:port
      // host:port:user:pass
      // host:port
      try {
        const urlMatch = line.match(/^(?:([^:]+):\/\/)?(?:([^:@]+):([^@]+)@)?([^:]+):(\d+)$/);
        if (urlMatch) {
          const [, protocol, username, password, host, port] = urlMatch;
          return {
            host,
            port: parseInt(port, 10),
            protocol: (protocol || 'http').toLowerCase() as any,
            username,
            password,
            health: {
              score: 100,
              lastCheck: 0,
              failures: 0,
              successes: 0,
              latency: 0,
            },
          };
        }
      } catch (e: any) {
        logger.error(`[ProxyManager] Failed to parse proxy line: ${line}. Error: ${e.message}`);
      }
      return null;
    }).filter(Boolean) as Proxy[];

    logger.info(`[ProxyManager] Loaded ${this.proxies.length} proxies from PROXY_LIST.`);
  }

  /**
   * Returns a configured proxy agent or null if running directly.
   */
  public getAgentForNextProxy(): any {
    const proxy = this.getNextProxy();
    if (!proxy) return null;
    return this.getAgent(proxy);
  }

  /**
   * Selects the next best proxy based on health scores.
   */
  public getNextProxy(): Proxy | null {
    const healthy = this.proxies.filter((p) => p.health.failures < this.maxFailures);
    if (healthy.length === 0) {
      if (this.proxies.length > 0) {
        logger.warn('[ProxyManager] All proxies are down. Resetting failure thresholds.');
        this.proxies.forEach((p) => (p.health.failures = 0));
        return this.proxies[this.currentIndex % this.proxies.length] || null;
      }
      return null;
    }

    // Sort by health score descending (highest quality first)
    const sorted = healthy.sort((a, b) => b.health.score - a.health.score);
    const proxy = sorted[this.currentIndex % sorted.length];
    this.currentIndex = (this.currentIndex + 1) % sorted.length;
    return proxy;
  }

  /**
   * Instantiates the SOCKS or HTTPS agent.
   */
  public getAgent(proxy: Proxy): any {
    const authString = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    const url = `${proxy.protocol}://${authString}${proxy.host}:${proxy.port}`;
    if (proxy.protocol === 'socks4' || proxy.protocol === 'socks5') {
      return new SocksProxyAgent(url);
    }
    return new HttpsProxyAgent(url);
  }

  /**
   * Helper to fetch the raw URL representation of a proxy for external tools (e.g. Puppeteer)
   */
  public getProxyUrlString(proxy: Proxy): string {
    const authString = proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : '';
    return `${proxy.protocol}://${authString}${proxy.host}:${proxy.port}`;
  }

  public reportSuccess(proxy: Proxy) {
    const p = this.proxies.find((x) => x.host === proxy.host && x.port === proxy.port);
    if (p) {
      p.health.successes++;
      p.health.score = Math.min(100, p.health.score + 1);
      p.health.failures = Math.max(0, p.health.failures - 1);
    }
  }

  public reportFailure(proxy: Proxy, reason: string) {
    const p = this.proxies.find((x) => x.host === proxy.host && x.port === proxy.port);
    if (p) {
      p.health.failures++;
      p.health.score = Math.max(0, p.health.score - 10);
      p.health.lastFailureReason = reason;

      if (p.health.failures >= this.maxFailures) {
        logger.error(`[ProxyManager] Quarantined proxy: ${proxy.host}:${proxy.port} - Reason: ${reason}`);
      }
    }
  }

  /**
   * Periodically validates proxy health by sending requests to httpbin.org.
   */
  private async healthCheck() {
    logger.info('[ProxyManager] Starting background proxy health checks...');
    for (const proxy of this.proxies) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const start = Date.now();
        const agent = this.getAgent(proxy);
        const response = await fetch('https://httpbin.org/ip', {
          agent: agent as any,
          signal: controller.signal as any,
        });

        proxy.health.latency = Date.now() - start;
        proxy.health.lastCheck = Date.now();

        if (response.ok) {
          proxy.health.score = Math.min(100, proxy.health.score + 5);
          proxy.health.failures = Math.max(0, proxy.health.failures - 1);
          logger.info(`[ProxyManager] Proxy ${proxy.host}:${proxy.port} is healthy. Latency: ${proxy.health.latency}ms`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error: any) {
        proxy.health.score = Math.max(0, proxy.health.score - 15);
        proxy.health.failures++;
        logger.warn(`[ProxyManager] Health check failed for ${proxy.host}:${proxy.port}: ${error.message}`);
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }
}

export const proxyManager = ProxyManager.getInstance();
export type { ProxyManager };
export { ProxyManager as ProxyManagerClass };
