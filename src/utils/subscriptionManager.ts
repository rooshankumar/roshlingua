import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type SubscriptionCreator = () => RealtimeChannel;
type CleanupFunction = () => void;

interface Subscription {
  key: string;
  channel: RealtimeChannel | null;
  creator: SubscriptionCreator;
  lastRefreshed: number;
}

/**
 * Manages all Supabase real-time subscriptions in the application
 * Provides methods to create, refresh, and clean up subscriptions
 */
class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private cleanupFunctions: Map<string, CleanupFunction> = new Map();
  private debug: boolean = false;
  private isRefreshing: boolean = false;

  constructor() {
    this.log('Subscription manager initialized');

    // Listen for visibility changes to refresh subscriptions when tab becomes active
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Enable or disable debug logging
   */
  setDebug(enabled: boolean): void {
    this.debug = enabled;
  }

  /**
   * Log messages when debug is enabled
   */
  private log(...args: any[]): void {
    if (this.debug) {
      console.log('[SubscriptionManager]', ...args);
    }
  }

  /**
   * Subscribe to a real-time channel with automatic reconnection
   * @param key Unique identifier for this subscription
   * @param creator Function that creates and returns a RealtimeChannel
   * @returns The RealtimeChannel that was created
   */
  subscribe(key: string, creator: SubscriptionCreator): RealtimeChannel {
    if (this.subscriptions.has(key)) {
      this.log(`Subscription already exists for key: ${key}, returning existing channel`);
      const existing = this.subscriptions.get(key);
      if (existing?.channel) {
        return existing.channel;
      }
    }

    this.log(`Creating new subscription for key: ${key}`);
    const channel = creator();

    this.subscriptions.set(key, {
      key,
      channel,
      creator,
      lastRefreshed: Date.now()
    });

    return channel;
  }

  /**
   * Unsubscribe and remove a specific subscription
   * @param key The key of the subscription to unsubscribe
   */
  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      this.log(`Unsubscribing from key: ${key}`);
      try {
        if (subscription.channel) {
          subscription.channel.unsubscribe();
        }
      } catch (err) {
        this.log(`Error unsubscribing from ${key}:`, err);
      }
      this.subscriptions.delete(key);
    }

    // Run cleanup function if exists
    if (this.cleanupFunctions.has(key)) {
      try {
        this.cleanupFunctions.get(key)?.();
      } catch (err) {
        this.log(`Error running cleanup for ${key}:`, err);
      }
      this.cleanupFunctions.delete(key);
    }
  }

  /**
   * Register a cleanup function to be called when a subscription is unsubscribed
   * @param key The subscription key
   * @param cleanup The cleanup function
   */
  registerCleanup(key: string, cleanup: CleanupFunction): void {
    this.cleanupFunctions.set(key, cleanup);
  }

  /**
   * Refresh a specific subscription by unsubscribing and resubscribing
   * @param key The key of the subscription to refresh
   */
  refresh(key: string): void {
    this.log(`Refreshing subscription for key: ${key}`);
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      try {
        if (subscription.channel) {
          subscription.channel.unsubscribe();
        }
        const newChannel = subscription.creator();

        this.subscriptions.set(key, {
          ...subscription,
          channel: newChannel,
          lastRefreshed: Date.now()
        });

        this.log(`Successfully refreshed subscription for key: ${key}`);
      } catch (err) {
        this.log(`Error refreshing subscription ${key}:`, err);
      }
    }
  }

  /**
   * Refresh all subscriptions in the application
   */
  refreshAll(): void {
    if (this.isRefreshing) {
      this.log('Already refreshing all subscriptions, skipping');
      return;
    }

    this.isRefreshing = true;
    this.log(`Refreshing all ${this.subscriptions.size} subscriptions`);

    // Create a new array of entries to avoid modification during iteration
    const entries = [...this.subscriptions.entries()];

    for (const [key, subscription] of entries) {
      try {
        this.refresh(key);
      } catch (err) {
        this.log(`Error refreshing subscription ${key}:`, err);
      }
    }

    this.isRefreshing = false;
    this.log('Finished refreshing all subscriptions');
  }

  /**
   * Cleanup all subscriptions (used when logging out)
   */
  cleanup(): void {
    this.log(`Cleaning up all ${this.subscriptions.size} subscriptions`);

    // Create a new array of keys to avoid modification during iteration
    const keys = [...this.subscriptions.keys()];

    for (const key of keys) {
      this.unsubscribe(key);
    }

    this.log('Finished cleaning up all subscriptions');
  }

  /**
   * Handle visibility change events to refresh subscriptions when tab becomes active
   */
  private lastGlobalRefresh: number = Date.now();
  private refreshDebounceTimer: NodeJS.Timeout | null = null;
  
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.log('Page became visible, checking subscriptions');

      // Use a longer stale time to reduce unnecessary refreshes
      const staleTime = 120 * 1000; // 2 minutes
      const now = Date.now();
      
      // Avoid refreshing too frequently
      if (now - this.lastGlobalRefresh < 30000) {
        this.log('Skipping refresh, last global refresh was too recent');
        return;
      }
      
      // Debounce rapid visibility changes
      if (this.refreshDebounceTimer) {
        clearTimeout(this.refreshDebounceTimer);
      }
      
      this.refreshDebounceTimer = setTimeout(() => {
        let needsRefresh = false;
        
        // Only check a few subscriptions as a sample to determine if refresh is needed
        let count = 0;
        for (const subscription of this.subscriptions.values()) {
          if (now - subscription.lastRefreshed > staleTime) {
            needsRefresh = true;
            break;
          }
          // Sample at most 5 subscriptions to avoid performance issues
          if (++count >= 5) break;
        }
        
        if (needsRefresh) {
          this.log('Found stale subscriptions, refreshing all');
          this.refreshAll();
          this.lastGlobalRefresh = Date.now();
        }
        
        this.refreshDebounceTimer = null;
      }, 500);
    }
  };

  /**
   * Get subscription status information for debugging
   */
  getStatus(): { subscriptions: number, channels: string[] } {
    return {
      subscriptions: this.subscriptions.size,
      channels: Array.from(this.subscriptions.keys())
    };
  }
}

// Create singleton instance
const subscriptionManager = new SubscriptionManager();

// Enable debug in development
if (import.meta.env.DEV) {
  subscriptionManager.setDebug(true);
}

// Handle cleanup when window is closing or refreshing
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.cleanup();
  });
}

export default subscriptionManager;