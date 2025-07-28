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

  // Clean up old subscriptions (older than 2 hours to prevent active chat disruption)
  cleanupStale(): void {
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000; // 2 hours instead of 30 minutes

    this.subscriptions.forEach((subscription, key) => {
      if (now - subscription.createdAt > twoHours) {
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

  // Refresh all subscriptions
  refreshAll() {
    console.log('[SubscriptionManager] Refreshing all subscriptions');
    const subscriptionKeys = Array.from(this.subscriptions.keys());

    if (subscriptionKeys.length === 0) {
      console.log('[SubscriptionManager] No subscriptions to refresh');
      return;
    }

    // Store current subscriptions
    const currentSubscriptions = new Map(this.subscriptions);

    // Clear current subscriptions
    this.subscriptions.clear();

    // Unsubscribe from all current channels
    currentSubscriptions.forEach((subscription, key) => {
      try {
        if (subscription.channel && typeof subscription.channel.unsubscribe === 'function') {
          subscription.channel.unsubscribe();
        }
      } catch (error) {
        console.warn('[SubscriptionManager] Error unsubscribing during refresh:', error);
      }
    });

    console.log(`[SubscriptionManager] Refreshed ${subscriptionKeys.length} subscriptions`);
  }
}

// Create singleton
const subscriptionManager = new SubscriptionManager();

// Only cleanup on actual page unload, not visibility changes
if (typeof window !== 'undefined') {
  // Only cleanup when page is actually being unloaded
  window.addEventListener('beforeunload', () => {
    subscriptionManager.cleanup();
  });

  // Don't cleanup on visibility change - this was causing the chat issues
  // Instead, just log visibility changes for debugging
  document.addEventListener('visibilitychange', () => {
    const isVisible = document.visibilityState === 'visible';
    console.log(`[SubscriptionManager] Page became ${isVisible ? 'visible' : 'hidden'}, current subscriptions:`, subscriptionManager.getSubscriptionCount());
  });

  // Clean up truly stale subscriptions (older than 2 hours instead of 30 minutes)
  setInterval(() => {
    subscriptionManager.cleanupStale();
  }, 10 * 60 * 1000); // Every 10 minutes, but with longer stale threshold
}

export default subscriptionManager;