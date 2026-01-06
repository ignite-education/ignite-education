import React from 'react';
import SEO from '../components/SEO';
import CourseCatalog from '../components/CourseCatalog';
import Footer from '../components/Footer';

const CourseCatalogPage = () => {
  return (
    <>
      <SEO
        title="Courses | Ignite Education"
        description="Explore free courses in Product Management, Cybersecurity, Data Analysis, and more. Find your specialism, skill, or subject to start learning today."
        url="https://ignite.education/courses"
      />
      <CourseCatalog variant="full" />
      <Footer />
    </>
  );
};

export default CourseCatalogPage;
