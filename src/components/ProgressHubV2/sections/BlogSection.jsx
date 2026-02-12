import React from 'react';
import BlogCarousel from '../../BlogCarousel';

const BlogSection = () => {
  return (
    <section className="px-12 pb-10 bg-black" style={{ paddingTop: '45px' }}>
      <h2 className="text-white" style={{ fontSize: '2rem', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-1%', marginBottom: '1rem' }}>Latest from Ignite</h2>
      <BlogCarousel limit={5} />
    </section>
  );
};

export default BlogSection;
