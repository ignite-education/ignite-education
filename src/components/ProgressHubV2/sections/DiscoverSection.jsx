import React from 'react';
import CourseCatalog from '../../CourseCatalog/CourseCatalog';

const DiscoverSection = () => {
  return (
    <section className="px-12 pb-10 bg-white" style={{ paddingTop: '45px' }}>
      <h2 className="text-black" style={{ fontSize: '2rem', fontWeight: 600, lineHeight: '1.2', letterSpacing: '-1%', marginBottom: '1rem' }}>Discover what's next</h2>
      <CourseCatalog variant="welcome" showHeader={false} showSearch={true} showDescriptions={true} />
    </section>
  );
};

export default DiscoverSection;
