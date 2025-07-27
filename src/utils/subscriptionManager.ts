import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

/**
 * Simplified Subscription Manager for Supabase Realtime
 * 
 * This utility manages realtime subscriptions with better error handling
 * and avoids over-engineering that can cause connection issues.
 */

interface Subscription {
  key: string;
  channel: RealtimeChannel;
  lastRefreshed: number;
}

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private isCleaningUp: boolean = false;

  // Store a subscription for later cleanup
  subscribe(key: string, channelFactory: () => RealtimeChannel): RealtimeChannel;
  subscribe(key: string, channel: RealtimeChannel): void;
  subscribe(key: string, channelOrFactory: RealtimeChannel | (() => RealtimeChannel)): RealtimeChannel | void {
    console.log('[SubscriptionManager]', `Registering subscription: ${key}`);

    // If there's an existing subscription with this key, unsubscribe first
    if (this.subscriptions.has(key)) {
      this.unsubscribe(key);
    }

    let channel: RealtimeChannel;
    
    if (typeof channelOrFactory === 'function') {
      channel = channelOrFactory();
      this.subscriptions.set(key, {
        key,
        channel,
        lastRefreshed: Date.now()
      });
      return channel;
    } else {
      channel = channelOrFactory;
      this.subscriptions.set(key, {
        key,
        channel,
        lastRefreshed: Date.now()
      });
    }
  }

  // Remove a specific subscription
  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      try {
        console.log('[SubscriptionManager]', `Unsubscribing from ${key}`);
        subscription.channel.unsubscribe();
        this.subscriptions.delete(key);
      } catch (error) {
        console.error('[SubscriptionManager]', `Error unsubscribing from ${key}:`, error);
      }
    }
  }

  // Clean up all subscriptions (typically called on logout)
  cleanup(): void {
    if (this.isCleaningUp) return;

    this.isCleaningUp = true;
    console.log('[SubscriptionManager]', `Cleaning up all ${this.subscriptions.size} subscriptions`);

    this.subscriptions.forEach((subscription) => {
      try {
        subscription.channel.unsubscribe();
      } catch (error) {
        console.error('[SubscriptionManager]', `Error during cleanup of ${subscription.key}:`, error);
      }
    });

    this.subscriptions.clear();
    this.isCleaningUp = false;
    console.log('[SubscriptionManager]', 'Finished cleaning up all subscriptions');
  }

  // Get subscription count for debugging
  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  // List all subscription keys for debugging
  getSubscriptionKeys(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Create a singleton instance
const subscriptionManager = new SubscriptionManager();

// Handle cleanup when window is closing or refreshing
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.cleanup();
  });

  // Handle visibility changes to track when app becomes inactive
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('[SubscriptionManager]', 'Page became visible, current subscriptions:', subscriptionManager.getSubscriptionCount());
    } else {
      console.log('[SubscriptionManager]', 'Page became hidden');
    }
  });
}

// Export the singleton instance
export default subscriptionManager;

// Export helper function
export const getSubscriptionStatus = () => ({
  count: subscriptionManager.getSubscriptionCount(),
  keys: subscriptionManager.getSubscriptionKeys()
});