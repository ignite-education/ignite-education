-- Seed existing 15 prompts from prompts.json into the prompts table
-- Run AFTER create_prompts_table.sql

INSERT INTO public.prompts (title, slug, description, full_prompt, profession, llm_tools, complexity, usage_count, rating, status, created_at) VALUES

('Competitor Product Analysis',
 'competitor-product-analysis',
 'Produce a comprehensive overview of a competitors product or service strengths and weaknesses, with supporting adoption and user feedback data.',
 E'Act as a senior product analyst. Produce a comprehensive overview of [COMPETITOR NAME]''s product/service including:\n\n1. Core product features and unique selling points\n2. Pricing structure and tier comparison\n3. Key strengths with supporting evidence\n4. Notable weaknesses and user complaints\n5. Market adoption metrics (users, revenue, growth rate)\n6. User feedback summary from G2, Trustpilot, and app stores\n7. Recent product updates and roadmap signals\n\nFormat the output as a structured report with sections, bullet points, and a summary table comparing strengths vs weaknesses.',
 'Data Analyst', ARRAY['Claude', 'Co-Pilot'], 'Mid', 1847, 4.8, 'published', '2026-02-28'),

('Sprint Retrospective Summary',
 'sprint-retrospective-summary',
 'Generate a structured sprint retrospective summary from team feedback notes, categorising insights into actionable themes.',
 E'You are an experienced Agile coach. Given the following sprint retrospective notes from the team, generate a structured summary:\n\n[PASTE TEAM NOTES HERE]\n\nOrganise the output into:\n1. What went well (grouped by theme)\n2. What could be improved (grouped by theme)\n3. Action items with owners and deadlines\n4. Team morale assessment (1-5 scale with justification)\n5. Patterns from previous retros (if applicable)\n\nKeep the tone constructive and forward-looking.',
 'Product Manager', ARRAY['Claude', 'ChatGPT'], 'Low', 2103, 4.9, 'published', '2026-02-25'),

('Code Review Checklist Generator',
 'code-review-checklist-generator',
 'Create a tailored code review checklist based on your tech stack and team conventions.',
 E'Act as a senior software engineer performing a code review. Given the following context:\n\n- Tech stack: [YOUR STACK]\n- Team conventions: [YOUR CONVENTIONS]\n- PR description: [PASTE PR DESCRIPTION]\n\nGenerate a comprehensive code review checklist covering:\n1. Code quality and readability\n2. Performance implications\n3. Security considerations (OWASP top 10)\n4. Test coverage gaps\n5. Edge cases not handled\n6. Documentation needs\n7. Breaking changes and backward compatibility\n\nFor each item, provide a brief explanation of why it matters.',
 'Software Engineer', ARRAY['Claude', 'Co-Pilot', 'ChatGPT'], 'Mid', 1562, 4.7, 'published', '2026-03-01'),

('Email Campaign A/B Test Plan',
 'email-campaign-a-b-test-plan',
 'Design a structured A/B testing plan for email marketing campaigns with statistical significance guidelines.',
 E'You are an email marketing strategist. Design an A/B testing plan for the following campaign:\n\n- Campaign goal: [YOUR GOAL]\n- Audience size: [SIZE]\n- Current open rate: [RATE]\n- Current CTR: [RATE]\n\nProvide:\n1. Three testable hypotheses ranked by potential impact\n2. Variable isolation plan for each test\n3. Sample size calculations for statistical significance (95% confidence)\n4. Test duration recommendations\n5. Success metrics and measurement framework\n6. Follow-up test recommendations based on possible outcomes\n\nFormat as an actionable test plan document.',
 'Marketing', ARRAY['ChatGPT', 'Claude'], 'High', 987, 4.5, 'published', '2026-02-20'),

('Job Description Optimiser',
 'job-description-optimiser',
 'Rewrite job descriptions to be more inclusive, engaging, and aligned with best practices for attracting diverse talent.',
 E'You are a talent acquisition specialist focused on inclusive hiring. Rewrite the following job description:\n\n[PASTE JOB DESCRIPTION]\n\nApply these improvements:\n1. Remove gendered language and unnecessary jargon\n2. Separate true requirements from nice-to-haves\n3. Add inclusive language that welcomes diverse candidates\n4. Highlight growth opportunities and team culture\n5. Ensure salary transparency (suggest a range if not provided)\n6. Optimise for job board SEO\n7. Keep it under 600 words\n\nProvide both the rewritten JD and a changelog of what was modified and why.',
 'HR', ARRAY['Claude', 'ChatGPT'], 'Low', 1340, 4.6, 'published', '2026-02-15'),

