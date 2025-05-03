import { RealtimeChannel } from '@supabase/supabase-js';

// Enhanced subscription manager to maintain active subscriptions
class SubscriptionManager {
  private subscriptions: Map<string, Function> = new Map();
  private activeChannels: Map<string, RealtimeChannel> = new Map();

  // Subscribe with a key and a function that creates a Supabase channel
  subscribe(key: string, createChannelFn: Function): RealtimeChannel {
    // Check if we already have an active channel for this key
    if (this.activeChannels.has(key)) {
      console.log(`Using existing subscription for ${key}`);
      return this.activeChannels.get(key)!;
    }

    console.log(`Creating new subscription for ${key}`);

    // Store the creation function
    this.subscriptions.set(key, createChannelFn);

    // Create and store the actual channel
    const channel = createChannelFn();
    this.activeChannels.set(key, channel);

    return channel;
  }

  // Unsubscribe by key
  unsubscribe(key: string) {
    if (this.activeChannels.has(key)) {
      console.log(`Unsubscribing from ${key}`);

      // Get the channel and unsubscribe
      const channel = this.activeChannels.get(key);
      if (channel && typeof channel.unsubscribe === 'function') {
        try {
          channel.unsubscribe();
        } catch (error) {
          console.error(`Error unsubscribing from ${key}:`, error);
        }
      }

      // Remove from our maps
      this.activeChannels.delete(key);
      this.subscriptions.delete(key);
    }
  }

  // Get an existing channel by key
  getChannel(key: string): RealtimeChannel | undefined {
    return this.activeChannels.get(key);
  }

  // Check if a subscription exists
  hasSubscription(key: string): boolean {
    return this.activeChannels.has(key);
  }

  // Refresh a specific subscription
  refresh(key: string): RealtimeChannel | undefined {
    if (this.subscriptions.has(key)) {
      // Unsubscribe first if there's an active channel
      if (this.activeChannels.has(key)) {
        const channel = this.activeChannels.get(key);
        if (channel && typeof channel.unsubscribe === 'function') {
          try {
            channel.unsubscribe();
          } catch (error) {
            console.error(`Error unsubscribing from ${key} during refresh:`, error);
          }
        }
        this.activeChannels.delete(key);
      }

      // Create a new subscription
      const createFn = this.subscriptions.get(key)!;
      const newChannel = createFn();
      this.activeChannels.set(key, newChannel);
      return newChannel;
    }
    return undefined;
  }
  
  // Get all active channels
  getActiveChannels(): Map<string, RealtimeChannel> {
    return this.activeChannels;
  }
  
  // Refresh all subscriptions
  refreshAll(): void {
    console.log('Refreshing all real-time subscriptions');
    const keys = Array.from(this.subscriptions.keys());
    keys.forEach(key => this.refresh(key));
  }

  // Cleanup all subscriptions
  cleanup() {
    const count = this.activeChannels.size;

    // Properly unsubscribe from all channels
    this.activeChannels.forEach((channel, key) => {
      if (channel && typeof channel.unsubscribe === 'function') {
        try {
          channel.unsubscribe();
        } catch (error) {
          console.error(`Error unsubscribing from ${key} during cleanup:`, error);
        }
      }
    });

    this.activeChannels.clear();
    this.subscriptions.clear();
    console.log(`Cleaned up ${count} subscriptions`);
  }
}

const subscriptionManager = new SubscriptionManager();

// Handle cleanup when window is closing or refreshing
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.cleanup();
  });
}

export default subscriptionManager;
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
  private handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.log('Page became visible, checking subscriptions');
      
      // Only refresh if it's been more than 60 seconds since the last refresh
      const staleTime = 60 * 1000; // 60 seconds
      const now = Date.now();
      let needsRefresh = false;
      
      for (const subscription of this.subscriptions.values()) {
        if (now - subscription.lastRefreshed > staleTime) {
          needsRefresh = true;
          break;
        }
      }
      
      if (needsRefresh) {
        this.log('Found stale subscriptions, refreshing all');
        this.refreshAll();
      }
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

export default subscriptionManager;
