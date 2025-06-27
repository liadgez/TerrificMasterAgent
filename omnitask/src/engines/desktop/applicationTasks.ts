import { BaseDesktopTask, DesktopTaskResult } from './desktopTaskTemplate';
import { AppleScriptExecutor } from './appleScriptExecutor';
import { ParsedCommand } from '@/lib/commandParser';

export class SpotifyControlTask extends BaseDesktopTask {
  name = 'Spotify Control';
  category = 'apps';
  description = 'Control Spotify music playback';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const action = this.determineSpotifyAction(command);
      
      // Ensure Spotify is running
      const isRunning = await appleScriptExecutor.isApplicationRunning('Spotify');
      if (!isRunning) {
        await appleScriptExecutor.activateApplication('Spotify');
        // Wait a moment for Spotify to launch
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      let result;

      switch (action.type) {
        case 'play':
          result = await this.playMusic(action, appleScriptExecutor);
          break;
        
        case 'pause':
          result = await this.pauseMusic(appleScriptExecutor);
          break;
        
        case 'next':
          result = await this.nextTrack(appleScriptExecutor);
          break;
        
        case 'previous':
          result = await this.previousTrack(appleScriptExecutor);
          break;
        
        case 'search':
          result = await this.searchAndPlay(action.query!, appleScriptExecutor);
          break;
        
        case 'volume':
          result = await this.setVolume(action.volume!, appleScriptExecutor);
          break;
        
        case 'current':
          result = await this.getCurrentTrack(appleScriptExecutor);
          break;
        
        default:
          throw new Error(`Unsupported Spotify action: ${action.type}`);
      }

      return {
        success: result.success,
        data: {
          action: action.type,
          spotify: true,
          ...action
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Spotify control failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determineSpotifyAction(command: ParsedCommand): { type: string; query?: string; volume?: number } {
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('pause') || commandText.includes('stop')) {
      return { type: 'pause' };
    }

    if (commandText.includes('next') || commandText.includes('skip')) {
      return { type: 'next' };
    }

    if (commandText.includes('previous') || commandText.includes('back')) {
      return { type: 'previous' };
    }

    if (commandText.includes('volume')) {
      const volumeMatch = commandText.match(/(\d+)/);
      const volume = volumeMatch ? parseInt(volumeMatch[1]) : 50;
      return { type: 'volume', volume };
    }

    if (commandText.includes('current') || commandText.includes('now playing') || commandText.includes('what')) {
      return { type: 'current' };
    }

    if (commandText.includes('search') || commandText.includes('find')) {
      const query = command.parameters.searchTerm as string || command.parameters.query as string;
      return { type: 'search', query };
    }

    if (commandText.includes('play')) {
      const playlist = command.parameters.playlist as string;
      const song = command.parameters.song as string;
      const artist = command.parameters.artist as string;
      
      if (playlist) {
        return { type: 'search', query: `playlist:${playlist}` };
      } else if (song || artist) {
        const query = [artist, song].filter(Boolean).join(' ');
        return { type: 'search', query };
      } else {
        return { type: 'play' };
      }
    }

    return { type: 'play' };
  }

  private async playMusic(action: { query?: string }, appleScriptExecutor: AppleScriptExecutor) {
    if (action.query) {
      return await this.searchAndPlay(action.query, appleScriptExecutor);
    } else {
      const script = `
        tell application "Spotify"
          play
        end tell
      `;
      return await appleScriptExecutor.executeScript(script);
    }
  }

  private async pauseMusic(appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "Spotify"
        pause
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }

  private async nextTrack(appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "Spotify"
        next track
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }

  private async previousTrack(appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "Spotify"
        previous track
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }

  private async searchAndPlay(query: string, appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "Spotify"
        activate
        delay 1
        search "${query}"
        delay 2
        play
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }

  private async setVolume(volume: number, appleScriptExecutor: AppleScriptExecutor) {
    const clampedVolume = Math.max(0, Math.min(100, volume));
    const script = `
      tell application "Spotify"
        set sound volume to ${clampedVolume}
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }

  private async getCurrentTrack(appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "Spotify"
        set trackName to name of current track
        set artistName to artist of current track
        set albumName to album of current track
        return trackName & " by " & artistName & " from " & albumName
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }
}

export class BrowserControlTask extends BaseDesktopTask {
  name = 'Browser Control';
  category = 'apps';
  description = 'Control web browsers (Safari, Chrome)';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const action = this.determineBrowserAction(command);
      const browser = this.determineBrowser(command);

      // Ensure browser is running
      const isRunning = await appleScriptExecutor.isApplicationRunning(browser);
      if (!isRunning) {
        await appleScriptExecutor.activateApplication(browser);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      let result;

      switch (action.type) {
        case 'open_url':
          result = await this.openUrl(action.url!, browser, appleScriptExecutor);
          break;
        
        case 'new_tab':
          result = await this.openNewTab(browser, appleScriptExecutor);
          break;
        
        case 'close_tab':
          result = await this.closeTab(browser, appleScriptExecutor);
          break;
        
        case 'refresh':
          result = await this.refreshPage(browser, appleScriptExecutor);
          break;
        
        case 'back':
          result = await this.goBack(browser, appleScriptExecutor);
          break;
        
        case 'forward':
          result = await this.goForward(browser, appleScriptExecutor);
          break;
        
        default:
          throw new Error(`Unsupported browser action: ${action.type}`);
      }

      return {
        success: result.success,
        data: {
          action: action.type,
          browser,
          ...action
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Browser control failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determineBrowserAction(command: ParsedCommand): { type: string; url?: string } {
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('open') && (commandText.includes('url') || commandText.includes('website'))) {
      const url = command.parameters.url as string || this.extractUrlFromCommand(commandText);
      return { type: 'open_url', url };
    }

    if (commandText.includes('new tab')) {
      return { type: 'new_tab' };
    }

    if (commandText.includes('close tab')) {
      return { type: 'close_tab' };
    }

    if (commandText.includes('refresh') || commandText.includes('reload')) {
      return { type: 'refresh' };
    }

    if (commandText.includes('back')) {
      return { type: 'back' };
    }

    if (commandText.includes('forward')) {
      return { type: 'forward' };
    }

    // Default to opening URL if one is found
    const url = this.extractUrlFromCommand(commandText);
    if (url) {
      return { type: 'open_url', url };
    }

    throw new Error('Could not determine browser action from command');
  }

  private determineBrowser(command: ParsedCommand): string {
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('chrome')) {
      return 'Google Chrome';
    }
    if (commandText.includes('safari')) {
      return 'Safari';
    }
    if (commandText.includes('firefox')) {
      return 'Firefox';
    }

    // Default to Safari on macOS
    return 'Safari';
  }

  private extractUrlFromCommand(commandText: string): string {
    // Try to find URLs in the command
    const urlPattern = /https?:\/\/[^\s]+/;
    const match = commandText.match(urlPattern);
    
    if (match) {
      return match[0];
    }

    // Check for common site names
    const siteShortcuts: Record<string, string> = {
      'google': 'https://www.google.com',
      'youtube': 'https://www.youtube.com',
      'github': 'https://www.github.com',
      'stackoverflow': 'https://stackoverflow.com',
      'reddit': 'https://www.reddit.com',
      'twitter': 'https://www.twitter.com',
      'facebook': 'https://www.facebook.com'
    };

    for (const [keyword, url] of Object.entries(siteShortcuts)) {
      if (commandText.includes(keyword)) {
        return url;
      }
    }

    throw new Error('No URL found in command');
  }

  private async openUrl(url: string, browser: string, appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "${browser}"
        activate
        open location "${url}"
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }

  private async openNewTab(browser: string, appleScriptExecutor: AppleScriptExecutor) {
    let script: string;
    
    if (browser === 'Safari') {
      script = `
        tell application "Safari"
          activate
          make new document
        end tell
      `;
    } else {
      script = `
        tell application "${browser}"
          activate
          make new tab at end of tabs of window 1
        end tell
      `;
    }
    
    return await appleScriptExecutor.executeScript(script);
  }

  private async closeTab(browser: string, appleScriptExecutor: AppleScriptExecutor) {
    let script: string;
    
    if (browser === 'Safari') {
      script = `
        tell application "Safari"
          close current tab of window 1
        end tell
      `;
    } else {
      script = `
        tell application "${browser}"
          close active tab of window 1
        end tell
      `;
    }
    
    return await appleScriptExecutor.executeScript(script);
  }

  private async refreshPage(browser: string, appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "${browser}"
        activate
        reload current tab of window 1
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }

  private async goBack(browser: string, appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "System Events"
        tell process "${browser}"
          keystroke "[" using command down
        end tell
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }

  private async goForward(browser: string, appleScriptExecutor: AppleScriptExecutor) {
    const script = `
      tell application "System Events"
        tell process "${browser}"
          keystroke "]" using command down
        end tell
      end tell
    `;
    return await appleScriptExecutor.executeScript(script);
  }
}

export class TextEditorTask extends BaseDesktopTask {
  name = 'Text Editor Control';
  category = 'apps';
  description = 'Control text editors and create/edit documents';

  async execute(command: ParsedCommand, appleScriptExecutor: AppleScriptExecutor): Promise<DesktopTaskResult> {
    const startTime = Date.now();

    try {
      const action = this.determineTextAction(command);
      const editor = this.determineEditor(command);

      let result;

      switch (action.type) {
        case 'create_note':
          result = await this.createNote(action.content!, editor, appleScriptExecutor);
          break;
        
        case 'open_editor':
          result = await this.openEditor(editor, appleScriptExecutor);
          break;
        
        default:
          throw new Error(`Unsupported text editor action: ${action.type}`);
      }

      return {
        success: result.success,
        data: {
          action: action.type,
          editor,
          ...action
        },
        error: result.error,
        duration: Date.now() - startTime,
        appleScriptOutput: result.output
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Text editor control failed',
        duration: Date.now() - startTime
      };
    }
  }

  private determineTextAction(command: ParsedCommand): { type: string; content?: string } {
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('create') && (commandText.includes('note') || commandText.includes('document'))) {
      const content = command.parameters.content as string || command.parameters.text as string || '';
      return { type: 'create_note', content };
    }

    if (commandText.includes('open') && (commandText.includes('editor') || commandText.includes('notes'))) {
      return { type: 'open_editor' };
    }

    return { type: 'open_editor' };
  }

  private determineEditor(command: ParsedCommand): string {
    const commandText = JSON.stringify(command).toLowerCase();

    if (commandText.includes('textedit')) {
      return 'TextEdit';
    }
    if (commandText.includes('notes')) {
      return 'Notes';
    }

    return 'Notes'; // Default to Notes app
  }

  private async createNote(content: string, editor: string, appleScriptExecutor: AppleScriptExecutor) {
    let script: string;
    
    if (editor === 'Notes') {
      script = `
        tell application "Notes"
          activate
          make new note with properties {body:"${content}"}
        end tell
      `;
    } else {
      script = `
        tell application "${editor}"
          activate
          make new document with properties {text:"${content}"}
        end tell
      `;
    }
    
    return await appleScriptExecutor.executeScript(script);
  }

  private async openEditor(editor: string, appleScriptExecutor: AppleScriptExecutor) {
    return await appleScriptExecutor.activateApplication(editor);
  }
}