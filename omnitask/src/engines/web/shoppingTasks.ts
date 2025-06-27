import { BaseWebTask, WebTaskResult } from './webTaskTemplate';
import { BrowserController } from './browserController';
import { ParsedCommand } from '@/lib/commandParser';

export interface ProductResult {
  title: string;
  price: string;
  url: string;
  image?: string;
  rating?: string;
  reviews?: string;
  availability?: string;
}

export class AmazonSearchTask extends BaseWebTask {
  name = 'Amazon Product Search';
  category = 'shopping';
  description = 'Search for products on Amazon with price filtering';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'amazon_search';

    try {
      const searchTerm = command.parameters.searchTerm as string || command.action;
      const maxPrice = command.parameters.maxPrice as number;

      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, 'https://www.amazon.com');
      await this.handleCookieConsent(pageId, browserController);

      // Wait for and fill search box
      await browserController.waitForElement(pageId, '#twotabsearchtextbox');
      await browserController.fillInput(pageId, '#twotabsearchtextbox', searchTerm);
      await browserController.clickElement(pageId, '#nav-search-submit-button');

      // Wait for search results
      await browserController.waitForElement(pageId, '[data-component-type="s-search-result"]', 15000);

      // Apply price filter if specified
      if (maxPrice) {
        await this.applyPriceFilter(pageId, browserController, maxPrice);
      }

      // Extract product results
      const products = await this.extractAmazonProducts(pageId, browserController);

      const duration = Date.now() - startTime;
      await browserController.closePage(pageId);

