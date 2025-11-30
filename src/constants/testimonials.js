/**
 * Course-specific testimonials
 * Add real testimonials here as students complete courses
 */
export const COURSE_TESTIMONIALS = {
  'product-manager': {
    quote: "Ignite gave me the confidence to change careers. Best decision I've made.",
    name: "Sarah Matthews",
    role: "Product Marketing Manager",
    avatar: "https://auth.ignite.education/storage/v1/object/public/assets/1.png"
  }
};

/**
 * Placeholder testimonial for courses without specific testimonials yet
 */
export const PLACEHOLDER_TESTIMONIAL = {
  quote: "Student testimonials coming soon as our learners complete this course.",
  name: "",
  role: "",
  avatar: "",
  isPlaceholder: true
};

/**
 * Get testimonial for a specific course
 * Returns course-specific testimonial if available, otherwise placeholder
 */
export const getTestimonialForCourse = (courseSlug) => {
  return COURSE_TESTIMONIALS[courseSlug] || PLACEHOLDER_TESTIMONIAL;
};
