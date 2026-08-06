import { supabase } from './supabase';

/**
 * Headline user counts.
 *
 * The growth figures are counts of new signups, not rates. An earlier version
 * computed percentage change and then discarded it, returning the count under
 * the same key — so the UI rendered "3 new users" as "+3.0%". At this scale a
 * percentage swings ±100% on a single signup, so the count is the honest
 * number and the labels say "New this week" rather than "Weekly growth".
 *
 * No timeRange parameter: every window here is fixed at 7 or 30 days, so the
 * argument the old signature took never did anything.
 */
export async function getUserAnalytics() {
  try {
    const { count: total } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { count: newThisWeek } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const { count: newThisMonth } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());

    return {
      total: total || 0,
      newThisWeek: newThisWeek || 0,
      newThisMonth: newThisMonth || 0,
    };
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return { total: 0, newThisWeek: 0, newThisMonth: 0 };
  }
}

/**
 * Active users, defined as distinct user_ids that completed a lesson in the
 * window. There is no session tracking, so this is not time-on-site — the tiles
 * that render these say so. An avgSessionDuration used to be returned here as a
 * hardcoded 1800 seconds; it was never a measurement.
 */
export async function getEngagementMetrics() {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: dailyCompletions } = await supabase
      .from('lesson_completions')
      .select('user_id')
      .gte('completed_at', oneDayAgo.toISOString());

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyCompletions } = await supabase
      .from('lesson_completions')
      .select('user_id')
      .gte('completed_at', thirtyDaysAgo.toISOString());

    return {
      dailyActive: new Set(dailyCompletions?.map((c) => c.user_id) || []).size,
      monthlyActive: new Set(monthlyCompletions?.map((c) => c.user_id) || []).size,
    };
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    return { dailyActive: 0, monthlyActive: 0 };
  }
}
