import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Subscription Manager for Supabase Realtime
 * 
 * This utility manages all realtime subscriptions to ensure proper cleanup
 * and reconnection when needed.
 */

// Track active subscriptions globally
const activeSubscriptions = new Map();

// Track the last refresh time to prevent excessive refreshes
let lastGlobalRefreshTime = 0;

const subscriptionManager = {
  // Store active subscriptions
  subscriptions: {},

  // Subscribe to a channel with automatic reconnection
  subscribe: (key, channelFactory) => {
    // Clean up any existing subscription with this key
    if (subscriptionManager.subscriptions[key]) {
      try {
        subscriptionManager.subscriptions[key].unsubscribe();
      } catch (err) {
        console.error(`Error unsubscribing from ${key}:`, err);
      }
      delete subscriptionManager.subscriptions[key];
    }

    // Create a new channel using the factory function
    try {
      const channel = channelFactory();
      subscriptionManager.subscriptions[key] = channel;
      console.log(`[SubscriptionManager] Subscription created for ${key}`);
      return channel;
    } catch (err) {
      console.error(`[SubscriptionManager] Error creating subscription for ${key}:`, err);
      return null;
    }
  },

  // Unsubscribe from a channel
  unsubscribe: (key) => {
    if (subscriptionManager.subscriptions[key]) {
      try {
        subscriptionManager.subscriptions[key].unsubscribe();
        console.log(`[SubscriptionManager] Unsubscribed from ${key}`);
      } catch (err) {
        console.error(`[SubscriptionManager] Error unsubscribing from ${key}:`, err);
      }
      delete subscriptionManager.subscriptions[key];
    }
  },

  // Refresh a specific subscription
  refresh: (key) => {
    if (!subscriptionManager.subscriptions[key]) {
      console.log(`[SubscriptionManager] Cannot refresh: No subscription for ${key}`);
      return;
    }

    try {
      const channel = subscriptionManager.subscriptions[key];
      console.log(`[SubscriptionManager] Refreshing subscription ${key}`);
      
      // Attempt to resubscribe if not in SUBSCRIBED state
      const status = channel.state;
      if (status !== 'SUBSCRIBED') {
        // Force a new subscription cycle
        channel.unsubscribe();
        // The original channel factory isn't available here, so we can't easily recreate
        // In a real implementation, you might store the factory too
        channel.subscribe();
      }
    } catch (err) {
      console.error(`[SubscriptionManager] Error refreshing ${key}:`, err);
    }
  },

  // Refresh all subscriptions
  refreshAll: () => {
    const now = Date.now();
    // Prevent refreshing too frequently (at most once every 30 seconds)
    if (now - lastGlobalRefreshTime < 30000) {
      console.log(`[SubscriptionManager] Skipping refresh: last global refresh was too recent`);
      return;
    }
    
    lastGlobalRefreshTime = now;
    const keys = Object.keys(subscriptionManager.subscriptions);
    console.log(`[SubscriptionManager] Refreshing all ${keys.length} subscriptions`);
    
    keys.forEach(key => {
      console.log(`[SubscriptionManager] Refreshing subscription ${key}`);
      try {
        const channel = subscriptionManager.subscriptions[key];
        // Only refresh if the channel exists
        if (channel) {
          // Handle different states
          const status = channel.state;
          if (status !== 'SUBSCRIBED') {
            // Try to resubscribe
            channel.unsubscribe();
            channel.subscribe();
          }
        }
      } catch (err) {
        console.error(`[SubscriptionManager] Error refreshing ${key}:`, err);
      }
    });
    
    console.log('[SubscriptionManager] Finished refreshing all subscriptions');
  },

  // Check health of all connections
  checkConnectionHealth: () => {
    const keys = Object.keys(subscriptionManager.subscriptions);
    let unhealthyCount = 0;
    
    keys.forEach(key => {
      const channel = subscriptionManager.subscriptions[key];
      if (channel && channel.state !== 'SUBSCRIBED') {
        unhealthyCount++;
      }
    });
    
    if (unhealthyCount > 0) {
      console.log(`[SubscriptionManager] Found ${unhealthyCount} unhealthy subscriptions, refreshing all`);
      subscriptionManager.refreshAll();
    }
    
    return unhealthyCount === 0;
  }
};

