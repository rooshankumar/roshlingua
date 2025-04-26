
# Roshlingua - Language Learning Platform

## Overview

Roshlingua is a modern language learning application built with React and Supabase, designed to connect language learners from around the world. The platform enables users to practice languages through chat, build community connections, and track their learning progress.

## Technologies

### Frontend
- **React 18**: Modern UI library for building user interfaces
- **TypeScript**: Static typing for JavaScript, enhancing code quality and developer experience
- **Vite**: Next-generation frontend build tool with HMR (Hot Module Replacement)
- **React Router**: Client-side routing for single-page applications
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **shadcn/ui**: High-quality React components built with Radix UI and Tailwind CSS
- **Lucide Icons**: Beautiful icons for the UI
- **Framer Motion**: Animation library for smooth transitions
- **i18next**: Internationalization framework for multi-language support
- **React Hook Form**: Form validation and management
- **Zod**: TypeScript-first schema validation
- **Tanstack Query**: Data fetching and state management
- **Recharts**: Composable charting library for visualizing data

### Backend
- **Supabase**: Open-source Firebase alternative with:
  - PostgreSQL database
  - Authentication (PKCE flow)
  - Realtime subscriptions
  - Row-level security
  - Storage for user files and media
- **SQL**: Custom database functions, triggers, and migrations

### Features
- **Authentication**: User registration, login, and session management
- **Internationalization**: Support for multiple languages (English, German, Spanish)
- **Real-time chat**: Instant messaging between language partners
- **User profiles**: Customizable profiles with language preferences
- **Community**: Find and connect with other language learners
- **Gamification**: XP points, achievements, and streaks to motivate learning
- **Responsive design**: Mobile-first approach for all screen sizes

## Project Structure

- `/src`: Main source code
  - `/components`: Reusable UI components
  - `/hooks`: Custom React hooks
  - `/pages`: Application pages/routes
  - `/services`: Service logic for backend interactions
  - `/utils`: Utility functions
  - `/i18n`: Internationalization configuration
  - `/types`: TypeScript type definitions
  - `/lib`: Shared libraries and configuration
- `/public`: Static assets and locale files
- `/migrations`: Database SQL migrations

## Development

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Build
```bash
# Build for production
npm run build

# Preview the build
npm run preview
```

## Authentication Flow

The application uses Supabase Auth with PKCE (Proof Key for Code Exchange) flow for secure authentication, which is suitable for public clients and provides protection against CSRF attacks.

## Database Schema

The database includes tables for:
- User profiles
- Chat conversations and messages
- Achievements and XP tracking
- User relationships (follows, likes)
- Learning progress

## Internationalization

The app supports multiple languages through i18next, with translations stored in JSON files in the `/public/locales` directory.

## Design System

The UI follows a consistent design system using:
- Customizable themes (light/dark mode)
- Responsive components
- Accessible UI elements
- Glass-morphism effects for modern aesthetics

## Contributors

This is an educational project developed by the Replit community.
