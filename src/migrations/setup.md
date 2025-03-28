
# Chat Feature Setup Instructions

Follow these steps to integrate the chat feature into your existing project:

## 1. Copy Files

First, copy all the files from the migration folder to your project:

1. `src/types/chat.ts` - Types for the chat feature
2. `src/components/chat/*` - All chat components
3. `src/utils/chatUtils.ts` - Helper functions
4. `src/services/chatService.ts` - Supabase integration

## 2. Update Tailwind Config

Make sure your tailwind.config.js includes these color variables:

```js
theme: {
  extend: {
    colors: {
      'chat-primary': '#0084FF', // Message bubble color
      'chat-dark': '#0070D8',    // Message bubble hover color
      'chat-unread': '#E5F1FF',  // Unread conversation background
    },
  },
},
```

## 3. Update Routes

Make sure you add the Chat page to your routes:

```tsx
<Route path="/chat" element={<Chat />} />
```

## 4. Integrate with Your Auth System

The Chat component needs access to the current user. Make sure your auth hook is properly connected.

## 5. Verify Database Schema

Ensure your database tables match the schema described in the migration guide. If any fields are missing, add them to your existing tables.

## 6. Custom Animations (Optional)

For the typing indicator animation, add these keyframes to your global CSS:

```css
@keyframes typing-dot {
  0%, 100% { opacity: 0.4; transform: translateY(0); }
  50% { opacity: 1; transform: translateY(-2px); }
}

.animate-typing-dot-1 {
  animation: typing-dot 1s infinite;
}

.animate-typing-dot-2 {
  animation: typing-dot 1s infinite 0.2s;
}

.animate-typing-dot-3 {
  animation: typing-dot 1s infinite 0.4s;
}
```

## 7. Testing

After integration, test the chat feature with multiple users to ensure:
- Conversations list loads correctly
- Messages appear in the right order
- New messages arrive in real-time
- Unread counts update correctly
- Message read status updates correctly
