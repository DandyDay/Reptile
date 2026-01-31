# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reptile Tracker is a care logging application for reptile pets. Users can track feeding, poop, cleaning, weight, and memo logs via a calendar interface. Features include multi-reptile support, community sharing, statistics dashboard, and customizable theming.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 with CSS custom properties for theming
- **Animation**: Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **i18n**: Custom hook supporting English (en) and Korean (ko)

## Commands

```bash
npm install --legacy-peer-deps  # Required due to React 19 peer dep conflicts
npm run dev                      # Start dev server at localhost:3000
npm run build                    # Production build
npm run lint                     # Run ESLint
```

## Architecture

### Directory Structure
- `src/app/` - Next.js App Router pages (calendar, stats, community, settings, auth/callback)
- `src/components/` - React components; `ui/` contains primitives (Button, Card, Input)
- `src/lib/store.tsx` - Central state management via ReptileProvider context
- `src/lib/database.types.ts` - Supabase TypeScript types (auto-generated)
- `src/lib/i18n.ts` - Translation hook with type-safe nested key access
- `src/locales/` - Translation JSON files (en, ko)

### State Management
All app state flows through `ReptileProvider` in `src/lib/store.tsx`. Access via `useReptileLogs()` hook which provides:
- `reptiles`, `logs`, `foodPresets` - Data arrays
- `selectedReptile`, `session` - Current selections/auth
- CRUD methods for all entities with optimistic updates

### Database Tables
- `profiles` - User accounts (linked to Supabase auth)
- `reptiles` - Pet records with care_schedules (JSONB)
- `logs` - Care events (type: feeding | poop | cleaning | memo | weight)
- `food_presets` - User-defined feeding presets
- `posts`, `likes`, `comments` - Community feature

### Log Types & Colors
- feeding: emerald
- poop: amber
- cleaning: blue
- memo: purple
- weight: cyan

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
```

## Conventions

- All page/component files use `"use client"` directive (client-side rendering)
- Path alias: `@/*` maps to `src/*`
- Theming uses CSS variables defined in `globals.css`, controlled via `data-theme` attribute
- Visual settings persisted to localStorage under key `reptile-visual-settings-v1`
- Supabase client initialized in `src/lib/supabase.ts`

## Workflow Guidelines

### Skill 활용
사용 가능한 스킬이 있다면 적극적으로 활용할 것:
- `context7` - 라이브러리/프레임워크 문서 조회
- `supabase-postgres-best-practices` - Supabase/Postgres 쿼리 최적화
- `next-best-practices` - Next.js 패턴 및 컨벤션
- `vercel-react-best-practices` - React 성능 최적화
- `tailwind-design-system` - Tailwind CSS 디자인 시스템
- `ui-ux-pro-max` - UI/UX 디자인 및 구현

### 코드 리뷰
작업 세션이 끝날 때마다 `code-quality-reviewer` 에이전트를 실행하여 코드 품질을 점검하고, 피드백을 반영할 것. 특히 다음 상황에서 필수:
- 새로운 기능 구현 완료 시
- 복잡한 리팩토링 완료 시
- 여러 관련 함수/컴포넌트 작성 완료 시

### 푸시 워크플로우
사용자가 "푸시해줘" 또는 "push"라고 하면:
1. `npm run build` 실행
2. 빌드 실패 시 → 오류 수정 후 다시 빌드
3. 빌드 성공 시 → git commit & git push
