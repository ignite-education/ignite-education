'use client'

import { useEffect, useState } from 'react'

interface Lesson {
  name: string
}

interface Module {
  name: string
  lessons?: Lesson[]
}

interface Coach {
  name: string
  position?: string
  description?: string
  image_url?: string
  linkedin_url?: string
}

interface Course {
  name: string
  title?: string
  description?: string
  status: string
  course_type?: string
  module_structure?: Module[]
}

interface CourseModalProps {
  course: Course
  coaches: Coach[]
  onClose: () => void
}

function generateModuleIntro(module: Module): string {
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
    if (lowerModuleName.includes('network')) return 'Master network security principles, protocols, and defensive techniques to protect against cyber threats. Learn to implement firewalls, detect intrusions, and secure network infrastructure.'
    if (lowerModuleName.includes('cloud')) return 'Develop expertise in cloud security architecture, data protection, and compliance frameworks for modern environments. Learn to secure cloud deployments, manage access controls, and implement best practices.'
    if (lowerModuleName.includes('ethical') || lowerModuleName.includes('penetration') || lowerModuleName.includes('testing')) return 'Learn ethical hacking methodologies and penetration testing techniques to identify vulnerabilities before attackers do. Develop skills in reconnaissance, exploitation, and security assessment.'
    if (lowerModuleName.includes('incident') || lowerModuleName.includes('response')) return 'Master incident response procedures, threat detection, and recovery strategies for security breaches. Learn to investigate attacks, contain threats, and restore normal operations.'
    if (lowerModuleName.includes('governance') || lowerModuleName.includes('compliance') || lowerModuleName.includes('risk')) return 'Understand security governance frameworks, compliance requirements, and risk management methodologies. Learn to develop security policies, conduct audits, and ensure regulatory compliance.'
    if (lowerModuleName.includes('threat') || lowerModuleName.includes('intelligence')) return 'Develop threat intelligence capabilities to identify, analyze, and respond to emerging cyber threats. Learn to leverage threat data, assess risks, and implement proactive defenses.'
    return 'Build comprehensive cybersecurity knowledge to protect systems, data, and networks from evolving threats. Develop practical skills in security implementation, monitoring, and incident management.'
  }

  if (lowerModuleName.includes('strategic') || lowerModuleName.includes('planning') || lowerModuleName.includes('thinking')) {
    if (lessonNames.includes('roadmap') || lessonNames.includes('vision')) return 'Master strategic vision and roadmapping techniques to align product development with business objectives. Learn to identify market opportunities and translate them into actionable product strategies.'
    if (lessonNames.includes('priorit')) return 'Learn proven frameworks for strategic prioritization and effective resource allocation across product initiatives. Develop decision-making skills to balance competing demands and maximize business impact.'
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
    if (lessonNames.includes('python') || lessonNames.includes('code') || lessonNames.includes('programming')) return 'Build hands-on technical skills with practical coding exercises and real-world implementation techniques. Develop proficiency in writing clean, efficient code for professional applications.'
    return 'Gain proficiency in essential technical tools and methodologies used by industry professionals. Learn to leverage technology effectively for improved productivity and results.'
  }

  if (lowerModuleName.includes('analysis') || lowerModuleName.includes('data') || lowerModuleName.includes('analyt')) {
    if (lessonNames.includes('statistics') || lessonNames.includes('statistical')) return 'Master statistical methods and analytical techniques to extract meaningful insights from complex datasets. Learn to apply rigorous mathematical approaches to solve real-world business problems.'
    if (lessonNames.includes('sql') || lessonNames.includes('database')) return 'Develop database querying skills and learn to manipulate, analyze, and extract valuable information from data sources. Master SQL fundamentals to efficiently retrieve and transform data for analysis.'
    if (lessonNames.includes('visualization') || lessonNames.includes('visualisation')) return 'Transform raw data into compelling visual stories that drive informed decision-making and stakeholder engagement. Learn to create clear, impactful charts and dashboards that communicate insights effectively.'
    return 'Build analytical expertise through data-driven approaches, interpretation techniques, and evidence-based decision frameworks. Develop skills to turn data into actionable insights that drive business value.'
  }

  if (lowerModuleName.includes('design') || lowerModuleName.includes('ux') || lowerModuleName.includes('ui')) {
    if (lessonNames.includes('research') || lessonNames.includes('user research')) return 'Discover user research methodologies to understand customer needs, behaviors, and pain points for better product outcomes. Learn to conduct interviews, usability tests, and gather insights that inform design decisions.'
    if (lessonNames.includes('wireframe') || lessonNames.includes('prototype')) return 'Learn to create effective wireframes and prototypes that communicate design concepts and validate solutions early. Master rapid prototyping techniques to test ideas and gather feedback before full development.'
    return 'Explore user-centered design principles, interaction patterns, and best practices for creating intuitive digital experiences. Develop skills to design products that delight users and meet business objectives.'
  }

  if (lowerModuleName.includes('communication') || lowerModuleName.includes('presentation')) {
    return 'Enhance your ability to communicate complex ideas clearly, present with confidence, and engage stakeholders effectively. Master techniques for persuasive storytelling and impactful professional communication.'
  }

  if (lowerModuleName.includes('career') || lowerModuleName.includes('professional') || lowerModuleName.includes('development')) {
    if (lessonNames.includes('interview') || lessonNames.includes('job')) return 'Prepare for career advancement with interview strategies, resume optimization, and techniques to stand out in the job market. Learn to showcase your skills effectively and navigate the hiring process with confidence.'
    if (lessonNames.includes('portfolio')) return 'Build a compelling professional portfolio that showcases your skills, projects, and value to potential employers. Learn to curate and present your work in ways that demonstrate impact and expertise.'
    return 'Advance your professional journey with career development strategies, networking techniques, and industry success pathways. Build the skills and mindset needed to achieve your long-term career goals.'
  }

  if (lowerModuleName.includes('excel') || lowerModuleName.includes('spreadsheet')) return 'Master spreadsheet analysis, formulas, and data manipulation techniques for efficient business intelligence and reporting. Learn advanced Excel features to automate workflows and create powerful analytical tools.'
  if (lowerModuleName.includes('sql') || lowerModuleName.includes('database')) return 'Learn to write powerful queries, manage databases, and extract insights from structured data using industry-standard SQL. Develop proficiency in data retrieval, joins, and aggregations for complex analytical tasks.'
  if (lowerModuleName.includes('python')) return 'Develop Python programming skills for automation, data manipulation, and solving real-world analytical challenges. Learn to write efficient, scalable code for professional data analysis workflows.'
  if (lowerModuleName.includes('business intelligence') || lowerModuleName.includes('bi')) return 'Transform data into actionable business insights using modern BI tools, dashboards, and reporting frameworks. Learn to design and build analytics solutions that drive strategic decision-making.'
  if (lowerModuleName.includes('metrics') || lowerModuleName.includes('measurement') || lowerModuleName.includes('kpi')) return 'Learn to define, track, and analyze key performance indicators that measure product success and business impact. Develop data-driven approaches to make informed decisions and demonstrate value.'
  if (lowerModuleName.includes('agile') || lowerModuleName.includes('scrum') || lowerModuleName.includes('sprint')) return 'Master agile methodologies and frameworks for efficient product development and team collaboration. Learn to run effective sprints, manage backlogs, and deliver value iteratively.'
  if (lowerModuleName.includes('health') || lowerModuleName.includes('medical') || lowerModuleName.includes('patient')) return 'Build essential healthcare knowledge and patient care skills for professional practice. Develop competencies in assessment, intervention, and collaborative healthcare delivery.'
  if (lowerModuleName.includes('energy') || lowerModuleName.includes('renewable') || lowerModuleName.includes('solar') || lowerModuleName.includes('green')) return 'Develop expertise in renewable energy technologies, sustainable practices, and green solutions. Learn to design and implement clean energy systems that reduce environmental impact.'
  if (lowerModuleName.includes('marketing') || lowerModuleName.includes('digital marketing')) return 'Build comprehensive digital marketing skills to reach audiences, drive engagement, and achieve business goals. Learn to create integrated campaigns across multiple channels.'

  return 'Build comprehensive knowledge and practical skills in this essential professional domain. Develop expertise through hands-on learning and real-world application of key concepts.'
}