export default subscriptionManager;

interface Subscription {
  key: string;
  channel: any;
  lastRefreshed: number;
}

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private lastGlobalRefresh: number = 0;
  private refreshDebounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private globalRefreshInProgress: boolean = false;

  // Store a subscription for later cleanup
  subscribe(key: string, channel: any): void {
    console.log('[SubscriptionManager]', `Subscribing to ${key}`);

    // If there's an existing subscription with this key, unsubscribe first
    if (this.subscriptions.has(key)) {
      this.unsubscribe(key);
    }

    this.subscriptions.set(key, {
      key,
      channel,
      lastRefreshed: Date.now()
    });
  }

  // Remove a specific subscription
  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      try {
        console.log('[SubscriptionManager]', `Unsubscribing from ${key}`);
        // Check if the subscription has the unsubscribe method
        if (typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe();
        } else if (subscription.channel && typeof subscription.channel.unsubscribe === 'function') {
          subscription.channel.unsubscribe();
        }
        this.subscriptions.delete(key);
      } catch (error) {
        console.error('[SubscriptionManager]', `Error unsubscribing from ${key}:`, error);
      }
    }
  }

  // Clean up all subscriptions (typically called on logout)
  cleanup(): void {
    console.log('[SubscriptionManager]', `Cleaning up all ${this.subscriptions.size} subscriptions`);

    this.subscriptions.forEach((subscription) => {
      try {
        subscription.channel.unsubscribe();
      } catch (error) {
        console.error('[SubscriptionManager]', `Error during cleanup of ${subscription.key}:`, error);
      }
    });

    this.subscriptions.clear();
    console.log('[SubscriptionManager]', 'Finished cleaning up all subscriptions');
  }

  // Refresh a specific subscription
  refreshSubscription(key: string): void {
    if (this.refreshDebounceTimers.has(key)) {
      clearTimeout(this.refreshDebounceTimers.get(key)!);
    }

    // Debounce refreshes to avoid multiple rapid refreshes
    this.refreshDebounceTimers.set(key, setTimeout(() => {
      const subscription = this.subscriptions.get(key);
      if (subscription) {
        try {
          console.log('[SubscriptionManager]', `Refreshing subscription ${key}`);
          // Unsubscribe and resubscribe to force a fresh connection
          if (subscription.channel && typeof subscription.channel.unsubscribe === 'function') {
            subscription.channel.unsubscribe();
          }

          // We'll let the component re-subscribe on its own when it detects
          // the connection is gone, which is more reliable than trying to
          // recreate the exact same subscription here

          this.subscriptions.delete(key);
        } catch (error) {
          console.error('[SubscriptionManager]', `Error refreshing subscription ${key}:`, error);
        }
      }

      this.refreshDebounceTimers.delete(key);
    }, 300));
  }

  // Refresh all subscriptions with optimized logic
  refreshAll(): void {
    // Prevent multiple simultaneous refreshes
    if (this.globalRefreshInProgress) {
      console.log('[SubscriptionManager]', 'Global refresh already in progress, skipping');
      return;
    }

    // Only refresh if there are subscriptions
    if (this.subscriptions.size === 0) {
      console.log('[SubscriptionManager]', 'No subscriptions to refresh');
      return;
    }

    // Don't refresh too frequently (at most once per 2 minutes for better performance)
    const now = Date.now();
    if (now - this.lastGlobalRefresh < 120000) {
      console.log('[SubscriptionManager]', 'Skipping refresh, last global refresh was too recent');
      return;
    }

    this.globalRefreshInProgress = true;
    this.lastGlobalRefresh = now;

    console.log('[SubscriptionManager]', `Refreshing all ${this.subscriptions.size} subscriptions`);

    // Use a more efficient approach for large numbers of subscriptions
    if (this.subscriptions.size > 10) {
      // Just refresh the most important ones, based on priority
      // For now, let's just refresh a subset (first 5)
      const keys = Array.from(this.subscriptions.keys()).slice(0, 5);

      Promise.all(keys.map(key => {
        return new Promise(resolve => {
          this.refreshSubscription(key);
          resolve(key);
        });
      })).then(() => {
        console.log('[SubscriptionManager]', 'Finished refreshing essential subscriptions');
        this.globalRefreshInProgress = false;
      });
    } else {
      // For smaller numbers, refresh all with small delays
      const keys = Array.from(this.subscriptions.keys());

      // Refresh each subscription with a small delay to spread out the load
      const refreshNext = (index: number) => {
        if (index >= keys.length) {
          console.log('[SubscriptionManager]', 'Finished refreshing all subscriptions');
          this.globalRefreshInProgress = false;
          return;
        }

        this.refreshSubscription(keys[index]);
        setTimeout(() => refreshNext(index + 1), 200); // Increased delay to reduce load
      };

      refreshNext(0);
    }
  }

  // Check health of all subscriptions and refresh if needed
  checkConnectionHealth(): void {
    const now = Date.now();

    // Check if Supabase connection is healthy
    if (!supabase) {
      console.error('[SubscriptionManager]', 'Supabase client not available');
      return;
    }

    // Attempt to refresh all subscriptions if connection state changed
    this.refreshAll();
  }

  // Setup visibility change monitoring to refresh subscriptions when tab becomes active
  setupVisibilityMonitoring(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          console.log('[SubscriptionManager]', 'Page became visible, checking subscriptions');
          this.checkConnectionHealth();
        }
      });
    }
  }
}

