# AIDu Implementation Specification
## Interactive Markdown / Reveal Presentation Activity

### Status
Draft implementation specification

### Goal
Introduce a new AIDu activity type that loads Markdown content and presents it as an interactive Reveal.js presentation inside AIDu.

The presentation must:

- use the existing `blended-marked` renderer for Markdown content,
- use the shared `renderPresentationMarkdown()` function for slide structure,
- support horizontal and vertical Reveal.js navigation,
- run inside the AIDu application rather than as a separate standalone HTML page,
- provide an explicit exit action that returns the user to AIDu,
- support progress and completion handling,
- remain extensible for AIDu-specific interactive blocks such as polls, MC questions, and teacher/student views.

---

# 1. Architectural Principle

The presentation layer must reuse the same Markdown-to-slide transformation that is already used by `mypandoc`.

The shared architecture is:

```text
                         Markdown
                            |
                            v
              renderPresentationMarkdown()
                            |
              +-------------+-------------+
              |                           |
              v                           v
        mypandoc CLI                   AIDu
              |                           |
        template.html              PresentationActivity
              |                           |
              v                           v
     standalone Reveal HTML       embedded Reveal deck
```

The implementation must avoid duplicate slide parsing logic in AIDu and `mypandoc`.

---

# 2. Existing Shared Presentation Renderer

The existing shared renderer is:

```ts
renderPresentationMarkdown(markdown: string): string
```

It transforms Markdown into Reveal.js `<section>` structures.

Horizontal slide separator:

```markdown
---
```

Vertical slide separator:

```markdown
--
```

Example:

```markdown
# Introduction

First slide

---

## Topic

Main topic slide

--

### Detail

Vertical detail slide

--

### More detail

Another vertical slide

---

## Next topic

Continue horizontally
```

Expected Reveal structure:

```html
<section>
  ...
</section>

<section>
  <section>
    ...
  </section>

  <section>
    ...
  </section>

  <section>
    ...
  </section>
</section>

<section>
  ...
</section>
```

The shared renderer remains presentation-format aware but must not contain:

- filesystem access,
- Node.js-specific code,
- Reveal.js initialization,
- AIDu routing,
- activity state handling,
- persistence logic.

---

# 3. New AIDu Activity Type

Add a new activity type:

```ts
interface PresentationActivityDefinition {
  type: 'presentation';
  id: string;
  title: string;
  source: string;
}
```

Example:

```yaml
type: presentation
id: ai-introduction
title: Einführung in KI
source: /activities/ai-introduction/slides.md
```

The `source` points to a Markdown document that can be loaded by the frontend.

Optional future fields may include:

```ts
interface PresentationActivityDefinition {
  type: 'presentation';
  id: string;
  title: string;
  source: string;

  completion?: 'exit' | 'last-slide' | 'explicit';
  resume?: boolean;
  teacherControlled?: boolean;
}
```

These options are not required for the initial implementation.

---

# 4. AIDu Activity Dispatch

Where AIDu currently selects activity components based on activity type, add:

```ts
case 'presentation':
  return (
    <PresentationActivity
      activity={activity}
      onExit={handleActivityExit}
      onComplete={handleActivityComplete}
    />
  );
```

The presentation activity must participate in the same lifecycle as existing AIDu activities.

It must not perform direct application-level navigation unless the AIDu activity framework already delegates navigation to activity components.

Preferred control flow:

```text
AIDu Activity Controller
        |
        v
PresentationActivity
        |
        +---- onExit()
        |
        +---- onComplete()
        |
        v
AIDu Activity Controller
```

---

# 5. PresentationActivity Component

Create:

```text
src/components/activities/PresentationActivity.tsx
```

Responsibilities:

1. load Markdown,
2. render Markdown to Reveal slide HTML,
3. inject slide HTML into the Reveal container,
4. initialize a Reveal instance,
5. restore optional slide progress,
6. listen for slide changes,
7. provide an AIDu exit control,
8. destroy Reveal during SolidJS cleanup.

Suggested component contract:

```ts
interface PresentationActivityProps {
  activity: PresentationActivityDefinition;
  onExit: () => void;
  onComplete: () => void;
}
```

Initial implementation:

