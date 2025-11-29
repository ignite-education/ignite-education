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
      className={`rounded-xl overflow-hidden cursor-pointer ${className}`}
    >
      {featured_image && (
        <div className="w-full" style={{ height: '240px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={featured_image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="p-4 bg-white rounded-b-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {title}
        </h3>

        <p className="text-gray-600 text-sm line-clamp-2">
          {excerpt}
        </p>
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
