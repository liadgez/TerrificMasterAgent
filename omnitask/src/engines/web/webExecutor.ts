import { globalBrowserController } from './browserController';
import { webTaskRegistry } from './webTaskTemplate';
import { AmazonSearchTask, GeneralShoppingSearchTask, ProductComparisonTask } from './shoppingTasks';
import { FormFillingTask, ContactFormTask, RegistrationFormTask } from './formTasks';
import { WebScrapingTask, NewsScrapingTask, SocialMediaScrapingTask } from './scrapingTasks';
import { ParsedCommand } from '@/lib/commandParser';
import { WebTaskResult } from './webTaskTemplate';

// Register all web tasks
const allWebTasks = new Map([
  // Base tasks
  ...webTaskRegistry,
  
  // Shopping tasks
  ['amazon_search', new AmazonSearchTask()],
  ['shopping_search', new GeneralShoppingSearchTask()],
  ['product_comparison', new ProductComparisonTask()],
  
  // Form tasks
  ['form_fill', new FormFillingTask()],
  ['contact_form', new ContactFormTask()],
  ['registration_form', new RegistrationFormTask()],
  
  // Scraping tasks
  ['web_scraping', new WebScrapingTask()],
  ['news_scraping', new NewsScrapingTask()],
  ['social_scraping', new SocialMediaScrapingTask()]
]);

export class WebExecutor {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (!this.isInitialized) {
      await globalBrowserController.initialize();
      this.isInitialized = true;
    }
  }

  async executeWebTask(command: ParsedCommand): Promise<WebTaskResult> {
    const startTime = Date.now();

    try {
      await this.initialize();

      // Determine which task to execute based on command
      const taskKey = this.determineTaskType(command);
      const task = allWebTasks.get(taskKey);

      if (!task) {
        throw new Error(`Unsupported web task type: ${taskKey}`);
      }

      console.log(`Executing web task: ${task.name} (${task.category})`);
      
      // Execute the task
      const result = await task.execute(command, globalBrowserController);

      return {
        ...result,
        data: {
          ...(result.data as Record<string, unknown> || {}),
          taskType: taskKey,
          taskName: task.name,
          category: task.category,
          executedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('Web task execution failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown web execution error',
        duration: Date.now() - startTime
      };
    }
  }

  private determineTaskType(command: ParsedCommand): string {
    const { category, action, parameters } = command;
    const commandText = JSON.stringify(command).toLowerCase();

    // Shopping tasks
    if (category === 'shopping') {
      if (commandText.includes('amazon')) {
        return 'amazon_search';
      }
      if (commandText.includes('compare') || commandText.includes('comparison')) {
        return 'product_comparison';
      }
      return 'shopping_search';
    }

    // Form tasks
    if (category === 'forms') {
      if (commandText.includes('contact')) {
        return 'contact_form';
      }
      if (commandText.includes('register') || commandText.includes('signup') || commandText.includes('sign up')) {
        return 'registration_form';
      }
      return 'form_fill';
    }

    // Scraping tasks
    if (category === 'scraping' || action === 'scrape' || action === 'extract') {
      if (commandText.includes('news') || commandText.includes('article')) {
        return 'news_scraping';
      }
      if (commandText.includes('twitter') || commandText.includes('reddit') || commandText.includes('social')) {
        return 'social_scraping';
      }
      return 'web_scraping';
    }

    // Browsing tasks
    if (category === 'browsing') {
      if (action === 'search' || commandText.includes('search')) {
        return 'search';
      }
      if (action === 'navigate' || action === 'open' || action === 'go' || action === 'visit') {
        return 'navigate';
      }
      return 'browse';
    }

    // Default based on action
    switch (action) {
      case 'search':
        if (commandText.includes('product') || commandText.includes('buy') || commandText.includes('shop')) {
          return 'shopping_search';
        }
        return 'search';
      
      case 'buy':
      case 'shop':
      case 'find':
        if (commandText.includes('product') || parameters.maxPrice) {
          return 'shopping_search';
        }
        return 'search';
      
      case 'fill':
        return 'form_fill';
      
      case 'scrape':
      case 'extract':
        return 'web_scraping';
      
      case 'open':
      case 'visit':
      case 'navigate':
      case 'go':
        return 'navigate';
      
      default:
        // Fallback to browsing for unknown actions
        return 'navigate';
    }
  }

  async cleanup(): Promise<void> {
    if (this.isInitialized) {
      await globalBrowserController.close();
      this.isInitialized = false;
    }
  }

  getAvailableTasks(): Array<{ key: string; name: string; category: string; description: string }> {
    return Array.from(allWebTasks.entries()).map(([key, task]) => ({
      key,
      name: task.name,
      category: task.category,
      description: task.description
    }));
  }

  isTaskSupported(taskKey: string): boolean {
    return allWebTasks.has(taskKey);
  }
}

// Singleton instance
export const globalWebExecutor = new WebExecutor();