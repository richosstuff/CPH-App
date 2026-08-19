import type { ApplicationStatus, ScheduleCategory, Currency, LifeGoalDomain, LifeGoalStatus } from './types';

export interface PhaseSeed {
  phase_number: number;
  title: string;
  start_date: string;
  end_date: string;
  goal_text: string;
  metric_text: string;
  checklist: string[];
}

export const PHASE_SEED: PhaseSeed[] = [
  {
    phase_number: 0,
    title: 'Pre-Arrival',
    start_date: '2026-07-01',
    end_date: '2026-08-21',
    goal_text: 'Close every open administrative loop before landing, so week one is settling in, not paperwork panic.',
    metric_text: 'Zero unresolved admin items by 21 August. Minimum 12 job applications submitted.',
    checklist: [
      'Get unconditional written confirmation of DTU admission — escalate beyond email if needed',
      'Get a European Health Insurance Card (EHIC); save digital copies of Citizen Card, DTU admission letter, housing contract, and insurance documents',
      'Confirm move-in date, key handover, and first payment for the Danish address',
      'Keep the job pipeline moving — EY assessment, Nilfisk, Green Therma, plus 2–3 more from the energy-sector list',
      'Do not commit to rugby or martial arts yet — that decision belongs to Phase 1/2',
    ],
  },
  {
    phase_number: 1,
    title: 'Landing',
    start_date: '2026-08-21',
    end_date: '2026-09-30',
    goal_text: 'Survive and stabilize. This phase is entirely about admin and orientation, not performance.',
    metric_text: 'Fully "administratively alive" (CPR + MitID + bank + tax card) within 14 days of arrival.',
    checklist: [
      'CPR number, MitID, NemKonto, tax card (skattekort) within the first two weeks',
      'Book the SIRI appointment and complete the OD1A EU Residence Document application',
      'Move into U2 dorm, get a Danish SIM, and pick up a second-hand bike with lights and a lock',
      'Set up Rejsekort, DOT Tickets, Rejseplanen; collect the yellow health card and assigned GP',
      'Attend DTU orientation, register for courses, meet the international buddy, join Polyteknisk Forening (PF)',
      'Book a CV feedback session at the DTU Career Centre in week 1 or 2',
      'Keep applying — target at least one live interview process by end of September',
      'Go watch or try one free session each of rugby and a martial art, no commitment yet',
    ],
  },
  {
    phase_number: 2,
    title: 'Semester 1 Settling In',
    start_date: '2026-10-01',
    end_date: '2027-01-31',
    goal_text: 'Land the first paying role, establish a real routine, make the sport decision for real.',
    metric_text: 'Job secured and SU applied for. Full training attended twice a week by December. Apartment search with Diogo underway. Semester 1 grades in.',
    checklist: [
      'Secure the first paid position by mid-October — if not, escalate to 5+ tailored applications a week',
      'Once employed at 10+ hours/week, apply for SU immediately',
      'Reach out to DTU Exiles and aim for full training within the first few weeks (or choose a martial art)',
      'Start scouting central shared apartments with Diogo for a February move',
      'Treat the IST average (16/20) as a baseline, not a ceiling',
      'Open a separate savings sub-account and start tracking actual net income',
    ],
  },
  {
    phase_number: 3,
    title: 'Semester 2',
    start_date: '2027-02-01',
    end_date: '2027-06-30',
    goal_text: 'Deepen the specialization, deepen the sport, build a real savings rhythm.',
    metric_text: 'A concrete savings figure banked (illustrative: 40,000–60,000 DKK). At least one sport milestone reached.',
    checklist: [
      'Choose Production and Project Management specialization courses deliberately, steering toward AI-augmented project management',
      'Push for a first rugby match, or a first grading/sparring milestone',
      "If the job isn't well-aligned with PM, energy, or sustainability, start actively moving toward one that is",
      'Move into the shared apartment with Diogo; settle utilities, transfer address, confirm the new commute',
      'Target saving roughly 40–50% of net income from this point on',
    ],
  },
  {
    phase_number: 4,
    title: 'Summer 2027',
    start_date: '2027-07-01',
    end_date: '2027-08-31',
    goal_text: 'Work full-time hours (no EU cap applies), save aggressively, reassess trajectory.',
    metric_text: 'Highest single-month income of the whole 24 months. A clear thesis-track decision made.',
    checklist: [
      'Convert to full-time hours at the current job, or take a full-time summer role elsewhere',
      'Honestly reassess: is this the company for a thesis and graduate offer?',
      "Keep training through summer if the club runs a summer programme",
    ],
  },
  {
    phase_number: 5,
    title: 'Semester 3',
    start_date: '2027-08-01',
    end_date: '2028-01-31',
    goal_text: 'Lock the thesis topic, push the career forward, start basic Danish.',
    metric_text: 'Thesis topic and supervisor confirmed. Basic conversational Danish underway.',
    checklist: [
      'Confirm the thesis topic and supervisor by end of September 2027 — AI in project management is a strong candidate',
      'Start basic Danish (A1/A2)',
      'Push for more responsibility at work, or move on deliberately if plateaued',
    ],
  },
  {
    phase_number: 6,
    title: 'Semester 4 / Thesis',
    start_date: '2028-02-01',
    end_date: '2028-07-31',
    goal_text: 'Execute the thesis, secure what comes after graduation.',
    metric_text: 'Thesis submitted on time. At least one concrete post-graduation offer or advanced interview by graduation.',
    checklist: [
      'Aim for a company-collaboration thesis where possible',
      'Start the post-graduation job search in February or March 2028, not after submitting the thesis',
      'Aim for a full first season in the sport — a tournament, a cap, a grading',
    ],
  },
  {
    phase_number: 7,
    title: 'Graduation Decision Point',
    start_date: '2028-07-01',
    end_date: '2028-08-31',
    goal_text: 'Decide, deliberately and with real numbers, whether to stay in Denmark or return to Portugal.',
    metric_text: 'This is the decision point itself — not a task to complete.',
    checklist: [
      'Compare an actual Danish graduate salary and cost of living against a Portuguese one (Novo Nordisk Porto Salvo is a direct comparison point)',
      'Measure both against your own bar for "comfortable enough to buy a house" — with real numbers, not a feeling',
    ],
  },
];

