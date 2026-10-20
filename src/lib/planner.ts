import type { EffortSize, Milestone, Project, Task } from '../types';
import { addDays, formatDate, formatHours, isWeekend, parseISODate, toISODate, todayISO, weekStart } from './dates';
import { uid } from './uid';

type StepTpl = readonly [title: string, minutes: number];
interface TaskTpl { title: string; steps: StepTpl[] }
interface PhaseTpl { name: string; tasks: TaskTpl[] }
interface Domain { label: string; nouns: string[]; verbs: string[]; phases: PhaseTpl[] }

const task = (title: string, ...steps: StepTpl[]): TaskTpl => ({ title, steps });
const phase = (name: string, ...tasks: TaskTpl[]): PhaseTpl => ({ name, tasks });

// ---------------------------------------------------------------------------
// Planning templates. `{s}` is replaced with the goal's subject.
// ---------------------------------------------------------------------------

const ROADMAP: Domain = {
  label: 'Strategy & roadmap',
  nouns: ['roadmap', 'strategy', 'okr', 'vision', 'budget', 'plan', 'forecast', 'offsite'],
  verbs: ['plan', 'prioritize', 'define', 'align'],
  phases: [
    phase('Discovery & input',
      task('Map stakeholders for the {s}', ['List everyone with a stake in the outcome', 10], ['Note what each person needs from it', 15], ['Book short input sessions', 10]),
      task('Gather customer & market signals', ['Export recent feedback and support themes', 15], ['Skim 3 competitor updates', 15], ['Write down the top 5 signals', 10]),
      task("Review last period's results", ['Pull core metrics into one sheet', 15], ['Mark wins, misses and surprises', 15], ['Summarize 3 key takeaways', 10])),
    phase('Prioritize themes',
      task('Cluster opportunities into themes', ['Put every idea on one board', 15], ['Group ideas into 4–6 themes', 20], ['Name each theme in plain language', 10]),
      task('Score initiatives by impact vs. effort', ['Set up a simple scoring sheet', 10], ['Score each initiative', 25], ['Flag the top 5', 10]),
      task('Align on priorities with leads', ['Draft a one-page priority summary', 20], ['Share it for async comments', 5], ['Resolve open disagreements', 20])),
    phase('Draft & sequence',
      task('Draft the {s} narrative', ['Write the "why now" opener', 15], ['Describe each theme in 2–3 sentences', 25], ['Add success metrics per theme', 15]),
      task('Sequence initiatives on a timeline', ['Place must-haves first', 15], ['Slot remaining work by capacity', 20], ['Mark key dates and milestones', 10]),
      task('Map dependencies & risks', ['List cross-team dependencies', 15], ['Note top 3 risks and mitigations', 15], ['Confirm an owner for each risk', 10])),
    phase('Review & finalize',
      task('Run a stakeholder review', ['Prep a 15-minute walkthrough', 20], ['Run the session and capture feedback', 30], ['Log decisions and follow-ups', 10]),
      task('Finalize the {s}', ['Apply review feedback', 25], ['Do a final consistency pass', 15], ['Lock the version', 5]),
      task('Share & communicate the {s}', ['Write the announcement summary', 15], ['Present it to the wider team', 20], ['Post the final version where everyone can find it', 5])),
  ],
};

