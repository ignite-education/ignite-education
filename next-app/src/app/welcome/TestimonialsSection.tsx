'use client'

import { useState } from 'react'

const testimonials = [
  {
    quote: "Ignite helped me transition from marketing to product management. The practical projects and AI-powered feedback made all the difference.",
    name: "Sarah Chen",
    role: "Product Manager at TechCorp",
    avatar: null
  },
  {
    quote: "The cybersecurity course was exactly what I needed. Real-world scenarios and hands-on labs prepared me for my current role.",
    name: "James Mitchell",
    role: "Security Analyst at SecureNet",
    avatar: null
  },
  {
    quote: "I love that Ignite is free. The quality rivals paid platforms, and the certificate helped me land interviews.",
    name: "Priya Sharma",
    role: "Data Analyst at DataFlow",
    avatar: null
  }
]

const useCases = [
  { title: "Career Changers", description: "Switch industries with confidence using our practical, job-ready courses" },
  { title: "Students", description: "Complement your degree with in-demand tech skills" },
  { title: "Professionals", description: "Upskill to stay competitive in a rapidly changing market" },
  { title: "Entrepreneurs", description: "Learn essential skills to launch and grow your startup" }
]

export default function TestimonialsSection() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0)
  const [activeUseCase, setActiveUseCase] = useState(0)

  return (
    <section className="min-h-screen flex items-center justify-center px-8 bg-white py-16">
      <div className="max-w-7xl w-full">
        {/* Section Title */}
        <h3 className="text-3xl md:text-4xl font-bold text-black text-center mb-12">
          Ignite is for everyone.
          <br />
          <span className="text-[#EF0B72]">The curious, the committed, the ambitious.</span>
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Testimonials */}
          <div className="flex flex-col items-center">
            <div className="bg-[#F0F0F2] rounded-lg p-6 w-full max-w-md relative min-h-[14rem]">
              <p className="text-lg text-black text-center italic mb-8 testimonial-text">
                &ldquo;{testimonials[currentTestimonial].quote}&rdquo;
              </p>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#8200EA] flex items-center justify-center text-white font-bold">
                    {testimonials[currentTestimonial].name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-black">{testimonials[currentTestimonial].name}</div>
                    <div className="text-sm text-gray-600">{testimonials[currentTestimonial].role}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Testimonial Indicators */}
            <div className="flex gap-2 mt-4">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentTestimonial(idx)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    currentTestimonial === idx ? 'bg-[#EF0B72]' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Use Cases */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2">
              {useCases.map((useCase, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveUseCase(idx)}
                  className={`aspect-square rounded-lg p-3 text-left transition-all ${
                    activeUseCase === idx
                      ? 'bg-[#EF0B72] text-white'
                      : 'bg-[#F0F0F2] text-black hover:bg-gray-200'
                  }`}
                >
                  <span className="text-xs font-semibold">{useCase.title}</span>
                </button>
              ))}
            </div>
            <div className="bg-[#F0F0F2] rounded-lg p-4">
              <h4 className="font-semibold text-black mb-2">{useCases[activeUseCase].title}</h4>
              <p className="text-gray-600">{useCases[activeUseCase].description}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
