import { Browser, BrowserContext, Page } from 'playwright';
import { chromium, firefox, webkit } from 'playwright';

export interface BrowserPoolConfig {
  maxBrowsers: number;
  maxContextsPerBrowser: number;
  maxPagesPerContext: number;
  browserIdleTimeout: number; // milliseconds
  contextIdleTimeout: number; // milliseconds
  pageIdleTimeout: number; // milliseconds
}

export interface PooledBrowser {
  browser: Browser;
  contexts: Map<string, PooledContext>;
  lastUsed: number;
  type: 'chromium' | 'firefox' | 'webkit';
}

export interface PooledContext {
  context: BrowserContext;
  pages: Map<string, PooledPage>;
  lastUsed: number;
  browserId: string;
}

export interface PooledPage {
  page: Page;
  lastUsed: number;
  contextId: string;
  isActive: boolean;
}

export class BrowserPool {
  private config: BrowserPoolConfig;
  private browsers = new Map<string, PooledBrowser>();
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<BrowserPoolConfig> = {}) {
    this.config = {
      maxBrowsers: 3,
      maxContextsPerBrowser: 5,
      maxPagesPerContext: 10,
      browserIdleTimeout: 5 * 60 * 1000, // 5 minutes
      contextIdleTimeout: 3 * 60 * 1000, // 3 minutes
      pageIdleTimeout: 1 * 60 * 1000, // 1 minute
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Get or create a browser instance
   */
  async getBrowser(type: 'chromium' | 'firefox' | 'webkit' = 'chromium'): Promise<string> {
    // Try to find an existing browser of the same type
    for (const [id, pooledBrowser] of this.browsers) {
      if (pooledBrowser.type === type && pooledBrowser.contexts.size < this.config.maxContextsPerBrowser) {
        pooledBrowser.lastUsed = Date.now();
        return id;
      }
    }

    // Create new browser if under limit
    if (this.browsers.size < this.config.maxBrowsers) {
      return await this.createBrowser(type);
    }

    // Find least recently used browser and close it to make room
    const lruBrowser = Array.from(this.browsers.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
    
    if (lruBrowser) {
      await this.closeBrowser(lruBrowser[0]);
    }

    return await this.createBrowser(type);
  }

  /**
   * Get or create a context
   */
  async getContext(browserId: string, options: any = {}): Promise<string> {
    const pooledBrowser = this.browsers.get(browserId);
    if (!pooledBrowser) {
      throw new Error(`Browser ${browserId} not found`);
    }

    // Try to find an available context
    for (const [id, pooledContext] of pooledBrowser.contexts) {
      if (pooledContext.pages.size < this.config.maxPagesPerContext) {
        pooledContext.lastUsed = Date.now();
        return id;
      }
    }

    // Create new context if under limit
    if (pooledBrowser.contexts.size < this.config.maxContextsPerBrowser) {
      return await this.createContext(browserId, options);
    }

    // Find least recently used context and close it
    const lruContext = Array.from(pooledBrowser.contexts.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
    
    if (lruContext) {
      await this.closeContext(browserId, lruContext[0]);
    }

    return await this.createContext(browserId, options);
  }

  /**
   * Get or create a page
   */
  async getPage(browserId: string, contextId: string): Promise<string> {
    const pooledBrowser = this.browsers.get(browserId);
    const pooledContext = pooledBrowser?.contexts.get(contextId);
    
    if (!pooledBrowser || !pooledContext) {
      throw new Error(`Browser ${browserId} or context ${contextId} not found`);
    }

    // Try to find an inactive page
    for (const [id, pooledPage] of pooledContext.pages) {
      if (!pooledPage.isActive) {
        pooledPage.isActive = true;
        pooledPage.lastUsed = Date.now();
        return id;
      }
    }

    // Create new page if under limit
    if (pooledContext.pages.size < this.config.maxPagesPerContext) {
      return await this.createPage(browserId, contextId);
    }

    // Find least recently used page and close it
    const lruPage = Array.from(pooledContext.pages.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed)[0];
    
    if (lruPage) {
      await this.closePage(browserId, contextId, lruPage[0]);
    }

    return await this.createPage(browserId, contextId);
  }

  /**
   * Release a page back to the pool
   */
  async releasePage(browserId: string, contextId: string, pageId: string): Promise<void> {
    const pooledPage = this.browsers.get(browserId)?.contexts.get(contextId)?.pages.get(pageId);
    if (pooledPage) {
      pooledPage.isActive = false;
      pooledPage.lastUsed = Date.now();
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): {
    browsers: number;
    contexts: number;
    pages: number;
    activePages: number;
  } {
    let contexts = 0;
    let pages = 0;
    let activePages = 0;

    for (const browser of this.browsers.values()) {
      contexts += browser.contexts.size;
      for (const context of browser.contexts.values()) {
        pages += context.pages.size;
        activePages += Array.from(context.pages.values()).filter(p => p.isActive).length;
      }
    }

    return {
      browsers: this.browsers.size,
      contexts,
      pages,
      activePages
    };
  }

  /**
   * Close all resources
   */
  async closeAll(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    const closeBrowserPromises = Array.from(this.browsers.keys()).map(id => 
      this.closeBrowser(id)
    );

    await Promise.all(closeBrowserPromises);
    this.browsers.clear();
  }

  private async createBrowser(type: 'chromium' | 'firefox' | 'webkit'): Promise<string> {
    const launcher = { chromium, firefox, webkit }[type];
    const browser = await launcher.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'] // Performance optimizations
    });

    const id = `browser-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.browsers.set(id, {
      browser,
      contexts: new Map(),
      lastUsed: Date.now(),
      type
    });

    return id;
  }

  private async createContext(browserId: string, options: any): Promise<string> {
    const pooledBrowser = this.browsers.get(browserId);
    if (!pooledBrowser) {
      throw new Error(`Browser ${browserId} not found`);
    }

    const context = await pooledBrowser.browser.newContext(options);
    const id = `context-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    pooledBrowser.contexts.set(id, {
      context,
      pages: new Map(),
      lastUsed: Date.now(),
      browserId
    });

    return id;
  }

  private async createPage(browserId: string, contextId: string): Promise<string> {
    const pooledContext = this.browsers.get(browserId)?.contexts.get(contextId);
    if (!pooledContext) {
      throw new Error(`Context ${contextId} not found`);
    }

    const page = await pooledContext.context.newPage();
    const id = `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    pooledContext.pages.set(id, {
      page,
      lastUsed: Date.now(),
      contextId,
      isActive: true
    });

    return id;
  }

  private async closePage(browserId: string, contextId: string, pageId: string): Promise<void> {
    const pooledPage = this.browsers.get(browserId)?.contexts.get(contextId)?.pages.get(pageId);
    if (pooledPage) {
      await pooledPage.page.close();
      this.browsers.get(browserId)?.contexts.get(contextId)?.pages.delete(pageId);
    }
  }

  private async closeContext(browserId: string, contextId: string): Promise<void> {
    const pooledContext = this.browsers.get(browserId)?.contexts.get(contextId);
    if (pooledContext) {
      // Close all pages first
      const closePagePromises = Array.from(pooledContext.pages.keys()).map(pageId =>
        this.closePage(browserId, contextId, pageId)
      );
      await Promise.all(closePagePromises);
      
      await pooledContext.context.close();
      this.browsers.get(browserId)?.contexts.delete(contextId);
    }
  }

  private async closeBrowser(browserId: string): Promise<void> {
    const pooledBrowser = this.browsers.get(browserId);
    if (pooledBrowser) {
      // Close all contexts first
      const closeContextPromises = Array.from(pooledBrowser.contexts.keys()).map(contextId =>
        this.closeContext(browserId, contextId)
      );
      await Promise.all(closeContextPromises);
      
      await pooledBrowser.browser.close();
      this.browsers.delete(browserId);
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 60000); // Check every minute
  }

  private async performCleanup(): Promise<void> {
    const now = Date.now();

    for (const [browserId, browser] of this.browsers) {
      // Cleanup idle pages
      for (const [contextId, context] of browser.contexts) {
        for (const [pageId, page] of context.pages) {
          if (!page.isActive && (now - page.lastUsed) > this.config.pageIdleTimeout) {
            await this.closePage(browserId, contextId, pageId);
          }
        }

        // Cleanup idle contexts
        if (context.pages.size === 0 && (now - context.lastUsed) > this.config.contextIdleTimeout) {
          await this.closeContext(browserId, contextId);
        }
      }

      // Cleanup idle browsers
      if (browser.contexts.size === 0 && (now - browser.lastUsed) > this.config.browserIdleTimeout) {
        await this.closeBrowser(browserId);
      }
    }
  }
}

export const globalBrowserPool = new BrowserPool();