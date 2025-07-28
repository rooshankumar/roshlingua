import { RealtimeChannel } from '@supabase/supabase-js';

interface Subscription {
  key: string;
  channel: RealtimeChannel;
  createdAt: number;
}

class SubscriptionManager {
  private subscriptions: Map<string, Subscription> = new Map();

  subscribe(key: string, channel: RealtimeChannel): void {
    console.log('[SubscriptionManager] Registering subscription:', key);

    // Clean up existing subscription with same key
    if (this.subscriptions.has(key)) {
      this.unsubscribe(key);
    }

    this.subscriptions.set(key, {
      key,
      channel,
      createdAt: Date.now()
    });
  }

  unsubscribe(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (subscription) {
      try {
        console.log('[SubscriptionManager] Unsubscribing from:', key);
        subscription.channel.unsubscribe();
        this.subscriptions.delete(key);
      } catch (error) {
        console.error('[SubscriptionManager] Error unsubscribing from', key, ':', error);
      }
    }
  }

  cleanup(): void {
    console.log('[SubscriptionManager] Cleaning up all subscriptions:', this.subscriptions.size);

    this.subscriptions.forEach((subscription) => {
      try {
        subscription.channel.unsubscribe();
      } catch (error) {
        console.error('[SubscriptionManager] Error during cleanup:', error);
      }
    });

    this.subscriptions.clear();
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  getSubscriptionKeys(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

// Create singleton
const subscriptionManager = new SubscriptionManager();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.cleanup();
  });
}

export default subscriptionManager;