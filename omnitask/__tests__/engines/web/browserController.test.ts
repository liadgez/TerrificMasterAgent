import { BrowserController } from '@/engines/web/browserController';

// Mock Playwright
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn()
  },
  firefox: {
    launch: jest.fn()
  },
  webkit: {
    launch: jest.fn()
  }
}));

describe('Browser Controller', () => {
  let controller: BrowserController;
  let mockBrowser: any;
  let mockContext: any;
  let mockPage: any;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn(),
      click: jest.fn(),
      fill: jest.fn(),
      selectOption: jest.fn(),
      locator: jest.fn().mockReturnValue({
        textContent: jest.fn(),
        getAttribute: jest.fn(),
        scrollIntoViewIfNeeded: jest.fn()
      }),
      screenshot: jest.fn(),
      evaluate: jest.fn(),
      waitForSelector: jest.fn(),
      waitForLoadState: jest.fn(),
      close: jest.fn(),
      on: jest.fn()
    };

    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      setDefaultTimeout: jest.fn(),
      setDefaultNavigationTimeout: jest.fn(),
      close: jest.fn()
    };

    mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext),
      close: jest.fn()
    };

    const { chromium } = require('playwright');
    chromium.launch.mockResolvedValue(mockBrowser);

    controller = new BrowserController();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    test('should initialize with default config', async () => {
      await controller.initialize();

      const { chromium } = require('playwright');
      expect(chromium.launch).toHaveBeenCalledWith({
        headless: true,
        timeout: 30000
      });
      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        viewport: { width: 1280, height: 720 },
        userAgent: undefined
      });
    });

    test('should initialize with custom config', async () => {
      const customController = new BrowserController({
        browser: 'firefox',
        headless: false,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Custom Agent'
      });

      await customController.initialize();

      const { firefox } = require('playwright');
      expect(firefox.launch).toHaveBeenCalledWith({
        headless: false,
        timeout: 30000
      });
    });

    test('should not reinitialize if already initialized', async () => {
      await controller.initialize();
      await controller.initialize();

      const { chromium } = require('playwright');
      expect(chromium.launch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Page Management', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    test('should create a new page', async () => {
      const page = await controller.createPage('test-page');

      expect(mockContext.newPage).toHaveBeenCalled();
      expect(mockPage.on).toHaveBeenCalledWith('console', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('pageerror', expect.any(Function));
      expect(page).toBe(mockPage);
    });

    test('should generate page ID if not provided', async () => {
      await controller.createPage();

      expect(mockContext.newPage).toHaveBeenCalled();
      expect(controller.getPageIds()).toHaveLength(1);
    });

    test('should navigate to URL', async () => {
      await controller.createPage('test-page');
      await controller.navigateToPage('test-page', 'https://example.com');

      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
    });

    test('should throw error for non-existent page', async () => {
      await expect(
        controller.navigateToPage('non-existent', 'https://example.com')
      ).rejects.toThrow('Page with ID non-existent not found');
    });

    test('should close page', async () => {
      await controller.createPage('test-page');
      await controller.closePage('test-page');

      expect(mockPage.close).toHaveBeenCalled();
      expect(controller.getPageIds()).toHaveLength(0);
    });

    test('should close all pages', async () => {
      await controller.createPage('page1');
      await controller.createPage('page2');
      await controller.closeAllPages();

      expect(mockPage.close).toHaveBeenCalledTimes(2);
      expect(controller.getPageIds()).toHaveLength(0);
    });
  });

  describe('Page Interactions', () => {
    beforeEach(async () => {
      await controller.initialize();
      await controller.createPage('test-page');
    });

    test('should wait for element', async () => {
      await controller.waitForElement('test-page', '#selector');

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('#selector', {
        timeout: 30000
      });
    });

    test('should click element', async () => {
      await controller.clickElement('test-page', '#button');

      expect(mockPage.click).toHaveBeenCalledWith('#button');
    });

    test('should fill input', async () => {
      await controller.fillInput('test-page', '#input', 'test value');

      expect(mockPage.fill).toHaveBeenCalledWith('#input', 'test value');
    });

    test('should select option', async () => {
      await controller.selectOption('test-page', '#select', 'option1');

      expect(mockPage.selectOption).toHaveBeenCalledWith('#select', 'option1');
    });

    test('should get element text', async () => {
      const mockLocator = mockPage.locator();
      mockLocator.textContent.mockResolvedValue('element text');

      const text = await controller.getElementText('test-page', '#element');

      expect(mockPage.locator).toHaveBeenCalledWith('#element');
      expect(text).toBe('element text');
    });

    test('should get element attribute', async () => {
      const mockLocator = mockPage.locator();
      mockLocator.getAttribute.mockResolvedValue('attribute value');

      const attr = await controller.getElementAttribute('test-page', '#element', 'href');

      expect(mockPage.locator).toHaveBeenCalledWith('#element');
      expect(mockLocator.getAttribute).toHaveBeenCalledWith('href');
      expect(attr).toBe('attribute value');
    });

    test('should scroll to element', async () => {
      const mockLocator = mockPage.locator();

      await controller.scrollToElement('test-page', '#element');

      expect(mockPage.locator).toHaveBeenCalledWith('#element');
      expect(mockLocator.scrollIntoViewIfNeeded).toHaveBeenCalled();
    });

    test('should take screenshot', async () => {
      const mockBuffer = Buffer.from('screenshot data');
      mockPage.screenshot.mockResolvedValue(mockBuffer);

      const screenshot = await controller.takeScreenshot('test-page', '/path/to/screenshot.png');

      expect(mockPage.screenshot).toHaveBeenCalledWith({
        path: '/path/to/screenshot.png',
        fullPage: true
      });
      expect(screenshot).toBe(mockBuffer);
    });

    test('should evaluate script', async () => {
      mockPage.evaluate.mockResolvedValue('script result');

      const result = await controller.evaluateScript('test-page', 'return "test"');

      expect(mockPage.evaluate).toHaveBeenCalledWith('return "test"');
      expect(result).toBe('script result');
    });

    test('should wait for navigation', async () => {
      await controller.waitForNavigation('test-page');

      expect(mockPage.waitForLoadState).toHaveBeenCalledWith('domcontentloaded', {
        timeout: 30000
      });
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await controller.initialize();
    });

    test('should close browser and context', async () => {
      await controller.close();

      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
      expect(controller.isInitialized()).toBe(false);
    });

    test('should close all pages before closing browser', async () => {
      await controller.createPage('test-page');
      await controller.close();

      expect(mockPage.close).toHaveBeenCalled();
      expect(mockContext.close).toHaveBeenCalled();
      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle initialization errors', async () => {
      const { chromium } = require('playwright');
      chromium.launch.mockRejectedValue(new Error('Launch failed'));

      await expect(controller.initialize()).rejects.toThrow('Launch failed');
    });

    test('should handle page creation errors', async () => {
      await controller.initialize();
      mockContext.newPage.mockRejectedValue(new Error('Page creation failed'));

      await expect(controller.createPage()).rejects.toThrow('Page creation failed');
    });

    test('should handle navigation errors', async () => {
      await controller.initialize();
      await controller.createPage('test-page');
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      await expect(
        controller.navigateToPage('test-page', 'https://example.com')
      ).rejects.toThrow('Navigation failed');
    });
  });
});