export default function CourseModal({ course, coaches, onClose }: CourseModalProps) {
  const [typedTitle, setTypedTitle] = useState('')

  // Typing animation for modal title (matches Vite: 75ms/char, 1s start delay)
  useEffect(() => {
    const title = course.title || course.name
    let currentIndex = 0
    setTypedTitle('')

    const typeNextChar = () => {
      if (currentIndex < title.length) {
        currentIndex++
        setTypedTitle(title.substring(0, currentIndex))
        setTimeout(typeNextChar, 75)
      }
    }

    const startTimeout = setTimeout(typeNextChar, 1000)
    return () => clearTimeout(startTimeout)
  }, [course.title, course.name])

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Course type tag label
  const typeLabels: Record<string, string> = { specialism: 'Specialism', skill: 'Skill', subject: 'Subject' }
  const courseTypeLabel = typeLabels[course.course_type || ''] || 'Course'

  // Dynamic tagline based on course type
  const title = course.title || course.name
  const taglineMap: Record<string, string> = {
    specialism: `Become a ${title} with Ignite's free, expert-led course.`,
    skill: `Upskill at ${title} with Ignite's free, expert-led course.`,
    subject: `Learn ${title} with Ignite's free, expert-led course.`
  }
  const tagline = taglineMap[course.course_type || ''] || `Become a ${title} with Ignite's free, expert-led course.`

  // First 2 sentences of description (matches course page's getTwoSentences)
  const description = course.description || ''
  const sentences = description.match(/[^.!?]*[.!?]+/g) || [description]
  const twoSentences = sentences.slice(0, 2).join('').trim()
  const courseSlug = course.name?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div
      className="fixed inset-0 flex items-center justify-center backdrop-blur-sm animate-fadeIn"
      style={{ background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.6))', zIndex: 9999 }}
      onClick={onClose}
    >
      <div className="relative auth-course-modal-container">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute text-white hover:text-gray-300 z-10"
          style={{ top: '-2rem', right: '0' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div
          className="relative flex flex-col animate-scaleUp auth-course-modal overflow-y-auto"
          style={{ width: '720px', height: '70vh', borderRadius: '6px', scrollbarWidth: 'none' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Black Header */}
          <div className="bg-black relative text-center" style={{ paddingTop: '2.4rem', paddingBottom: '2.5rem', paddingLeft: '3rem', paddingRight: '3rem' }}>
            {/* Course Type Tag */}
            <span
              className="inline-block px-2 py-1 text-sm bg-white rounded-sm font-medium text-gray-600"
              style={{ letterSpacing: '-0.02em', marginBottom: '24px' }}
            >
              {courseTypeLabel}
            </span>

            {/* Course Title */}
            <h2 className="font-bold text-white" style={{ fontSize: '2.3rem', letterSpacing: '-0.02em', marginBottom: '10px', lineHeight: 'tight' }}>
              <span style={{ display: 'inline-block', textAlign: 'left' }}>
                {typedTitle}
                {typedTitle.length < (course.title || course.name).length && (
                  <span style={{ opacity: 0 }}>{(course.title || course.name).substring(typedTitle.length)}</span>
                )}
              </span>
            </h2>

            {/* Dynamic Tagline */}
            <p className="text-[#EF0B72] font-semibold leading-relaxed" style={{ fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
              {tagline}
            </p>
          </div>

          {/* White Content */}
          <div className="bg-white px-8" style={{ paddingTop: '1.5rem', paddingBottom: '1.25rem' }}>
            <div>
              {/* Description - first 2 sentences (matches course page) */}
              {twoSentences && (
                <div className="text-black leading-relaxed mb-6 text-center mx-auto" style={{ maxWidth: '90%' }}>
                  <span style={{ fontWeight: 400, fontSize: '15px' }}>
                    {twoSentences}
                  </span>
                  <br />
                  <a
                    href={`/courses/${courseSlug}`}
                    className="font-medium text-black hover:text-[#EF0B72] transition-colors"
                    style={{ fontSize: '15px', textDecoration: 'none' }}
                  >
                    Learn more &gt;
                  </a>
                </div>
              )}

              {/* Benefits */}
              <div className="mb-8 grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                  </div>
                  <span className="text-sm text-black leading-tight">Certificate upon<br />completion</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-black leading-tight">Built by<br />industry experts</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="mb-2">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF0B72" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-sm text-black leading-tight">Self-paced<br />learning</span>
                </div>
              </div>

              {/* Curriculum */}
              {course.module_structure && Array.isArray(course.module_structure) && course.module_structure.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900" style={{ fontSize: '22px', marginBottom: '0.5rem' }}>
                    Curriculum
                  </h3>
                  <div style={{ marginLeft: '-2rem', marginRight: '-2rem', backgroundColor: '#F0F0F2', paddingTop: '1.2rem', paddingRight: '2rem', paddingBottom: '2rem', paddingLeft: '2rem' }}>
                    <div className="space-y-6">
                      {course.module_structure.map((module, moduleIndex) => (
                        <div key={moduleIndex}>
                          <h4 className="font-semibold mb-1" style={{ fontSize: '18px', color: '#7714E0' }}>
                            Module {moduleIndex + 1} - {module.name}
                          </h4>
                          <div>
                            <p className="text-gray-900 mb-3" style={{ fontSize: '15px' }}>
                              {generateModuleIntro(module)}
                            </p>
                            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0', paddingLeft: '0.4rem' }}>
                              {(module.lessons || []).map((lesson, lessonIndex) => (
                                <li key={lessonIndex} className="flex items-center gap-2" style={{ fontSize: '14px' }}>
                                  <span className="text-gray-900" style={{ fontSize: '0.5em' }}>&#9632;</span>
                                  <span className="font-medium text-gray-900">{lesson.name}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Quote */}
              {course.status === 'live' && (
                <div className="mb-6 p-6 rounded-lg" style={{ backgroundColor: '#F0F0F2' }}>
                  <p className="text-black text-lg font-medium">
                    &ldquo;The Product Manager course was great! For someone new to the topic, this is a great introduction and allowed me to connect with the community&rdquo;
                  </p>
                </div>
              )}

              {/* Coaches */}
              {coaches.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3" style={{ fontSize: '22px' }}>
                    Course Leaders
                  </h3>
                  <div className="flex flex-col gap-4">
                    {coaches.map((coach, index) => {
                      const content = (
                        <>
                          {coach.image_url ? (
                            <img
                              src={coach.image_url}
                              alt={`${coach.name}${coach.position ? `, ${coach.position}` : ''} - Course instructor at Ignite Education`}
                              className="w-16 h-16 rounded object-cover flex-shrink-0"
                              loading="lazy"
                              width={64}
                              height={64}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded bg-gray-200 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-black" style={{ fontSize: '14px', lineHeight: '1.3', marginBottom: '0px' }}>
                              {coach.name}
                            </h4>
                            {coach.position && (
                              <p className="text-black font-medium" style={{ fontSize: '12px', lineHeight: '1.3', opacity: 0.9, marginBottom: '2px' }}>
                                {coach.position}
                              </p>
                            )}
                            {coach.description && (
                              <p className="text-black" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                                {coach.description}
                              </p>
                            )}
                          </div>
                        </>
                      )

                      return coach.linkedin_url ? (
                        <a key={index} href={coach.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex gap-4 items-start group">
                          {content}
                        </a>
                      ) : (
                        <div key={index} className="flex gap-4 items-start">
                          {content}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Get Started Button */}
              <div className="mt-6">
                <a
                  href={course.status === 'coming_soon' ? '/sign-in' : '/sign-in'}
                  className="block w-full font-semibold py-3 rounded-lg transition text-center bg-[#EF0B72] text-white hover:bg-[#D50A65]"
                >
                  {course.status === 'coming_soon' ? 'Register Interest' : 'Get Started'}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
