import { BaseWebTask, WebTaskResult } from './webTaskTemplate';
import { BrowserController } from './browserController';
import { ParsedCommand } from '@/lib/commandParser';

export interface ScrapingRule {
  selector: string;
  attribute?: string;
  multiple?: boolean;
  transform?: (value: string) => string;
}

export interface ScrapingConfig {
  url: string;
  rules: Record<string, ScrapingRule>;
  waitForSelector?: string;
  scrollToBottom?: boolean;
  pagination?: {
    nextButtonSelector: string;
    maxPages: number;
  };
}

export class WebScrapingTask extends BaseWebTask {
  name = 'Web Scraping';
  category = 'scraping';
  description = 'Extract structured data from web pages';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'scraping_page';

    try {
      const config = command.parameters.scrapingConfig as ScrapingConfig;
      
      if (!config || !config.url || !config.rules) {
        throw new Error('Scraping configuration with URL and rules is required');
      }

      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, config.url);
      await this.waitForPageLoad(pageId, browserController);
      await this.handleCookieConsent(pageId, browserController);

      // Wait for specific element if specified
      if (config.waitForSelector) {
        await browserController.waitForElement(pageId, config.waitForSelector, 15000);
      }

      // Scroll to bottom if needed (for infinite scroll pages)
      if (config.scrollToBottom) {
        await this.scrollToBottom(pageId, browserController);
      }

      const allData = [];
      let currentPage = 1;
      const maxPages = config.pagination?.maxPages || 1;

      do {
        // Extract data from current page
        const pageData = await this.extractData(pageId, browserController, config.rules);
        allData.push(...pageData);

        // Handle pagination if configured
        if (config.pagination && currentPage < maxPages) {
          const hasNext = await this.goToNextPage(pageId, browserController, config.pagination.nextButtonSelector);
          if (!hasNext) break;
          currentPage++;
          
          // Wait for new content to load
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          break;
        }
      } while (currentPage <= maxPages);

      const duration = Date.now() - startTime;
      await browserController.closePage(pageId);

