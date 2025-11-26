import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../lib/blogApi';

const BlogCard = ({ post, className = '', onClick = null }) => {
  const {
    slug,
    title,
    excerpt,
    featured_image,
    author_name,
    author_avatar,
    published_at,
  } = post;

  const cardContent = (
    <div
      className={`bg-white/5 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 hover:border-[#EF0B72]/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#EF0B72]/20 cursor-pointer h-full flex flex-col ${className}`}
    >
      {featured_image && (
        <div className="w-full bg-gray-900" style={{ height: '200px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={featured_image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
          {title}
        </h3>

        <p className="text-gray-300 text-sm mb-4 line-clamp-3 flex-1">
          {excerpt}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            {author_avatar ? (
              <img
                src={author_avatar}
                alt={author_name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#EF0B72]/20 flex items-center justify-center">
                <span className="text-[#EF0B72] text-sm font-bold">
                  {author_name.charAt(0)}
                </span>
              </div>
            )}
            <span className="text-gray-400 text-sm">{author_name}</span>
          </div>

          <span className="text-gray-500 text-xs">
            {formatDate(published_at, 'short')}
          </span>
        </div>

        <div className="mt-4">
          <span className="text-[#EF0B72] text-sm font-semibold hover:text-[#D10A64] transition-colors inline-flex items-center gap-1">
            Read More
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <div onClick={() => onClick(post)} role="button" tabIndex={0}>
        {cardContent}
      </div>
    );
  }

  return (
    <Link to={`/blog/${slug}`} className="block h-full">
      {cardContent}
    </Link>
  );
};

export default BlogCard;
