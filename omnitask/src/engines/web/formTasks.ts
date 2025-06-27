import { BaseWebTask, WebTaskResult } from './webTaskTemplate';
import { BrowserController } from './browserController';
import { ParsedCommand } from '@/lib/commandParser';

export interface FormField {
  selector: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea';
  value: string;
  label?: string;
  required?: boolean;
}

export interface FormData {
  fields: FormField[];
  submitSelector?: string;
  formSelector?: string;
}

export class FormFillingTask extends BaseWebTask {
  name = 'Form Filling';
  category = 'forms';
  description = 'Automatically fill out web forms with provided data';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'form_page';

    try {
      const url = command.parameters.url as string;
      const formData = command.parameters.formData as FormData;

      if (!url) {
        throw new Error('URL is required for form filling');
      }

      if (!formData || !formData.fields || formData.fields.length === 0) {
        throw new Error('Form data with fields is required');
      }

      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, url);
      await this.waitForPageLoad(pageId, browserController);
      await this.handleCookieConsent(pageId, browserController);

      // Fill form fields
      const filledFields = await this.fillFormFields(pageId, browserController, formData.fields);

      // Optionally submit the form
      let submitted = false;
      if (formData.submitSelector) {
        submitted = await this.submitForm(pageId, browserController, formData.submitSelector);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          url,
          filledFields,
          submitted,
          fieldCount: formData.fields.length,
          successfullyFilled: filledFields.filter(f => f.success).length
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Form filling failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async fillFormFields(
    pageId: string,
    browserController: BrowserController,
    fields: FormField[]
  ): Promise<Array<{ field: FormField; success: boolean; error?: string }>> {
    const results = [];

    for (const field of fields) {
      try {
        await browserController.waitForElement(pageId, field.selector, 5000);

        switch (field.type) {
          case 'text':
          case 'email':
          case 'password':
          case 'number':
          case 'textarea':
            await browserController.fillInput(pageId, field.selector, field.value);
            break;

          case 'select':
            await browserController.selectOption(pageId, field.selector, field.value);
            break;

          case 'checkbox':
            if (field.value.toLowerCase() === 'true' || field.value === '1') {
              await browserController.clickElement(pageId, field.selector);
            }
            break;

          case 'radio':
            await browserController.clickElement(pageId, `${field.selector}[value="${field.value}"]`);
            break;

          default:
            throw new Error(`Unsupported field type: ${field.type}`);
        }

        results.push({ field, success: true });

        // Small delay between fields to avoid overwhelming the page
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        results.push({
          field,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  private async submitForm(
    pageId: string,
    browserController: BrowserController,
    submitSelector: string
  ): Promise<boolean> {
    try {
      await browserController.clickElement(pageId, submitSelector);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for submission
      return true;
    } catch (error) {
      console.error('Form submission failed:', error);
      return false;
    }
  }
}

export class ContactFormTask extends BaseWebTask {
  name = 'Contact Form';
  category = 'forms';
  description = 'Fill out contact forms with standard contact information';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'contact_form';

    try {
      const url = command.parameters.url as string;
      const contactInfo = command.parameters.contactInfo as Record<string, string>;

      if (!url) {
        throw new Error('URL is required for contact form filling');
      }

      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, url);
      await this.waitForPageLoad(pageId, browserController);
      await this.handleCookieConsent(pageId, browserController);

      // Detect and fill common contact form fields
      const detectedFields = await this.detectContactFormFields(pageId, browserController);
      const filledFields = await this.fillDetectedFields(pageId, browserController, detectedFields, contactInfo);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          url,
          detectedFields: detectedFields.length,
          filledFields: filledFields.filter(f => f.success).length,
          fields: filledFields
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Contact form filling failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async detectContactFormFields(
    pageId: string,
    browserController: BrowserController
  ): Promise<Array<{ selector: string; type: string; fieldType: string }>> {
    const script = `
      const fields = [];
      const inputElements = document.querySelectorAll('input, textarea, select');
      
      inputElements.forEach(element => {
        const type = element.type || element.tagName.toLowerCase();
        const name = element.name || element.id || '';
        const placeholder = element.placeholder || '';
        const label = element.getAttribute('aria-label') || '';
        
        const fieldInfo = {
          selector: element.name ? \`[name="\${element.name}"]\` : \`#\${element.id}\`,
          type: type,
          fieldType: ''
        };
        
        // Detect field purpose based on attributes
        const allText = (name + placeholder + label).toLowerCase();
        
        if (allText.includes('name') && !allText.includes('user') && !allText.includes('company')) {
          fieldInfo.fieldType = allText.includes('first') ? 'firstName' : 
                               allText.includes('last') ? 'lastName' : 'fullName';
        } else if (allText.includes('email')) {
          fieldInfo.fieldType = 'email';
        } else if (allText.includes('phone') || allText.includes('tel')) {
          fieldInfo.fieldType = 'phone';
        } else if (allText.includes('company') || allText.includes('organization')) {
          fieldInfo.fieldType = 'company';
        } else if (allText.includes('subject')) {
          fieldInfo.fieldType = 'subject';
        } else if (allText.includes('message') || type === 'textarea') {
          fieldInfo.fieldType = 'message';
        } else if (allText.includes('address')) {
          fieldInfo.fieldType = 'address';
        } else if (allText.includes('city')) {
          fieldInfo.fieldType = 'city';
        } else if (allText.includes('state') || allText.includes('province')) {
          fieldInfo.fieldType = 'state';
        } else if (allText.includes('zip') || allText.includes('postal')) {
          fieldInfo.fieldType = 'zip';
        }
        
        if (fieldInfo.fieldType && element.offsetParent !== null) {
          fields.push(fieldInfo);
        }
      });
      
      return fields;
    `;

    return await browserController.evaluateScript(pageId, script) as Array<{ selector: string; type: string; fieldType: string }>;
  }

  private async fillDetectedFields(
    pageId: string,
    browserController: BrowserController,
    detectedFields: Array<{ selector: string; type: string; fieldType: string }>,
    contactInfo: Record<string, string>
  ): Promise<Array<{ field: { selector: string; fieldType: string }; success: boolean; error?: string }>> {
    const results = [];

    // Default values if not provided in contactInfo
    const defaultValues: Record<string, string> = {
      firstName: contactInfo.firstName || 'John',
      lastName: contactInfo.lastName || 'Doe',
      fullName: contactInfo.fullName || 'John Doe',
      email: contactInfo.email || 'john.doe@example.com',
      phone: contactInfo.phone || '(555) 123-4567',
      company: contactInfo.company || 'Example Company',
      subject: contactInfo.subject || 'General Inquiry',
      message: contactInfo.message || 'Hello, I am interested in learning more about your services.',
      address: contactInfo.address || '123 Main Street',
      city: contactInfo.city || 'Anytown',
      state: contactInfo.state || 'CA',
      zip: contactInfo.zip || '12345'
    };

    for (const field of detectedFields) {
      try {
        const value = defaultValues[field.fieldType];
        if (!value) {
          results.push({
            field: { selector: field.selector, fieldType: field.fieldType },
            success: false,
            error: 'No value available for field type'
          });
          continue;
        }

        await browserController.waitForElement(pageId, field.selector, 3000);

        if (field.type === 'select') {
          // For select fields, try to find a matching option
          await browserController.selectOption(pageId, field.selector, value);
        } else {
          await browserController.fillInput(pageId, field.selector, value);
        }

        results.push({
          field: { selector: field.selector, fieldType: field.fieldType },
          success: true
        });

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        results.push({
          field: { selector: field.selector, fieldType: field.fieldType },
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

export class RegistrationFormTask extends BaseWebTask {
  name = 'Registration Form';
  category = 'forms';
  description = 'Fill out user registration and signup forms';

  async execute(command: ParsedCommand, browserController: BrowserController): Promise<WebTaskResult> {
    const startTime = Date.now();
    const pageId = 'registration_form';

    try {
      const url = command.parameters.url as string;
      const userInfo = command.parameters.userInfo as Record<string, string>;

      if (!url) {
        throw new Error('URL is required for registration form filling');
      }

      await browserController.createPage(pageId);
      await browserController.navigateToPage(pageId, url);
      await this.waitForPageLoad(pageId, browserController);
      await this.handleCookieConsent(pageId, browserController);

      // Detect registration form fields
      const detectedFields = await this.detectRegistrationFields(pageId, browserController);
      const filledFields = await this.fillRegistrationFields(pageId, browserController, detectedFields, userInfo);

      const duration = Date.now() - startTime;

      return {
        success: true,
        data: {
          url,
          detectedFields: detectedFields.length,
          filledFields: filledFields.filter(f => f.success).length,
          fields: filledFields,
          warning: 'Registration form filled but not submitted for security reasons'
        },
        duration
      };

    } catch (error) {
      await browserController.closePage(pageId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration form filling failed',
        duration: Date.now() - startTime
      };
    }
  }

  private async detectRegistrationFields(
    pageId: string,
    browserController: BrowserController
  ): Promise<Array<{ selector: string; type: string; fieldType: string }>> {
    const script = `
      const fields = [];
      const inputElements = document.querySelectorAll('input, select');
      
      inputElements.forEach(element => {
        const type = element.type || 'text';
        const name = element.name || element.id || '';
        const placeholder = element.placeholder || '';
        const label = element.getAttribute('aria-label') || '';
        
        const fieldInfo = {
          selector: element.name ? \`[name="\${element.name}"]\` : \`#\${element.id}\`,
          type: type,
          fieldType: ''
        };
        
        const allText = (name + placeholder + label).toLowerCase();
        
        if (allText.includes('username') || (allText.includes('user') && allText.includes('name'))) {
          fieldInfo.fieldType = 'username';
        } else if (allText.includes('email')) {
          fieldInfo.fieldType = 'email';
        } else if (allText.includes('password') && !allText.includes('confirm')) {
          fieldInfo.fieldType = 'password';
        } else if (allText.includes('confirm') && allText.includes('password')) {
          fieldInfo.fieldType = 'confirmPassword';
        } else if (allText.includes('first') && allText.includes('name')) {
          fieldInfo.fieldType = 'firstName';
        } else if (allText.includes('last') && allText.includes('name')) {
          fieldInfo.fieldType = 'lastName';
        } else if (allText.includes('phone')) {
          fieldInfo.fieldType = 'phone';
        } else if (allText.includes('birth') || allText.includes('dob')) {
          fieldInfo.fieldType = 'birthDate';
        } else if (allText.includes('gender')) {
          fieldInfo.fieldType = 'gender';
        } else if (allText.includes('terms') || allText.includes('agreement')) {
          fieldInfo.fieldType = 'terms';
        } else if (allText.includes('newsletter') || allText.includes('updates')) {
          fieldInfo.fieldType = 'newsletter';
        }
        
        if (fieldInfo.fieldType && element.offsetParent !== null) {
          fields.push(fieldInfo);
        }
      });
      
      return fields;
    `;

    return await browserController.evaluateScript(pageId, script) as Array<{ selector: string; type: string; fieldType: string }>;
  }

  private async fillRegistrationFields(
    pageId: string,
    browserController: BrowserController,
    detectedFields: Array<{ selector: string; type: string; fieldType: string }>,
    userInfo: Record<string, string>
  ): Promise<Array<{ field: { selector: string; fieldType: string }; success: boolean; error?: string }>> {
    const results = [];

    // Generate secure random values for registration
    const timestamp = Date.now();
    const defaultValues: Record<string, string> = {
      username: userInfo.username || `user_${timestamp}`,
      email: userInfo.email || `user${timestamp}@example.com`,
      password: userInfo.password || 'SecurePass123!',
      confirmPassword: userInfo.password || 'SecurePass123!',
      firstName: userInfo.firstName || 'John',
      lastName: userInfo.lastName || 'Doe',
      phone: userInfo.phone || '(555) 123-4567',
      birthDate: userInfo.birthDate || '01/01/1990',
      gender: userInfo.gender || 'prefer-not-to-say'
    };

    for (const field of detectedFields) {
      try {
        const value = defaultValues[field.fieldType];

        // Handle special cases
        if (field.fieldType === 'terms' || field.fieldType === 'newsletter') {
          // For checkboxes, only check if explicitly requested
          if (userInfo[field.fieldType] === 'true') {
            await browserController.clickElement(pageId, field.selector);
          }
          results.push({
            field: { selector: field.selector, fieldType: field.fieldType },
            success: true
          });
          continue;
        }

        if (!value) {
          results.push({
            field: { selector: field.selector, fieldType: field.fieldType },
            success: false,
            error: 'No value available for field type'
          });
          continue;
        }

        await browserController.waitForElement(pageId, field.selector, 3000);

        if (field.type === 'select') {
          await browserController.selectOption(pageId, field.selector, value);
        } else {
          await browserController.fillInput(pageId, field.selector, value);
        }

        results.push({
          field: { selector: field.selector, fieldType: field.fieldType },
          success: true
        });

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        results.push({
          field: { selector: field.selector, fieldType: field.fieldType },
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}