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
      className={`rounded-md overflow-hidden cursor-pointer ${className}`}
    >
      {featured_image && (
        <div className="w-full" style={{ height: '331px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={featured_image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4 bg-white rounded-b-md flex items-center justify-between">
        <div className="flex-1 pr-3">
          <h3 className="font-bold text-gray-900 mb-1 line-clamp-2" style={{ fontSize: '1.21rem' }}>
            {title}
          </h3>

          <p className="text-black text-sm line-clamp-2">
            {excerpt}
          </p>
        </div>
        <div className="flex-shrink-0">
          <span className="bg-black hover:bg-[#EF0B72] transition-colors p-2 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
