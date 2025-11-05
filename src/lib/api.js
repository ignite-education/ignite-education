import { supabase } from './supabase';

/**
 * Get all lessons for a specific course
 * @param {string} courseId - The course ID to fetch lessons for
 * @returns {Promise<Array>} Array of lesson objects
 */
export async function getLessons(courseId) {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index');

  if (error) throw error;
  return data;
}

/**
 * Get lessons metadata (for upcoming lessons cards with bullet points)
 * @param {string} courseId - The course ID to fetch lessons for
 * @returns {Promise<Array>} Array of lesson metadata objects with bullet points
 */
export async function getLessonsMetadata(courseId) {
  console.log('📋 getLessonsMetadata called for courseId:', courseId);

  // Fetch from the course's module_structure using name as primary key
  const { data: courseData, error: courseError } = await supabase
    .from('courses')
    .select('module_structure, name, title')
    .eq('name', courseId)
    .single();

  if (courseError) {
    console.error('Error fetching course module_structure:', courseError);
    return [];
  }

  console.log('📚 Course data fetched:', courseData);

  // If module_structure exists and has data, transform it to lesson metadata format
  if (courseData?.module_structure && Array.isArray(courseData.module_structure)) {
    const lessonsMetadata = [];

    courseData.module_structure.forEach((module, moduleIndex) => {
      if (module.lessons && Array.isArray(module.lessons)) {
        module.lessons.forEach((lesson, lessonIndex) => {
          lessonsMetadata.push({
            course_id: courseId,
            module_number: moduleIndex + 1,
            lesson_number: lessonIndex + 1,
            lesson_name: lesson.name || `Lesson ${lessonIndex + 1}`,
            description: lesson.description || '',
            bullet_points: lesson.bullet_points || ['', '', '']
          });
        });
      }
    });

    console.log('✅ Transformed module_structure to lessons metadata:', lessonsMetadata);
    return lessonsMetadata;
  }

  console.log('⚠️ No module_structure found, falling back to lessons_metadata table');

  // Fallback to old lessons_metadata table if module_structure doesn't exist
  const { data, error } = await supabase
    .from('lessons_metadata')
    .select('*')
    .eq('course_id', courseId)
    .order('module_number', { ascending: true })
    .order('lesson_number', { ascending: true });

  if (error) {
    console.error('Error fetching lessons metadata:', error);
    return [];
  }

  return data || [];
}

/**
 * Get lessons grouped by module and lesson number
 * @param {string} courseId - The course ID to fetch lessons for (optional, not used if table doesn't have course_id)
 * @returns {Promise<Object>} Nested object structure: { module_1: { lesson_1: [...], lesson_2: [...] }, ... }
 */
export async function getLessonsByModule(courseId) {
  console.log('🔍 getLessonsByModule: Fetching lessons for courseId:', courseId);

  // Fetch lessons filtered by course_id
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('course_id', courseId)
    .order('module_number', { ascending: true })
    .order('lesson_number', { ascending: true })
    .order('section_number', { ascending: true });

  if (error) {
    console.error('❌ Supabase query error:', error);
    throw error;
  }

  console.log('✅ Raw data from Supabase:', data);
  console.log('📊 Number of lessons fetched:', data?.length);

  // Check if we have data
  if (!data || data.length === 0) {
    console.warn('⚠️ No lessons found in database');
    return {};
  }

  // Log first lesson to see structure
  console.log('📝 Sample lesson structure:', data[0]);
  console.log('🔍 Checking suggested_question field:', data[0]?.suggested_question);

  // Log all H2 headings with suggested questions
  const h2WithQuestions = data.filter(lesson =>
    lesson.content_type === 'heading' &&
    lesson.content?.level === 2 &&
    lesson.suggested_question
  );
  console.log('📌 H2 headings with suggested questions:', h2WithQuestions.length);
  if (h2WithQuestions.length > 0) {
    console.log('📌 First H2 with question:', h2WithQuestions[0]);
  }

  // Group by module and lesson
  const grouped = data?.reduce((acc, lesson) => {
    const moduleKey = `module_${lesson.module_number}`;
    if (!acc[moduleKey]) {
      acc[moduleKey] = {};
    }

    const lessonKey = `lesson_${lesson.lesson_number}`;
    if (!acc[moduleKey][lessonKey]) {
      acc[moduleKey][lessonKey] = [];
    }

    acc[moduleKey][lessonKey].push(lesson);
    return acc;
  }, {});

  // Add lesson metadata to make it easier to display lesson names
  Object.keys(grouped).forEach(moduleKey => {
    Object.keys(grouped[moduleKey]).forEach(lessonKey => {
      const sections = grouped[moduleKey][lessonKey];
      if (sections.length > 0) {
        // Add metadata from first section (all sections in a lesson share the same lesson_name)
        grouped[moduleKey][lessonKey].lessonName = sections[0].lesson_name || sections[0].title;
        grouped[moduleKey][lessonKey].sectionNumber = sections[0].section_number;
      }
    });
    console.log(`📚 ${moduleKey} has ${Object.keys(grouped[moduleKey]).length} lessons`);
  });

  console.log('🎯 Final grouped structure:', grouped);

  return grouped;
}

