import { supabase } from './supabase';
import {
  PHASE_SEED,
  DEFAULT_HABITS,
  DEFAULT_APPLICATIONS,
  DEFAULT_SCHEDULE_BLOCKS,
  DEFAULT_EXCHANGE_RATES,
  DEFAULT_LIFE_GOALS,
  DEFAULT_CALENDAR_CATEGORIES,
} from './seedData';

/**
 * Runs once per new user (checked by row count, not a flag) to populate
 * the app with the 24-month plan's own phases, checklists, starter habits,
 * and known job applications — so the dashboard is useful from minute one
 * instead of opening to an empty shell.
 */
export async function seedIfEmpty(userId: string) {
  const { count: phaseCount } = await supabase
    .from('phases')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!phaseCount) {
    for (const phase of PHASE_SEED) {
      const { data: insertedPhase, error } = await supabase
        .from('phases')
        .insert({
          user_id: userId,
          phase_number: phase.phase_number,
          title: phase.title,
          start_date: phase.start_date,
          end_date: phase.end_date,
          goal_text: phase.goal_text,
          metric_text: phase.metric_text,
        })
        .select()
        .single();

      if (error || !insertedPhase) continue;

      const items = phase.checklist.map((text, position) => ({
        user_id: userId,
        phase_id: insertedPhase.id,
        position,
        text,
        is_done: false,
      }));
      await supabase.from('checklist_items').insert(items);
    }
  }

  const { count: habitCount } = await supabase
    .from('habits')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!habitCount) {
    const habits = DEFAULT_HABITS.map((name, position) => ({
      user_id: userId,
      name,
      is_active: true,
      position,
    }));
    await supabase.from('habits').insert(habits);
  }

  const { count: applicationCount } = await supabase
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!applicationCount) {
    const applications = DEFAULT_APPLICATIONS.map((app) => ({
      user_id: userId,
      company: app.company,
      role: app.role,
      status: app.status,
      deadline_date: null,
      notes: null,
    }));
    await supabase.from('applications').insert(applications);
  }

  const { count: scheduleCount } = await supabase
    .from('schedule_blocks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!scheduleCount) {
    const blocks = DEFAULT_SCHEDULE_BLOCKS.map((block) => ({ ...block, user_id: userId }));
    await supabase.from('schedule_blocks').insert(blocks);
  }

  const { count: rateCount } = await supabase
    .from('exchange_rates')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!rateCount) {
    const rates = DEFAULT_EXCHANGE_RATES.map((rate) => ({ ...rate, user_id: userId }));
    await supabase.from('exchange_rates').insert(rates);
  }

  const { count: lifeGoalCount } = await supabase
    .from('life_goals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!lifeGoalCount) {
    const goals = DEFAULT_LIFE_GOALS.map((goal) => ({ ...goal, user_id: userId, progress_pct: 0 }));
    await supabase.from('life_goals').insert(goals);
  }

  const { count: calendarCategoryCount } = await supabase
    .from('calendar_categories')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (!calendarCategoryCount) {
    const categories = DEFAULT_CALENDAR_CATEGORIES.map((c) => ({ ...c, user_id: userId }));
    await supabase.from('calendar_categories').insert(categories);
  }
}
