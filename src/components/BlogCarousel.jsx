import { useState, useEffect, useRef } from 'react';
import BlogCard from './BlogCard';
import { getRecentPosts } from '../lib/blogApi';

const BlogCarousel = ({ limit = 5 }) => {
  const [posts, setPosts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef(null);

  useEffect(() => {
    fetchPosts();
  }, [limit]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRecentPosts(limit);
      setPosts(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading blog posts:', err);
      setError('Unable to load blog posts. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAutoPlaying && posts.length > 1) {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % posts.length);
      }, 5000);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, posts.length]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % posts.length);
    setIsAutoPlaying(false);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + posts.length) % posts.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  const handleCardClick = (post) => {
    window.open(`/blog/${post.slug}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#EF0B72]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 bg-white/5 rounded-lg p-6">
        <p className="text-gray-400 text-sm">Updates coming soon...</p>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 bg-white/5 rounded-lg p-6">
        <p className="text-gray-400">No blog posts available yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: '20rem' }}>
      <div className="relative overflow-hidden rounded-md">
        <div className="transition-all duration-500 ease-in-out">
          <BlogCard
            post={posts[currentIndex]}
            onClick={handleCardClick}
            className="min-h-[400px]"
          />
        </div>

        {posts.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200 hover:scale-110 z-10"
              aria-label="Previous post"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-200 hover:scale-110 z-10"
              aria-label="Next post"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {posts.length > 1 && (
        <div className="flex justify-center gap-3 mt-6">
          {posts.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'bg-[#EF0B72]'
                  : 'bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to post ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BlogCarousel;
