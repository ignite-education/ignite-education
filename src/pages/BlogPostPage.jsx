import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPostBySlug, formatDate } from '../lib/blogApi';
import SEO, { generateBlogPostStructuredData } from '../components/SEO';
import { Home, ChevronRight } from 'lucide-react';

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typedTitle, setTypedTitle] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    fetchPost();
  }, [slug]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollableHeight = documentHeight - windowHeight;
      const progress = (scrollTop / scrollableHeight) * 100;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Typing animation for title (75ms per character to match Auth page, 1 second delay)
  useEffect(() => {
    if (!post) return;

    let currentIndex = 0;
    const titleText = post.title;

    // Add 1 second delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (currentIndex <= titleText.length) {
          setTypedTitle(titleText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTypingComplete(true);
        }
      }, 75);
    }, 1000);

    return () => {};
  }, [post]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#EF0B72]"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
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
      <SEO
        title={post.meta_title || post.title}
        description={post.meta_description || post.excerpt}
        image={post.og_image || post.featured_image}
        url={fullUrl}
        type="article"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-black">
        {/* Sticky Top Navigation Bar with Progress Indicator */}
        <div className="sticky top-0 z-50 bg-black">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <Link to="/" className="inline-block">
              <div 
                className="w-32 h-10 bg-contain bg-no-repeat bg-left"
                style={{
                  backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)'
                }}
              />
            </Link>
          </div>
          {/* Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
            <div 
              className="h-full bg-[#EF0B72] transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        </div>

        {/* Hero Section with Black Background */}
        <div className="bg-black">
          <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Breadcrumb Navigation - Left aligned - 40% less gap */}
            <nav className="flex items-center gap-2 text-sm text-gray-400 mb-7">
              <Link to="/" className="hover:text-[#EF0B72] transition-colors flex items-center gap-1">
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-500">Posts</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-white truncate max-w-md">{post.title}</span>
            </nav>

            {/* Title with typing animation - Left aligned */}
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight text-left">
              {typedTitle}
              {!isTypingComplete && <span className="animate-pulse">|</span>}
            </h1>

            {/* Subtitle/Excerpt - Left aligned - Ignite Pink */}
            <p className="text-xl text-[#EF0B72] mb-6 leading-relaxed text-left">
              {post.excerpt}
            </p>

            {/* Meta Info: Date and Tag - Left aligned */}
            <div className="flex items-center gap-4 mb-12">
              <time className="text-gray-400 text-sm">
                {new Date(post.published_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </time>
              <span className="px-3 py-1 bg-[#EF0B72]/10 border border-[#EF0B72]/20 text-[#EF0B72] text-xs font-medium rounded-full">
                News
              </span>
            </div>
          </div>
        </div>

        {/* Featured Image with gradient transition */}
        {post.featured_image && (
          <div className="relative">
            <div className="max-w-5xl mx-auto px-6">
              <div className="relative rounded-lg overflow-hidden">
                <img
                  src={post.featured_image}
                  alt={post.title}
                  className="w-full h-auto object-cover"
                />
                {/* Gradient overlay at bottom half */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, transparent, white)'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* White Content Section */}
        <div className="bg-white">
          <div className="max-w-4xl mx-auto px-6 py-16">
            <article>
              {/* Article Body */}
              <div 
                className="prose prose-lg max-w-none"
                style={{
                  color: '#374151',
                  fontSize: '18px',
                  lineHeight: '1.8'
                }}
              >
                <style>{`
                  .prose h2 {
                    background-color: black;
                    color: white;
                    font-size: 1.5rem;
                    font-weight: 500;
                    padding: 0.35rem 0.5rem;
                    border-radius: 0.2rem;
                    max-width: 750px;
                    width: fit-content;
                    margin-top: 3rem;
                    margin-bottom: 1.5rem;
                  }
                  .prose h3 {
                    color: #111827;
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-top: 2.5rem;
                    margin-bottom: 1rem;
                  }
                  .prose p {
                    color: #374151;
                    margin-bottom: 1.5rem;
                  }
                  .prose ul, .prose ol {
                    margin-top: 1.5rem;
                    margin-bottom: 1.5rem;
                    padding-left: 1.5rem;
                  }
                  .prose li {
                    color: #374151;
                    margin-bottom: 0.75rem;
                  }
                  .prose strong {
                    color: #111827;
                    font-weight: 600;
                  }
                  .prose a {
                    color: #EF0B72;
                    text-decoration: none;
                    border-bottom: 1px solid #EF0B72;
                    transition: all 0.2s;
                  }
                  .prose a:hover {
                    color: #D10A64;
                    border-bottom-color: #D10A64;
                  }
                  .prose blockquote {
                    border-left: 4px solid #EF0B72;
                    padding-left: 1.5rem;
                    font-style: italic;
                    color: #6B7280;
                  }
                `}</style>
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </div>

              {/* Article Footer */}
              <div className="mt-16 pt-8 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  {/* Author Info */}
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
                      <p className="text-gray-900 font-semibold">{post.author_name}</p>
                      {post.author_role && (
                        <p className="text-gray-600 text-sm">{post.author_role}</p>
                      )}
                    </div>
                  </div>

                  {/* Back to Home Button */}
                  <Link
                    to="/"
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-900 rounded-lg transition-colors inline-flex items-center gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Back to Home
                  </Link>
                </div>
              </div>
            </article>
          </div>

          {/* Bottom Spacing */}
          <div className="h-24"></div>
        </div>
      </div>
    </>
  );
};

export default BlogPostPage;
