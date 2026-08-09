import { Link } from 'react-router-dom';

// `compact` matches the title/subtext type to the ProgressHubV2 lesson cards
const BlogCard = ({ post, className = '', onClick = null, compact = false }) => {
  const {
    slug,
    title,
    excerpt,
    featured_image,
  } = post;

  const cardContent = (
    <div className={className}>
      <div
        className="rounded-sm overflow-hidden cursor-pointer group"
      >
        {featured_image && (
          <div className="w-full blog-card-image-container" style={{ height: '279px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={featured_image}
              alt={title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        <div className="p-4 bg-white rounded-b-sm flex items-center justify-between">
          <div className="flex-1 pr-3">
            <h3
              className={`text-gray-900 line-clamp-2 ${compact ? 'text-[1rem] font-semibold lg:text-[1.1rem] lg:font-medium' : 'font-medium'}`}
              style={{ ...(compact ? {} : { fontSize: '1.21rem' }), marginBottom: '0.1rem' }}
            >
              {title}
            </h3>

            <p className={`text-black line-clamp-2 ${compact ? 'text-[0.9rem] font-light leading-[1.375]' : 'text-sm'}`}>
              {excerpt}
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="bg-gray-200 rounded-md flex items-center justify-center" style={{ width: '35px', height: '35px' }}>
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 group-hover:text-[#EF0B72] transition-colors">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
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
