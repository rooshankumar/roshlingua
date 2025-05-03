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