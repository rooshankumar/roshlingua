
# Roshlingua - Language Learning Platform

## Overview

Roshlingua is a modern language learning application built with React and Supabase, designed to connect language learners from around the world. The platform enables users to practice languages through chat, build community connections, and track their learning progress.

## Features

### Core Features
- **User Authentication**: Secure login/signup with email and password
- **Personalized Dashboard**: Track progress, streaks, and learning stats
- **Language Selection**: Support for multiple learning and native languages
- **Achievement System**: Gamification with XP points and achievements

### Chat System
- **Real-time Messaging**: Instant communication between language partners
- **Multi-format Attachments**: Share images, audio, video, PDFs, and other files
- **File Preview**: View images, play videos/audio directly in the chat
- **Message Reactions**: React to messages with emojis
- **Reply Threading**: Reply to specific messages to maintain context
- **Typing Indicators**: See when your chat partner is typing
- **Unread Message Tracking**: Visual indicators for unread messages

### Community Features
- **User Profiles**: Customizable profiles with avatar, bio, and language preferences
- **Language Partner Matching**: Find users who match your language learning goals
- **Activity Feed**: See what's happening in the community

### User Experience
- **Responsive Design**: Mobile-first approach for all screen sizes
- **Theme Support**: Light and dark mode available
- **Internationalization**: Interface available in multiple languages

## Technologies

### Frontend
- **React 18**: Modern UI library for building user interfaces
- **TypeScript**: Static typing for JavaScript, enhancing code quality
- **Vite**: Next-generation frontend build tool with HMR
- **React Router**: Client-side routing for single-page applications
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **shadcn/ui**: High-quality React components built with Radix UI and Tailwind CSS
- **Lucide Icons**: Beautiful icons for the UI
- **Framer Motion**: Animation library for smooth transitions
- **i18next**: Internationalization framework for multi-language support
- **React Hook Form**: Form validation and management
- **Zod**: TypeScript-first schema validation
- **Tanstack Query**: Data fetching and state management

### Backend
- **Supabase**: Open-source Firebase alternative with:
  - PostgreSQL database
  - Authentication (PKCE flow)
  - Realtime subscriptions
  - Row-level security
  - Storage for user files and media
- **SQL**: Custom database functions, triggers, and migrations

## Getting Started

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production
```bash
# Build for production
npm run build

# Preview the build
npm run preview
```

## Project Structure

- `/src`: Main source code
  - `/components`: Reusable UI components
    - `/chat`: Chat-related components (MessageBubble, ChatAttachment, etc.)
    - `/ui`: shadcn/ui components
    - `/layouts`: Page layout components
  - `/hooks`: Custom React hooks
  - `/pages`: Application pages/routes
  - `/services`: Service logic for backend interactions
  - `/utils`: Utility functions
  - `/i18n`: Internationalization configuration
  - `/types`: TypeScript type definitions
  - `/lib`: Shared libraries and configuration
- `/public`: Static assets and locale files
- `/migrations`: Database SQL migrations

## Authentication Flow

The application uses Supabase Auth with PKCE (Proof Key for Code Exchange) flow for secure authentication, which is suitable for public clients and provides protection against CSRF attacks.

## Storage

Files uploaded through the chat system are stored in Supabase Storage buckets:
- Images, videos, audio, and documents are supported
- Thumbnails are generated for images
- Files are served with optimized caching settings
- URL handling includes fixes for the double-slash issue that can occur with Supabase Storage paths

### Storage Bucket Configuration

The application uses a Supabase Storage bucket named 'attachments' for storing user-uploaded files. The system:
1. Validates files for security (size limit: 10MB)
2. Generates unique filenames to prevent collisions
3. Sets proper content-type headers for media files
4. Handles URL path correction for Supabase's double-slash issue
