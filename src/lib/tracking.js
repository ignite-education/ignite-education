import { supabase } from './supabase';

/**
 * Track a page visit with geo location from Vercel headers.
 * Deduplicates: skips if same user+page visited within the last 5 minutes.
 */
export async function trackPageVisit(userId, page) {
  try {
    // Deduplicate: check for recent visit
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('user_visits')
      .select('id')
      .eq('user_id', userId)
      .eq('page', page)
      .gte('visited_at', fiveMinutesAgo)
      .limit(1);

    if (recent && recent.length > 0) return;

    // Fetch geo data from Vercel edge
    let country = null;
    let region = null;
    try {
      const res = await fetch('/api/geo');
      if (res.ok) {
        const geo = await res.json();
        country = geo.country;
        region = geo.region;
      }
    } catch {
      // Geo fetch failed (e.g. localhost) — still record the visit
    }

    await supabase.from('user_visits').insert({
      user_id: userId,
      page,
      country,
      region,
    });
  } catch {
    // Tracking should never break the app
  }
}
