# Quest4kid Mobile Frontend

React Native + Expo mobile app for family quest management with AI-assisted plan generation.

This project supports two role-based experiences:
- `adult`: creates child profiles, generates plans, approves plans, and manages family progress
- `child`: executes quests, tracks progress, completes steps, and collects achievements/badges

## Table of Contents
- [Product Overview](#product-overview)
- [Core Features](#core-features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Persistence](#data-persistence)
- [API Integration](#api-integration)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Testing](#testing)
- [Build and Release](#build-and-release)
- [Configuration Notes](#configuration-notes)
- [Known Limitations](#known-limitations)

## Product Overview
Quest4kid helps families turn everyday goals into trackable quests. The app combines:
- account and family management
- role-based navigation
- AI-generated quest plans (with optional photo context)
- progress tracking and gamification (XP, streaks, achievements, badges)
- a full offline testing mode with a persistent mock data layer

## Core Features
### 1. Role-Based App Flow
- Automatic navigation resolution after store hydration
- Separate tab labels/content for `adult` and `child` roles
- Role fallback to child mode if no explicit role is present

### 2. Authentication and Family Setup
- Register, login, confirm email, and reset password flows
- Family creation and family state refresh after auth events
- Child registration flow for adult users
- Token refresh handling in child/family APIs when unauthorized

### 3. AI Builder and Plan Lifecycle
- Prompt-based plan generation from `/api/ai/quest`
- Photo-assisted generation from `/api/ai/quest-vision`
- Plan preview screen before approval
- Plan approval activates quests for execution
- Local plan caching via Zustand + AsyncStorage

### 4. Quest Execution
- Step-based quest progression
- Reward editing (reward type/title/value/unit)
- Before/after photo handling for quests
- Optional AI vision summary on quest completion (`/api/ai/summary-vision`)
- Completion gating: all steps done, required photo report attached (if configured)

### 5. Progress and Gamification
- XP/level/streak calculations
- Quest statistics by category
- Achievement unlocking pipeline
- Earned badge storage and gallery screens
- Leaderboard service (mock-backed)

### 6. Offline Testing Mode
- Toggle in Settings (`Offline testing mode`)
- No backend requests in offline mode
- Persistent mock-layer snapshot and seeded demo data
- Supports role switching for debug in offline mode

### 7. UI/UX Foundation
- React Navigation stack + bottom tabs
- Shared design primitives (`StatCard`, `PrimaryButton`, `QuestCard`, etc.)
- Light/dark theme toggle with persisted state
- Responsive layout hook for phone/tablet and orientation handling

## Technology Stack
### Core
- Expo `~54`
- React `19`
- React Native `0.81`
- TypeScript (strict mode)

### Navigation
- `expo-router` (entry point and root layout wiring)
- `@react-navigation/native`
- `@react-navigation/native-stack`
- `@react-navigation/bottom-tabs`

### State and Data
- Zustand for app stores (`Auth`, `Theme`, `Plans`, `OfflineTesting`)
- TanStack React Query (`QueryClientProvider` + auth screen mutations)
- AsyncStorage for persistence

### UI and Interaction
- `react-native-paper` (MD3 theme integration)
- `@expo/vector-icons` / Ionicons
- `react-native-gesture-handler`
- `react-native-reanimated`
- `expo-image-picker` for camera/gallery flows

### Tooling and Quality
- ESLint (`eslint-config-expo`)
- Vitest for unit/service tests
- Test aliases with React Native and navigation mocks

## Architecture
### Runtime composition
- Root layout initializes:
  - theme store hydration
  - auth store hydration
  - plans cache hydration
  - offline testing store hydration
- Providers:
  - `QueryClientProvider`
  - `PaperProvider`
  - `ThemeProvider` (React Navigation)
  - `AppErrorBoundary`

### State design
- `Auth-store`: session, role, user profile, family info, selected child
- `Plans-store`: generated plans and approved quest cache
- `OfflineTesting-store`: backend switch + mock hydration trigger
- `Theme-store`: light/dark theme and palette

### Integration layer
`src/integration/services` provides a stable service API for screens and decides between:
- real backend calls
- local/cache fallback
- mock layer behavior in offline mode

This keeps UI screens mostly backend-agnostic.

## Project Structure
```text
app/
  _layout.tsx              # Root providers + hydration bootstrap
  index.tsx                # AppNavigator entry

context/
  Auth-store.ts            # Session, role, family, child selection
  Theme-store.ts           # Theme persistence
  Plans-store.ts           # Plan/quest cache
  OfflineTesting-store.ts  # Offline mode switch + hydration

src/
  navigation/
    AppNavigator.tsx
    AdultTabNavigator.tsx
    ChildTabNavigator.tsx
    RoleBasedNavigator.tsx
  integration/services/
    authService.ts
    plansService.ts
    questsService.ts
    childrenService.ts
    progressService.ts
    userService.ts
    cameraService.ts
    leaderboardService.ts
    offline-mode.ts
    offline-testing-storage.ts
  features/
    auth/
      screens/
      api/
      dto/
    chat/
      screens/
      api/
    profile/
      screens/
      services/
    mvp/
      mocks/
      services/
  screens/
    HomeScreen.tsx
    QuestsScreen.tsx
    AdultHomeScreen.tsx
    ChildHomeScreen.tsx

shared/
  components/ui/           # Shared UI components
  models/                  # App contracts and domain models
  styles/                  # Theme color tokens
```

## Data Persistence
AsyncStorage keys used by the app:
- `AUTH_SESSION`
- `APP_THEME`
- `AI_PLANS_CACHE_V1`
- `OFFLINE_TESTING_MODE_V1`
- `OFFLINE_TESTING_MOCK_SNAPSHOT_V1`
- `ACHIEVEMENTS_V1`
- `EARNED_BADGES_V1`

## API Integration
### Base URL
Currently hardcoded in `src/features/auth/api/client.ts`:
- `https://infomatrix-api-cda8ftcucbg8dnfc.germanywestcentral-01.azurewebsites.net`

### Main endpoints
Auth and family:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/confirm-email`
- `POST /api/auth/refresh-token`
- `POST /api/auth/request-reset-password`
- `POST /api/auth/verify-otp`
- `POST /api/auth/reset-password`
- `GET /api/families`
- `POST /api/families`
- `GET /api/children`
- `POST /api/children`

AI:
- `POST /api/ai`
- `POST /api/ai/quest`
- `POST /api/ai/quest-vision`
- `POST /api/ai/summary-vision`

## Getting Started
### Prerequisites
- Node.js 18+ (20+ recommended)
- npm
- Expo CLI tooling available via `npx expo`

### Install
```bash
npm install
```

### Run in development
```bash
npm run start
```

You can also run directly on a target:
```bash
npm run android
npm run ios
npm run web
```

## Scripts
- `npm run start` - start Expo dev server
- `npm run android` - start with Android target
- `npm run ios` - start with iOS target
- `npm run web` - start web target
- `npm run lint` - run Expo ESLint config
- `npm run test` - run Vitest once
- `npm run test:watch` - run Vitest in watch mode
- `npm run reset-project` - reset starter scaffold script

## Testing
Run all tests:
```bash
npm run test
```

Current test coverage focuses on:
- API client behavior and error mapping
- auth/plan integration services
- navigation config
- mock layer services
- achievements service
- key stores

Test files include:
- `context/Auth-store.test.ts`
- `context/Theme-store.test.ts`
- `src/navigation/navigation-config.test.ts`
- `src/integration/services/plansService.test.ts`
- `src/features/auth/api/client.test.ts`
- `src/features/chat/api/agent.test.ts`
- `src/features/chat/api/quest.test.ts`
- `src/features/mvp/services/mock-layer-services.test.ts`
- `src/features/profile/services/achievementsService.test.ts`

## Build and Release
EAS profiles are defined in `eas.json`:
- `development` (internal distribution, dev client)
- `preview` (Android APK)
- `production` (Android App Bundle + auto increment)

Typical Android preview build:
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview
```

## Configuration Notes
- API base URL is currently code-level config, not environment-driven.
- UI text is partially Ukrainian at the moment.
- Offline mode is intended for demos, UX testing, and backend-free validation.

## Known Limitations
- No environment-based API switching yet (`dev/stage/prod` from env vars).
- Some screens still include mixed-language copy.
- Most online quest data is derived from local approved-plan cache (no dedicated remote quest endpoint yet).