const BUILD: Domain = {
  label: 'Product build',
  nouns: ['app', 'mvp', 'website', 'site', 'feature', 'prototype', 'beta', 'release', 'platform', 'api', 'tool', 'extension', 'game', 'hackathon', 'dashboard'],
  verbs: ['build', 'launch', 'ship', 'develop', 'code', 'deploy', 'design', 'prototype'],
  phases: [
    phase('Scope & design',
      task('Define the core problem & success metric', ['Write the problem in one sentence', 10], ['Pick one success metric', 10], ['List what is explicitly out of scope', 15]),
      task('Sketch key screens & user flow', ['List the 3–5 core screens', 10], ['Sketch the main flow end-to-end', 30], ['Get quick feedback from one person', 15]),
      task('Set up the project & tooling', ['Create the repo and base project', 15], ['Configure linting and formatting', 10], ['Deploy a hello-world preview', 20])),
    phase('Build the core',
      task('Build the data model', ['Define the main entities', 15], ['Implement storage and types', 30], ['Seed realistic sample data', 15]),
      task('Implement the primary workflow', ['Build the main create/edit flow', 40], ['Handle loading and empty states', 20], ['Test the flow by hand', 10]),
      task('Wire up the main screens', ['Connect screens to real data', 30], ['Add navigation between screens', 15], ['Smooth out obvious UI rough edges', 20])),
    phase('Polish & test',
      task('Test the end-to-end happy path', ['Write down the demo script', 15], ['Walk through it 3 times', 20], ['Log every bug you hit', 10]),
      task('Fix top bugs & edge cases', ['Triage the bug list', 10], ['Fix the top 3 bugs', 40], ['Re-test the happy path', 10]),
      task('Polish visuals & copy', ['Unify spacing and colors', 25], ['Rewrite unclear labels', 15], ['Check the layout on mobile', 15])),
    phase('Launch',
      task('Prepare launch assets', ['Record a 2-minute demo video', 30], ['Capture 4 clean screenshots', 15], ['Write the launch description', 20]),
      task('Deploy & smoke-test production', ['Deploy the production build', 15], ['Run the demo script on production', 15], ['Fix any deploy-only issues', 20]),
      task('Launch the {s} & collect feedback', ['Publish the announcement', 10], ['Share it with the first users', 15], ['Capture early feedback in one place', 15])),
  ],
};

const WRITING: Domain = {
  label: 'Writing project',
  nouns: ['report', 'thesis', 'paper', 'essay', 'book', 'article', 'proposal', 'blog', 'post', 'update', 'newsletter', 'dissertation', 'grant', 'memo', 'spec', 'chapter', 'whitepaper'],
  verbs: ['write', 'draft', 'edit', 'publish'],
  phases: [
    phase('Research & outline',
      task('Collect sources & raw material', ['List the questions the piece must answer', 10], ['Gather 8–10 key sources or data points', 30], ['Save notes in one doc', 10]),
      task('Nail the key message', ['Write the core message in one sentence', 15], ['List 3 supporting points', 15], ['Name the audience and what they need', 10]),
      task('Outline section by section', ['Draft headings for every section', 15], ['Add 2–3 bullet points under each', 25], ['Sanity-check the flow', 10])),
    phase('First draft',
      task('Draft the opening', ['Write a hook or context paragraph', 20], ['State the key message clearly', 15], ['Preview what follows', 10]),
      task('Draft the core sections', ['Draft section one without editing', 30], ['Draft the remaining sections', 40], ['Drop in placeholders for missing data', 10]),
      task('Draft the conclusion & asks', ['Summarize the 3 key points', 15], ['Write clear next steps or asks', 15], ['Draft a working title', 5])),
    phase('Revise',
      task('Restructure for flow', ['Read the draft start to finish', 20], ['Reorder or merge weak sections', 25], ['Fix transitions', 15]),
      task('Tighten the language', ['Cut 15% of the words', 30], ['Replace jargon with plain language', 15], ['Vary sentence length', 10]),
      task('Check facts, figures & references', ['Verify every number', 20], ['Confirm sources and links', 15], ['Fill the remaining placeholders', 15])),
    phase('Finalize',
      task('Get reviewer feedback', ['Send the draft to 1–2 reviewers', 10], ['Collect and group their comments', 15], ['Decide which changes to make', 10]),
      task('Apply final edits & formatting', ['Apply the agreed changes', 30], ['Format headings, visuals and tables', 20], ['Proofread one last time', 15]),
      task('Publish the {s}', ['Export the final version', 10], ['Submit or publish it', 10], ['Share it with the people who need it', 10])),
  ],
};

