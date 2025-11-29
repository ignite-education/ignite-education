import { Link } from 'react-router-dom';

const BlogCard = ({ post, className = '', onClick = null }) => {
  const {
    slug,
    title,
    excerpt,
    featured_image,
  } = post;

  const cardContent = (
    <div
      className={`bg-white/5 backdrop-blur-md rounded-xl overflow-hidden border border-white/10 hover:border-[#EF0B72]/50 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#EF0B72]/20 cursor-pointer h-full flex flex-col ${className}`}
    >
      {featured_image && (
        <div className="w-full bg-gray-900" style={{ height: '240px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={featured_image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4 bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>

        <p className="text-gray-600 text-sm line-clamp-2">
          {excerpt}
        </p>

        <div className="mt-3">
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