export const DEFAULT_HABITS = [
  'Job applications sent',
  'Training / sport session',
  'Danish practice',
  'Study hours',
  'Sleep quality check-in',
];

export const DEFAULT_APPLICATIONS: {
  company: string;
  role: string;
  status: ApplicationStatus;
}[] = [
  { company: 'Maersk', role: 'Student Assistant, Customer Success', status: 'Applied' },
  { company: 'Novo Nordisk', role: 'Student Worker (342936)', status: 'Applied' },
  { company: 'EY', role: 'Technology Consulting Junior Consultant', status: 'Assessment' },
  { company: 'Salomon', role: 'Retail Sales Assistant', status: 'Rejected' },
  { company: 'COWI', role: 'Student Assistant, Payroll & People Master Data', status: 'Applied' },
  { company: 'NNE', role: 'Student Assistant, Engineering Data', status: 'Applied' },
  { company: 'Novo Nordisk', role: 'Student Assistant, PM & Communication (FPMSAT)', status: 'Applied' },
  { company: 'Nilfisk', role: 'Student Assistant, Global Sustainability & ESG', status: 'Applied' },
  { company: 'Green Therma', role: 'Engineering Student Assistant', status: 'Applied' },
];

/** The two fixed weekly anchors from the plan — everything else the user fills in once their DTU timetable is out. */
export const DEFAULT_SCHEDULE_BLOCKS: {
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  category: ScheduleCategory;
}[] = [
  { day_of_week: 0, start_time: '18:00', end_time: '20:00', title: 'Batch cooking', category: 'Cooking' },
  { day_of_week: 1, start_time: '08:00', end_time: '18:00', title: 'Long class day', category: 'Class' },
];

/** Illustrative planning bands from the 24-month plan — shown as a reference range on the finance chart. */
export const FINANCE_MODEL_BANDS = [
  { label: 'Aug–Sep 2026', low: 0, high: 0 },
  { label: 'Oct 2026–Jan 2027', low: 6800, high: 9450 },
  { label: 'Feb–Jun 2027', low: 9450, high: 12600 },
  { label: 'Summer 2027', low: 12600, high: 16000 },
  { label: 'Aug 2027–Jun 2028', low: 10000, high: 13000 },
];

/** Starting exchange rates — approximate, the user updates these to current rates from the Expenses tab. */
export const DEFAULT_EXCHANGE_RATES: { currency: Exclude<Currency, 'DKK'>; rate_to_dkk: number }[] = [
  { currency: 'EUR', rate_to_dkk: 7.46 },
  { currency: 'USD', rate_to_dkk: 6.9 },
  { currency: 'GBP', rate_to_dkk: 8.7 },
  { currency: 'SEK', rate_to_dkk: 0.66 },
];

/** A starter palette so the calendar isn't an empty legend on first load — freely rename, recolor, or delete. */
export const DEFAULT_CALENDAR_CATEGORIES: { name: string; color: string }[] = [
  { name: 'Great day', color: '#5f8863' },
  { name: 'Tough day', color: '#b4622e' },
  { name: 'Travel', color: '#2d6e7e' },
  { name: 'Deadline', color: '#c9974f' },
];

export const DEFAULT_LIFE_GOALS: {
  domain: LifeGoalDomain;
  dream: string;
  measurable_target: string;
  daily_system: string;
  next_checkpoint: string;
  next_checkpoint_date: string;
  status: LifeGoalStatus;
}[] = [
  {
    domain: 'Financial',
    dream: 'Own a home in Portugal near Oeiras',
    measurable_target: 'Save 80,000 DKK in 24 months',
    daily_system: '40-50% savings rate from Phase 3 onward',
    next_checkpoint: '10,000 DKK by Jan 2027',
    next_checkpoint_date: '2027-01-31',
    status: 'Active',
  },
  {
    domain: 'Physical',
    dream: 'Be genuinely fit and competitive in a team sport',
    measurable_target: 'Play 10 competitive rugby matches or earn a martial arts grading by Aug 2028',
    daily_system: 'Train twice a week minimum, every week',
    next_checkpoint: 'First match or first grading by June 2027',
    next_checkpoint_date: '2027-06-30',
    status: 'Active',
  },
  {
    domain: 'Career',
    dream: 'Work as a PM or strategic lead on projects that matter, from Denmark or Portugal',
    measurable_target: 'Graduate with a company-collaboration thesis and one post-grad offer in hand',
    daily_system: 'Apply for 2 new relevant roles every month from Feb 2028',
    next_checkpoint: 'Thesis topic confirmed with supervisor by Sept 2027',
    next_checkpoint_date: '2027-09-30',
    status: 'Active',
  },
];
