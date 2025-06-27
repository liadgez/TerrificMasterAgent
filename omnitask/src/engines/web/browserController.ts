import { Browser, BrowserContext, Page, chromium, firefox, webkit } from 'playwright';

export interface BrowserConfig {
  browser: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
  timeout?: number;
}

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<string, Page> = new Map();
  private config: BrowserConfig;

  constructor(config: BrowserConfig = { browser: 'chromium', headless: true }) {
    this.config = {
      timeout: 30000,
      viewport: { width: 1280, height: 720 },
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.browser) {
      return;
    }

    const launchOptions = {
      headless: this.config.headless,
      timeout: this.config.timeout
    };

    switch (this.config.browser) {
      case 'chromium':
        this.browser = await chromium.launch(launchOptions);
        break;
      case 'firefox':
        this.browser = await firefox.launch(launchOptions);
        break;
      case 'webkit':
        this.browser = await webkit.launch(launchOptions);
        break;
      default:
        throw new Error(`Unsupported browser: ${this.config.browser}`);
    }

    this.context = await this.browser.newContext({
      viewport: this.config.viewport,
      userAgent: this.config.userAgent
    });

    // Set default timeouts
    this.context.setDefaultTimeout(this.config.timeout!);
    this.context.setDefaultNavigationTimeout(this.config.timeout!);
  }

  async createPage(pageId?: string): Promise<Page> {
    if (!this.context) {
      await this.initialize();
    }

    const page = await this.context!.newPage();
    const id = pageId || `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.pages.set(id, page);
    
    // Set up page event handlers
    page.on('console', msg => {
      console.log(`Browser Console [${msg.type()}]:`, msg.text());
    });

    page.on('pageerror', error => {
      console.error('Browser Page Error:', error);
    });

    return page;
  }

  async navigateToPage(pageId: string, url: string, options?: NavigationOptions): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    await page.goto(url, {
      waitUntil: options?.waitUntil || 'domcontentloaded',
      timeout: options?.timeout || this.config.timeout
    });
  }

  async waitForElement(pageId: string, selector: string, timeout?: number): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    await page.waitForSelector(selector, { 
      timeout: timeout || this.config.timeout 
    });
  }

  async clickElement(pageId: string, selector: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    await page.click(selector);
  }

  async fillInput(pageId: string, selector: string, value: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    await page.fill(selector, value);
  }

  async selectOption(pageId: string, selector: string, value: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    await page.selectOption(selector, value);
  }

  async getElementText(pageId: string, selector: string): Promise<string> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    const element = await page.locator(selector);
    return await element.textContent() || '';
  }

  async getElementAttribute(pageId: string, selector: string, attribute: string): Promise<string | null> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    const element = await page.locator(selector);
    return await element.getAttribute(attribute);
  }

  async scrollToElement(pageId: string, selector: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    await page.locator(selector).scrollIntoViewIfNeeded();
  }

  async takeScreenshot(pageId: string, path?: string): Promise<Buffer> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    return await page.screenshot({ 
      path,
      fullPage: true 
    });
  }

  async evaluateScript(pageId: string, script: string): Promise<unknown> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    return await page.evaluate(script);
  }

  async waitForNavigation(pageId: string, timeout?: number): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) {
      throw new Error(`Page with ID ${pageId} not found`);
    }

    await page.waitForLoadState('domcontentloaded', { 
      timeout: timeout || this.config.timeout 
    });
  }

  async closePage(pageId: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (page) {
      await page.close();
      this.pages.delete(pageId);
    }
  }

  async closeAllPages(): Promise<void> {
    for (const [pageId, page] of this.pages) {
      await page.close();
      this.pages.delete(pageId);
    }
  }

  async close(): Promise<void> {
    await this.closeAllPages();
    
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getPageIds(): string[] {
    return Array.from(this.pages.keys());
  }

  isInitialized(): boolean {
    return this.browser !== null && this.context !== null;
  }
}

// Singleton instance for global use
export const globalBrowserController = new BrowserController();