```tsx
import { onCleanup, onMount } from 'solid-js';
import Reveal from 'reveal.js';

import { renderPresentationMarkdown }
  from '../../mypandoc/presentation-markdown';

export function PresentationActivity(
  props: PresentationActivityProps
) {
  let revealElement!: HTMLDivElement;
  let deck: Reveal.Api | undefined;

  onMount(async () => {
    const response = await fetch(
      props.activity.source
    );

    if (!response.ok) {
      throw new Error(
        `Failed to load presentation: ${response.status}`
      );
    }

    const markdown = await response.text();

    const renderedSlides =
      renderPresentationMarkdown(markdown);

    const slidesElement =
      revealElement.querySelector('.slides');

    if (!slidesElement) {
      throw new Error(
        'Reveal slides container not found'
      );
    }

    slidesElement.innerHTML =
      renderedSlides;

    deck = new Reveal(
      revealElement,
      {
        embedded: true,
        hash: false,
        controls: true,
        progress: true,
        center: false,
        slideNumber: false,
        transition: 'slide',
      }
    );

    await deck.initialize();

    deck.on(
      'slidechanged',
      handleSlideChanged
    );
  });

  onCleanup(() => {
    deck?.destroy();
    deck = undefined;
  });

  function handleSlideChanged() {
    if (!deck) {
      return;
    }

    const indices =
      deck.getIndices();

    // Future:
    // persistPresentationProgress(
    //   props.activity.id,
    //   indices
    // );
  }

  function exitPresentation() {
    props.onExit();
  }

  return (
    <div class="presentation-activity">

      <button
        class="presentation-exit"
        type="button"
        onClick={exitPresentation}
      >
        Exit
      </button>

      <div
        ref={revealElement}
        class="reveal presentation-reveal"
      >
        <div class="slides" />
      </div>

    </div>
  );
}
```

Exact import paths depend on the final AIDu repository structure.

---

# 6. Reveal.js Configuration

Reveal must be instantiated as an embedded presentation:

```ts
embedded: true
```

Recommended initial configuration:

```ts
{
  embedded: true,
  hash: false,
  controls: true,
  progress: true,
  center: false,
  slideNumber: false,
  transition: 'slide',
}
```

`hash` should initially be disabled because navigation state belongs to AIDu rather than the browser URL.

Reveal must not take over the entire document.

---

# 7. Presentation Container

The presentation should visually occupy the available activity area.

Suggested structure:

```html
<div class="presentation-activity">

  <button class="presentation-exit">
    Exit
  </button>

  <div class="reveal presentation-reveal">
    <div class="slides">
      ...
    </div>
  </div>

</div>
```

Suggested CSS:

```css
.presentation-activity {
  position: relative;

  width: 100%;
  height: 100%;

  min-height: 0;
  overflow: hidden;
}

.presentation-reveal {
  width: 100%;
  height: 100%;
}

.presentation-exit {
  position: absolute;

  top: 1rem;
  right: 1rem;

  z-index: 100;

  cursor: pointer;
}
```

The exact styling should follow AIDu's UI conventions.

---

# 8. Exit Behaviour

The presentation must provide an explicit Exit control.

Exit semantics:

```text
Exit
  |
  v
destroy Reveal
  |
  v
return control to AIDu
```

The component should call:

```ts
props.onExit();
```

It must not directly execute:

```ts
window.history.back();
```

or:

```ts
window.location.href = ...
```

unless this is already part of AIDu's standard navigation model.

This keeps the presentation activity independent of AIDu routing details.

---

# 9. Completion Behaviour

Exit and completion should remain conceptually separate.

## Exit

Means:

> Leave the presentation.

The activity may remain incomplete.

## Complete

Means:

> The learner has completed the presentation activity.

Possible initial completion strategy:

```ts
completion: 'explicit'
```

A future final slide could contain:

```text
Continue
```

which invokes:

```ts
props.onComplete();
```

Alternative future strategies:

```text
completion = exit
completion = last-slide
completion = explicit
```

For the first implementation, explicit completion is preferred if AIDu already distinguishes completed activities from abandoned activities.

---

# 10. Presentation Progress

Reveal exposes the current location:

```ts
const indices =
  deck.getIndices();
```

Typical structure:

```ts
{
  h: 2,
  v: 1,
  f: undefined
}
```

AIDu may persist:

```ts
interface PresentationProgress {
  activityId: string;
  h: number;
  v: number;
}
```

Example:

```json
{
  "activityId": "ai-introduction",
  "h": 4,
  "v": 1
}
```

When reopening the presentation:

```ts
deck.slide(
  progress.h,
  progress.v
);
```

Progress persistence is optional for the first implementation but the component design should not prevent it.

---

# 11. Slide Menu