('Financial Model Assumptions Review',
 'financial-model-assumptions-review',
 'Critically evaluate financial model assumptions and identify risks, sensitivities, and areas needing validation.',
 E'Act as a senior financial analyst reviewing a financial model. Given the following assumptions:\n\n[PASTE MODEL ASSUMPTIONS]\n\nProvide:\n1. Critical evaluation of each assumption (realistic, optimistic, or aggressive)\n2. Industry benchmarks for comparison\n3. Sensitivity analysis: which assumptions have the highest impact on outcomes\n4. Risk factors that could invalidate key assumptions\n5. Recommended stress test scenarios (base, bull, bear)\n6. Data sources to validate each assumption\n7. Summary risk rating (Low/Medium/High) with justification\n\nFormat as a professional review memo.',
 'Finance', ARRAY['Claude', 'ChatGPT', 'Gemini'], 'High', 756, 4.4, 'published', '2026-02-10'),

('UI Component Specification',
 'ui-component-specification',
 'Generate detailed UI component specifications from a brief description, including states, interactions, and accessibility requirements.',
 E'You are a senior UX designer creating component specifications. Based on this brief:\n\n- Component: [COMPONENT NAME]\n- Purpose: [BRIEF DESCRIPTION]\n- Context: [WHERE IT APPEARS]\n\nGenerate a complete specification including:\n1. Component anatomy (all visual elements)\n2. All states: default, hover, active, focused, disabled, loading, error, empty\n3. Responsive behaviour across breakpoints (mobile, tablet, desktop)\n4. Interaction patterns and micro-animations\n5. Accessibility requirements (ARIA roles, keyboard navigation, screen reader text)\n6. Design tokens (spacing, colours, typography) using 8px grid\n7. Edge cases (long text, missing data, RTL support)\n\nFormat as a design specification document.',
 'Designer', ARRAY['Claude', 'Gemini'], 'Mid', 1123, 4.7, 'published', '2026-03-02'),

('Sales Objection Handler',
 'sales-objection-handler',
 'Generate tailored responses to common sales objections based on your product value proposition and target customer profile.',
 E'You are an experienced sales coach. Given the following context:\n\n- Product: [YOUR PRODUCT]\n- Target customer: [CUSTOMER PROFILE]\n- Key value propositions: [LIST VP]\n- Pricing: [PRICING DETAILS]\n\nGenerate response frameworks for these common objections:\n1. "It''s too expensive"\n2. "We''re already using [COMPETITOR]"\n3. "We don''t have the budget right now"\n4. "I need to talk to my team"\n5. "Can you send me more information?"\n\nFor each objection provide:\n- The underlying concern\n- Acknowledge + Bridge + Deliver framework response\n- A follow-up question to keep the conversation going\n- A relevant case study or data point to share',
 'Sales', ARRAY['ChatGPT', 'Claude'], 'Low', 1678, 4.3, 'published', '2026-02-22'),

('Process Automation Identifier',
 'process-automation-identifier',
 'Analyse a business workflow and identify the top automation opportunities ranked by effort vs impact.',
 E'You are an operations consultant specialising in process improvement. Analyse the following workflow:\n\n[DESCRIBE YOUR CURRENT WORKFLOW]\n\nProvide:\n1. Workflow map with identified bottlenecks\n2. Top 5 automation opportunities ranked by effort vs impact (2x2 matrix)\n3. For each opportunity:\n   - Current time spent (estimated)\n   - Potential time savings\n   - Recommended tool/approach\n   - Implementation complexity (Low/Med/High)\n   - ROI estimate\n4. Quick wins (< 1 week to implement)\n5. Strategic improvements (1-3 month horizon)\n6. Recommended implementation sequence\n\nFormat as an executive summary with detailed appendix.',
 'Operations', ARRAY['Claude', 'ChatGPT', 'Gemini'], 'High', 892, 4.6, 'published', '2026-02-18'),

('Lesson Plan Builder',
 'lesson-plan-builder',
 'Create a detailed lesson plan with learning objectives, activities, assessments, and differentiation strategies.',
 E'You are an experienced curriculum designer. Create a detailed lesson plan for:\n\n- Subject: [SUBJECT]\n- Topic: [TOPIC]\n- Level: [LEVEL/AGE GROUP]\n- Duration: [TIME]\n- Class size: [SIZE]\n\nInclude:\n1. Learning objectives (using Bloom''s taxonomy verbs)\n2. Prior knowledge requirements\n3. Lesson structure:\n   - Starter/hook activity (5-10 min)\n   - Main teaching content with examples\n   - Student practice activities\n   - Plenary/summary\n4. Differentiation strategies (stretch, support, EAL)\n5. Assessment methods (formative and summative)\n6. Required resources and materials\n7. Cross-curricular links\n8. Homework/extension tasks',
 'Educator', ARRAY['Claude', 'ChatGPT', 'Gemini', 'Co-Pilot'], 'Mid', 2450, 4.9, 'published', '2026-02-27'),

