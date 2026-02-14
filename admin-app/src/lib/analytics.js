import { supabase } from './supabase';

/**
 * Get user analytics data
 */
export async function getUserAnalytics(timeRange = '30') {
  try {
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Users created in time range
    const { data: recentUsers } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    // Weekly growth (last 7 days vs previous 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const { count: lastWeekUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString());

    const { count: previousWeekUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', weekAgo.toISOString());

    const weeklyGrowth = previousWeekUsers > 0
      ? ((lastWeekUsers - previousWeekUsers) / previousWeekUsers) * 100
      : 0;

    // Monthly growth
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

    const { count: lastMonthUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString());

    const { count: previousMonthUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', monthAgo.toISOString());

    const monthlyGrowth = previousMonthUsers > 0
      ? ((lastMonthUsers - previousMonthUsers) / previousMonthUsers) * 100
      : 0;

    // Average time spent (mock for now - would need session tracking)
    const avgTimeSpent = 1200; // 20 minutes in seconds

    // Forum posts (if you have a forum table)
    const forumPosts = 0; // Placeholder

    return {
      total: totalUsers || 0,
      weeklyGrowth: lastWeekUsers || 0,
      monthlyGrowth: lastMonthUsers || 0,
      avgTimeSpent,
      forumPosts
    };
  } catch (error) {
    console.error('Error fetching user analytics:', error);
    return {
      total: 0,
      weeklyGrowth: 0,
      monthlyGrowth: 0,
      avgTimeSpent: 0,
      forumPosts: 0
    };
  }
}

/**
 * Get course analytics data
 */
export async function getCourseAnalytics(timeRange = '30') {
  try {
    // Get all courses
    const { data: courses } = await supabase
      .from('courses')
      .select('id, name');

    const enrollments = [];

    for (const course of courses || []) {
      // Get user progress for this course
      const { data: progress } = await supabase
        .from('user_progress')
        .select('*')
        .eq('course_id', course.id);

      // Get lesson completions
      const { data: completions } = await supabase
        .from('lesson_completions')
        .select('*')
        .eq('course_id', course.id);

      // Get knowledge check results for average score
      const { data: scores } = await supabase
        .from('knowledge_check_results')
        .select('score, total_questions')
        .eq('course_id', course.id);

      const avgScore = scores && scores.length > 0
        ? (scores.reduce((sum, s) => sum + (s.score / s.total_questions * 100), 0) / scores.length)
        : 0;

      // Count active users (those who have started but not completed)
      const activeCount = progress ? progress.filter(p => {
        const userCompletions = completions?.filter(c => c.user_id === p.user_id) || [];
        return userCompletions.length > 0 && userCompletions.length < 50; // Not completed all
      }).length : 0;

      // Count completed users
      const completedCount = 0; // Would need completion tracking

      enrollments.push({
        name: course.name,
        enrollments: progress?.length || 0,
        active: activeCount,
        completed: completedCount,
        avgScore: Math.round(avgScore)
      });
    }

    // Calculate overall completion rate
    const totalEnrolled = enrollments.reduce((sum, e) => sum + e.enrollments, 0);
    const totalCompleted = enrollments.reduce((sum, e) => sum + e.completed, 0);
    const completionRate = totalEnrolled > 0 ? (totalCompleted / totalEnrolled * 100) : 0;

    // Get average scores by lesson
    const { data: lessonScores } = await supabase
      .from('knowledge_check_results')
      .select('course_id, module_number, lesson_number, score, total_questions');

    const lessonAverages = [];
    if (lessonScores) {
      const grouped = lessonScores.reduce((acc, score) => {
        const key = `${score.course_id}-${score.module_number}-${score.lesson_number}`;
        if (!acc[key]) {
          acc[key] = {
            courseId: score.course_id,
            module: score.module_number,
            lesson: score.lesson_number,
            scores: []
          };
        }
        acc[key].scores.push((score.score / score.total_questions) * 100);
        return acc;
      }, {});

      for (const key in grouped) {
        const item = grouped[key];
        const avg = item.scores.reduce((sum, s) => sum + s, 0) / item.scores.length;
        lessonAverages.push({
          name: `Module ${item.module}, Lesson ${item.lesson}`,
          module: item.module,
          lesson: item.lesson,
          score: Math.round(avg)
        });
      }

      // Sort by score descending
      lessonAverages.sort((a, b) => b.score - a.score);
    }

    return {
      enrollments,
      scores: lessonAverages,
      completionRate
    };
  } catch (error) {
    console.error('Error fetching course analytics:', error);
    return {
      enrollments: [],
      scores: [],
      completionRate: 0
    };
  }
}

/**
 * Get lesson rating analytics
 */
export async function getLessonRatingAnalytics(timeRange = '30') {
  try {
    // Get all lesson ratings
    const { data: ratings } = await supabase
      .from('lesson_ratings')
      .select('course_id, module_number, lesson_number, rating');

    if (!ratings || ratings.length === 0) {
      return {
        ratings: [],
        overallSatisfaction: 0
      };
    }

    // Group by lesson
    const grouped = ratings.reduce((acc, rating) => {
      const key = `${rating.course_id}-${rating.module_number}-${rating.lesson_number}`;
      if (!acc[key]) {
        acc[key] = {
          courseId: rating.course_id,
          module: rating.module_number,
          lesson: rating.lesson_number,
          thumbsUp: 0,
          thumbsDown: 0,
          total: 0
        };
      }
      if (rating.rating) {
        acc[key].thumbsUp++;
      } else {
        acc[key].thumbsDown++;
      }
      acc[key].total++;
      return acc;
    }, {});

    const lessonRatings = Object.values(grouped).map(item => ({
      name: `Module ${item.module}, Lesson ${item.lesson}`,
      module: item.module,
      lesson: item.lesson,
      thumbsUp: item.thumbsUp,
      thumbsDown: item.thumbsDown,
      total: item.total
    }));

    // Calculate overall satisfaction
    const totalThumbsUp = lessonRatings.reduce((sum, l) => sum + l.thumbsUp, 0);
    const totalRatings = lessonRatings.reduce((sum, l) => sum + l.total, 0);
    const overallSatisfaction = totalRatings > 0 ? (totalThumbsUp / totalRatings * 100) : 0;

    return {
      ratings: lessonRatings,
      overallSatisfaction
    };
  } catch (error) {
    console.error('Error fetching lesson rating analytics:', error);
    return {
      ratings: [],
      overallSatisfaction: 0
    };
  }
}

/**
 * Get engagement metrics
 */
export async function getEngagementMetrics(timeRange = '30') {
  try {
    const daysAgo = parseInt(timeRange);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Daily active users (users with completions in last 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: dailyCompletions } = await supabase
      .from('lesson_completions')
      .select('user_id')
      .gte('completed_at', oneDayAgo.toISOString());

    const dailyActive = new Set(dailyCompletions?.map(c => c.user_id) || []).size;

    // Monthly active users
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: monthlyCompletions } = await supabase
      .from('lesson_completions')
      .select('user_id')
      .gte('completed_at', thirtyDaysAgo.toISOString());

    const monthlyActive = new Set(monthlyCompletions?.map(c => c.user_id) || []).size;

    // Average session duration (mock for now)
    const avgSessionDuration = 1800; // 30 minutes in seconds

    return {
      dailyActive,
      monthlyActive,
      avgSessionDuration
    };
  } catch (error) {
    console.error('Error fetching engagement metrics:', error);
    return {
      dailyActive: 0,
      monthlyActive: 0,
      avgSessionDuration: 0
    };
  }
}

/**
 * Get retention metrics
 */
export async function getRetentionMetrics(timeRange = '30') {
  try {
    // Get users from previous month
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const { data: previousMonthUsers } = await supabase
      .from('users')
      .select('id')
      .gte('created_at', twoMonthsAgo.toISOString())
      .lt('created_at', oneMonthAgo.toISOString());

    if (!previousMonthUsers || previousMonthUsers.length === 0) {
      return {
        retentionRate: 0,
        churnRate: 0
      };
    }

    // Check how many of those users are still active
    const { data: activeUsers } = await supabase
      .from('lesson_completions')
      .select('user_id')
      .in('user_id', previousMonthUsers.map(u => u.id))
      .gte('completed_at', oneMonthAgo.toISOString());

    const retainedCount = new Set(activeUsers?.map(c => c.user_id) || []).size;
    const retentionRate = (retainedCount / previousMonthUsers.length) * 100;
    const churnRate = 100 - retentionRate;

    return {
      retentionRate,
      churnRate
    };
  } catch (error) {
    console.error('Error fetching retention metrics:', error);
    return {
      retentionRate: 0,
      churnRate: 0
    };
  }
}
