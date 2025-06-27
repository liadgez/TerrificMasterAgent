import { WebTaskExecutor } from '@/engines/web/webTaskExecutor';
import { BrowserController } from '@/engines/web/browserController';
import { parseCommand } from '@/lib/commandParser';
import { validateCommand } from '@/lib/commandValidator';

// Mock browser controller
jest.mock('@/engines/web/browserController');

const MockBrowserController = BrowserController as jest.MockedClass<typeof BrowserController>;

describe('Web Automation Integration Tests', () => {
  let webExecutor: WebTaskExecutor;
  let mockBrowserController: jest.Mocked<BrowserController>;

  beforeEach(() => {
    MockBrowserController.mockClear();
    mockBrowserController = {
      initialize: jest.fn(),
      createPage: jest.fn(),
      navigateToPage: jest.fn(),
      waitForElement: jest.fn(),
      clickElement: jest.fn(),
      fillInput: jest.fn(),
      selectOption: jest.fn(),
      getElementText: jest.fn(),
      getElementAttribute: jest.fn(),
      scrollToElement: jest.fn(),
      takeScreenshot: jest.fn(),
      evaluateScript: jest.fn(),
      waitForNavigation: jest.fn(),
      closePage: jest.fn(),
      closeAllPages: jest.fn(),
      close: jest.fn(),
      isInitialized: jest.fn().mockReturnValue(true),
      getPageIds: jest.fn().mockReturnValue(['test-page'])
    } as any;

    MockBrowserController.mockImplementation(() => mockBrowserController);
    webExecutor = new WebTaskExecutor();
  });

  describe('Shopping Task Integration', () => {
    test('should execute complete Amazon shopping flow', async () => {
      const command = 'search for laptops on amazon under $1000';
      const parsed = parseCommand(command);
      const validation = validateCommand(command, parsed);

      expect(validation.isValid).toBe(true);
      expect(parsed.type).toBe('web');
      expect(parsed.category).toBe('shopping');

      mockBrowserController.navigateToPage.mockResolvedValue();
      mockBrowserController.waitForElement.mockResolvedValue(null);
      mockBrowserController.fillInput.mockResolvedValue();
      mockBrowserController.clickElement.mockResolvedValue();
      mockBrowserController.getElementText.mockResolvedValue('Search Results');

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'shopping',
        action: 'search',
        parameters: {
          query: 'laptops',
          site: 'amazon',
          maxPrice: 1000
        }
      });

      expect(result.success).toBe(true);
      expect(mockBrowserController.initialize).toHaveBeenCalled();
      expect(mockBrowserController.navigateToPage).toHaveBeenCalledWith(
        expect.any(String),
        'https://www.amazon.com'
      );
      expect(mockBrowserController.fillInput).toHaveBeenCalledWith(
        expect.any(String),
        '#twotabsearchtextbox',
        'laptops'
      );
    });

    test('should handle eBay auction monitoring', async () => {
      const command = 'monitor auction for vintage camera on ebay';
      const parsed = parseCommand(command);

      mockBrowserController.navigateToPage.mockResolvedValue();
      mockBrowserController.getElementText.mockResolvedValue('$250.00');

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'shopping',
        action: 'monitor',
        parameters: {
          query: 'vintage camera',
          site: 'ebay',
          type: 'auction'
        }
      });

      expect(result.success).toBe(true);
      expect(mockBrowserController.navigateToPage).toHaveBeenCalledWith(
        expect.any(String),
        'https://www.ebay.com'
      );
    });
  });

  describe('Form Filling Integration', () => {
    test('should fill complex multi-step form', async () => {
      const formData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        address: '123 Main St'
      };

      mockBrowserController.waitForElement.mockResolvedValue(null);
      mockBrowserController.fillInput.mockResolvedValue();
      mockBrowserController.clickElement.mockResolvedValue();

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'forms',
        action: 'fill',
        parameters: {
          url: 'https://example.com/form',
          fields: formData
        }
      });

      expect(result.success).toBe(true);
      expect(mockBrowserController.fillInput).toHaveBeenCalledTimes(5);
    });

    test('should handle form validation errors', async () => {
      mockBrowserController.fillInput.mockRejectedValue(new Error('Element not found'));

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'forms',
        action: 'fill',
        parameters: {
          url: 'https://example.com/form',
          fields: { email: 'invalid-email' }
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Element not found');
    });
  });

  describe('Web Scraping Integration', () => {
    test('should scrape structured data from e-commerce site', async () => {
      mockBrowserController.navigateToPage.mockResolvedValue();
      mockBrowserController.getElementText.mockResolvedValueOnce('Product Title')
        .mockResolvedValueOnce('$99.99')
        .mockResolvedValueOnce('In Stock');

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'scraping',
        action: 'extract',
        parameters: {
          url: 'https://shop.example.com/product/123',
          selectors: {
            title: '.product-title',
            price: '.price',
            availability: '.stock-status'
          }
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        title: 'Product Title',
        price: '$99.99',
        availability: 'In Stock'
      });
    });

    test('should handle pagination during scraping', async () => {
      let pageCount = 0;
      mockBrowserController.clickElement.mockImplementation(() => {
        pageCount++;
        if (pageCount > 3) {
          throw new Error('Next button not found'); // Simulate end of pagination
        }
        return Promise.resolve();
      });

      mockBrowserController.getElementText.mockResolvedValue('Page content');

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'scraping',
        action: 'paginate',
        parameters: {
          url: 'https://example.com/products',
          maxPages: 5,
          selector: '.product-item'
        }
      });

      expect(result.success).toBe(true);
      expect(mockBrowserController.clickElement).toHaveBeenCalledTimes(3);
    });
  });

  describe('Social Media Integration', () => {
    test('should post to multiple social platforms', async () => {
      const postContent = 'Check out this amazing product!';
      
      mockBrowserController.navigateToPage.mockResolvedValue();
      mockBrowserController.fillInput.mockResolvedValue();
      mockBrowserController.clickElement.mockResolvedValue();

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'social',
        action: 'post',
        parameters: {
          platforms: ['twitter', 'facebook'],
          content: postContent,
          scheduled: false
        }
      });

      expect(result.success).toBe(true);
      expect(mockBrowserController.navigateToPage).toHaveBeenCalledTimes(2);
    });

    test('should schedule social media posts', async () => {
      const scheduleTime = new Date(Date.now() + 3600000); // 1 hour from now

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'social',
        action: 'schedule',
        parameters: {
          platform: 'twitter',
          content: 'Scheduled post',
          scheduleTime: scheduleTime.toISOString()
        }
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Error Recovery Integration', () => {
    test('should retry failed operations', async () => {
      let attemptCount = 0;
      mockBrowserController.clickElement.mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve();
      });

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'navigation',
        action: 'click',
        parameters: {
          url: 'https://example.com',
          selector: '#retry-button'
        }
      });

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
    });

    test('should handle network timeouts gracefully', async () => {
      mockBrowserController.navigateToPage.mockRejectedValue(
        new Error('net::ERR_CONNECTION_TIMED_OUT')
      );

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'navigation',
        action: 'goto',
        parameters: {
          url: 'https://slow-site.example.com'
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection timed out');
    });
  });

  describe('Performance Integration', () => {
    test('should handle multiple concurrent pages', async () => {
      const pageIds = ['page1', 'page2', 'page3'];
      mockBrowserController.getPageIds.mockReturnValue(pageIds);
      mockBrowserController.createPage.mockResolvedValue({} as any);

      const tasks = pageIds.map(pageId => 
        webExecutor.executeTask({
          type: 'web',
          category: 'navigation',
          action: 'goto',
          parameters: {
            url: `https://example.com/${pageId}`,
            pageId
          }
        })
      );

      const results = await Promise.all(tasks);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    test('should cleanup resources after task completion', async () => {
      await webExecutor.executeTask({
        type: 'web',
        category: 'navigation',
        action: 'goto',
        parameters: {
          url: 'https://example.com'
        }
      });

      expect(mockBrowserController.closeAllPages).toHaveBeenCalled();
    });
  });

  describe('Security Integration', () => {
    test('should reject malicious URLs', async () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd'
      ];

      for (const url of maliciousUrls) {
        const result = await webExecutor.executeTask({
          type: 'web',
          category: 'navigation',
          action: 'goto',
          parameters: { url }
        });

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid or unsafe URL');
      }
    });

    test('should sanitize form inputs', async () => {
      const maliciousInput = '<script>alert("xss")</script>';

      mockBrowserController.fillInput.mockImplementation((pageId, selector, value) => {
        expect(value).not.toContain('<script>');
        return Promise.resolve();
      });

      const result = await webExecutor.executeTask({
        type: 'web',
        category: 'forms',
        action: 'fill',
        parameters: {
          url: 'https://example.com/form',
          fields: {
            comment: maliciousInput
          }
        }
      });

      expect(result.success).toBe(true);
    });
  });
});