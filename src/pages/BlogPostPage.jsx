import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPostBySlug, formatDate } from '../lib/blogApi';
import SEO, { generateBlogPostStructuredData } from '../components/SEO';

/**
 * BlogPostPage - Individual blog post page with SEO optimization
 */
const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPostBySlug(slug);

      if (!data) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      setPost(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading blog post:', err);
      setError('Unable to load blog post. Please try again later.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#EF0B72]"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            {error === 'Post not found' ? '404 - Post Not Found' : 'Error Loading Post'}
          </h1>
          <p className="text-gray-400 mb-8">
            {error === 'Post not found'
              ? "The blog post you're looking for doesn't exist or has been removed."
              : 'Unable to load the blog post. Please try again later.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] text-white rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const fullUrl = `/blog/${post.slug}`;
  const structuredData = generateBlogPostStructuredData(post, fullUrl);

  return (
    <>
      {/* SEO Meta Tags */}
      <SEO
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        image={post.og_image || post.featured_image}
        url={fullUrl}
        type="article"
        structuredData={structuredData}
      />

      {/* Page Content */}
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        {/* Header Navigation */}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[#EF0B72] hover:text-[#D10A64] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Article Container */}
        <article className="max-w-4xl mx-auto px-4 pb-16">
          {/* Featured Image */}
          {post.featured_image && (
            <div className="mb-8 rounded-2xl overflow-hidden">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-auto max-h-[500px] object-cover"
              />
            </div>
          )}

          {/* Article Header */}
          <header className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Author and Date Info */}
            <div className="flex items-center gap-4 mb-6">
              {/* Author */}
              <div className="flex items-center gap-3">
                {post.author_avatar ? (
                  <img
                    src={post.author_avatar}
                    alt={post.author_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#EF0B72]/20 flex items-center justify-center">
                    <span className="text-[#EF0B72] text-lg font-bold">
                      {post.author_name.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-white font-semibold">{post.author_name}</p>
                  {post.author_role && (
                    <p className="text-gray-400 text-sm">{post.author_role}</p>
                  )}
                </div>
              </div>

              {/* Date */}
              <div className="ml-auto text-right">
                <p className="text-gray-400 text-sm">
                  {formatDate(post.published_at, 'long')}
                </p>
              </div>
            </div>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl text-gray-300 leading-relaxed italic border-l-4 border-[#EF0B72] pl-6">
                {post.excerpt}
              </p>
            )}
          </header>

          {/* Article Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <div
              className="text-gray-300 leading-relaxed space-y-6"
              style={{
                fontSize: '1.125rem',
                lineHeight: '1.75'
              }}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </div>

          {/* Article Footer */}
          <footer className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Last updated: {formatDate(post.updated_at, 'long')}
              </div>

              <Link
                to="/"
                className="px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] text-white rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Return Home
              </Link>
            </div>
          </footer>
        </article>
      </div>
    </>
  );
};

export default BlogPostPage;
