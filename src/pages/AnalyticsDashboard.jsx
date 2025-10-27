import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  MessageSquare,
  BookOpen,
  Award,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Calendar,
  Target,
  ArrowLeft,
  Shield,
  GraduationCap,
  UserCircle,
  Trash2,
  Edit3,
  Plus,
  X
} from 'lucide-react';
import {
  getUserAnalytics,
  getCourseAnalytics,
  getLessonRatingAnalytics,
  getEngagementMetrics,
  getRetentionMetrics
} from '../lib/analytics';
import { getAllUsers, updateUserRole, deleteUser, updateUserCourse, getCourseRequestAnalytics } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';

const AnalyticsDashboard = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days

  // Available courses
  const courses = [
    'Product Manager',
    'Software Engineering',
    'Data Science',
    'UX Design',
    'Digital Marketing',
    'Business Analytics'
  ];

  // User metrics
  const [totalUsers, setTotalUsers] = useState(0);
  const [weeklyGrowth, setWeeklyGrowth] = useState(0);
  const [monthlyGrowth, setMonthlyGrowth] = useState(0);
  const [avgTimeSpent, setAvgTimeSpent] = useState(0);
  const [forumPosts, setForumPosts] = useState(0);

  // Course metrics
  const [courseEnrollments, setCourseEnrollments] = useState([]);
  const [averageScores, setAverageScores] = useState([]);
  const [completionRate, setCompletionRate] = useState(0);

  // Satisfaction metrics
  const [lessonRatings, setLessonRatings] = useState([]);
  const [overallSatisfaction, setOverallSatisfaction] = useState(0);

  // Engagement metrics
  const [activeUsers, setActiveUsers] = useState(0);
  const [dailyActiveUsers, setDailyActiveUsers] = useState(0);
  const [averageSessionDuration, setAverageSessionDuration] = useState(0);

  // Retention metrics
  const [retentionRate, setRetentionRate] = useState(0);
  const [churnRate, setChurnRate] = useState(0);

  // User management
  const [allUsers, setAllUsers] = useState([]);
  const [userFilter, setUserFilter] = useState('all'); // all, student, teacher, admin
  const [updatingUserId, setUpdatingUserId] = useState(null);

  // Course requests
  const [courseRequests, setCourseRequests] = useState([]);

  // Courses management
  const [managedCourses, setManagedCourses] = useState([]);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseEditForm, setCourseEditForm] = useState({});

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  useEffect(() => {
    loadUsers();
    loadCourseRequests();
    loadManagedCourses();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Load all analytics data
      const [
        userAnalytics,
        courseAnalytics,
        ratingAnalytics,
        engagementMetrics,
        retentionMetrics
      ] = await Promise.all([
        getUserAnalytics(timeRange),
        getCourseAnalytics(timeRange),
        getLessonRatingAnalytics(timeRange),
        getEngagementMetrics(timeRange),
        getRetentionMetrics(timeRange)
      ]);

      // Set user metrics
      setTotalUsers(userAnalytics.total);
      setWeeklyGrowth(userAnalytics.weeklyGrowth);
      setMonthlyGrowth(userAnalytics.monthlyGrowth);
      setAvgTimeSpent(userAnalytics.avgTimeSpent);
      setForumPosts(userAnalytics.forumPosts);

      // Set course metrics
      setCourseEnrollments(courseAnalytics.enrollments);
      setAverageScores(courseAnalytics.scores);
      setCompletionRate(courseAnalytics.completionRate);

      // Set satisfaction metrics
      setLessonRatings(ratingAnalytics.ratings);
      setOverallSatisfaction(ratingAnalytics.overallSatisfaction);

      // Set engagement metrics
      setActiveUsers(engagementMetrics.monthlyActive);
      setDailyActiveUsers(engagementMetrics.dailyActive);
      setAverageSessionDuration(engagementMetrics.avgSessionDuration);

      // Set retention metrics
      setRetentionRate(retentionMetrics.retentionRate);
      setChurnRate(retentionMetrics.churnRate);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users || []);
    } catch (error) {
      console.error('Error loading users:', error);
      setAllUsers([]);
    }
  };

  const loadCourseRequests = async () => {
    try {
      const requests = await getCourseRequestAnalytics();
      setCourseRequests(requests || []);
    } catch (error) {
      console.error('Error loading course requests:', error);
      setCourseRequests([]);
    }
  };

  const loadManagedCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setManagedCourses(data || []);
    } catch (error) {
      console.error('Error loading courses:', error);
      setManagedCourses([]);
    }
  };

  const handleCourseStatusChange = async (courseId, newStatus) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) throw error;

      setManagedCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, status: newStatus } : c)
      );
    } catch (error) {
      console.error('Error updating course status:', error);
      alert('Failed to update course status');
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course.id);
    setCourseEditForm({
      title: course.title,
      modules: course.modules,
      lessons: course.lessons,
      description: course.description
    });
  };

  const handleSaveCourse = async (courseId) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          ...courseEditForm,
          name: courseEditForm.title, // Also update name for compatibility
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) throw error;

      setManagedCourses(prev =>
        prev.map(c => c.id === courseId ? { ...c, ...courseEditForm } : c)
      );
      setEditingCourse(null);
      setCourseEditForm({});
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course');
    }
  };

  const handleDeleteCourse = async (courseId, courseName) => {
    if (!confirm(`Are you sure you want to delete "${courseName}"?`)) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      setManagedCourses(prev => prev.filter(c => c.id !== courseId));
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingUserId(userId);
    try {
      await updateUserRole(userId, newRole);
      // Update local state
      setAllUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${userName}? This will completely remove them from both the authentication system and database. This action cannot be undone.`
    );

    if (!confirmed) return;

    setUpdatingUserId(userId);
    try {
      const result = await deleteUser(userId);
      // Remove from local state
      setAllUsers(prev => prev.filter(user => user.id !== userId));
      alert(`${userName} has been completely deleted from the system.`);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(`Failed to delete user: ${error.message}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCourseChange = async (userId, newCourse) => {
    setUpdatingUserId(userId);
    try {
      await updateUserCourse(userId, newCourse);
      // Update local state
      setAllUsers(prev =>
        prev.map(user =>
          user.id === userId ? { ...user, enrolled_course: newCourse } : user
        )
      );
    } catch (error) {
      console.error('Error updating user course:', error);
      alert('Failed to update user course. Please try again.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return Shield;
      case 'teacher': return GraduationCap;
      case 'student': return UserCircle;
      default: return UserCircle;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-purple-400 bg-purple-900/30';
      case 'teacher': return 'text-blue-400 bg-blue-900/30';
      case 'student': return 'text-gray-400 bg-gray-800';
      default: return 'text-gray-400 bg-gray-800';
    }
  };

  const filteredUsers = allUsers.filter(user => {
    if (userFilter === 'all') return true;
    return user.role === userFilter;
  });

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const MetricCard = ({ icon: Icon, title, value, subtitle, trend, trendValue }) => (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-900/30 rounded-lg">
            <Icon className="text-purple-400" size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            <span className="text-sm font-medium">{trendValue}</span>
          </div>
        )}
      </div>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white" style={{ fontFamily: 'Geist, -apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <header className="px-12 flex-shrink-0 border-b border-gray-800" style={{ paddingTop: '1.5rem', paddingBottom: '1.575rem' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-900 rounded-lg transition text-white"
            >
              <ArrowLeft size={20} />
            </button>
            <div
              style={{
                backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)',
                backgroundSize: 'contain',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'left center',
                width: '108.8px',
                height: '36px',
                marginLeft: '-5.44px'
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white"
            >
              <option value="7" className="bg-gray-900 text-white">Last 7 days</option>
              <option value="30" className="bg-gray-900 text-white">Last 30 days</option>
              <option value="90" className="bg-gray-900 text-white">Last 90 days</option>
              <option value="365" className="bg-gray-900 text-white">Last year</option>
            </select>
            <button
              onClick={loadAnalytics}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm font-semibold"
            >
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-12 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Page Title */}
            <div>
              <h1 className="font-semibold mb-2" style={{ fontSize: '36px' }}>
                Analytics <span className="text-pink-500">Dashboard</span>
              </h1>
              <p className="text-white" style={{ letterSpacing: '0.011em', fontSize: '14px', fontWeight: '100' }}>
                Monitor platform performance and user engagement
              </p>
            </div>

            {/* User Metrics */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontSize: '27px', letterSpacing: '0.011em' }}>
                <Users size={24} className="text-pink-500" />
                User Metrics
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  icon={Users}
                  title="Total Users"
                  value={totalUsers.toLocaleString()}
                  subtitle="All registered users"
                />
                <MetricCard
                  icon={TrendingUp}
                  title="Weekly Growth"
                  value={weeklyGrowth}
                  trend={weeklyGrowth >= 0 ? 'up' : 'down'}
                  trendValue={formatPercentage(weeklyGrowth)}
                  subtitle="New users this week"
                />
                <MetricCard
                  icon={Calendar}
                  title="Monthly Growth"
                  value={monthlyGrowth}
                  trend={monthlyGrowth >= 0 ? 'up' : 'down'}
                  trendValue={formatPercentage(monthlyGrowth)}
                  subtitle="New users this month"
                />
                <MetricCard
                  icon={Clock}
                  title="Avg. Time Spent"
                  value={formatDuration(avgTimeSpent)}
                  subtitle="Per user session"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <MetricCard
                  icon={MessageSquare}
                  title="Forum Posts"
                  value={forumPosts.toLocaleString()}
                  subtitle="Community engagement"
                />
                <MetricCard
                  icon={Activity}
                  title="Daily Active Users"
                  value={dailyActiveUsers.toLocaleString()}
                  subtitle="Active in last 24h"
                />
                <MetricCard
                  icon={Users}
                  title="Monthly Active Users"
                  value={activeUsers.toLocaleString()}
                  subtitle="Active in last 30 days"
                />
              </div>
            </section>

            {/* Course Metrics */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontSize: '27px', letterSpacing: '0.011em' }}>
                <BookOpen size={24} className="text-pink-500" />
                Course Performance
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <MetricCard
                  icon={Target}
                  title="Completion Rate"
                  value={`${completionRate.toFixed(1)}%`}
                  subtitle="Users completing courses"
                />
                <MetricCard
                  icon={Award}
                  title="Avg. Session Duration"
                  value={formatDuration(averageSessionDuration)}
                  subtitle="Time per learning session"
                />
              </div>

              {/* Course Enrollments Table */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="font-semibold text-white">Course Enrollments</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Enrollments</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Active</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Completed</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Avg. Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {courseEnrollments.map((course, idx) => (
                        <tr key={idx} className="hover:bg-gray-800/50">
                          <td className="px-6 py-4 text-sm font-medium text-white">{course.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{course.enrollments}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{course.active}</td>
                          <td className="px-6 py-4 text-sm text-gray-300">{course.completed}</td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded ${
                              course.avgScore >= 80 ? 'bg-green-900/30 text-green-400' :
                              course.avgScore >= 60 ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-red-900/30 text-red-400'
                            }`}>
                              {course.avgScore}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Average Scores by Lesson */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 mt-4">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="font-semibold text-white">Top Performing Lessons</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {averageScores.slice(0, 5).map((lesson, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{lesson.name}</p>
                          <p className="text-xs text-gray-500">Module {lesson.module}, Lesson {lesson.lesson}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${lesson.score}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right text-white">{lesson.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* User Satisfaction */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontSize: '27px', letterSpacing: '0.011em' }}>
                <ThumbsUp size={24} className="text-pink-500" />
                User Satisfaction
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <MetricCard
                  icon={ThumbsUp}
                  title="Overall Satisfaction"
                  value={`${overallSatisfaction.toFixed(1)}%`}
                  subtitle="Positive ratings"
                />
                <MetricCard
                  icon={Target}
                  title="Total Ratings"
                  value={lessonRatings.reduce((sum, l) => sum + l.total, 0).toLocaleString()}
                  subtitle="All lesson feedback"
                />
              </div>

              {/* Lesson Ratings Table */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h3 className="font-semibold text-white">Lesson Ratings</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Lesson</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Thumbs Up</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Thumbs Down</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Satisfaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {lessonRatings.map((lesson, idx) => {
                        const satisfaction = (lesson.thumbsUp / lesson.total * 100) || 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-800/50">
                            <td className="px-6 py-4 text-sm font-medium">
                              <div>
                                <div className="text-white">{lesson.name}</div>
                                <div className="text-xs text-gray-500">
                                  Module {lesson.module}, Lesson {lesson.lesson}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="flex items-center gap-1 text-green-400">
                                <ThumbsUp size={14} />
                                {lesson.thumbsUp}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <span className="flex items-center gap-1 text-red-400">
                                <ThumbsDown size={14} />
                                {lesson.thumbsDown}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-300">{lesson.total}</td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-gray-700 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      satisfaction >= 80 ? 'bg-green-500' :
                                      satisfaction >= 60 ? 'bg-yellow-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${satisfaction}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs font-medium text-white">{satisfaction.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Retention Metrics */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontSize: '27px', letterSpacing: '0.011em' }}>
                <Activity size={24} className="text-pink-500" />
                Retention & Engagement
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  icon={Target}
                  title="Retention Rate"
                  value={`${retentionRate.toFixed(1)}%`}
                  subtitle="Users returning monthly"
                  trend={retentionRate >= 50 ? 'up' : 'down'}
                  trendValue={retentionRate >= 50 ? 'Good' : 'Needs attention'}
                />
                <MetricCard
                  icon={TrendingDown}
                  title="Churn Rate"
                  value={`${churnRate.toFixed(1)}%`}
                  subtitle="Users leaving monthly"
                  trend={churnRate <= 10 ? 'up' : 'down'}
                  trendValue={churnRate <= 10 ? 'Low' : 'High'}
                />
              </div>
            </section>

            {/* User Management */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontSize: '27px', letterSpacing: '0.011em' }}>
                <Shield size={24} className="text-pink-500" />
                User Management
              </h2>

              {/* Role Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-purple-900/20 rounded-lg p-4 border border-purple-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-900/40 rounded-lg">
                      <Shield className="text-purple-400" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-purple-400 font-medium">Admins</p>
                      <p className="text-2xl font-bold text-white">
                        {allUsers.filter(u => u.role === 'admin').length}
                      </p>
                      <p className="text-xs text-purple-400">Full access</p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-900/40 rounded-lg">
                      <GraduationCap className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-blue-400 font-medium">Teachers</p>
                      <p className="text-2xl font-bold text-white">
                        {allUsers.filter(u => u.role === 'teacher').length}
                      </p>
                      <p className="text-xs text-blue-400">Learning + Curriculum</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-700 rounded-lg">
                      <UserCircle className="text-gray-400" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-medium">Students</p>
                      <p className="text-2xl font-bold text-white">
                        {allUsers.filter(u => u.role === 'student').length}
                      </p>
                      <p className="text-xs text-gray-400">Learning only</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User List */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white">All Users ({filteredUsers.length})</h3>
                  <div className="flex gap-2">
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                    >
                      <option value="all" className="bg-gray-900 text-white">All Roles</option>
                      <option value="admin" className="bg-gray-900 text-white">Admins</option>
                      <option value="teacher" className="bg-gray-900 text-white">Teachers</option>
                      <option value="student" className="bg-gray-900 text-white">Students</option>
                    </select>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Current Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Enrolled Course</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Joined</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Change Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center text-gray-400">
                            No users found
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const RoleIcon = getRoleIcon(user.role);
                          const isUpdating = updatingUserId === user.id;
                          const isCurrentUser = authUser?.id === user.id;
                          return (
                            <tr key={user.id} className={`hover:bg-gray-800/50 ${isCurrentUser ? 'bg-pink-900/10 border-l-4 border-pink-500' : ''}`}>
                              <td className="px-6 py-4 text-sm font-medium text-white">
                                <div className="flex items-center gap-2">
                                  {user.first_name} {user.last_name}
                                  {isCurrentUser && (
                                    <span className="px-2 py-0.5 bg-pink-500 text-white text-xs font-semibold rounded">
                                      You
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {user.email || 'No email'}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                                  <RoleIcon size={14} />
                                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <select
                                  value={user.enrolled_course || ''}
                                  onChange={(e) => handleCourseChange(user.id, e.target.value)}
                                  disabled={isUpdating}
                                  className={`px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white ${
                                    isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                >
                                  <option value="" className="bg-gray-900 text-white">No course</option>
                                  {courses.map(course => (
                                    <option key={course} value={course} className="bg-gray-900 text-white">{course}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-400">
                                {new Date(user.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <select
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                  disabled={isUpdating}
                                  className={`px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white ${
                                    isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                  }`}
                                >
                                  <option value="student" className="bg-gray-900 text-white">Student</option>
                                  <option value="teacher" className="bg-gray-900 text-white">Teacher</option>
                                  <option value="admin" className="bg-gray-900 text-white">Admin</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <button
                                  onClick={() => handleDeleteUser(user.id, `${user.first_name} ${user.last_name}`)}
                                  disabled={isUpdating}
                                  className={`p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition ${
                                    isUpdating ? 'opacity-50 cursor-not-allowed' : ''
                                  }`}
                                  title="Delete user"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Role Permissions Info */}
              <div className="mt-4 bg-gray-800 border border-gray-700 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2 text-sm">Role Permissions:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="flex items-start gap-2">
                    <UserCircle size={16} className="text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-300">Student</p>
                      <p className="text-gray-500">Learning Hub, Progress tracking</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <GraduationCap size={16} className="text-blue-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-300">Teacher</p>
                      <p className="text-blue-500">Student access + Curriculum Upload</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Shield size={16} className="text-purple-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-purple-300">Admin</p>
                      <p className="text-purple-500">Teacher access + Analytics Dashboard</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Courses Management Section */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontSize: '27px', letterSpacing: '0.011em' }}>
                <BookOpen size={24} className="text-pink-500" />
                Courses Management
              </h2>
              <p className="text-gray-400 mb-6 text-sm">
                Manage course availability, details, and content
              </p>

              {/* Course Status Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-900/20 rounded-lg p-4 border border-green-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-900/40 rounded-lg">
                      <BookOpen className="text-green-400" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-green-400 font-medium">Available</p>
                      <p className="text-2xl font-bold text-white">
                        {managedCourses.filter(c => c.status === 'live').length}
                      </p>
                      <p className="text-xs text-green-400">Live courses</p>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-900/40 rounded-lg">
                      <Clock className="text-blue-400" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-blue-400 font-medium">Coming Soon</p>
                      <p className="text-2xl font-bold text-white">
                        {managedCourses.filter(c => c.status === 'coming_soon').length}
                      </p>
                      <p className="text-xs text-blue-400">In development</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-700 rounded-lg">
                      <MessageSquare className="text-gray-400" size={24} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 font-medium">Requested</p>
                      <p className="text-2xl font-bold text-white">
                        {managedCourses.filter(c => c.status === 'requested').length}
                      </p>
                      <p className="text-xs text-gray-400">User requests</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Courses Table */}
              <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-white">All Courses ({managedCourses.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Course Title</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Modules</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Lessons</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {managedCourses.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                            No courses found. Add courses in the Courses Dashboard.
                          </td>
                        </tr>
                      ) : (
                        managedCourses.map((course) => {
                          const isEditing = editingCourse === course.id;

                          return (
                            <tr key={course.id} className="hover:bg-gray-800/50">
                              {isEditing ? (
                                // Edit Mode
                                <>
                                  <td className="px-6 py-4">
                                    <input
                                      type="text"
                                      value={courseEditForm.title}
                                      onChange={(e) => setCourseEditForm({ ...courseEditForm, title: e.target.value })}
                                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                                      course.status === 'live' ? 'bg-green-900/30 text-green-400' :
                                      course.status === 'coming_soon' ? 'bg-blue-900/30 text-blue-400' :
                                      'bg-gray-700 text-gray-400'
                                    }`}>
                                      {course.status === 'live' ? 'Available' :
                                       course.status === 'coming_soon' ? 'Coming Soon' :
                                       'Requested'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <input
                                      type="text"
                                      value={courseEditForm.modules}
                                      onChange={(e) => setCourseEditForm({ ...courseEditForm, modules: e.target.value })}
                                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                                      placeholder="e.g., 3 or Multiple"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <input
                                      type="number"
                                      value={courseEditForm.lessons}
                                      onChange={(e) => setCourseEditForm({ ...courseEditForm, lessons: parseInt(e.target.value) || 0 })}
                                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <textarea
                                      value={courseEditForm.description}
                                      onChange={(e) => setCourseEditForm({ ...courseEditForm, description: e.target.value })}
                                      className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
                                      rows={2}
                                    />
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleSaveCourse(course.id)}
                                        className="p-2 text-green-400 hover:bg-green-900/20 rounded-lg transition"
                                        title="Save changes"
                                      >
                                        <Plus size={16} className="rotate-45" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingCourse(null);
                                          setCourseEditForm({});
                                        }}
                                        className="p-2 text-gray-400 hover:bg-gray-800 rounded-lg transition"
                                        title="Cancel"
                                      >
                                        <X size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                // View Mode
                                <>
                                  <td className="px-6 py-4 text-sm font-medium text-white">
                                    {course.title || course.name}
                                  </td>
                                  <td className="px-6 py-4">
                                    <select
                                      value={course.status}
                                      onChange={(e) => handleCourseStatusChange(course.id, e.target.value)}
                                      className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer ${
                                        course.status === 'live' ? 'bg-green-900/30 text-green-400 hover:bg-green-900/40' :
                                        course.status === 'coming_soon' ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/40' :
                                        'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                      }`}
                                    >
                                      <option value="live" className="bg-gray-900 text-white">Available</option>
                                      <option value="coming_soon" className="bg-gray-900 text-white">Coming Soon</option>
                                      <option value="requested" className="bg-gray-900 text-white">Requested</option>
                                    </select>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-300">{course.modules || 'N/A'}</td>
                                  <td className="px-6 py-4 text-sm text-gray-300">{course.lessons || 0}</td>
                                  <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">{course.description || 'No description'}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleEditCourse(course)}
                                        className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition"
                                        title="Edit course"
                                      >
                                        <Edit3 size={16} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteCourse(course.id, course.title || course.name)}
                                        className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition"
                                        title="Delete course"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* Course Demand Section */}
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ fontSize: '27px', letterSpacing: '0.011em' }}>
                <TrendingUp size={24} className="text-pink-500" />
                Course Demand
              </h2>
              <p className="text-gray-400 mb-6 text-sm">
                User interest in upcoming and requested courses
              </p>

              {courseRequests.length === 0 ? (
                <div className="bg-gray-900 rounded-lg border border-gray-800 p-8 text-center">
                  <BookOpen className="mx-auto text-gray-600 mb-3" size={48} />
                  <p className="text-gray-400 text-lg">No course requests yet</p>
                  <p className="text-gray-500 text-sm mt-2">Users will see this data when they request upcoming or new courses</p>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800">
                    <h3 className="font-semibold text-white">Requested Courses ({courseRequests.reduce((sum, c) => sum + c.total, 0)} total requests)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Course Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Total Requests</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Upcoming</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Requested</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Popularity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {courseRequests.map((request, idx) => {
                          const maxRequests = Math.max(...courseRequests.map(r => r.total));
                          const popularityPercent = (request.total / maxRequests) * 100;

                          return (
                            <tr key={idx} className="hover:bg-gray-800/50">
                              <td className="px-6 py-4 text-sm font-medium text-white">{request.courseName}</td>
                              <td className="px-6 py-4 text-sm">
                                <span className="px-3 py-1 bg-pink-900/30 text-pink-400 rounded-full font-semibold">
                                  {request.total}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-300">{request.upcoming}</td>
                              <td className="px-6 py-4 text-sm text-gray-300">{request.requested}</td>
                              <td className="px-6 py-4 text-sm">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 bg-gray-700 rounded-full h-2" style={{ minWidth: '100px' }}>
                                    <div
                                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${popularityPercent}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-medium text-gray-400 w-12 text-right">
                                    {popularityPercent.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
