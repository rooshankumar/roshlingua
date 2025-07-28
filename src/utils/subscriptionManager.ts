
import { RealtimeChannel } from '@supabase/supabase-js';

interface Subscription {
  key: string;
  channel: RealtimeChannel;
  createdAt: number;
}

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();
  private isCleaningUp = false;

  subscribe(key: string, channel: RealtimeChannel): void {
    console.log('[SubscriptionManager] Registering subscription:', key);

    // Clean up existing subscription with same key
    if (this.subscriptions.has(key)) {
      console.log('[SubscriptionManager] Replacing existing subscription:', key);
      this.unsubscribe(key);
    }

    this.subscriptions.set(key, {
      key,
      channel,
      createdAt: Date.now()
    });

    console.log('[SubscriptionManager] Active subscriptions:', this.subscriptions.size);
  }

  unsubscribe(key: string): boolean {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      try {
        console.log('[SubscriptionManager] Unsubscribing from:', key);
        // Check if channel has unsubscribe method and is not already closed
        if (subscription.channel && typeof subscription.channel.unsubscribe === 'function') {
          subscription.channel.unsubscribe();
        }
        this.subscriptions.delete(key);
        console.log('[SubscriptionManager] Successfully unsubscribed from:', key);
        return true;
      } catch (error) {
        console.error('[SubscriptionManager] Error unsubscribing from', key, ':', error);
        // Still remove from map even if unsubscribe failed
        this.subscriptions.delete(key);
        return false;
      }
    }
    return false;
  }

  cleanup(): void {
    if (this.isCleaningUp) {
      console.log('[SubscriptionManager] Cleanup already in progress');
      return;
    }

    this.isCleaningUp = true;
    console.log('[SubscriptionManager] Cleaning up all subscriptions:', this.subscriptions.size);

    const keys = Array.from(this.subscriptions.keys());
    let cleaned = 0;

    keys.forEach((key) => {
      try {
        if (this.unsubscribe(key)) {
          cleaned++;
        }
      } catch (error) {
        console.error('[SubscriptionManager] Error during cleanup for', key, ':', error);
      }
    });

    this.subscriptions.clear();
    console.log('[SubscriptionManager] Cleanup complete. Cleaned:', cleaned, 'subscriptions');
    this.isCleaningUp = false;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getSubscriptionKeys(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  // Clean up old subscriptions (older than 30 minutes)
  cleanupStale(): void {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000;

    this.subscriptions.forEach((subscription, key) => {
      if (now - subscription.createdAt > thirtyMinutes) {
        console.log('[SubscriptionManager] Cleaning up stale subscription:', key);
        this.unsubscribe(key);
      }
    });
  }

  // Get subscription info for debugging
  getSubscriptionInfo(): { key: string; age: number }[] {
    const now = Date.now();
    return Array.from(this.subscriptions.entries()).map(([key, subscription]) => ({
      key,
      age: now - subscription.createdAt
    }));
  }
}

// Create singleton
const subscriptionManager = new SubscriptionManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.cleanup();
  });

  // Clean up stale subscriptions periodically
  setInterval(() => {
    subscriptionManager.cleanupStale();
  }, 5 * 60 * 1000); // Every 5 minutes
}

export default subscriptionManager;
