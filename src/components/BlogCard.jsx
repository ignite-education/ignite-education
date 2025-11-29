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
      className={`rounded-md overflow-hidden cursor-pointer group ${className}`}
      style={{ width: '110%' }}
    >
      {featured_image && (
        <div className="w-full" style={{ height: '364px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-2" style={{ fontSize: '1.21rem' }}>
            {title}
          </h3>

          <p className="text-black text-sm line-clamp-2">
            {excerpt}
          </p>
        </div>
        <div className="flex-shrink-0">
          <div className="bg-black rounded-md flex items-center justify-center" style={{ width: '25px', height: '25px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white group-hover:text-[#EF0B72] transition-colors">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
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
