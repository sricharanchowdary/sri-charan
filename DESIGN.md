# Design System

## Direction

The site uses a quiet, work-focused portfolio style: clear navigation, readable pages, modest cards, and a practical color system. The goal is to feel like a junior engineer who cares about clarity and shipping discipline, not a generic template.

## Artifacts

Design artifacts are in [design/](./design/):

- `wireframes.svg`: home, project case study, and contact in desktop and mobile layouts.
- `theme-board.svg`: light and dark color samples.
- `README.md`: notes on how the artifacts map to the implementation.

## Colors

Light mode:

- Background: `#f8fafc`
- Surface: `#ffffff`
- Text: `#111827`
- Muted text: `#4b5563`
- Accent: `#2563eb`
- Secondary accent: `#f97316`

Dark mode:

- Background: `#0f172a`
- Surface: `#172033`
- Text: `#f8fafc`
- Muted text: `#cbd5e1`
- Accent: `#38bdf8`
- Success: `#34d399`

The palette intentionally avoids a one-note purple/dark-blue theme by using blue as the action color, orange as a secondary accent in design artifacts, and green only for success states.

## Typography and Spacing

The site uses the system UI font stack for performance. Headings are bold and compact; body copy uses relaxed line height for readability. Spacing follows a 4px grid through Tailwind utilities, with 8px card radius or less for the main UI surfaces.

## Accessibility

- Skip-to-content link is present.
- Navigation uses semantic links inside a `nav`.
- Form controls have labels and visible errors.
- Dark mode respects OS preference and persists manual choice.
- Focus styles are visible through `:focus-visible`.
