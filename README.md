# TempoMind

Energy-aware goal pacing. Owners break big goals into weekly milestones and daily sub-tasks, then re-slice each day to match how they actually feel. Teammates get a clean, view-only dashboard of momentum, without ever seeing anyone's energy or burnout state.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

## Features

- **AI pacing plan:** enter a goal and deadline (dates like "by Nov 15" are detected automatically), then click **Generate Pacing Plan**. The planner classifies the goal (roadmap, product build, writing, learning or general), sizes the effort to the runway, and produces weekly milestones, daily sub-tasks and micro-steps.
- **🔒 Private energy slicer:** ⚡ High Focus / 🟢 Steady / 🔋 Low Energy / 🔥 Fried re-slice *today's* work (deep-work blocks, ~20-min chunks, or one tiny step at a time). Task dates, milestones and deadlines are never changed.
- **Team view (view-only):** current task badge, % complete, planned vs. actual pacing with projected finish, a live countdown for the active focus session, and a milestone timeline.
- **Share links:** `#/share/<projectId>` opens a standalone, view-only page. Open one in a second tab: it updates live as the owner checks things off.

## Privacy model

- Energy check-ins live in a separate owner-only store (`tempomind.owner-private.v1`) and reset daily.
- The team view and share pages receive **projects only**, and render from `toPublicView()` (`src/lib/metrics.ts`), whose inputs don't include energy.
- The public "current task" is always the parent task, never an energy-sized micro-step.

## Demo notes

- The AI call is simulated in `generatePacingPlan()` (`src/lib/planner.ts`) with streamed "thinking" output. To use a real model, replace its body with an API call that returns the same `Project` shape.
- Data is stored in the browser (localStorage). **Reset demo data** in the footer restores two sample projects, one with a live focus session.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · Motion · Lucide icons