      return {
        success: true,
        data: {
          searchTerm,
          maxPrice,
          products,
          productCount: products.length,
          marketplace: 'Amazon'
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Amazon search failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async applyPriceFilter(
    pageId: string, 
    browserController: BrowserController, 
    maxPrice: number
  ): Promise<void> {
    try {
      // Look for price filter options
      const priceFilterSelector = '[data-cy="price-range-input-low"]';
      await browserController.waitForElement(pageId, priceFilterSelector, 5000);
      
      // Set max price
      await browserController.fillInput(pageId, '[data-cy="price-range-input-high"]', maxPrice.toString());
      await browserController.clickElement(pageId, '[aria-label="Submit price range"]');
      
      // Wait for results to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch {
      // Price filter might not be available, continue without it
      console.log('Price filter not available, continuing without filtering');
    }
  }

  private async extractAmazonProducts(
    pageId: string, 
    browserController: BrowserController
  ): Promise<ProductResult[]> {
    const script = `
      const products = [];
      const productElements = document.querySelectorAll('[data-component-type="s-search-result"]');
      
      for (let i = 0; i < Math.min(20, productElements.length); i++) {
        const element = productElements[i];
        
        const titleEl = element.querySelector('h2 a span, h2 span');
        const priceEl = element.querySelector('.a-price-whole, .a-offscreen');
        const linkEl = element.querySelector('h2 a');
        const imageEl = element.querySelector('img');
        const ratingEl = element.querySelector('[aria-label*="stars"]');
        const reviewsEl = element.querySelector('[aria-label*="ratings"]');
        
        if (titleEl && priceEl) {
          products.push({
            title: titleEl.textContent?.trim() || '',
            price: priceEl.textContent?.trim() || '',
            url: linkEl ? 'https://amazon.com' + linkEl.getAttribute('href') : '',
            image: imageEl?.src || '',
            rating: ratingEl?.getAttribute('aria-label') || '',
            reviews: reviewsEl?.getAttribute('aria-label') || '',
            availability: 'Available'
          });
        }
      }
      
      return products;
    `;

    return await browserController.evaluateScript(pageId, script) as ProductResult[];
  }
}

export class GeneralShoppingSearchTask extends BaseWebTask {
  name = 'General Shopping Search';
  category = 'shopping';
  description = 'Search for products across multiple shopping platforms';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();

    try {
      // Determine which shopping site to use based on command
      const shoppingSite = this.determineShoppingSite(command);
      
      if (shoppingSite === 'amazon') {
        const amazonTask = new AmazonSearchTask();
        return await amazonTask.execute(command, browserController);
      }

      // For other sites, use Google Shopping search
      return await this.executeGoogleShoppingSearch(command, browserController);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Shopping search failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determineShoppingSite(command: ParsedCommand): string {
    const commandText = JSON.stringify(command).toLowerCase();
    
    if (commandText.includes('amazon')) return 'amazon';
    if (commandText.includes('ebay')) return 'ebay';
    if (commandText.includes('walmart')) return 'walmart';
    if (commandText.includes('target')) return 'target';
    
    return 'google_shopping';
  }

  private async executeGoogleShoppingSearch(
    command: ParsedCommand, 
    browserController: BrowserController
  ): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'google_shopping';
    const searchTerm = command.parameters.searchTerm as string || command.action;

    try {
      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(searchTerm)}`);
      await this.handleCookieConsent(pageId, browserController);

      // Wait for shopping results
      await browserController.waitForElement(pageId, '.sh-dgr__content', 15000);

      // Extract Google Shopping results
      const products = await this.extractGoogleShoppingProducts(pageId, browserController);

      const duration = Date.now() - startTime;
      await browserController.closePage(pageId);

      return {
        success: true,
        data: {
          searchTerm,
          products,
          productCount: products.length,
          marketplace: 'Google Shopping'
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Google Shopping search failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async extractGoogleShoppingProducts(
    pageId: string, 
    browserController: BrowserController
  ): Promise<ProductResult[]> {
    const script = `
      const products = [];
      const productElements = document.querySelectorAll('.sh-dgr__content');
      
      for (let i = 0; i < Math.min(15, productElements.length); i++) {
        const element = productElements[i];
        
        const titleEl = element.querySelector('.tAxDx');
        const priceEl = element.querySelector('.a8Pemb');
        const linkEl = element.querySelector('a');
        const imageEl = element.querySelector('img');
        const merchantEl = element.querySelector('.aULzUe');
        
        if (titleEl && priceEl) {
          products.push({
            title: titleEl.textContent?.trim() || '',
            price: priceEl.textContent?.trim() || '',
            url: linkEl?.href || '',
            image: imageEl?.src || '',
            merchant: merchantEl?.textContent?.trim() || '',
            availability: 'Check availability'
          });
        }
      }
      
      return products;
    `;

    return await browserController.evaluateScript(pageId, script) as ProductResult[];
  }
}

export class ProductComparisonTask extends BaseWebTask {
  name = 'Product Comparison';
  category = 'shopping';
  description = 'Compare products across multiple platforms';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const searchTerm = command.parameters.searchTerm as string || command.action;

    try {
      // Run searches on multiple platforms in parallel
      const amazonTask = new AmazonSearchTask();
      const googleShoppingTask = new GeneralShoppingSearchTask();

      const [amazonResults, googleResults] = await Promise.all([
        amazonTask.execute(command, browserController),
        googleShoppingTask.execute(command, browserController)
      ]);

      const allProducts = [
        ...(amazonResults.success ? (amazonResults.data as { products: ProductResult[] }).products : []),
        ...(googleResults.success ? (googleResults.data as { products: ProductResult[] }).products : [])
      ];

      // Sort by price if available
      const sortedProducts = allProducts
        .filter(p => p.price)
        .sort((a, b) => {
          const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''));
          const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''));
          return priceA - priceB;
        });

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          searchTerm,
          products: sortedProducts,
          productCount: sortedProducts.length,
          platforms: ['Amazon', 'Google Shopping'],
          comparison: {
            lowestPrice: sortedProducts[0]?.price || 'N/A',
            highestPrice: sortedProducts[sortedProducts.length - 1]?.price || 'N/A',
            averagePrice: this.calculateAveragePrice(sortedProducts)
          }
        },
        duration
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Product comparison failed',
        duration: Date.now() - startTime
      };
    }
  }

  private calculateAveragePrice(products: ProductResult[]): string {
    if (products.length === 0) return 'N/A';

    const prices = products
      .map(p => parseFloat(p.price.replace(/[^0-9.]/g, '')))
      .filter(p => !isNaN(p));

    if (prices.length === 0) return 'N/A';

    const average = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    return `$${average.toFixed(2)}`;
  }
}