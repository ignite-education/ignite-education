import { supabase } from './supabase';

/**
 * Fetch all published release notes
 */
export const getPublishedReleases = async () => {
  try {
    const { data, error } = await supabase
      .from('release_notes')
      .select('*')
      .eq('status', 'published')
      .order('release_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching published releases:', error);
    throw error;
  }
};

/**
 * Fetch all release notes (for admin)
 */
export const getAllReleases = async () => {
  try {
    const { data, error } = await supabase
      .from('release_notes')
      .select('*')
      .order('release_date', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching all releases:', error);
    throw error;
  }
};

/**
 * Create a new release
 */
export const createRelease = async (releaseData) => {
  try {
    const { data, error } = await supabase
      .from('release_notes')
      .insert([releaseData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating release:', error);
    throw error;
  }
};

/**
 * Update an existing release
 */
export const updateRelease = async (id, releaseData) => {
  try {
    const { data, error } = await supabase
      .from('release_notes')
      .update(releaseData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating release:', error);
    throw error;
  }
};

/**
 * Delete a release
 */
export const deleteRelease = async (id) => {
  try {
    const { error } = await supabase
      .from('release_notes')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting release:', error);
    throw error;
  }
};

/**
 * Format a date for display
 */
export const formatReleaseDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};