/**
 * Get community posts ordered by creation date
 * @param {number} limit - Optional limit for number of posts to fetch
 * @returns {Promise<Array>} Array of community post objects with user details
 */
export async function getCommunityPosts(limit = null) {
  let query = supabase
    .from('community_posts')
    .select(`
      *,
      users!community_posts_user_id_fkey (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data: posts, error } = await query;

  if (error) throw error;

  // Fetch comment counts separately for each post
  const transformedPosts = await Promise.all((posts || []).map(async (post) => {
    const { count } = await supabase
      .from('community_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id);

    return {
      ...post,
      author_name: post.users ? `${post.users.first_name} ${post.users.last_name}` : post.author,
      comment_count: count || 0
    };
  }));

  return transformedPosts;
}

/**
 * Create a new community post
 * @param {Object} postData - The post data
 * @param {string} postData.title - Post title
 * @param {string} postData.content - Post content
 * @param {string} postData.author - Author username
 * @param {string} postData.user_id - User ID of the author
 * @param {string} postData.author_icon - Optional author profile image URL
 * @param {string} postData.tag - Optional tag/flair
 * @returns {Promise<Object>} Created post object
 */
export async function createCommunityPost(postData) {
  const { data, error} = await supabase
    .from('community_posts')
    .insert([
      {
        title: postData.title,
        content: postData.content,
        author: postData.author,
        user_id: postData.user_id,
        author_icon: postData.author_icon || null,
        tag: postData.tag || null,
        upvotes: 0
        // Note: created_at will be handled automatically by Supabase
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    throw error;
  }
  return data;
}

/**
 * Get live posts from Reddit subreddit via backend
 * @param {number} limit - Number of posts to fetch (default: 10)
 * @param {boolean} forceRefresh - Whether to force a cache refresh (default: false)
 * @param {string} subreddit - Subreddit to fetch from (without 'r/' prefix, default: 'ProductManagement')
 * @returns {Promise<Array>} Array of Reddit post objects
 */
export async function getRedditPosts(limit = 10, forceRefresh = false, subreddit = 'ProductManagement') {
  try {
    // Use new cached endpoint - posts are fetched daily by server and stored in database
    // This drastically reduces Reddit API calls from every user to once per day
    const url = `https://ignite-education-api.onrender.com/api/reddit-posts-cached?limit=${limit}&subreddit=${subreddit}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.status}`);
    }

    const posts = await response.json();
    return posts;
  } catch (error) {
    console.error('Error fetching Reddit posts:', error);
    throw error;
  }
}

/**
 * Get comments for a Reddit post via backend API (no authentication required)
 * @param {string} subreddit - Subreddit name (without r/)
 * @param {string} postId - Reddit post ID
 * @returns {Promise<Array>} Array of comment objects
 */