      return {
        success: true,
        data: {
          url: config.url,
          extractedData: allData,
          itemCount: allData.length,
          pagesScraped: currentPage,
          rules: Object.keys(config.rules)
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Web scraping failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async extractData(
    pageId: string,
    browserController: BrowserController,
    rules: Record<string, ScrapingRule>
  ): Promise<Record<string, unknown>[]> {
    const script = `
      (function() {
        const rules = ${JSON.stringify(rules)};
        const results = [];
        
        // Find the container elements
        const containerSelectors = Object.values(rules)
          .map(rule => rule.selector.split(' ')[0])
          .filter((v, i, a) => a.indexOf(v) === i);
        
        // If all selectors start with the same container, use that
        let containers = [];
        if (containerSelectors.length === 1) {
          containers = Array.from(document.querySelectorAll(containerSelectors[0]));
        } else {
          // Find common parent containers
          const allElements = Object.values(rules)
            .map(rule => Array.from(document.querySelectorAll(rule.selector)))
            .flat();
          
          if (allElements.length > 0) {
            containers = [document];
          }
        }
        
        if (containers.length === 0) {
          containers = [document];
        }
        
        containers.forEach(container => {
          const item = {};
          let hasData = false;
          
          Object.entries(rules).forEach(([key, rule]) => {
            try {
              if (rule.multiple) {
                const elements = container.querySelectorAll(rule.selector);
                const values = Array.from(elements).map(el => {
                  let value = rule.attribute ? el.getAttribute(rule.attribute) : el.textContent;
                  return rule.transform ? rule.transform(value) : value;
                }).filter(v => v);
                
                if (values.length > 0) {
                  item[key] = values;
                  hasData = true;
                }
              } else {
                const element = container.querySelector(rule.selector);
                if (element) {
                  let value = rule.attribute ? element.getAttribute(rule.attribute) : element.textContent;
                  if (value) {
                    value = rule.transform ? rule.transform(value.trim()) : value.trim();
                    item[key] = value;
                    hasData = true;
                  }
                }
              }
            } catch (e) {
              console.warn('Error extracting data for', key, ':', e);
            }
          });
          
          if (hasData) {
            results.push(item);
          }
        });
        
        return results;
      })();
    `;

    return await browserController.evaluateScript(pageId, script) as Record<string, unknown>[];
  }

  private async scrollToBottom(pageId: string, browserController: BrowserController): Promise<void> {
    const script = `
      (async function() {
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
        
        let previousHeight = 0;
        let currentHeight = document.body.scrollHeight;
        
        while (previousHeight !== currentHeight) {
          previousHeight = currentHeight;
          window.scrollTo(0, document.body.scrollHeight);
          await delay(1000);
          currentHeight = document.body.scrollHeight;
        }
      })();
    `;

    await browserController.evaluateScript(pageId, script);
  }

  private async goToNextPage(
    pageId: string,
    browserController: BrowserController,
    nextButtonSelector: string
  ): Promise<boolean> {
    try {
      await browserController.waitForElement(pageId, nextButtonSelector, 5000);
      await browserController.clickElement(pageId, nextButtonSelector);
      return true;
    } catch {
      return false;
    }
  }
}

export class NewsScrapingTask extends BaseWebTask {
  name = 'News Scraping';
  category = 'scraping';
  description = 'Extract news articles and headlines from news websites';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'news_scraping';

    try {
      const url = command.parameters.url as string || this.getDefaultNewsUrl(command);
      const maxArticles = command.parameters.maxArticles as number || 10;

      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, url);
      await this.waitForPageLoad(pageId, browserController);
      await this.handleCookieConsent(pageId, browserController);

      // Extract news articles
      const articles = await this.extractNewsArticles(pageId, browserController, maxArticles);

      const duration = Date.now() - startTime;
      await browserController.closePage(pageId);

      return {
        success: true,
        data: {
          url,
          articles,
          articleCount: articles.length,
          source: this.getSourceName(url)
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'News scraping failed',
        duration: Date.now() - startTime
      };
    }
  }

  private getDefaultNewsUrl(command: ParsedCommand): string {
    const commandText = JSON.stringify(command).toLowerCase();
    
    if (commandText.includes('bbc')) return 'https://www.bbc.com/news';
    if (commandText.includes('cnn')) return 'https://www.cnn.com';
    if (commandText.includes('reuters')) return 'https://www.reuters.com';
    if (commandText.includes('ap') || commandText.includes('associated press')) return 'https://apnews.com';
    
    return 'https://news.google.com';
  }

  private getSourceName(url: string): string {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain.split('.')[0].toUpperCase();
  }

  private async extractNewsArticles(
    pageId: string,
    browserController: BrowserController,
    maxArticles: number
  ): Promise<Array<{ title: string; url: string; summary?: string; timestamp?: string; author?: string }>> {
    const script = `
      (function() {
        const articles = [];
        const maxCount = ${maxArticles};
        
        // Common selectors for different news sites
        const selectors = [
          // Generic article selectors
          'article',
          '.article',
          '.story',
          '.news-item',
          '.headline',
          
          // Google News specific
          'article[data-n-tid]',
          
          // BBC specific
          '[data-testid="edinburgh-article"]',
          '.gs-c-promo',
          
          // CNN specific
          '.cd__content',
          '.container__link',
          
          // Reuters specific
          '.story-content',
          '.media-story-card'
        ];
        
        let foundArticles = [];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundArticles = Array.from(elements);
            break;
          }
        }
        
        // If no specific selectors work, try to find links with article-like content
        if (foundArticles.length === 0) {
          foundArticles = Array.from(document.querySelectorAll('a')).filter(link => {
            const text = link.textContent?.trim() || '';
            return text.length > 20 && text.length < 200;
          });
        }
        
        foundArticles.slice(0, maxCount).forEach(element => {
          try {
            const titleEl = element.querySelector('h1, h2, h3, h4, .headline, .title') || element;
            const linkEl = element.querySelector('a') || (element.tagName === 'A' ? element : null);
            const summaryEl = element.querySelector('p, .summary, .description, .excerpt');
            const timestampEl = element.querySelector('time, .timestamp, .date, .time');
            const authorEl = element.querySelector('.author, .byline, .by');
            
            const title = titleEl?.textContent?.trim() || '';
            const url = linkEl?.href || '';
            
            if (title && title.length > 10) {
              articles.push({
                title,
                url,
                summary: summaryEl?.textContent?.trim()?.substring(0, 200) || '',
                timestamp: timestampEl?.textContent?.trim() || timestampEl?.getAttribute('datetime') || '',
                author: authorEl?.textContent?.trim() || ''
              });
            }
          } catch (e) {
            console.warn('Error extracting article:', e);
          }
        });
        
        return articles;
      })();
    `;

    return await browserController.evaluateScript(pageId, script) as Array<{ title: string; url: string; summary?: string; timestamp?: string; author?: string }>;
  }
}

export class SocialMediaScrapingTask extends BaseWebTask {
  name = 'Social Media Scraping';
  category = 'scraping';
  description = 'Extract posts and content from social media platforms';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    
    try {
      // Note: Most social media platforms have strict anti-scraping measures
      // This is a simplified implementation for educational purposes
      
      const platform = this.determinePlatform(command);
      const query = command.parameters.searchTerm as string || command.action;

      let result: Omit<WebTaskResult, 'duration'>;

      switch (platform) {
        case 'twitter':
          result = await this.scrapeTwitter();
          break;
        case 'reddit':
          result = await this.scrapeReddit(command, browserController, query);
          break;
        default:
          throw new Error(`Unsupported social media platform: ${platform}`);
      }

      const duration = Date.now() - startTime;
      return {
        ...result,
        duration
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Social media scraping failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determinePlatform(command: ParsedCommand): string {
    const commandText = JSON.stringify(command).toLowerCase();
    
    if (commandText.includes('twitter') || commandText.includes('tweet')) return 'twitter';
    if (commandText.includes('reddit')) return 'reddit';
    if (commandText.includes('linkedin')) return 'linkedin';
    if (commandText.includes('facebook')) return 'facebook';
    
    throw new Error('No supported social media platform specified');
  }

  private async scrapeTwitter(): Promise<Omit<WebTaskResult, 'duration'>> {
    // Note: Twitter requires authentication for most content
    // This is a simplified example
    return {
      success: false,
      error: 'Twitter scraping requires authentication and is subject to rate limits. Consider using Twitter API instead.'
    };
  }

  private async scrapeReddit(
    command: ParsedCommand,
    browserController: BrowserController,
    query: string
  ): Promise<Omit<WebTaskResult, 'duration'>> {
    const pageId = 'reddit_scraping';

    try {
      const searchUrl = `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
      
      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, searchUrl);
      await this.waitForPageLoad(pageId, browserController);

      // Extract Reddit posts
      const posts = await this.extractRedditPosts(pageId, browserController);

      await browserController.closePage(pageId);

      return {
        success: true,
        data: {
          platform: 'Reddit',
          query,
          posts,
          postCount: posts.length
        }
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reddit scraping failed'
      };
    }
  }

  private async extractRedditPosts(
    pageId: string,
    browserController: BrowserController
  ): Promise<Array<{ title: string; url: string; subreddit: string; score: string; comments: string }>> {
    const script = `
      (function() {
        const posts = [];
        const postElements = document.querySelectorAll('[data-testid="post-container"]');
        
        postElements.forEach(element => {
          try {
            const titleEl = element.querySelector('h3');
            const linkEl = element.querySelector('a[data-click-id="body"]');
            const subredditEl = element.querySelector('[data-testid="subreddit-name"]');
            const scoreEl = element.querySelector('[data-testid="vote-arrows"] div');
            const commentsEl = element.querySelector('[data-testid="comment-count"]');
            
            if (titleEl) {
              posts.push({
                title: titleEl.textContent?.trim() || '',
                url: linkEl?.href || '',
                subreddit: subredditEl?.textContent?.trim() || '',
                score: scoreEl?.textContent?.trim() || '0',
                comments: commentsEl?.textContent?.trim() || '0'
              });
            }
          } catch (e) {
            console.warn('Error extracting Reddit post:', e);
          }
        });
        
        return posts;
      })();
    `;

    return await browserController.evaluateScript(pageId, script) as Array<{ title: string; url: string; subreddit: string; score: string; comments: string }>;
  }
}