The standalone `mypandoc` implementation currently uses a separate `reveal-menu.ts`.

For AIDu, the menu should not initially depend on the standalone generated script.

Instead, either:

1. extract the menu logic into a reusable browser module, or
2. implement the menu as a SolidJS component using the Reveal API.

Preferred long-term design:

```text
PresentationActivity
    |
    +-- Reveal deck
    |
    +-- PresentationMenu
    |
    +-- Exit control
```

Example interface:

```tsx
<PresentationMenu
  deck={deck}
/>
```

The menu should derive slide names from the rendered slide headings:

```text
h1
h2
h3
```

No automatic numbering should be added.

If Markdown headings contain manual numbering such as:

```markdown
## 3. Neural Networks
```

the menu should display:

```text
3. Neural Networks
```

without adding another number.

---

# 12. Markdown Rendering

All presentation Markdown must use:

```ts
renderBlendedMarkdown()
```

indirectly through:

```ts
renderPresentationMarkdown()
```

This ensures that presentations support the same content features as AIDu Markdown elsewhere, including:

- standard Markdown,
- headings,
- lists,
- links,
- images,
- inline mathematics,
- display mathematics,
- chemfig rendering,
- fenced divs,
- CSS classes,
- AIDu-specific future renderables.

The PresentationActivity must not introduce a second Markdown parser.

---

# 13. Fenced Div Layouts

The presentation syntax may use fenced divs for layout.

Example two-column slide:

```markdown
## Two-column layout

:::: {.two-col}

::: {.column}

Text links

:::

::: {.column}

![Image](image.jpg)

:::

::::
```

Possible CSS:

```css
.two-col {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 2rem;

  align-items: center;
}

.two-col .column {
  min-width: 0;
}

.two-col img {
  max-width: 100%;
  height: auto;
}
```

Layout remains content-driven rather than relying on absolute positioning.

---

# 14. CSS Architecture

Presentation styling should be separated into:

```text
global AIDu styles
        |
        +-- blended-marked content styles
        |
        +-- presentation/reveal styles
```

Suggested file:

```text
src/styles/presentation.css
```

or equivalent.

Presentation-specific rules must be scoped:

```css
.presentation-activity ...
```

or:

```css
.presentation-reveal ...
```

to avoid affecting other AIDu pages.

---

# 15. Reveal CSS

AIDu must import Reveal's base CSS through the normal frontend build:

```ts
import 'reveal.js/dist/reveal.css';
```

Theme handling should initially be controlled by AIDu rather than loading CSS from a CDN.

Possible:

```ts
import 'reveal.js/dist/theme/white.css';
```

or preferably an AIDu-owned presentation theme layered on top of Reveal base styles.

The standalone `mypandoc` export may continue to use CDN resources independently.

---

# 16. Dependency

Add Reveal.js as a frontend dependency if not already present:

```bash
npm install reveal.js
```

AIDu should import Reveal as a module:

```ts
import Reveal from 'reveal.js';
```

Do not load it through a global `<script>` tag inside the SolidJS application.

---

# 17. Source Loading

The initial implementation loads Markdown through:

```ts
fetch(activity.source)
```

The source may therefore be:

```text
/public/activities/.../slides.md
```

or another URL exposed by the AIDu backend.

Later the source may come from:

- backend activity content,
- database content,
- uploaded lesson assets,
- teacher-authored activities,
- generated Markdown.

The PresentationActivity should only require a string containing Markdown after loading.

A useful later refactoring is:

```ts
interface PresentationActivityProps {
  markdown: string;
  ...
}
```

with loading delegated to the activity controller.

---

# 18. Error Handling

Loading failures should not leave an empty presentation.

Required states:

```text
loading
error
ready
```

Example:

```text
Presentation could not be loaded.
```

The Exit button must remain available in the error state.

Reveal initialization errors should similarly be surfaced inside the activity container.

---

# 19. Cleanup

Reveal must always be destroyed when the component is removed:

```ts
onCleanup(() => {
  deck?.destroy();
});
```

This is important because Reveal installs:

- keyboard handlers,
- resize handlers,
- presentation state,
- DOM observers.

Without cleanup, reopening presentations may create duplicate event handling.

---

# 20. Keyboard Handling

Reveal normally reacts to keyboard navigation.

Inside AIDu this must be verified against AIDu global shortcuts.

Potential conflicts:

```text
Escape
Arrow keys
Space
M
F
```

For the initial implementation:

