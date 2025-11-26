import { supabase } from './supabase';

/**
 * Fetch all published blog posts
 */
export const getPublishedPosts = async (limit = null) => {
  try {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching published posts:', error);
    throw error;
  }
};

/**
 * Fetch a single blog post by slug
 */
export const getPostBySlug = async (slug) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`Error fetching post with slug "${slug}":`, error);
    throw error;
  }
};

/**
 * Fetch recent blog posts for carousel display
 */
export const getRecentPosts = async (count = 5) => {
  return getPublishedPosts(count);
};

/**
 * Format a date for display
 */
export const formatDate = (dateString, format = 'long') => {
  const date = new Date(dateString);

  if (format === 'short') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  if (format === 'long') {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return date.toLocaleDateString();
};
