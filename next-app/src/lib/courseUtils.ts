import type { Course, Module } from '@/types/course'

/**
 * Convert URL slug to possible database name formats for flexible matching
 */
export function slugToNameVariations(slug: string): string[] {
  return [
    slug,
    slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    slug.replace(/-/g, ' '),
  ]
}

/**
 * Get the display label for course type tag
 */
export function getCourseTypeLabel(course: Course): string {
  if (!course) return 'Course'

  const typeLabels: Record<string, string> = {
    'specialism': 'Specialism',
    'skill': 'Skill',
    'subject': 'Subject',
  }

  return typeLabels[course.course_type] || course.category || 'Course'
}

/**
 * Get the dynamic tagline based on course type
 */
export function getCourseTagline(course: Course): string {
  if (!course?.title) return "Learn with Ignite's free, expert-built course"

  const taglineTemplates: Record<string, string> = {
    'specialism': `Become a ${course.title} with Ignite's free, expert-built course`,
    'skill': `Upskill at ${course.title} with Ignite's free, expert-built course`,
    'subject': `Learn ${course.title} with Ignite's free, expert-built course`,
  }

  return taglineTemplates[course.course_type] || `Become a ${course.title} with Ignite's free, expert-built course`
}

/**
 * Get first two sentences of description
 */
export function getTwoSentences(description: string): string {
  if (!description) return ''
  const sentences = description.match(/[^.!?]*[.!?]+/g) || [description]
  return sentences.slice(0, 2).join('').trim()
}

/**
 * Generate contextual module intro based on module name and lesson content
 */