export async function getRedditComments(subreddit, postId) {
  try {
    // Use new cached endpoint - comments are fetched daily by server and stored in database
    const url = `https://ignite-education-api.onrender.com/api/reddit-comments-cached?postId=${postId}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Reddit comments API error: ${response.status}`);
    }

    const comments = await response.json();
    return comments;
  } catch (error) {
    console.error('Error fetching Reddit comments:', error);
    throw error;
  }
}

/**
 * Get user data by ID
 * @param {string} userId - The user ID to fetch
 * @returns {Promise<Object>} User object
 */
export async function getUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all courses
 * @returns {Promise<Array>} Array of course objects
 */
export async function getAllCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get course information by ID
 * @param {string} courseId - The course ID or name to fetch
 * @returns {Promise<Object>} Course object
 */
export async function getCourse(courseId) {
  // Query by name (primary key)
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('name', courseId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get user progress for a specific course
 * @param {string} userId - The user ID
 * @param {string} courseId - The course ID
 * @returns {Promise<Object|null>} User progress object or null if no progress exists
 */
export async function getUserProgress(userId, courseId) {
  const { data, error } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();

  if (error) {
    // If no progress exists, return null instead of throwing error
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data;
}

/**
 * Save or update user progress
 * @param {string} userId - The user ID
 * @param {string} courseId - The course ID
 * @param {number} currentModule - Current module number
 * @param {number} currentLesson - Current lesson number
 * @returns {Promise<Object>} Updated progress object
 */
export async function saveUserProgress(userId, courseId, currentModule, currentLesson) {
  const { data, error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      course_id: courseId,
      current_module: currentModule,
      current_lesson: currentLesson,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,course_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get completed lessons for a user
 * @param {string} userId - The user ID
 * @param {string} courseId - The course ID
 * @returns {Promise<Array>} Array of completed lesson objects with module_number and lesson_number
 */
export async function getCompletedLessons(userId, courseId) {
  console.log('📖 getCompletedLessons called with:', { userId, courseId });

  const { data, error } = await supabase
    .from('lesson_completions')
    .select('module_number, lesson_number, completed_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .order('completed_at', { ascending: true });

  if (error) {
    console.error('❌ Error in getCompletedLessons:', error);
    // If table doesn't exist or no completions, return empty array
    if (error.code === 'PGRST116' || error.code === '42P01') {
      return [];
    }
    throw error;
  }

  console.log('✅ getCompletedLessons returned:', data);
  return data || [];
}

/**
 * Mark a lesson as completed
 * @param {string} userId - The user ID
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - Module number
 * @param {number} lessonNumber - Lesson number
 * @returns {Promise<Object>} Completion record
 */
export async function markLessonComplete(userId, courseId, moduleNumber, lessonNumber) {
  console.log('💾 markLessonComplete called with:', {
    userId,
    courseId,
    moduleNumber,
    lessonNumber
  });

  const { data, error } = await supabase
    .from('lesson_completions')
    .upsert({
      user_id: userId,
      course_id: courseId,
      module_number: moduleNumber,
      lesson_number: lessonNumber,
      completed_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,course_id,module_number,lesson_number'
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Database error in markLessonComplete:', error);
    throw error;
  }

  console.log('✅ Successfully wrote to database:', data);
  return data;
}

/**
 * Log knowledge check results
 * @param {string} userId - The user ID
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - Module number
 * @param {number} lessonNumber - Lesson number
 * @param {number} score - Score achieved (e.g., 12)
 * @param {number} totalQuestions - Total questions (e.g., 15)
 * @param {boolean} passed - Whether they passed
 * @param {Array} answers - Array of answer objects with question, answer, isCorrect
 * @returns {Promise<Object>} Knowledge check record
 */
export async function logKnowledgeCheck(userId, courseId, moduleNumber, lessonNumber, score, totalQuestions, passed, answers) {
  const { data, error } = await supabase
    .from('knowledge_check_results')
    .insert({
      user_id: userId,
      course_id: courseId,
      module_number: moduleNumber,
      lesson_number: lessonNumber,
      score: score,
      total_questions: totalQuestions,
      passed: passed,
      answers: answers,
      completed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    // Log error but don't throw - we don't want to prevent lesson completion if logging fails
    console.error('Error logging knowledge check:', error);
    return null;
  }
  return data;
}

// =====================================================
// POST LIKES FUNCTIONS
// =====================================================

/**
 * Like a post
 * @param {string} postId - The post ID (e.g., 'user-123' or 'reddit-abc')
 * @param {string} userId - The user ID who is liking the post
 * @returns {Promise<Object>} Created like object
 */
export async function likePost(postId, userId) {
  const { data, error } = await supabase
    .from('community_likes')
    .insert({
      post_id: postId,
      user_id: userId
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Unlike a post
 * @param {string} postId - The post ID
 * @param {string} userId - The user ID who is unliking the post
 * @returns {Promise<void>}
 */
export async function unlikePost(postId, userId) {
  const { error } = await supabase
    .from('community_likes')
    .delete()
    .eq('post_id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

/**
 * Get likes for a specific post
 * @param {string} postId - The post ID
 * @returns {Promise<Array>} Array of like objects
 */
export async function getPostLikes(postId) {
  const { data, error } = await supabase
    .from('community_likes')
    .select('*')
    .eq('post_id', postId);

  if (error) throw error;
  return data || [];
}

/**
 * Get all likes for multiple posts
 * @param {Array<string>} postIds - Array of post IDs
 * @returns {Promise<Array>} Array of like objects
 */
export async function getMultiplePostsLikes(postIds) {
  const { data, error } = await supabase
    .from('community_likes')
    .select('*')
    .in('post_id', postIds);

  if (error) throw error;
  return data || [];
}

/**
 * Get user's liked posts
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of post IDs that the user has liked
 */
export async function getUserLikedPosts(userId) {
  const { data, error } = await supabase
    .from('community_likes')
    .select('post_id')
    .eq('user_id', userId);

  if (error) throw error;
  return data?.map(like => like.post_id) || [];
}

/**
 * Get like count for a post
 * @param {string} postId - The post ID
 * @returns {Promise<number>} Number of likes
 */
export async function getPostLikeCount(postId) {
  const { count, error } = await supabase
    .from('community_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) throw error;
  return count || 0;
}

// =====================================================
// POST COMMENTS FUNCTIONS
// =====================================================

/**
 * Create a comment on a post
 * @param {string} postId - The post ID
 * @param {string} userId - The user ID who is commenting
 * @param {string} content - The comment content
 * @returns {Promise<Object>} Created comment object
 */
export async function createComment(postId, userId, content) {
  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      post_id: postId,
      user_id: userId,
      content: content
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get comments for a specific post with user metadata
 * @param {string} postId - The post ID
 * @returns {Promise<Array>} Array of comment objects with user data
 */
export async function getPostComments(postId) {
  // First get the comments
  const { data: comments, error: commentsError } = await supabase
    .from('community_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (commentsError) throw commentsError;

  // Then fetch user metadata for each comment
  if (comments && comments.length > 0) {
    const userIds = [...new Set(comments.map(c => c.user_id))];
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (!usersError && users) {
      // Map user metadata to comments
      return comments.map(comment => {
        const user = users.users.find(u => u.id === comment.user_id);
        return {
          ...comment,
          user_metadata: user?.user_metadata || {}
        };
      });
    }
  }

  return comments || [];
}

/**
 * Get comments for multiple posts with user metadata
 * @param {Array<string>} postIds - Array of post IDs
 * @returns {Promise<Array>} Array of comment objects with user data
 */
export async function getMultiplePostsComments(postIds) {
  if (!postIds || postIds.length === 0) return [];

  // Split into batches to avoid URL length issues (max ~20 IDs per batch)
  const batchSize = 20;
  const batches = [];

  for (let i = 0; i < postIds.length; i += batchSize) {
    batches.push(postIds.slice(i, i + batchSize));
  }

  // Fetch all batches in parallel
  const allComments = [];

  try {
    const batchPromises = batches.map(async (batch) => {
      const { data: comments, error: commentsError } = await supabase
        .from('community_comments')
        .select('*')
        .in('post_id', batch)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      return comments || [];
    });

    const results = await Promise.all(batchPromises);

    // Flatten all results
    for (const batchComments of results) {
      allComments.push(...batchComments);
    }

    // Add user metadata fallback
    return allComments.map(comment => ({
      ...comment,
      user_metadata: { first_name: 'User' } // Fallback
    }));
  } catch (error) {
    console.error('Error fetching comments in batches:', error);
    throw error;
  }
}

/**
 * Get comment count for a post
 * @param {string} postId - The post ID
 * @returns {Promise<number>} Number of comments
 */
export async function getPostCommentCount(postId) {
  const { count, error } = await supabase
    .from('community_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (error) throw error;
  return count || 0;
}

/**
 * Update a comment
 * @param {string} commentId - The comment ID
 * @param {string} content - The new comment content
 * @returns {Promise<Object>} Updated comment object
 */
export async function updateComment(commentId, content) {
  const { data, error } = await supabase
    .from('community_comments')
    .update({ content })
    .eq('id', commentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a comment
 * @param {string} commentId - The comment ID
 * @returns {Promise<void>}
 */
export async function deleteComment(commentId) {
  const { error } = await supabase
    .from('community_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}

/**
 * Save an explained section (text that Will has explained)
 * @param {string} userId - The user ID
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - The module number
 * @param {number} lessonNumber - The lesson number
 * @param {string} selectedText - The text that was explained
 * @param {string} explanation - Will's explanation
 * @returns {Promise<Object>} Created explained section object
 */
export async function saveExplainedSection(userId, courseId, moduleNumber, lessonNumber, selectedText, explanation) {
  const { data, error } = await supabase
    .from('explained_sections')
    .insert({
      user_id: userId,
      course_id: courseId,
      module_number: moduleNumber,
      lesson_number: lessonNumber,
      selected_text: selectedText,
      explanation: explanation
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all explained sections for a specific lesson
 * @param {string} userId - The user ID
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - The module number
 * @param {number} lessonNumber - The lesson number
 * @returns {Promise<Array>} Array of explained section objects
 */
export async function getExplainedSections(userId, courseId, moduleNumber, lessonNumber) {
  const { data, error } = await supabase
    .from('explained_sections')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('module_number', moduleNumber)
    .eq('lesson_number', lessonNumber)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Update an explained section's explanation text
 * @param {string} sectionId - The explained section ID
 * @param {string} explanation - The updated explanation text
 * @returns {Promise<Object>} Updated explained section object
 */
export async function updateExplainedSection(sectionId, explanation) {
  const { data, error } = await supabase
    .from('explained_sections')
    .update({ explanation })
    .eq('id', sectionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete an explained section
 * @param {string} sectionId - The explained section ID
 * @returns {Promise<void>}
 */
export async function deleteExplainedSection(sectionId) {
  const { error } = await supabase
    .from('explained_sections')
    .delete()
    .eq('id', sectionId);

  if (error) throw error;
}

// =====================================================
// JOBS FUNCTIONS
// =====================================================

/**
 * Get top jobs for a specific course
 * @param {string} courseTitle - The course title (e.g., 'Product Management')
 * @param {string} seniorityLevel - The seniority level (e.g., 'Junior', 'Mid', 'Senior')
 * @param {number} limit - Number of jobs to fetch (default: 10)
 * @returns {Promise<Array>} Array of job objects
 */
export async function getJobsForCourse(courseTitle, seniorityLevel = null, limit = 10) {
  try {
    // Build the query
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('course_title', courseTitle)
      .order('posted_at', { ascending: false });

    // Filter by seniority level if provided
    if (seniorityLevel) {
      query = query.eq('seniority_level', seniorityLevel);
    }

    // Limit the results
    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getJobsForCourse:', error);
    throw error;
  }
}

/**
 * Get flashcards for a specific lesson
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - The module number
 * @param {number} lessonNumber - The lesson number
 * @returns {Promise<Array>} Array of 15 flashcard objects (shuffled randomly)
 */
export async function getFlashcards(courseId, moduleNumber, lessonNumber) {
  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('course_id', courseId)
    .eq('module_number', moduleNumber)
    .eq('lesson_number', lessonNumber);

  if (error) {
    console.error('Error fetching flashcards:', error);
    throw error;
  }

  // Shuffle the flashcards randomly for each fetch
  const shuffled = (data || []).sort(() => Math.random() - 0.5);
  return shuffled;
}

/**
 * Create flashcards for a specific lesson (admin/setup function)
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - The module number
 * @param {number} lessonNumber - The lesson number
 * @param {Array} flashcards - Array of flashcard objects with question and answer
 * @returns {Promise<Array>} Created flashcard objects
 */
export async function createFlashcards(courseId, moduleNumber, lessonNumber, flashcards) {
  const flashcardsToInsert = flashcards.map(card => ({
    course_id: courseId,
    module_number: moduleNumber,
    lesson_number: lessonNumber,
    question: card.question,
    answer: card.answer
  }));

  const { data, error } = await supabase
    .from('flashcards')
    .insert(flashcardsToInsert)
    .select();

  if (error) {
    console.error('Error creating flashcards:', error);
    throw error;
  }

  return data;
}

/**
 * Submit or update a lesson rating (thumbs up/down)
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - The module number
 * @param {number} lessonNumber - The lesson number
 * @param {boolean} rating - true for thumbs up, false for thumbs down
 * @returns {Promise<Object>} The created/updated rating object
 */
export async function submitLessonRating(userId, courseId, moduleNumber, lessonNumber, rating) {
  const { data, error } = await supabase
    .from('lesson_ratings')
    .upsert({
      user_id: userId,
      course_id: courseId,
      module_number: moduleNumber,
      lesson_number: lessonNumber,
      rating: rating
    }, {
      onConflict: 'user_id,course_id,module_number,lesson_number'
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting lesson rating:', error);
    throw error;
  }

  return data;
}

/**
 * Get a user's rating for a specific lesson
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - The module number
 * @param {number} lessonNumber - The lesson number
 * @returns {Promise<Object|null>} The rating object or null if not found
 */
export async function getLessonRating(userId, courseId, moduleNumber, lessonNumber) {
  const { data, error } = await supabase
    .from('lesson_ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('module_number', moduleNumber)
    .eq('lesson_number', lessonNumber)
    .maybeSingle();

  if (error) {
    console.error('Error fetching lesson rating:', error);
    throw error;
  }

  return data;
}

/**
 * Get rating statistics for a specific lesson
 * @param {string} courseId - The course ID
 * @param {number} moduleNumber - The module number
 * @param {number} lessonNumber - The lesson number
 * @returns {Promise<Object>} Object with thumbsUp and thumbsDown counts
 */
export async function getLessonRatingStats(courseId, moduleNumber, lessonNumber) {
  const { data, error } = await supabase
    .from('lesson_ratings')
    .select('rating')
    .eq('course_id', courseId)
    .eq('module_number', moduleNumber)
    .eq('lesson_number', lessonNumber);

  if (error) {
    console.error('Error fetching lesson rating stats:', error);
    throw error;
  }

  const stats = {
    thumbsUp: data?.filter(r => r.rating === true).length || 0,
    thumbsDown: data?.filter(r => r.rating === false).length || 0,
    total: data?.length || 0
  };

  return stats;
}

/**
 * Get all users with their roles for user management
 * Note: This requires RLS policies to allow admins to read all users
 */
export async function getAllUsers() {
  // First check if we're authenticated
  const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !currentUser) {
    console.error('Not authenticated:', authError);
    return [];
  }

  // Try to get all users from public.users table
  const { data, error, count } = await supabase
    .from('users')
    .select('id, first_name, last_name, role, created_at, enrolled_course', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    // Return empty array instead of throwing to prevent UI breaks
    return [];
  }

  // Note: Cannot fetch emails from auth.users due to permissions
  // Emails require Service Role key which cannot be used client-side
  // Users will show with "Email not accessible" instead
  const usersWithPlaceholder = (data || []).map(user => ({
    ...user,
    email: 'Email not accessible (requires service role)'
  }));

  console.log(`Fetched ${usersWithPlaceholder?.length || 0} users (total count: ${count})`);
  return usersWithPlaceholder;
}

/**
 * Update user role
 * @param {string} userId - The user's ID
 * @param {string} role - The new role (student, teacher, admin)
 */
export async function updateUserRole(userId, role) {
  // Validate role
  if (!['student', 'teacher', 'admin'].includes(role)) {
    throw new Error('Invalid role. Must be student, teacher, or admin.');
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }

  return data;
}

/**
 * Get current user with role
 */
export async function getCurrentUserWithRole(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a user from the system
 * Calls backend API which has service role permissions to delete from both auth and database
 * @param {string} userId - The user's ID to delete
 */
export async function deleteUser(userId) {
  try {
    // Get current session token
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    // Call backend API to delete user
    const response = await fetch(`https://ignite-education-api.onrender.com/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete user');
    }

    const data = await response.json();
    console.log('User deleted successfully:', data);

    return data;
  } catch (err) {
    console.error('Error in deleteUser:', err);
    throw err;
  }
}

/**
 * Update user's enrolled course
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course ID to enroll the user in
 */
export async function updateUserCourse(userId, courseId) {
  const { data, error } = await supabase
    .from('users')
    .update({ enrolled_course: courseId })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user course:', error);
    throw error;
  }

  return data;
}

/**
 * Get course request analytics
 * Shows demand for upcoming and requested courses
 * @returns {Promise<Array>} Array of course request objects with counts
 */
export async function getCourseRequestAnalytics() {
  try {
    const { data, error } = await supabase
      .from('course_requests')
      .select('course_name, status, created_at');

    if (error) {
      console.error('Error fetching course requests:', error);
      return [];
    }

    // Group by course name and count requests
    const requestCounts = {};

    (data || []).forEach(request => {
      if (!requestCounts[request.course_name]) {
        requestCounts[request.course_name] = {
          courseName: request.course_name,
          total: 0,
          upcoming: 0,
          requested: 0
        };
      }

      requestCounts[request.course_name].total++;

      if (request.status === 'upcoming') {
        requestCounts[request.course_name].upcoming++;
      } else if (request.status === 'requested') {
        requestCounts[request.course_name].requested++;
      }
    });

    // Convert to array and sort by total requests (highest first)
    const result = Object.values(requestCounts)
      .sort((a, b) => b.total - a.total);

    console.log('Course request analytics:', result);
    return result;
  } catch (err) {
    console.error('Exception in getCourseRequestAnalytics:', err);
    return [];
  }
}

// ============================================================================
// COACHES FUNCTIONS
// ============================================================================

/**
 * Get all coaches for a specific course
 * @param {string} courseId - The course ID
 * @returns {Promise<Array>} Array of coach objects
 */
export async function getCoachesForCourse(courseId) {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('course_id', courseId)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching coaches for course:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all coaches (for admin panel)
 * @returns {Promise<Array>} Array of all coach objects
 */
export async function getAllCoaches() {
  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .order('course_id', { ascending: true })
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching all coaches:', error);
    throw error;
  }

  return data || [];
}

/**
 * Create a new coach
 * @param {Object} coachData - Coach data
 * @param {string} coachData.course_id - Course ID
 * @param {string} coachData.name - Coach name
 * @param {string} coachData.position - Coach position/title
 * @param {string} coachData.description - Coach bio/description
 * @param {string} coachData.image_url - Coach profile image URL
 * @param {string} coachData.linkedin_url - LinkedIn profile URL
 * @param {number} coachData.display_order - Display order (optional, defaults to 0)
 * @returns {Promise<Object>} Created coach object
 */
export async function createCoach(coachData) {
  const { data, error } = await supabase
    .from('coaches')
    .insert({
      course_id: coachData.course_id,
      name: coachData.name,
      position: coachData.position || '',
      description: coachData.description || '',
      image_url: coachData.image_url || '',
      linkedin_url: coachData.linkedin_url || '',
      display_order: coachData.display_order || 0,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating coach:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing coach
 * @param {string} coachId - Coach ID
 * @param {Object} coachData - Updated coach data
 * @returns {Promise<Object>} Updated coach object
 */
export async function updateCoach(coachId, coachData) {
  const { data, error } = await supabase
    .from('coaches')
    .update(coachData)
    .eq('id', coachId)
    .select()
    .single();

  if (error) {
    console.error('Error updating coach:', error);
    throw error;
  }

  return data;
}

/**
 * Delete a coach
 * @param {string} coachId - Coach ID
 * @returns {Promise<void>}
 */
export async function deleteCoach(coachId) {
  const { error } = await supabase
    .from('coaches')
    .delete()
    .eq('id', coachId);

  if (error) {
    console.error('Error deleting coach:', error);
    throw error;
  }
}

// ============================================================================
// CERTIFICATE FUNCTIONS
// ============================================================================

/**
 * Generate a certificate for a user when they complete a course
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course ID
 * @returns {Promise<Object>} Certificate data
 */
export async function generateCertificate(userId, courseId) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

  try {
    const response = await fetch(`${API_URL}/api/certificate/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, courseId }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate certificate');
    }

    return data.certificate;
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
}

/**
 * Get a specific certificate by ID
 * @param {string} certificateId - The certificate ID
 * @returns {Promise<Object>} Certificate data
 */
export async function getCertificate(certificateId) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

  try {
    const response = await fetch(`${API_URL}/api/certificate/${certificateId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch certificate');
    }

    return data.certificate;
  } catch (error) {
    console.error('Error fetching certificate:', error);
    throw error;
  }
}

/**
 * Get all certificates for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<Array>} Array of certificate objects
 */
export async function getUserCertificates(userId) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

  try {
    const response = await fetch(`${API_URL}/api/certificate/user/${userId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch certificates');
    }

    return data.certificates || [];
  } catch (error) {
    console.error('Error fetching user certificates:', error);
    throw error;
  }
}

/**
 * Verify a certificate by certificate number (for public verification)
 * @param {string} certificateNumber - The certificate number
 * @returns {Promise<Object>} Certificate data
 */
export async function verifyCertificate(certificateNumber) {
  const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

  try {
    const response = await fetch(`${API_URL}/api/certificate/verify/${certificateNumber}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify certificate');
    }

    return data.certificate;
  } catch (error) {
    console.error('Error verifying certificate:', error);
    throw error;
  }
}

/**
 * Check if a user has completed a course (all lessons marked complete)
 * @param {string} userId - The user's ID
 * @param {string} courseId - The course ID
 * @returns {Promise<boolean>} True if course is completed
 */
export async function checkCourseCompletion(userId, courseId) {
  try {
    // Get all completed lessons for this course
    const completedLessons = await getCompletedLessons(userId, courseId);

    // Get all lessons in the course from the database
    const { data: allLessons, error } = await supabase
      .from('lessons')
      .select('module_number, lesson_number')
      .eq('course_id', courseId);

    if (error) {
      console.error('Error fetching course lessons:', error);
      return false;
    }

    // Create a set of unique lesson identifiers for comparison
    const completedSet = new Set(
      completedLessons.map(l => `${l.module_number}-${l.lesson_number}`)
    );

    const allLessonsSet = new Set(
      allLessons.map(l => `${l.module_number}-${l.lesson_number}`)
    );

    // Check if all lessons are completed
    const isComplete = allLessons.every(lesson =>
      completedSet.has(`${lesson.module_number}-${lesson.lesson_number}`)
    );

    console.log('Course completion check:', {
      courseId,
      totalLessons: allLessons.length,
      completedLessons: completedLessons.length,
      isComplete
    });

    return isComplete;
  } catch (error) {
    console.error('Error checking course completion:', error);
    return false;
  }
}