const LEARNING: Domain = {
  label: 'Learning goal',
  nouns: ['exam', 'course', 'certification', 'certificate', 'test', 'language', 'skill', 'class', 'gre', 'gmat', 'lsat', 'interview'],
  verbs: ['learn', 'study', 'master', 'practice', 'pass', 'prep'],
  phases: [
    phase('Map the material',
      task('Map out everything to cover', ['Collect the syllabus or topic list', 10], ['Rate your confidence per topic', 15], ['Pick the 3 weakest areas', 10]),
      task('Set up a study system', ['Pick one place for notes', 5], ['Create a flashcard deck', 15], ['Block study time on the calendar', 10])),
    phase('Core learning',
      task('Work through the foundational topics', ['Study topic one with active notes', 30], ['Summarize it from memory', 15], ['Make 10 flashcards', 15]),
      task('Tackle the hardest topic', ['Read or watch one clear explanation', 25], ['Work 3 examples by hand', 25], ['Write down what is still confusing', 10]),
      task('Cover the remaining topics', ['Study the next topic', 30], ['Teach it back in your own words', 15], ['Add flashcards', 10])),
    phase('Practice',
      task('Do a timed practice set', ['Set a timer and attempt the set', 40], ['Mark your answers', 15], ['Log every mistake by type', 10]),
      task('Drill your weak spots', ['Review the mistake log', 10], ['Redo similar problems', 30], ['Review flashcards', 15]),
      task('Consolidate notes & flashcards', ['Run through due flashcards', 20], ['Rewrite one messy page of notes', 20], ['Quiz yourself on 5 random topics', 10])),
    phase('Review & test',
      task('Take a full mock test', ['Simulate real conditions', 60], ['Score it honestly', 10], ['Note the 3 biggest gaps', 10]),
      task('Close the final gaps', ['Re-study the 3 gaps', 35], ['Do a short practice set', 20], ['Light flashcard review', 10]),
      task('Final prep for the {s}', ['Skim your summary sheet', 15], ['Sort logistics for the day', 10], ['Wind down early and rest', 5])),
  ],
};

const GENERAL: Domain = {
  label: 'General project',
  nouns: [],
  verbs: [],
  phases: [
    phase('Define & plan',
      task('Define what "done" looks like', ['Write the outcome in one sentence', 10], ['List concrete deliverables', 15], ['Agree on how success is measured', 10]),
      task('Break the work into deliverables', ['List every piece of work', 20], ['Group it into 3–4 chunks', 15], ['Roughly estimate each chunk', 10]),
      task('Identify risks & resources', ['List what could block you', 10], ['Note who or what you need', 10], ['Ask for help early where needed', 10])),
    phase('First push',
      task('Start the first deliverable', ['Set up your workspace', 10], ['Complete a first rough version', 40], ['Note what is left', 5]),
      task('Finish the first deliverable', ['Fill in the gaps', 30], ['Check it against the definition of done', 15], ['Mark it complete', 5]),
      task('Check in with collaborators', ['Share progress so far', 10], ['Collect feedback', 15], ['Adjust the plan', 10])),
    phase('Second push',
      task('Complete the next deliverable', ['Draft a rough version', 40], ['Refine it', 25], ['Get a quick review', 10]),
      task('Handle open issues', ['List outstanding issues', 10], ['Resolve the top 3', 35], ['Update the plan', 5])),
    phase('Wrap up',
      task('Review & polish everything', ['Do a full review pass', 25], ['Fix inconsistencies', 25], ['Get final sign-off', 10]),
      task('Deliver the {s}', ['Package the final output', 15], ['Deliver or present it', 20], ['Share it with stakeholders', 10]),
      task('Retro & next steps', ['Note what went well', 10], ['Note what to change next time', 10], ['Celebrate the finish', 5])),
  ],
};

const DOMAINS = [ROADMAP, BUILD, WRITING, LEARNING];

const WEEKLY_REVIEW = task('Weekly review: progress vs. pace', ['Check off everything you finished', 5], ['Compare progress with the plan', 10], ["Pick next week's top 3 priorities", 10]);
/** Longer steps are split so every micro-step stays small enough for a low-energy day. */
const MAX_STEP_MIN = 25;