// Create a singleton instance
const subscriptionManager = new SubscriptionManager();

// Set up monitoring on import
subscriptionManager.setupVisibilityMonitoring();

// Enable debug in development
if (import.meta.env.DEV) {
  //  The original code had this.setDebug(true); but this function is removed in the edited code.  No replacement is added.
}

// Handle cleanup when window is closing or refreshing
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Attempt to set user offline before page unload
    try {
      const auth = supabase.auth.getSession();
      auth.then(({ data }) => {
        const userId = data?.session?.user?.id;
        if (userId) {
          // Use navigator.sendBeacon for reliable delivery during page unload
          const formData = new FormData();
          formData.append('is_online', 'false');

          navigator.sendBeacon(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, 
            formData
          );
        }
      });
    } catch (e) {
      console.error('Error during cleanup status update:', e);
    }

    subscriptionManager.cleanup();
  });
}

export default subscriptionManager;

// Time when the last global refresh happened
let lastGlobalRefresh = 0;
const GLOBAL_REFRESH_TIMEOUT = 10000; // 10 seconds

// Called on components mount to clean and check all current subscriptions
export const checkAllSubscriptions = () => {
  const now = new Date().getTime();

  // Check if we refreshed everything recently
  if (now - lastGlobalRefresh < GLOBAL_REFRESH_TIMEOUT) {
    console.log(`[SubscriptionManager] Skipping refresh, last global refresh was too recent (${now - lastGlobalRefresh}ms ago)`);
    return;
  }

  // Refresh subs that are older than the refresh interval
  Object.entries(subscriptions).forEach(([key, sub]) => {
    const age = now - sub.lastRefreshed;
    if (age > REFRESH_INTERVAL) {
      console.log(`[SubscriptionManager] Auto-refreshing old subscription: ${key} (age: ${age}ms)`);
      refreshSubscription(key);
    }
  });

  lastGlobalRefresh = now;
};