export function generateModuleIntro(module: Module): string {
  if (!module?.lessons || module.lessons.length === 0) {
    return 'Comprehensive content designed to enhance your skills. Build practical expertise in this essential area.'
  }

  const moduleName = module.name || ''
  const lessonNames = module.lessons.map(l => l.name.toLowerCase()).join(' ')
  const lowerModuleName = moduleName.toLowerCase()

  if (lowerModuleName.includes('foundation') || lowerModuleName.includes('fundamental')) {
    if (lessonNames.includes('role') || lessonNames.includes('responsibilit')) {
      return 'Master the core responsibilities and key competencies that define professional success in this field. Build essential knowledge of industry practices, methodologies, and best practices.'
    }
    if (lessonNames.includes('lifecycle') || lessonNames.includes('process')) {
      return 'Understand fundamental processes, workflows, and lifecycle management from start to finish. Develop a comprehensive framework for approaching work systematically and effectively.'
    }
    if (lessonNames.includes('stakeholder') || lessonNames.includes('management')) {
      return 'Learn essential principles of stakeholder engagement, relationship management, and collaborative work. Build foundational skills for effective communication and cross-functional cooperation.'
    }
    if (lessonNames.includes('research') || lessonNames.includes('analysis')) {
      return 'Develop fundamental research and analytical capabilities to gather insights and inform decisions. Master core methodologies for understanding problems and identifying solutions.'
    }
    return 'Build a comprehensive foundation in essential concepts, principles, and practices. Develop core competencies and fundamental knowledge that supports all advanced work in this field.'
  }

  if (lowerModuleName.includes('security') || lowerModuleName.includes('cybersecurity')) {
    if (lowerModuleName.includes('network')) {
      return 'Master network security principles, protocols, and defensive techniques to protect against cyber threats. Learn to implement firewalls, detect intrusions, and secure network infrastructure.'
    }
    if (lowerModuleName.includes('cloud')) {
      return 'Develop expertise in cloud security architecture, data protection, and compliance frameworks for modern environments. Learn to secure cloud deployments, manage access controls, and implement best practices.'
    }
    if (lowerModuleName.includes('ethical') || lowerModuleName.includes('penetration') || lowerModuleName.includes('testing')) {
      return 'Learn ethical hacking methodologies and penetration testing techniques to identify vulnerabilities before attackers do. Develop skills in reconnaissance, exploitation, and security assessment.'
    }
    if (lowerModuleName.includes('incident') || lowerModuleName.includes('response')) {
      return 'Master incident response procedures, threat detection, and recovery strategies for security breaches. Learn to investigate attacks, contain threats, and restore normal operations.'
    }
    if (lowerModuleName.includes('governance') || lowerModuleName.includes('compliance') || lowerModuleName.includes('risk')) {
      return 'Understand security governance frameworks, compliance requirements, and risk management methodologies. Learn to develop security policies, conduct audits, and ensure regulatory compliance.'
    }
    if (lowerModuleName.includes('threat') || lowerModuleName.includes('intelligence')) {
      return 'Develop threat intelligence capabilities to identify, analyze, and respond to emerging cyber threats. Learn to leverage threat data, assess risks, and implement proactive defenses.'
    }
    return 'Build comprehensive cybersecurity knowledge to protect systems, data, and networks from evolving threats. Develop practical skills in security implementation, monitoring, and incident management.'
  }

  if (lowerModuleName.includes('marketing') || lowerModuleName.includes('digital marketing')) {
    if (lowerModuleName.includes('social') || lowerModuleName.includes('social media')) {
      return 'Master social media marketing strategies, content creation, and community engagement techniques. Learn to build brand presence, drive engagement, and measure social media ROI.'
    }
    if (lowerModuleName.includes('seo') || lowerModuleName.includes('search')) {
      return 'Learn search engine optimization techniques to improve website visibility and organic traffic. Master keyword research, on-page optimization, and link building strategies.'
    }
    if (lowerModuleName.includes('content')) {
      return 'Develop content marketing expertise to create compelling stories that attract and engage audiences. Learn to plan, produce, and distribute content that drives business results.'
    }
    if (lowerModuleName.includes('analytics') || lowerModuleName.includes('measurement')) {
      return 'Master marketing analytics tools and techniques to measure campaign performance and ROI. Learn to interpret data, generate insights, and optimize marketing strategies.'
    }
    return 'Build comprehensive digital marketing skills to reach audiences, drive engagement, and achieve business goals. Learn to create integrated campaigns across multiple channels.'
  }

  if (lowerModuleName.includes('strategic') || lowerModuleName.includes('planning') || lowerModuleName.includes('thinking')) {
    if (lessonNames.includes('roadmap') || lessonNames.includes('vision')) {
      return 'Master strategic vision and roadmapping techniques to align product development with business objectives. Learn to identify market opportunities and translate them into actionable product strategies.'
    }
    if (lessonNames.includes('priorit')) {
      return 'Learn proven frameworks for strategic prioritization and effective resource allocation across product initiatives. Develop decision-making skills to balance competing demands and maximize business impact.'
    }
    return 'Develop strategic thinking capabilities for product planning, competitive positioning, and long-term business success. Master frameworks for analyzing market dynamics and creating winning product strategies.'
  }

  if (lowerModuleName.includes('execution') || lowerModuleName.includes('implementation') || lowerModuleName.includes('delivery')) {
    return 'Master practical execution strategies to turn plans into reality and deliver results on time. Learn agile methodologies, project management techniques, and ways to overcome common obstacles.'
  }

  if (lowerModuleName.includes('stakeholder') || lowerModuleName.includes('influence') || lowerModuleName.includes('leadership')) {
    return 'Develop strategies for effective stakeholder management, influence, and building consensus across diverse audiences. Learn to navigate complex organizational dynamics and secure buy-in for your initiatives.'
  }

  if (lowerModuleName.includes('market') || lowerModuleName.includes('research') || lowerModuleName.includes('customer')) {
    return 'Discover methodologies to understand market dynamics, customer needs, and competitive landscapes. Learn to conduct effective research that informs strategic decisions and product direction.'
  }

  if (lowerModuleName.includes('technical') || lowerModuleName.includes('tool')) {
    if (lessonNames.includes('python') || lessonNames.includes('code') || lessonNames.includes('programming')) {
      return 'Build hands-on technical skills with practical coding exercises and real-world implementation techniques. Develop proficiency in writing clean, efficient code for professional applications.'
    }
    return 'Gain proficiency in essential technical tools and methodologies used by industry professionals. Learn to leverage technology effectively for improved productivity and results.'
  }

  if (lowerModuleName.includes('analysis') || lowerModuleName.includes('data') || lowerModuleName.includes('analyt')) {
    if (lessonNames.includes('statistics') || lessonNames.includes('statistical')) {
      return 'Master statistical methods and analytical techniques to extract meaningful insights from complex datasets. Learn to apply rigorous mathematical approaches to solve real-world business problems.'
    }
    if (lessonNames.includes('sql') || lessonNames.includes('database')) {
      return 'Develop database querying skills and learn to manipulate, analyze, and extract valuable information from data sources. Master SQL fundamentals to efficiently retrieve and transform data for analysis.'
    }
    if (lessonNames.includes('visualization') || lessonNames.includes('visualisation')) {
      return 'Transform raw data into compelling visual stories that drive informed decision-making and stakeholder engagement. Learn to create clear, impactful charts and dashboards that communicate insights effectively.'
    }
    return 'Build analytical expertise through data-driven approaches, interpretation techniques, and evidence-based decision frameworks. Develop skills to turn data into actionable insights that drive business value.'
  }

  if (lowerModuleName.includes('design') || lowerModuleName.includes('ux') || lowerModuleName.includes('ui')) {
    if (lessonNames.includes('research') || lessonNames.includes('user research')) {
      return 'Discover user research methodologies to understand customer needs, behaviors, and pain points for better product outcomes. Learn to conduct interviews, usability tests, and gather insights that inform design decisions.'
    }
    if (lessonNames.includes('wireframe') || lessonNames.includes('prototype')) {
      return 'Learn to create effective wireframes and prototypes that communicate design concepts and validate solutions early. Master rapid prototyping techniques to test ideas and gather feedback before full development.'
    }
    return 'Explore user-centered design principles, interaction patterns, and best practices for creating intuitive digital experiences. Develop skills to design products that delight users and meet business objectives.'
  }

  if (lowerModuleName.includes('communication') || lowerModuleName.includes('presentation')) {
    if (lessonNames.includes('stakeholder')) {
      return 'Develop strategies for effective stakeholder management, influence, and building consensus across diverse audiences. Learn to navigate complex organizational dynamics and secure buy-in for your initiatives.'
    }
    return 'Enhance your ability to communicate complex ideas clearly, present with confidence, and engage stakeholders effectively. Master techniques for persuasive storytelling and impactful professional communication.'
  }

  if (lowerModuleName.includes('career') || lowerModuleName.includes('professional') || lowerModuleName.includes('development')) {
    if (lessonNames.includes('interview') || lessonNames.includes('job')) {
      return 'Prepare for career advancement with interview strategies, resume optimization, and techniques to stand out in the job market. Learn to showcase your skills effectively and navigate the hiring process with confidence.'
    }
    if (lessonNames.includes('portfolio')) {
      return 'Build a compelling professional portfolio that showcases your skills, projects, and value to potential employers. Learn to curate and present your work in ways that demonstrate impact and expertise.'
    }
    return 'Advance your professional journey with career development strategies, networking techniques, and industry success pathways. Build the skills and mindset needed to achieve your long-term career goals.'
  }

  if (lowerModuleName.includes('excel') || lowerModuleName.includes('spreadsheet')) {
    return 'Master spreadsheet analysis, formulas, and data manipulation techniques for efficient business intelligence and reporting. Learn advanced Excel features to automate workflows and create powerful analytical tools.'
  }

  if (lowerModuleName.includes('sql') || lowerModuleName.includes('database')) {
    return 'Learn to write powerful queries, manage databases, and extract insights from structured data using industry-standard SQL. Develop proficiency in data retrieval, joins, and aggregations for complex analytical tasks.'
  }

  if (lowerModuleName.includes('python')) {
    if (lessonNames.includes('pandas') || lessonNames.includes('numpy')) {
      return "Harness Python's data analysis libraries to clean, transform, and analyze datasets with professional-grade techniques. Master pandas and NumPy for efficient data manipulation and computational tasks."
    }
    return 'Develop Python programming skills for automation, data manipulation, and solving real-world analytical challenges. Learn to write efficient, scalable code for professional data analysis workflows.'
  }

  if (lowerModuleName.includes('business intelligence') || lowerModuleName.includes('bi')) {
    return 'Transform data into actionable business insights using modern BI tools, dashboards, and reporting frameworks. Learn to design and build analytics solutions that drive strategic decision-making.'
  }

  if (lowerModuleName.includes('metrics') || lowerModuleName.includes('measurement') || lowerModuleName.includes('kpi')) {
    return 'Learn to define, track, and analyze key performance indicators that measure product success and business impact. Develop data-driven approaches to make informed decisions and demonstrate value.'
  }

  if (lowerModuleName.includes('agile') || lowerModuleName.includes('scrum') || lowerModuleName.includes('sprint')) {
    return 'Master agile methodologies and frameworks for efficient product development and team collaboration. Learn to run effective sprints, manage backlogs, and deliver value iteratively.'
  }

  return 'Build comprehensive knowledge and practical skills in this essential professional domain. Develop expertise through hands-on learning and real-world application of key concepts.'
}
