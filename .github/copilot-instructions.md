# iNFOMATRIX Mobile Frontend — Copilot Instructions

## Project context
- Stack: Expo (managed workflow) + React Native + TypeScript (`strict: true`) + React Navigation + Zustand.
- Package manager and CLI conventions: use `npm` and Expo CLI commands (`npx expo ...`) only.
- Path alias `@/*` is enabled in `tsconfig.json`; prefer alias imports over long relative paths.

## Architecture you should follow
- App entry is Expo Router (`package.json` -> `main: expo-router/entry`), but main app UI is mounted from `app/index.tsx` and renders `AppNavigator`.
- Navigation is centralized in `src/navigation/AppNavigator.tsx` (native stack) and `src/navigation/TabNavigator.tsx` (bottom tabs).
- Header is fully custom via `modules/Header/Header.tsx` and injected through `options.header` per screen.
- Screen files live in `src/screens/*`; shared screen styles are composed with factories like `getStyles` in `src/screens/styles.ts`.
- Theme state is global in Zustand store `context/Theme-store.ts` with persistence via AsyncStorage (`APP_THEME`).

## Existing data and UI flow patterns
- Theme flow: `SettingsScreen` toggles `useThemeStore.toggleTheme()`, store updates `isDark/theme/colors`, persists to AsyncStorage, and screens consume `colors` from store.
- Header title for tabs is derived from focused child route in `getMainHeaderTitle` (`AppNavigator`).
- Profile screen acts as navigation hub to `Login`, `Registration`, and `Settings` screens.

## Coding rules specific to this repo
- Use functional components and hooks only.
- Keep TypeScript strict: do not introduce `any`; define `type`/`interface` for props/navigation params.
- Prefer `StyleSheet` and existing style factories (`getStyles(...)`) over ad-hoc inline styling for non-trivial UI.
- For press interactions, prefer Android-friendly `Pressable` with `android_ripple` when adding new tappable UI.
- For Android visual depth, include `elevation` (not only iOS shadow props).
- Prefer Expo-provided libraries for native capabilities to stay within managed workflow.

## Developer workflow
- Install deps: `npm install`
- Start dev server: `npm run start` or `npx expo start`
- Run Android target: `npm run android` or `npx expo start --android`
- Clear Metro cache: `npx expo start -c`
- Lint: `npm run lint`
- No dedicated unit/integration test setup is currently present; do not assume Jest/Detox exists.

## Guardrails for edits
- Make focused, minimal changes; do not introduce new architecture layers unless requested.
- Preserve existing navigation shape and custom header integration.
- When touching theme logic, keep `Theme-store.ts` as the single source of truth and preserve AsyncStorage persistence behavior.
- If adding screens/routes, update both navigator definitions and typed param lists together.

## Useful reference files
- `app/index.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/navigation/TabNavigator.tsx`
- `modules/Header/Header.tsx`
- `context/Theme-store.ts`
- `src/screens/SettingsScreen.tsx`
- `TOOLS.md`