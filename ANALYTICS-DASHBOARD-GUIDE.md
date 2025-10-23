# Analytics Dashboard Guide

## 📊 Overview

The Analytics Dashboard provides comprehensive insights into Ignite Learning's platform performance, user engagement, and content effectiveness.

**Access:** Navigate to `/admin/analytics` or click the Analytics link from the admin menu.

---

## 🎯 Key Metrics Tracked

### 1. User Metrics

#### **Total Users**
- **What:** Total number of registered users on the platform
- **Source:** `users` table
- **Why it matters:** Indicates platform growth and market reach

#### **Weekly Growth**
- **What:** Number of new users in the last 7 days vs. previous 7 days
- **Calculation:** `((last 7 days - previous 7 days) / previous 7 days) × 100`
- **Indicator:**
  - 🟢 Green arrow = positive growth
  - 🔴 Red arrow = decline
- **Why it matters:** Short-term growth trend, helps identify marketing campaign effectiveness

#### **Monthly Growth**
- **What:** Number of new users in the last 30 days vs. previous 30 days
- **Calculation:** `((last 30 days - previous 30 days) / previous 30 days) × 100`
- **Why it matters:** Long-term growth trend, better for strategic planning

#### **Average Time Spent**
- **What:** Average duration per user session
- **Current:** Mock data (20 minutes)
- **Future:** Requires session tracking implementation
- **Why it matters:** Engagement indicator - higher time = better engagement

#### **Forum Posts**
- **What:** Total community forum posts
- **Current:** Placeholder (awaiting forum feature)
- **Why it matters:** Community engagement and peer learning indicator

#### **Daily Active Users (DAU)**
- **What:** Unique users active in the last 24 hours
- **Source:** Users with `lesson_completions` in last 24h
- **Why it matters:** Real-time engagement metric

#### **Monthly Active Users (MAU)**
- **What:** Unique users active in the last 30 days
- **Source:** Users with `lesson_completions` in last 30 days
- **Why it matters:** Monthly engagement health, used for DAU/MAU ratio

---

### 2. Course Performance Metrics

#### **Course Enrollments Table**
Shows per-course breakdown:
- **Enrollments:** Total users who started the course
- **Active:** Users currently progressing through the course
- **Completed:** Users who finished all lessons
- **Avg. Score:** Average knowledge check score across all lessons

**Color Coding:**
- 🟢 Green: ≥80% (Excellent)
- 🟡 Yellow: 60-79% (Good)
- 🔴 Red: <60% (Needs improvement)

#### **Completion Rate**
- **What:** Percentage of enrolled users who complete courses
- **Calculation:** `(total completed / total enrolled) × 100`
- **Industry Benchmark:** 5-15% is typical for online courses
- **Why it matters:** Indicates course quality and user motivation

#### **Average Session Duration**
- **What:** Average time per learning session
- **Why it matters:** Indicates content engagement quality

#### **Top Performing Lessons**
- **What:** Lessons with highest knowledge check scores
- **Display:** Progress bar visualization
- **Why it matters:** Identifies well-designed content that can be replicated

---

### 3. User Satisfaction Metrics

#### **Overall Satisfaction**
- **What:** Percentage of positive (thumbs up) ratings
- **Calculation:** `(total thumbs up / total ratings) × 100`
- **Target:** >80% is excellent
- **Why it matters:** Direct user feedback on content quality

#### **Lesson Ratings Table**
Per-lesson breakdown showing:
- **Thumbs Up:** Positive ratings count
- **Thumbs Down:** Negative ratings count
- **Total:** All ratings
- **Satisfaction %:** Visual progress bar with color coding
  - 🟢 Green: ≥80% positive
  - 🟡 Yellow: 60-79% positive
  - 🔴 Red: <60% positive

**Action Items:**
- Lessons with <60% satisfaction should be reviewed and improved
- High-rated lessons can serve as templates

---

### 4. Retention & Engagement Metrics

#### **Retention Rate**
- **What:** Percentage of users returning monthly
- **Calculation:** Users from previous month who were active this month
- **Benchmark:**
  - 🟢 >50% = Good
  - 🟡 30-50% = Average
  - 🔴 <30% = Needs attention
- **Why it matters:** Long-term platform health indicator

#### **Churn Rate**
- **What:** Percentage of users leaving monthly
- **Calculation:** `100 - retention rate`
- **Benchmark:**
  - 🟢 <10% = Low/Good
  - 🟡 10-20% = Moderate
  - 🔴 >20% = High/Concerning
- **Why it matters:** Indicates user dissatisfaction or competitive threats

---

## 📈 Additional Metrics Recommended

### Engagement Depth
- **Average Lessons per User:** How many lessons users complete on average
- **Lesson Drop-off Points:** Where users most commonly stop
- **Time to First Completion:** How long until first lesson completion

### Revenue Metrics (If Applicable)
- **Conversion Rate:** Free to paid users
- **Average Revenue Per User (ARPU)**
- **Customer Lifetime Value (CLV)**
- **Monthly Recurring Revenue (MRR)**

### Content Quality Metrics
- **Video Completion Rate:** Percentage of videos watched fully
- **Flashcard Usage:** How many users use flashcards
- **AI Tutor Interactions:** Engagement with "Will" assistant
- **Knowledge Check Pass Rate:** First-attempt pass percentage

### Technical Metrics
- **Page Load Time:** Average page load speed
- **Error Rate:** Platform errors encountered
- **Mobile vs Desktop Usage:** Device breakdown
- **Browser Compatibility Issues**

### Marketing Metrics
- **Traffic Sources:** Where users come from
- **Referral Conversions:** Users from referrals
- **Email Click-Through Rate**
- **Social Media Engagement**

