
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Store for active subscriptions
const activeSubscriptions = new Map<string, RealtimeChannel>();

export const subscriptionManager = {
  // Subscribe with a unique key to prevent duplicates
  subscribe: (key: string, channelBuilder: () => RealtimeChannel): RealtimeChannel => {
    // Clean up existing subscription with the same key if it exists
    if (activeSubscriptions.has(key)) {
      const existingChannel = activeSubscriptions.get(key);
      if (existingChannel) {
        console.log(`Removing existing subscription: ${key}`);
        supabase.removeChannel(existingChannel);
      }
    }
    
    // Create new subscription
    const channel = channelBuilder();
    activeSubscriptions.set(key, channel);
    
    console.log(`Created new subscription: ${key}`);
    return channel;
  },
  
  // Unsubscribe and clean up
  unsubscribe: (key: string): void => {
    if (activeSubscriptions.has(key)) {
      const channel = activeSubscriptions.get(key);
      if (channel) {
        console.log(`Unsubscribing from: ${key}`);
        supabase.removeChannel(channel);
        activeSubscriptions.delete(key);
      }
    }
  },
  
  // Check if subscription exists
  exists: (key: string): boolean => {
    return activeSubscriptions.has(key);
  },
  
  // Get active subscription
  get: (key: string): RealtimeChannel | undefined => {
    return activeSubscriptions.get(key);
  },
  
  // Clean up all subscriptions
  cleanup: (): void => {
    console.log(`Cleaning up ${activeSubscriptions.size} subscriptions`);
    activeSubscriptions.forEach((channel, key) => {
      supabase.removeChannel(channel);
      console.log(`Cleaned up: ${key}`);
    });
    activeSubscriptions.clear();
  }
};

// Add cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    subscriptionManager.cleanup();
  });
}

export default subscriptionManager;
