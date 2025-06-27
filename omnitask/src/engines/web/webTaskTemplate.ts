import { BrowserController } from './browserController';
import { ParsedCommand } from '@/lib/commandParser';

export interface WebTaskResult {
  success: boolean;
  data?: unknown;
  error?: string;
  screenshots?: string[];
  duration: number;
}

export interface WebTaskTemplate {
  name: string;
  category: string;
  description: string;
  execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult>;
}

export abstract class BaseWebTask implements WebTaskTemplate {
  abstract name: string;
  abstract category: string;
  abstract description: string;

  protected async withErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`${operationName} failed: ${errorMessage}`);
    }
  }

  protected async waitForPageLoad(pageId: string, browserController: BrowserController): Promise<void> {
    await browserController.waitForNavigation(pageId, 10000);
  }

  protected async handleCookieConsent(pageId: string, browserController: BrowserController): Promise<void> {
    const cookieSelectors = [
      '[data-testid="cookie-banner"] button',
      '.cookie-consent button',
      '#cookie-consent button',
      'button:text("Accept")',
      'button:text("Accept All")',
      'button:text("I Accept")',
      'button:text("OK")',
      '.gdpr-banner button'
    ];

    for (const selector of cookieSelectors) {
      try {
        await browserController.waitForElement(pageId, selector, 2000);
        await browserController.clickElement(pageId, selector);
        await new Promise(resolve => setTimeout(resolve, 1000));
        break;
      } catch {
        // Continue to next selector if this one doesn't exist
      }
    }
  }

  abstract execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult>;
}

export class WebSearchTask extends BaseWebTask {
  name = 'Web Search';
  category = 'browsing';
  description = 'Perform web searches on search engines';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'search_page';

    try {
      const searchTerm = command.parameters.searchTerm as string || command.action;
      const searchEngine = this.determineSearchEngine(command);

      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, searchEngine.url);
      await this.handleCookieConsent(pageId, browserController);

      // Wait for search input and perform search
      await browserController.waitForElement(pageId, searchEngine.searchSelector);
      await browserController.fillInput(pageId, searchEngine.searchSelector, searchTerm);
      await browserController.clickElement(pageId, searchEngine.submitSelector);

      // Wait for results
      await browserController.waitForElement(pageId, searchEngine.resultsSelector, 15000);

      // Extract search results
      const results = await this.extractSearchResults(pageId, browserController, searchEngine);

      const duration = Date.now() - startTime;
      await browserController.closePage(pageId);

      return {
        success: true,
        data: {
          searchTerm,
          searchEngine: searchEngine.name,
          results,
          resultCount: results.length
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determineSearchEngine(command: ParsedCommand) {
    const engines = {
      google: {
        name: 'Google',
        url: 'https://www.google.com',
        searchSelector: 'input[name="q"]',
        submitSelector: 'input[type="submit"], button[type="submit"]',
        resultsSelector: '#search .g'
      },
      bing: {
        name: 'Bing',
        url: 'https://www.bing.com',
        searchSelector: 'input[name="q"]',
        submitSelector: 'input[type="submit"]',
        resultsSelector: '.b_algo'
      }
    };

    const commandText = JSON.stringify(command).toLowerCase();
    if (commandText.includes('bing')) {
      return engines.bing;
    }
    
    return engines.google;
  }

  private async extractSearchResults(
    pageId: string, 
    browserController: BrowserController, 
    searchEngine: { resultsSelector: string }
  ): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const script = `
      const results = [];
      const elements = document.querySelectorAll('${searchEngine.resultsSelector}');
      
      for (let i = 0; i < Math.min(10, elements.length); i++) {
        const element = elements[i];
        const titleEl = element.querySelector('h3');
        const linkEl = element.querySelector('a');
        const snippetEl = element.querySelector('.VwiC3b, .b_caption p');
        
        if (titleEl && linkEl) {
          results.push({
            title: titleEl.textContent?.trim() || '',
            url: linkEl.href || '',
            snippet: snippetEl?.textContent?.trim() || ''
          });
        }
      }
      
      return results;
    `;

    return await browserController.evaluateScript(pageId, script) as Array<{ title: string; url: string; snippet: string }>;
  }
}

export class WebNavigationTask extends BaseWebTask {
  name = 'Web Navigation';
  category = 'browsing';
  description = 'Navigate to specific websites and URLs';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'navigation_page';

    try {
      const url = this.extractUrl(command);
      
      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, url);
      await this.waitForPageLoad(pageId, browserController);
      await this.handleCookieConsent(pageId, browserController);

      // Get page information
      const title = await browserController.evaluateScript(pageId, 'document.title') as string;
      const currentUrl = await browserController.evaluateScript(pageId, 'window.location.href') as string;

      const duration = Date.now() - startTime;
      
      // Keep page open for user interaction
      return {
        success: true,
        data: {
          url: currentUrl,
          title,
          pageId
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        duration: Date.now() - startTime
      };
    }
  }

  private extractUrl(command: ParsedCommand): string {
    if (command.parameters.url && typeof command.parameters.url === 'string') {
      return command.parameters.url;
    }

    // Try to extract URL from action or command text
    const commandText = JSON.stringify(command).toLowerCase();
    
    // Common website shortcuts
    const shortcuts: Record<string, string> = {
      'amazon': 'https://www.amazon.com',
      'google': 'https://www.google.com',
      'youtube': 'https://www.youtube.com',
      'github': 'https://www.github.com',
      'stackoverflow': 'https://stackoverflow.com',
      'reddit': 'https://www.reddit.com',
      'twitter': 'https://www.twitter.com',
      'facebook': 'https://www.facebook.com',
      'linkedin': 'https://www.linkedin.com'
    };

    for (const [keyword, url] of Object.entries(shortcuts)) {
      if (commandText.includes(keyword)) {
        return url;
      }
    }

    throw new Error('No valid URL found in command');
  }
}

// Registry of available web tasks
export const webTaskRegistry = new Map<string, WebTaskTemplate>([
  ['search', new WebSearchTask()],
  ['navigate', new WebNavigationTask()],
  ['browse', new WebNavigationTask()]
]);