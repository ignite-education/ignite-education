import Link from 'next/link'
import type { BlogPost } from '@/types/blog'

interface BlogCardProps {
  post: BlogPost
  className?: string
}

export default function BlogCard({ post, className = '' }: BlogCardProps) {
  return (
    <Link href={`/blog/${post.slug}`} className="block h-full">
      <div className={className}>
        <div className="rounded-md overflow-hidden cursor-pointer group">
          {post.featured_image && (
            <div
              className="w-full overflow-hidden flex items-center justify-center"
              style={{ height: '387px' }}
            >
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="p-4 bg-white rounded-b-md flex items-center justify-between">
            <div className="flex-1 pr-3">
              <h3
                className="font-semibold text-gray-900 line-clamp-2"
                style={{ fontSize: '1.21rem', marginBottom: '0.1rem' }}
              >
                {post.title}
              </h3>
              <p className="text-black text-sm line-clamp-2">
                {post.excerpt}
              </p>
            </div>
            <div className="flex-shrink-0">
              <div
                className="bg-gray-200 rounded-md flex items-center justify-center"
                style={{ width: '35px', height: '35px' }}
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-600 group-hover:text-[#EF0B72] transition-colors"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