---

## 🔄 Time Range Filters

The dashboard supports multiple time ranges:
- **Last 7 days:** Weekly trends
- **Last 30 days:** Monthly overview (default)
- **Last 90 days:** Quarterly analysis
- **Last year:** Annual performance

**Recommendation:** Use 30 days for regular monitoring, 7 days for campaign tracking.

---

## 🎨 Visual Design

### Color Coding System
- **Pink (#EF0B72):** Primary brand color for headers and icons
- **Green:** Positive indicators (growth, high scores, satisfaction)
- **Red:** Negative indicators (decline, low scores, churn)
- **Yellow:** Warning/moderate indicators
- **Gray:** Neutral data

### Card Layout
Each metric card includes:
- Icon representing the metric
- Metric title
- Large value display
- Subtitle for context
- Trend indicator (when applicable)

---

## 💾 Data Sources

### Database Tables Used
1. **users** - User registration and profile data
2. **user_progress** - Course enrollment tracking
3. **lesson_completions** - Lesson completion events
4. **knowledge_check_results** - Quiz scores and performance
5. **lesson_ratings** - Thumbs up/down feedback
6. **courses** - Course metadata

### API Endpoints
Located in `/src/lib/analytics.js`:
- `getUserAnalytics(timeRange)` - User metrics
- `getCourseAnalytics(timeRange)` - Course performance
- `getLessonRatingAnalytics(timeRange)` - Satisfaction data
- `getEngagementMetrics(timeRange)` - Activity metrics
- `getRetentionMetrics(timeRange)` - Retention analysis

---

## 🚀 Implementation Status

### ✅ Implemented
- Complete dashboard UI
- User growth metrics
- Course enrollment tracking
- Lesson ratings analysis
- Knowledge check scores
- Retention/churn calculations
- Time range filtering
- Responsive design

### ⚠️ Mock Data (Needs Real Implementation)
- **Average Time Spent:** Currently hardcoded
- **Forum Posts:** Awaiting forum feature
- **Session Duration:** Requires session tracking

### 🔜 Future Enhancements
1. **Real-time Data:** WebSocket updates for live metrics
2. **Export Functionality:** Download reports as PDF/CSV
3. **Custom Date Ranges:** Specific date selection
4. **Comparison Mode:** Compare time periods side-by-side
5. **Goal Tracking:** Set and monitor KPI targets
6. **Automated Alerts:** Email notifications for threshold breaches
7. **Cohort Analysis:** Track user cohorts over time
8. **A/B Test Results:** Track experiment performance
9. **Heatmaps:** User interaction heatmaps
10. **Predictive Analytics:** ML-based forecasting

---

## 📊 How to Use

### For Daily Monitoring
1. Check **Daily Active Users** - Engagement health
2. Review **Overall Satisfaction** - Content quality
3. Monitor **Churn Rate** - User retention

### For Weekly Reviews
1. Analyze **Weekly Growth** - Marketing effectiveness
2. Review **Lesson Ratings** - Identify content to improve
3. Check **Top Performing Lessons** - Learn from success

### For Monthly Planning
1. Review **Monthly Growth** - Strategic planning
2. Analyze **Course Completion Rates** - Content effectiveness
3. Calculate **Retention Rate** - Long-term health
4. Review **Average Scores** - Learning outcomes

### For Content Improvement
1. Sort **Lesson Ratings** by satisfaction (low to high)
2. Identify lessons with <60% satisfaction
3. Review lesson content and knowledge checks
4. Compare to high-performing lessons
5. Implement improvements

### For Marketing Strategy
1. Track **User Growth Trends**
2. Correlate with marketing campaigns
3. Identify high-performing channels
4. Adjust budget allocation

---

## 🎯 Success Metrics

### Excellent Platform Health
- User Growth: >10% monthly
- Retention Rate: >60%
- Churn Rate: <10%
- Satisfaction: >85%
- Completion Rate: >15%
- DAU/MAU Ratio: >30%

### Good Platform Health
- User Growth: 5-10% monthly
- Retention Rate: 40-60%
- Churn Rate: 10-20%
- Satisfaction: 75-85%
- Completion Rate: 10-15%
- DAU/MAU Ratio: 20-30%

### Needs Attention
- User Growth: <5% monthly or negative
- Retention Rate: <40%
- Churn Rate: >20%
- Satisfaction: <75%
- Completion Rate: <10%
- DAU/MAU Ratio: <20%

---

## 🔐 Access Control

**Current:** Available to all authenticated users via `/admin/analytics`

**Recommended:** Restrict to admin users only
```javascript
// Add role-based access control
if (user.role !== 'admin') {
  navigate('/');
  return;
}
```

---

## 🐛 Troubleshooting

### Dashboard Not Loading
1. Check browser console for errors
2. Verify Supabase connection
3. Ensure database tables exist
4. Check RLS policies on analytics tables

### Zero Data Showing
1. Verify data exists in database
2. Check time range filter
3. Review SQL queries in browser network tab
4. Confirm RLS policies allow data access

### Slow Loading
1. Add database indexes on frequently queried columns
2. Implement caching for expensive queries
3. Consider pagination for large datasets
4. Use database views for complex aggregations

---

## 📝 Maintenance

### Daily
- Monitor dashboard load times
- Check for errors in logs

### Weekly
- Review data accuracy
- Update mock metrics with real implementations

### Monthly
- Analyze trends
- Generate executive summary reports
- Plan feature improvements based on data

---

**Access the dashboard:** [http://localhost:5174/admin/analytics](http://localhost:5174/admin/analytics)

For questions or feature requests, contact the development team.
