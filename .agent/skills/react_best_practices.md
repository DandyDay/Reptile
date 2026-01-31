
name: React & UI Best Practices
description: 가이드라인 및 코드 품질 체크리스트

# React & Next.js Best Practices

## Components
- 컴포넌트는 작고 단일 책임을 가져야 한다.
- `use client` 지시어는 필요한 컴포넌트 최상단에만 사용한다.
- UI 로직과 비즈니스 로직을 분리한다 (가능하면 Custom Hook 사용).

## Styling (Tailwind)
- 색상은 하드코딩하지 말고 `bg-slate-900` 등 테마 컬러를 사용한다.
- 반응형 디자인 (`md:`, `lg:`)을 항상 고려한다.
- `cn()` 유틸리티를 사용하여 클래스를 병합한다.

## Accessibility
- 버튼에는 `aria-label`이나 명확한 텍스트가 있어야 한다.
- `img` 태그에는 `alt` 속성을 반드시 포함한다.

## Review Checklist for Agent
- [ ] 문법 오류나 린트 에러가 없는가?
- [ ] 기존 코드를 불필요하게 삭제하지 않았는가?
- [ ] 사용자 요청 사항을 빼먹지 않고 구현했는가?
- [ ] 모바일/데스크탑 뷰가 깨지지 않는지 고려했는가?