- arrow navigation should remain enabled,
- Escape should not unexpectedly leave AIDu,
- AIDu global shortcuts should not trigger while interacting with the presentation if they conflict with Reveal.

The explicit Exit button remains the authoritative way to leave the activity.

---

# 21. Fullscreen

Fullscreen presentation mode can be added later.

It should be distinct from exiting the AIDu activity.

Possible UI:

```text
[☰]                    [Fullscreen] [Exit]
```

Fullscreen is not required for the first implementation.

---

# 22. Teacher and Student Views

The presentation activity should be designed so that AIDu role-specific rendering can later be introduced.

Potential distinction:

```text
Student
  - presentation
  - polls
  - questions
  - no aggregate results

Teacher
  - presentation
  - controls
  - aggregate poll results
  - presentation progression
```

This should not initially be implemented inside Reveal itself.

Role-specific behaviour belongs to AIDu components embedded within the presentation.

---

# 23. Interactive Blocks

The major future extension is interactive Markdown content.

Example:

````markdown
## Which hypothesis is plausible?

```poll
{
  "id": "hypothesis",
  "question": "Warum verändert sich die Farbe?",
  "type": "single",
  "options": [
    "Temperatur",
    "pH-Wert",
    "Verdunstung"
  ]
}
```
````

Long-term pipeline:

```text
Markdown
   |
   v
blended-marked
   |
   +-- normal HTML
   +-- math
   +-- chemfig
   +-- fenced divs
   +-- interactive declarations
             |
             v
       AIDu components
```

Reveal should remain responsible only for presentation structure and navigation.

AIDu remains responsible for:

- interactive state,
- poll submission,
- backend communication,
- permissions,
- student/teacher roles,
- aggregation,
- persistence.

---

# 24. Important Separation of Concerns

The following responsibilities must remain separate.

## `blended-marked`

```text
Markdown
    ->
HTML/content representation
```

## `presentation-markdown.ts`

```text
Markdown document
    ->
Reveal horizontal/vertical slide structure
```

## Reveal.js

```text
slide DOM
    ->
presentation navigation
```

## `PresentationActivity`

```text
AIDu activity lifecycle
Reveal instance lifecycle
Exit/completion/progress
```

## AIDu backend

```text
activity definitions
progress
poll responses
class aggregation
teacher/student state
```

This separation prevents Reveal-specific behaviour from leaking into the generic Markdown renderer.

---

# 25. Suggested File Structure

A possible AIDu frontend structure:

```text
src/
├── components/
│   └── activities/
│       ├── PresentationActivity.tsx
│       └── PresentationMenu.tsx
│
├── markdown/
│   ├── presentation-markdown.ts
│   └── ...
│
├── styles/
│   └── presentation.css
│
└── ...
```

If `presentation-markdown.ts` currently lives in the `mypandoc` package, it should preferably move to a location that both AIDu and `mypandoc` can import without creating a dependency from AIDu onto CLI-specific code.

Potential shared package:

```text
blended-marked/
presentation/
    presentation-markdown.ts
mypandoc/
aidu/
```

or:

```text
src/shared/presentation/
```

depending on repository organization.

---

# 26. Recommended Shared Module Boundary

Preferred dependency direction:

```text
blended-marked
      ^
      |
presentation-markdown
      ^
      |
 +----+----+
 |         |
mypandoc  AIDu
```

Avoid:

```text
AIDu
  |
  v
mypandoc
```

AIDu should not import a CLI package.

---

# 27. Minimal First Implementation

The first functional version should implement only:

1. `presentation` activity type,
2. Markdown loading,
3. `renderPresentationMarkdown()`,
4. embedded Reveal initialization,
5. horizontal slides,
6. vertical slides,
7. existing Markdown features,
8. Exit button,
9. cleanup on exit.

Not required in the first implementation:

- teacher-controlled navigation,
- polls,
- MC tests,
- backend progress persistence,
- presentation resume,
- fullscreen,
- speaker notes,
- synchronized classroom mode.

---

# 28. Acceptance Criteria

The implementation is complete for version 1 when:

- AIDu can open an activity with `type: presentation`.
- The activity loads a Markdown source.
- `---` moves horizontally.
- `--` creates vertical Reveal stacks.
- Markdown is rendered through `blended-marked`.
- Math and existing blended-marked content continue to work.
- Images render correctly.
- Fenced-div layouts work.
- Reveal runs inside the AIDu activity area.
- Reveal does not replace the AIDu application page.
- An Exit control returns to the previous AIDu activity/application state.
- Re-entering a presentation does not result in duplicate Reveal event handlers.
- Reveal is destroyed on component cleanup.
- The implementation reuses `renderPresentationMarkdown()` rather than duplicating slide parsing.

