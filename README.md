# TempoMind

Energy-aware goal pacing. Owners break big goals into weekly milestones and daily sub-tasks, then re-slice each day to match how they actually feel. Teammates get a clean, view-only dashboard of momentum, without ever seeing anyone's energy or burnout state.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Features

- **AI pacing plan:** enter a goal and deadline (dates like "by Nov 15" are detected automatically), then click **Generate Pacing Plan**. The planner classifies the goal (roadmap, product build, writing, learning or general) and produces weekly milestones, daily sub-tasks and micro-steps of 25 minutes or less.
- **Effort & capacity check:** the planner guesses how big the goal is (Small ~6h, Medium ~24h, Large ~60h) and uses your hours per week to check it fits before the deadline. If it doesn't, it suggests a later deadline, more hours, or a smaller scope. When there's slack, the last ~15% of the runway is kept as buffer.
- **🔒 Private energy slicer:** ⚡ High Focus / 🟢 Steady / 🔋 Low Energy / 🔥 Fried re-slice *today's* work (deep-work blocks, ~20-min chunks, or one tiny step at a time). Task dates, milestones and deadlines are never changed.
- **Focus sessions:** start a timed session from Today; teammates see the task name and a live countdown.
- **Team view (view-only):** current task, % complete, estimated vs. actual pacing with projected finish, live session countdown and a weekly timeline.
- **Human-in-the-loop completion:** at 100% a goal shows **Mark for completion**; after confirming, it's locked, greyed out at the bottom of the workspace and listed on the read-only **Completed Goals** page. Unticking it (and confirming) makes it live again.
- **Share links:** `#/share/<projectId>` opens a standalone, view-only page that updates live in other tabs of the same browser.
- **Colour schemes & dark mode:** five palettes, generated from Tailwind's colour scales (`npm run palettes`).

## Accessibility

- WCAG AA colour contrast (4.5:1 text, 3:1 focus indicators) in every palette, light and dark.
- Full keyboard use with visible focus rings and a skip-to-content link.
- Screen-reader labels and live announcements for planning progress, the capacity check, energy mode and copied links.
- Respects the OS "reduce motion" setting.
- Fried / Overwhelmed mode is designed for cognitive overload: one small step at a time.

## Privacy model

- Energy check-ins live in a separate owner-only store (`tempomind.owner-private.v1`) and reset daily.
- The team view, Completed Goals and share pages receive **projects only**, and render from `toPublicView()` (`src/lib/metrics.ts`), whose inputs don't include energy.
- The public "current task" is always the parent task, never an energy-sized micro-step.

## Demo notes

- The AI call is simulated in `generatePacingPlan()` (`src/lib/planner.ts`) with streamed "thinking" output. To use a real model, replace its body with an API call that returns the same `Project` shape.
- Data is stored in the browser (localStorage), so share links only work within the same browser. **Reset demo data** at the bottom of My Workspace restores four sample goals: one behind with a live focus session, one ahead, one ready to mark complete and one already completed.

## What's next

- A backend with sign-in, so share links work for real teammates and energy data is protected server-side.
- A real LLM behind `generatePacingPlan()`.
- Learning from actual time spent to calibrate future estimates.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Motion · Lucide icons
