import React from 'react';
import BlogCarousel from '../../BlogCarousel';

const BlogSection = () => {
  return (
    <section className="px-12 py-10 bg-black">
      <h2 className="font-bold text-white" style={{ fontSize: '2.4rem', lineHeight: '1.2', letterSpacing: '-1%', marginBottom: '1rem' }}>Latest from Ignite</h2>
      <BlogCarousel limit={5} />
    </section>
  );
};

export default BlogSection;
