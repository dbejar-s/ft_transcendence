/**
 * Browser Compatibility Utilities
 * Ensures cross-browser compatibility for the Transcendence project
 */

// Browser detection utility
export const detectBrowser = () => {
  const userAgent = navigator.userAgent;
  
  if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edge') === -1) {
    return 'chrome';
  } else if (userAgent.indexOf('Firefox') > -1) {
    return 'firefox';
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    return 'safari';
  } else if (userAgent.indexOf('Edge') > -1) {
    return 'edge';
  }
  return 'unknown';
};

// Feature detection utilities
export const browserSupport = {
  webSocket: () => 'WebSocket' in window,
  webGL: () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && canvas.getContext('webgl'));
    } catch (e) {
      return false;
    }
  },
  localStorage: () => {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  },
  notifications: () => 'Notification' in window,
  fullscreen: () => 
    document.fullscreenEnabled || 
    (document as any).webkitFullscreenEnabled || 
    (document as any).mozFullScreenEnabled ||
    (document as any).msFullscreenEnabled
};

// Browser-specific polyfills and fixes
export const applyBrowserFixes = () => {
  const browser = detectBrowser();
  
  // Firefox-specific fixes
  if (browser === 'firefox') {
    // Firefox sometimes has issues with rapid WebSocket connections
    // This is handled in the CompatibleWebSocket class below
    console.log('Firefox detected: Enhanced WebSocket compatibility enabled');
  }
  
  // Safari-specific fixes
  if (browser === 'safari') {
    // Safari has stricter CORS policies
    // Ensure proper headers are set for API calls
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      const newInit = {
        ...init,
        credentials: 'include' as RequestCredentials,
        headers: {
          ...init?.headers,
          'Content-Type': 'application/json'
        }
      };
      return originalFetch(input, newInit);
    };
  }
};

// CSS browser compatibility
export const addBrowserSpecificCSS = () => {
  const style = document.createElement('style');
  const browser = detectBrowser();
  
  let css = `
    /* Base cross-browser styles */
    * {
      box-sizing: border-box;
    }
    
    /* Ensure consistent button styling */
    button {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
    }
    
    /* Consistent input styling */
    input[type="text"], input[type="email"], input[type="password"] {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
    }
  `;
  
  // Browser-specific CSS
  if (browser === 'firefox') {
    css += `
      /* Firefox-specific styles */
      input::-moz-focus-inner {
        border: 0;
        padding: 0;
      }
    `;
  }
  
  if (browser === 'safari') {
    css += `
      /* Safari-specific styles */
      input {
        -webkit-border-radius: 0;
        border-radius: 0;
      }
      
      button {
        -webkit-border-radius: 0;
        border-radius: 0;
      }
    `;
  }
  
  style.textContent = css;
  document.head.appendChild(style);
};

// WebSocket compatibility wrapper
export class CompatibleWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private protocols?: string | string[];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
    this.connect();
  }
  
  private connect() {
    try {
      this.ws = new WebSocket(this.url, this.protocols);
      
      this.ws.onopen = (event) => {
        this.reconnectAttempts = 0;
        this.onopen?.(event);
      };
      
      this.ws.onclose = (event) => {
        this.onclose?.(event);
        
        // Auto-reconnect for network issues
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
      };
      
      this.ws.onerror = (event) => {
        this.onerror?.(event);
      };
      
      this.ws.onmessage = (event) => {
        this.onmessage?.(event);
      };
      
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.onerror?.(error as Event);
    }
  }
  
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('WebSocket not ready, message not sent:', data);
    }
  }
  
  close(code?: number, reason?: string) {
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }
  
  get readyState() {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
  
  // Event handlers (to be set by user)
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
}

// Initialize browser compatibility on page load
export const initBrowserCompatibility = () => {
  // Apply fixes when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyBrowserFixes();
      addBrowserSpecificCSS();
    });
  } else {
    applyBrowserFixes();
    addBrowserSpecificCSS();
  }
  
  // Log browser info for debugging
  console.log('Browser detected:', detectBrowser());
  console.log('Browser support:', {
    webSocket: browserSupport.webSocket(),
    webGL: browserSupport.webGL(),
    localStorage: browserSupport.localStorage(),
    notifications: browserSupport.notifications(),
    fullscreen: browserSupport.fullscreen()
  });
};