---

# 29. Initial Implementation Sequence

Recommended implementation order:

```text
1. Move presentation-markdown.ts to shared frontend-accessible location
        |
2. Add reveal.js dependency to AIDu
        |
3. Add PresentationActivityDefinition
        |
4. Add activity dispatch
        |
5. Implement PresentationActivity.tsx
        |
6. Add scoped Reveal/presentation CSS
        |
7. Test horizontal navigation
        |
8. Test vertical navigation
        |
9. Test Exit + cleanup
        |
10. Test existing blended-marked features
```

After this baseline works:

```text
11. Presentation menu
12. progress/resume
13. interactive poll blocks
14. teacher/student views
15. classroom aggregation
```

---

# 30. Long-Term Direction

The presentation activity is intended to become an AIDu-native interactive teaching surface rather than merely a slide viewer.

Target architecture:

```text
AIDu Presentation Activity
        |
        +-- Reveal navigation
        |
        +-- blended-marked content
        |
        +-- mathematics
        |
        +-- chemistry
        |
        +-- images/layouts
        |
        +-- polls
        |
        +-- MC tests
        |
        +-- learner input
        |
        +-- teacher-only controls
        |
        +-- class aggregation
        |
        +-- AIDu diagnostics
```

Reveal.js provides navigation and visual presentation.

AIDu provides the learning activity model, interaction, orchestration, evidence collection, persistence, and teacher/student semantics.

# 31. Placement in `frontend-support`

The current support package:

```text
applet-support
```

will be renamed to:

```text
frontend-support
```

The presentation renderer is shared functionality and must therefore not remain inside the `mypandoc` implementation directory.

Recommended structure:

```text
frontend-support/src
├── blended-marked
│   └── render.ts
│
├── chemfig
│   ├── chemfig.ts
│   ├── global.d.ts
│   ├── main.ts
│   └── styles.css
│
├── presentation
│   └── presentation-markdown.ts
│
├── mypandoc
│   ├── src
│   │   ├── mypandoc.ts
│   │   └── reveal-menu.ts
│   ├── styles.css
│   ├── template.html
│   ├── slides.md
│   ├── package.json
│   └── vite.config.ts
│
└── fluid-typography.css
```

The important change is:

```text
mypandoc/src/presentation-markdown.ts
```

moves to:

```text
frontend-support/src/presentation/presentation-markdown.ts
```

The reason is that `presentation-markdown.ts` is no longer a `mypandoc` implementation detail.

It is a shared presentation-format layer used by both:

```text
mypandoc
AIDu
```

---

# 32. Dependency Direction inside `frontend-support`

The intended dependency structure is:

```text
chemfig
   ^
   |
blended-marked
   ^
   |
presentation
   ^
   |
   +--------- mypandoc
   |
   +--------- AIDu frontend
```

More explicitly:

```text
chemfig
    |
    v
blended-marked
    |
    v
presentation-markdown
    |
    +----> mypandoc CLI
    |
    +----> AIDu PresentationActivity
```

The direction must not be reversed.

In particular, avoid:

```text
AIDu
  |
  v
mypandoc
```

AIDu must never depend on the CLI/export implementation.

`mypandoc` is a consumer of the shared presentation renderer, not its owner.

---

# 33. Shared Presentation Module

The shared module is:

```text
frontend-support/src/presentation/presentation-markdown.ts
```

Its responsibility is strictly:

```text
Markdown document
    |
    v
Reveal-compatible slide HTML structure
```

It imports the generic Markdown renderer:

```ts
import {
  renderBlendedMarkdown
} from '../blended-marked/render';
```

Representative implementation:

```ts
import {
  renderBlendedMarkdown
} from '../blended-marked/render';

export function renderPresentationMarkdown(
  markdown: string
): string {
  const horizontalGroups = markdown
    .split(/^\s*---\s*$/m)
    .map(group => group.trim())
    .filter(Boolean);

  const renderedSlides: string[] = [];

  for (const group of horizontalGroups) {
    const verticalSlides = group
      .split(/^\s*--\s*$/m)
      .map(slide => slide.trim())
      .filter(Boolean);

    if (verticalSlides.length === 1) {
      const body =
        renderBlendedMarkdown(
          verticalSlides[0]
        );

      renderedSlides.push(`