// ---------------------------------------------------------------------------
// Goal parsing
// ---------------------------------------------------------------------------

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DATE_WORD = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?|\\d|q[1-4]|end\\b|eo[dwmqy]\\b|next\\b|this\\b|tomorrow|today|(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?\\b';
const DEADLINE_TAIL = new RegExp(`[\\s,–-]*\\b(?:by|before|due|until|no later than)\\s+(?:the\\s+)?(?:${DATE_WORD}).*$`, 'i');
const SUBJECT_SKIP = new Set([
  ...DOMAINS.flatMap((d) => d.verbs),
  'create', 'finish', 'complete', 'finalize', 'prepare', 'make', 'get', 'do', 'run', 'deliver', 'organize', 'start',
  'a', 'an', 'the', 'our', 'my', 'new',
]);

function parseGoal(goal: string): { title: string; subject: string } {
  const cleaned = goal.trim().replace(/\s+/g, ' ').replace(/[.!]+$/, '');
  const core = cleaned.replace(DEADLINE_TAIL, '').trim() || cleaned;
  const words = core.split(' ');
  let i = 0;
  while (i < words.length - 1 && SUBJECT_SKIP.has(words[i].toLowerCase())) i++;
  const subjectWords = words.slice(i);
  return {
    title: core.charAt(0).toUpperCase() + core.slice(1),
    subject: subjectWords.length > 6 ? 'project' : subjectWords.join(' '),
  };
}

function detectDomain(goal: string): Domain {
  const words = goal.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  let best = GENERAL;
  let bestScore = 0;
  for (const domain of DOMAINS) {
    let score = words[0] && domain.verbs.includes(words[0]) ? 1 : 0;
    for (const w of words) {
      if (domain.nouns.includes(w) || domain.nouns.includes(w.replace(/s$/, ''))) score += 3;
      else if (domain.verbs.includes(w)) score += 1;
    }
    if (score > bestScore) {
      best = domain;
      bestScore = score;
    }
  }
  return best;
}

/** Pulls a date like "by Nov 15" or "before 12/1" out of free text. */
export function extractDeadline(goal: string, today: string): string | null {
  const named = goal.match(/\b(?:by|before|due|until|on)\s+(?:the\s+)?([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s+(\d{4}))?/i);
  if (named) {
    const month = MONTHS.indexOf(named[1].slice(0, 3).toLowerCase());
    if (month >= 0) return resolveDate(today, month, Number(named[2]), named[3] ? Number(named[3]) : undefined);
  }
  const numeric = goal.match(/\b(?:by|before|due|until|on)\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/i);
  if (numeric) {
    const year = numeric[3] ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3]) : undefined;
    return resolveDate(today, Number(numeric[1]) - 1, Number(numeric[2]), year);
  }
  return null;
}

function resolveDate(today: string, month: number, day: number, year?: number): string | null {
  const build = (y: number) => {
    const d = new Date(y, month, day);
    return d.getMonth() === month ? toISODate(d) : null;
  };
  if (year) return build(year);
  const thisYear = parseISODate(today).getFullYear();
  const candidate = build(thisYear);
  if (!candidate) return null;
  return candidate < today ? build(thisYear + 1) : candidate;
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

interface Draft { phase: string; title: string; steps: StepTpl[]; parts: number }
interface Unit { phase: string; title: string; steps: StepTpl[] }

/** Working days from start to end. The start day always counts, even on a weekend. */
function listWorkdays(start: string, end: string): string[] {
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) if (d === start || !isWeekend(d)) days.push(d);
  return days;
}

function groupByWeek(days: string[]): string[][] {
  const weeks = new Map<string, string[]>();
  for (const d of days) {
    const key = weekStart(d);
    weeks.set(key, [...(weeks.get(key) ?? []), d]);
  }
  return [...weeks.values()];
}

function chunk<T>(items: T[], parts: number): T[][] {
  const out: T[][] = [];
  let start = 0;
  for (let i = 0; i < parts; i++) {
    const size = Math.ceil((items.length - start) / (parts - i));
    out.push(items.slice(start, start + size));
    start += size;
  }
  return out;
}

const minutesOf = (steps: StepTpl[]) => steps.reduce((n, [, m]) => n + m, 0);