('SQL Query Optimiser',
 'sql-query-optimiser',
 'Analyse and optimise slow SQL queries with index recommendations and execution plan improvements.',
 E'You are a database performance specialist. Analyse the following SQL query and its context:\n\n```sql\n[PASTE YOUR QUERY]\n```\n\nDatabase: [PostgreSQL/MySQL/etc]\nTable sizes: [APPROXIMATE ROWS]\nCurrent execution time: [TIME]\n\nProvide:\n1. Line-by-line analysis of the query\n2. Identified performance issues\n3. Optimised version of the query with explanation\n4. Index recommendations (with CREATE INDEX statements)\n5. Execution plan analysis tips\n6. Alternative approaches (CTEs, window functions, materialised views)\n7. Estimated performance improvement\n\nExplain each optimisation so the developer learns from it.',
 'Data Analyst', ARRAY['Co-Pilot', 'Claude'], 'High', 1205, 4.8, 'published', '2026-01-30'),

('Product Requirements Document',
 'product-requirements-document',
 'Generate a structured PRD from a feature brief, including user stories, acceptance criteria, and technical considerations.',
 E'You are a senior product manager. Create a comprehensive PRD based on this feature brief:\n\n- Feature name: [NAME]\n- Problem statement: [PROBLEM]\n- Target users: [USERS]\n- Success metrics: [METRICS]\n\nGenerate a PRD including:\n1. Executive summary\n2. Problem definition and user pain points\n3. Proposed solution with user flows\n4. User stories in "As a [role], I want [action], so that [benefit]" format\n5. Acceptance criteria for each story (Given/When/Then)\n6. Out of scope (explicit exclusions)\n7. Technical considerations and dependencies\n8. Risks and mitigations\n9. Launch plan (phased rollout)\n10. Success metrics and measurement plan',
 'Product Manager', ARRAY['Claude', 'ChatGPT'], 'High', 1890, 4.7, 'published', '2026-02-05'),

('Social Media Content Calendar',
 'social-media-content-calendar',
 'Create a month-long content calendar with post ideas, captions, hashtags, and optimal posting times.',
 E'You are a social media strategist. Create a 4-week content calendar for:\n\n- Brand: [BRAND NAME]\n- Industry: [INDUSTRY]\n- Platforms: [PLATFORMS]\n- Tone: [BRAND VOICE]\n- Goals: [GOALS]\n\nFor each week provide:\n1. Content themes aligned with business goals\n2. 5 post ideas per platform with:\n   - Post type (carousel, reel, story, thread, article)\n   - Caption (ready to publish)\n   - Hashtag sets (trending + niche)\n   - Optimal posting day/time\n   - Visual direction brief\n3. One engagement initiative (poll, Q&A, UGC campaign)\n4. Key dates and trending topics to leverage\n5. Performance metrics to track\n\nFormat as a table/calendar view.',
 'Marketing', ARRAY['ChatGPT', 'Gemini'], 'Mid', 1455, 4.5, 'published', '2026-02-12'),

('API Error Handling Guide',
 'api-error-handling-guide',
 'Generate comprehensive error handling patterns for REST APIs with proper HTTP status codes and user-friendly messages.',
 E'You are a senior backend engineer. Generate a comprehensive error handling guide for a REST API:\n\n- Framework: [YOUR FRAMEWORK]\n- Auth method: [JWT/OAuth/etc]\n- Database: [YOUR DB]\n\nProvide:\n1. Error response format (JSON schema)\n2. HTTP status code mapping for common scenarios:\n   - Authentication errors (401, 403)\n   - Validation errors (400, 422)\n   - Not found (404)\n   - Rate limiting (429)\n   - Server errors (500, 502, 503)\n3. Custom error class implementation\n4. Global error handler middleware\n5. Logging strategy (what to log at each level)\n6. Client-friendly error messages (separate from technical details)\n7. Retry strategy recommendations for clients\n\nInclude code examples for each pattern.',
 'Software Engineer', ARRAY['Co-Pilot', 'Claude', 'ChatGPT'], 'Mid', 1089, 4.6, 'published', '2026-02-08'),

('Employee Onboarding Checklist',
 'employee-onboarding-checklist',
 'Create a comprehensive 90-day onboarding plan with milestones, check-ins, and role-specific training activities.',
 E'You are an HR operations specialist. Create a 90-day onboarding plan for:\n\n- Role: [JOB TITLE]\n- Department: [DEPARTMENT]\n- Seniority: [LEVEL]\n- Remote/Hybrid/Office: [WORK MODEL]\n\nProvide a structured plan covering:\n\nWeek 1 (Days 1-5): Foundation\n- Day 1 schedule with welcome activities\n- System access and tool setup checklist\n- Key introductions and meetings\n\nDays 6-30: Learning\n- Role-specific training modules\n- Shadowing and mentorship plan\n- First deliverable/quick win opportunity\n\nDays 31-60: Contributing\n- Independent project assignments\n- Cross-functional introductions\n- 30-day check-in template\n\nDays 61-90: Ownership\n- Performance expectations\n- Goal setting (OKRs/KPIs)\n- 90-day review criteria\n\nInclude check-in templates for manager 1:1s at day 7, 30, 60, and 90.',
 'HR', ARRAY['Claude', 'ChatGPT', 'Gemini'], 'Low', 1567, 4.4, 'published', '2026-01-25');