<section>
${body}
</section>`);

      continue;
    }

    const vertical =
      verticalSlides
        .map(slide => `
<section>
${renderBlendedMarkdown(slide)}
</section>`)
        .join('\n');

    renderedSlides.push(`
<section>
${vertical}
</section>`);
  }

  return renderedSlides.join('\n');
}
```

This module must not contain:

- Node filesystem access,
- JSDOM setup,
- Reveal initialization,
- SolidJS lifecycle code,
- AIDu routing,
- activity persistence,
- CLI argument parsing,
- HTML template loading.

---

# 34. `mypandoc` after Refactoring

After moving the shared renderer, `mypandoc` becomes a thin standalone export tool.

Its responsibilities are:

```text
mypandoc
    |
    +-- CLI argument handling
    +-- JSDOM setup
    +-- read Markdown file
    +-- call renderPresentationMarkdown()
    +-- inject result into template.html
    +-- copy styles/browser helper
    +-- write standalone HTML
```

Its import becomes approximately:

```ts
const {
  renderPresentationMarkdown
} = await import(
  '../../presentation/presentation-markdown'
);
```

assuming the structure:

```text
frontend-support/src/mypandoc/src/mypandoc.ts
frontend-support/src/presentation/presentation-markdown.ts
```

The dynamic import remains useful in the CLI because `blended-marked` currently requires browser globals installed through JSDOM before it is imported.

---

# 35. AIDu use of `frontend-support`

AIDu should consume the shared presentation renderer directly from `frontend-support`.

Conceptually:

```ts
import {
  renderPresentationMarkdown
} from '@aidu/frontend-support/presentation';
```

and not:

```ts
import {
  renderPresentationMarkdown
} from '@aidu/frontend-support/mypandoc/...';
```

This keeps AIDu independent of:

- CLI code,
- standalone HTML templates,
- Node-specific functionality,
- export tooling.

---

# 36. Package Exports

Once `applet-support` has been renamed to `frontend-support`, the package should expose reusable frontend capabilities explicitly.

Recommended package exports:

```json
{
  "exports": {
    "./blended-marked": "./src/blended-marked/render.ts",
    "./presentation": "./src/presentation/presentation-markdown.ts",
    "./chemfig": "./src/chemfig/main.ts"
  }
}
```

Consumers can then use stable imports:

```ts
import {
  renderBlendedMarkdown
} from '@aidu/frontend-support/blended-marked';

import {
  renderPresentationMarkdown
} from '@aidu/frontend-support/presentation';
```

This is preferable to relative imports across package internals.

---

# 37. Updated Overall Architecture

With the package rename and presentation extraction, the architecture becomes:

```text
frontend-support
│
├── chemfig
│      |
│      v
├── blended-marked
│      |
│      v
├── presentation
│      |
│      +-------------------+
│      |                   |
│      v                   v
├── mypandoc            AIDu frontend
│                          |
│                          v
│                 PresentationActivity
│
└── shared styles/utilities
```

The semantic layers are therefore:

```text
chemfig
    chemical notation rendering

blended-marked
    generic Markdown/content rendering

presentation
    slide document structure

mypandoc
    standalone presentation export

AIDu
    interactive learning activity runtime
```

---

# 38. Documentation Placement

The implementation specification should not remain conceptually owned by `mypandoc`.

Recommended location:

```text
frontend-support/docs/
└── aidu-presentation-implementation-spec.md
```

or, if documentation remains close to AIDu:

```text
docs/
└── aidu-presentation-implementation-spec.md
```

The specification describes the integration between:

```text
frontend-support
AIDu
Reveal.js
interactive activities
```

rather than only the `mypandoc` CLI.

---

# 39. Updated Refactoring Sequence

Before implementing `PresentationActivity`, perform the shared-module refactoring:

```text
1. Rename applet-support -> frontend-support
        |
2. Create frontend-support/src/presentation/
        |
3. Move presentation-markdown.ts there
        |
4. Update its blended-marked import
        |
5. Update mypandoc import
        |
6. Verify standalone mypandoc still works
        |
7. Add stable frontend-support package export
        |
8. Import presentation renderer into AIDu
        |
9. Implement PresentationActivity
```

The standalone exporter should remain a regression test for the shared presentation renderer.

A change to presentation parsing should therefore be testable through both:

```text
mypandoc
AIDu PresentationActivity
```

without maintaining separate parsing implementations.