/** Splits the heaviest tasks into multi-day parts until there's roughly enough work to fill the runway. */
function splitIntoParts(drafts: Draft[], target: number): Unit[] {
  let count = drafts.length;
  while (count < target) {
    let pick: Draft | undefined;
    let heaviest = 0;
    for (const d of drafts) {
      const load = minutesOf(d.steps) / d.parts;
      if (d.parts < d.steps.length && load > heaviest) {
        pick = d;
        heaviest = load;
      }
    }
    if (!pick) break;
    pick.parts++;
    count++;
  }
  return drafts.flatMap((d) =>
    chunk(d.steps, d.parts).map((steps, i) => ({
      phase: d.phase,
      title: d.parts > 1 ? `${d.title} (${i + 1}/${d.parts})` : d.title,
      steps,
    })),
  );
}

function makeTask(unit: Unit, date: string, kind?: 'review'): Task {
  return {
    id: uid(),
    milestoneId: '',
    phase: unit.phase,
    title: unit.title,
    date,
    ...(kind ? { kind } : {}),
    steps: unit.steps.map(([title, minutes]) => ({ id: uid(), title, minutes, done: false })),
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export interface PlanDraft {
  project: Project;
  reasoning: string[];
}

// ---------------------------------------------------------------------------
// Effort & capacity
// ---------------------------------------------------------------------------

export const EFFORT_SIZES: Record<EffortSize, { label: string; hours: number; hint: string }> = {
  small: { label: 'Small', hours: 6, hint: 'A few focused hours' },
  medium: { label: 'Medium', hours: 24, hint: 'A few days of focused work' },
  large: { label: 'Large', hours: 60, hint: 'Weeks of focused work' },
};
export const EFFORT_ORDER: EffortSize[] = ['small', 'medium', 'large'];
export const HOURS_PER_WEEK_OPTIONS = [4, 8, 12, 20, 30];
export const DEFAULT_HOURS_PER_WEEK = 8;
/** Share of the runway kept free as buffer, since estimates usually run short. */
const BUFFER_SHARE = 0.15;

const DOMAIN_EFFORT = new Map<Domain, EffortSize>([[ROADMAP, 'medium'], [BUILD, 'large'], [WRITING, 'medium'], [LEARNING, 'large']]);
const SMALL_HINTS = ['post', 'email', 'memo', 'blog', 'newsletter', 'update', 'outline', 'quick', 'small', 'simple', 'slide', 'brief', 'one-pager'];
const LARGE_HINTS = ['platform', 'thesis', 'dissertation', 'book', 'certification', 'migration', 'redesign', 'rebuild', 'curriculum'];

/** Best guess at how big a goal is, from its wording and how much runway it has. */
export function inferEffort(goal: string, deadline: string, start: string): EffortSize {
  const words = goal.toLowerCase().match(/[a-z0-9-]+/g) ?? [];
  let size = DOMAIN_EFFORT.get(detectDomain(goal)) ?? 'medium';
  if (words.some((w) => SMALL_HINTS.includes(w))) size = 'small';
  else if (words.some((w) => LARGE_HINTS.includes(w))) size = 'large';
  // Nobody fits weeks of work into a few days, so scale the guess to the runway.
  const days = listWorkdays(start, deadline < start ? start : deadline).length;
  if (days <= 2) return 'small';
  if (days <= 5 && size === 'large') return 'medium';
  return size;
}

export type Feasibility = 'fits' | 'tight' | 'over';

export interface CapacityCheck {
  estimateMin: number;
  budgetMin: number;
  status: Feasibility;
  /** Earliest deadline that fits the work plus buffer at the current hours. */
  suggestedDeadline: string | null;
  /** Smallest weekly-hours option that fits the work plus buffer by the deadline. */
  suggestedHours: number | null;
}

const dailyMinutes = (hoursPerWeek: number) => (hoursPerWeek * 60) / 5;

export function checkCapacity(size: EffortSize, hoursPerWeek: number, deadline: string, start: string): CapacityCheck {
  const end = deadline < start ? start : deadline;
  const days = listWorkdays(start, end).length;
  const estimateMin = EFFORT_SIZES[size].hours * 60;
  const neededMin = estimateMin * (1 + BUFFER_SHARE);
  const budgetMin = days * dailyMinutes(hoursPerWeek);
  const status: Feasibility = budgetMin >= neededMin ? 'fits' : budgetMin >= estimateMin ? 'tight' : 'over';

  let suggestedDeadline: string | null = null;
  let suggestedHours: number | null = null;
  if (status !== 'fits') {
    const daysNeeded = Math.ceil(neededMin / dailyMinutes(hoursPerWeek));
    suggestedDeadline = end;
    for (let count = days; count < daysNeeded; ) {
      suggestedDeadline = addDays(suggestedDeadline, 1);
      if (!isWeekend(suggestedDeadline)) count++;
    }
    suggestedHours = HOURS_PER_WEEK_OPTIONS.find((h) => days * dailyMinutes(h) >= neededMin) ?? null;
  }
  return { estimateMin, budgetMin, status, suggestedDeadline, suggestedHours };
}

/** Scales template steps to the target effort, splitting any that grow too long. */
function scaleSteps(steps: StepTpl[], factor: number): StepTpl[] {
  return steps.flatMap(([title, minutes]) => {
    const scaled = Math.max(5, Math.round((minutes * factor) / 5) * 5);
    const parts = Math.ceil(scaled / MAX_STEP_MIN);
    const each = Math.max(5, Math.round(scaled / parts / 5) * 5);
    return Array.from({ length: parts }, (_, i) => [i === 0 ? title : `${title} (cont.)`, each] as const);
  });
}

export interface PlanOptions {
  size?: EffortSize;
  hoursPerWeek?: number;
}

export function buildPlan(goal: string, deadline: string, start: string, options: PlanOptions = {}): PlanDraft {
  const end = deadline < start ? start : deadline;
  const { title, subject } = parseGoal(goal);
  const domain = detectDomain(goal);
  const size = options.size ?? inferEffort(goal, end, start);
  const hoursPerWeek = options.hoursPerWeek ?? DEFAULT_HOURS_PER_WEEK;
  const capacity = checkCapacity(size, hoursPerWeek, end, start);
  const fill = (text: string) => text.replaceAll('{s}', subject);

  // Keep the tail of the runway free as buffer, but only as much as the slack allows.
  const workdays = listWorkdays(start, end);
  const slackDays = Math.floor((capacity.budgetMin - capacity.estimateMin) / dailyMinutes(hoursPerWeek));
  const bufferDays = workdays.length >= 5 ? Math.max(0, Math.min(Math.round(workdays.length * BUFFER_SHARE), slackDays)) : 0;
  const planDays = workdays.slice(0, workdays.length - bufferDays);
  const planWeeks = groupByWeek(planDays).slice(0, -1).filter((days) => days.length >= 3);

  // Small goals skip the middle of each phase; everything is scaled to the effort estimate.
  const phases = domain.phases.map((p) => (size === 'small' ? { ...p, tasks: p.tasks.filter((_, i, all) => i === 0 || i === all.length - 1) } : p));
  const templateMin = phases.reduce((n, p) => n + p.tasks.reduce((m, t) => m + minutesOf(t.steps), 0), 0);
  const reviewMin = planWeeks.length * minutesOf(WEEKLY_REVIEW.steps);
  const factor = Math.max(0.3, (capacity.estimateMin - reviewMin) / templateMin);
  const drafts: Draft[] = phases.flatMap((p) =>
    p.tasks.map((t) => ({
      phase: p.name,
      title: fill(t.title),
      steps: scaleSteps(t.steps.map(([s, m]) => [fill(s), m] as const), factor),
      parts: 1,
    })),
  );
  const draftMin = drafts.reduce((n, d) => n + minutesOf(d.steps), 0);
  const units = splitIntoParts(drafts, Math.max(Math.round(planDays.length * 1.25), Math.ceil(draftMin / 90)));

  // Spread work by minutes rather than task count, so no single day is overloaded.
  const unitsMin = units.reduce((n, u) => n + minutesOf(u.steps), 0);
  let before = 0;
  const tasks = units.map((u, i) => {
    const minutes = minutesOf(u.steps);
    const index = i === 0 ? 0 : Math.min(planDays.length - 1, Math.floor(((before + minutes / 2) / unitsMin) * planDays.length));
    before += minutes;
    return makeTask(u, planDays[index]);
  });

  // A short check-in on the last working day of each full week of work.
  for (const days of planWeeks) tasks.push(makeTask({ phase: '', ...WEEKLY_REVIEW }, days[days.length - 1], 'review'));
  tasks.sort((a, b) => a.date.localeCompare(b.date));
  const weeks = groupByWeek(workdays);

  let previousPhase = '';
  const milestones: Milestone[] = weeks.map((days, i) => {
    const id = uid();
    const first = days[0];
    const last = days[days.length - 1];
    const inWeek = tasks.filter((t) => t.date >= first && t.date <= last);
    inWeek.forEach((t) => (t.milestoneId = id));
    const regular = inWeek.filter((t) => t.kind !== 'review');
    const phases = [...new Set(regular.map((t) => t.phase))];
    let milestoneTitle = phases.join(' → ') || 'Buffer & catch-up';
    if (phases.length === 1 && phases[0] === previousPhase) milestoneTitle += ', continued';
    if (phases.length) previousPhase = phases[phases.length - 1];
    const lastTask = regular[regular.length - 1];
    return {
      id,
      week: i + 1,
      title: milestoneTitle,
      deliverable: lastTask ? lastTask.title.replace(/\s*\(\d+\/\d+\)$/, '') : 'Catch up and rest',
      startDate: first,
      endDate: last,
    };
  });

  const totalMin = tasks.reduce((n, t) => n + t.steps.reduce((m, s) => m + s.minutes, 0), 0);
  const stepCount = tasks.reduce((n, t) => n + t.steps.length, 0);
  const fixes = [
    capacity.suggestedDeadline && `moving the deadline to ${formatDate(capacity.suggestedDeadline)}`,
    capacity.suggestedHours && `${capacity.suggestedHours}h/week`,
  ].filter(Boolean);
  const fit = {
    fits: `Fits with ~${formatHours(capacity.budgetMin - capacity.estimateMin)} to spare${bufferDays ? `, keeping the last ${plural(bufferDays, 'working day')} as buffer` : ''}`,
    tight: 'Tight: the work fits, but there is no room for buffer days',
    over: `⚠ Over capacity by ~${formatHours(capacity.estimateMin - capacity.budgetMin)}, so days will run long${fixes.length ? `. Consider ${fixes.join(' or ')}` : ''}`,
  }[capacity.status];
  const reasoning = [
    `Reading goal: “${title}”`,
    `Goal type: ${domain.label.toLowerCase()} → ${size} effort, ~${formatHours(totalMin)} (likely ${formatHours(totalMin * 0.8)}–${formatHours(totalMin * 1.25)})`,
    `Capacity: ${hoursPerWeek}h/week across ${plural(workdays.length, 'working day')} → ~${formatHours(capacity.budgetMin)} available before ${formatDate(end, true)}`,
    fit,
    `Weekly milestones: ${milestones.slice(0, 3).map((m) => m.title).join(' → ')}${milestones.length > 3 ? ' → …' : ''}`,
    `Sliced into ${stepCount} micro-steps of ${MAX_STEP_MIN} min or less, so each day can flex with your energy`,
  ];

  return {
    project: {
      id: uid(),
      goal: goal.trim(),
      title,
      category: domain.label,
      startDate: start,
      deadline: end,
      createdAt: Date.now(),
      milestones,
      tasks,
      session: null,
      effort: { size, hoursPerWeek, bufferDays },
    },
    reasoning,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Simulated LLM call. The UI awaits this exactly as it would a model request,
 * streaming "thoughts" as they arrive. To use a real model, replace the body
 * with an API call that returns the same Project shape.
 */
export async function generatePacingPlan(goal: string, deadline: string, options: PlanOptions, onThought?: (line: string) => void): Promise<Project> {
  const { project, reasoning } = buildPlan(goal, deadline, todayISO(), options);
  for (const line of reasoning) {
    await sleep(380 + Math.random() * 320);
    onThought?.(line);
  }
  await sleep(300);
  return project;
}
