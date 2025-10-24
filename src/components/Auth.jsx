import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProgressHub from './ProgressHub';
import Onboarding from './Onboarding';
import { ChevronDown } from 'lucide-react';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState(null);
  const marketingSectionRef = useRef(null);
  const [animateWords, setAnimateWords] = useState(false);
  const [activeCard, setActiveCard] = useState(0);

  const { user, signIn, signUp, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users away from auth page
  useEffect(() => {
    if (user && !showOnboarding) {
      navigate('/progress', { replace: true });
    }
  }, [user, navigate, showOnboarding]);

  // Intersection observer for animating words when section comes into view
  useEffect(() => {
    if (!marketingSectionRef.current || isLogin) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animateWords) {
            setAnimateWords(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(marketingSectionRef.current);

    return () => {
      if (marketingSectionRef.current) {
        observer.unobserve(marketingSectionRef.current);
      }
    };
  }, [isLogin, animateWords]);

  // Auto-rotate through cards
  useEffect(() => {
    if (!animateWords || isLogin) return;

    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % 3); // Rotate through 0, 1, 2
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [animateWords, isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        navigate('/progress');
      } else {
        const result = await signUp(email, password, firstName, lastName);
        // Show onboarding for new signups
        setNewUserId(result.user.id);
        setShowOnboarding(true);
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    setError('');
    setLoading(true);

    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError(err.message || 'An error occurred with OAuth sign in');
      setLoading(false);
    }
  };

  const scrollToMarketing = () => {
    marketingSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  // Show onboarding if user just signed up
  if (showOnboarding) {
    return <Onboarding firstName={firstName} userId={newUserId} />;
  }

  return (
    <>
      {/* Background - Progress Hub */}
      <div
        style={{
          filter: 'blur(2px)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'fadeIn 1s ease-out forwards'
        }}
      >
        <ProgressHub />
      </div>

      {/* Auth Overlay - Scrollable Container */}
      <div
        className="fixed inset-0 backdrop-blur-sm animate-fadeIn overflow-y-auto"
        style={{
          background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0.75))',
          animation: 'fadeIn 0.2s ease-out',
          zIndex: 50,
          scrollBehavior: 'smooth',
          scrollSnapType: 'y mandatory'
        }}
      >
      {/* First Section - Auth Form */}
      <div className="min-h-screen flex items-start justify-center px-4 sm:px-6 lg:px-8" style={{ paddingTop: '8.1vh', paddingBottom: '2vh', scrollSnapAlign: 'start' }}>
      <div className="relative w-full" style={{ maxWidth: '533px' }}>
        {/* Logo */}
        <div
          className="mx-auto"
          style={{
            backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            width: 'clamp(100px, 25vw, 140px)',
            height: 'clamp(32px, 8vw, 44.8px)',
            marginBottom: 'clamp(0.88rem, 4.4vh, 1.76rem)'
          }}
        />

        {/* Tagline - on both sign in and create account pages */}
        <h1 className="text-lg sm:text-xl font-semibold text-white text-center px-2" style={{ paddingTop: '0.25rem', paddingBottom: '0.25rem', marginBottom: 'clamp(0.5rem, 1.5vh, 1rem)', lineHeight: '1.2', fontSize: 'clamp(18px, 4vw, 26px)' }}>
          Upskill. Reskill.<br /><span className="text-pink-500">Get ready for what's next.</span>
        </h1>

        {/* Title above the box */}
        <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white pl-1" style={{ marginBottom: '0.15rem' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        {/* Form Card */}
        <div
          className="bg-white text-black px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-4"
          style={{
            animation: 'scaleUp 0.2s ease-out',
            borderRadius: '0.3rem'
          }}
        >

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
            <button
              type="button"
              onClick={() => handleOAuthSignIn('google')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-300 text-gray-700 rounded-xl px-3 py-1.5 sm:py-2 text-sm hover:bg-gray-50 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="truncate">Continue with Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthSignIn('linkedin_oidc')}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#0077B5] text-white rounded-xl px-3 py-1.5 sm:py-2 text-sm hover:bg-[#006097] transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="truncate">Continue with LinkedIn</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative" style={{ marginBottom: '0.625rem' }}>
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 sm:gap-2">
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 transition-all duration-200 ${isLogin ? 'opacity-0 h-0 overflow-hidden pointer-events-none' : 'opacity-100'}`}>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-0.5">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-gray-100 text-black px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-lg"
                  placeholder="John"
                  disabled={isLogin}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-0.5">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required={!isLogin}
                  className="w-full bg-gray-100 text-black px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 rounded-lg"
                  placeholder="Doe"
                  disabled={isLogin}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-0.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-100 text-black px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium mb-0.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-gray-100 text-black px-3 py-1.5 sm:py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-lg"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pink-500 text-white rounded-xl px-4 py-1.5 sm:py-2 text-sm font-semibold hover:bg-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
            </button>
          </form>

          <div className="text-center" style={{ marginTop: '0.5rem' }}>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-black hover:text-pink-500 transition"
              style={{ fontSize: '0.85em' }}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        {/* Scroll Down Arrow - visible on both sign in and create account */}
        <div className="flex justify-center mt-10 sm:mt-12 mb-2">
          <button
            onClick={scrollToMarketing}
            className="bg-white rounded-full hover:bg-gray-100 transition shadow-lg group"
            style={{
              animation: 'subtleBounce 2s infinite',
              padding: '8px'
            }}
            aria-label="Scroll to learn more"
          >
            <ChevronDown size={18} className="text-black group-hover:text-pink-500 transition" />
          </button>
        </div>
      </div>
      </div>

      {/* Second Section - Marketing Content (visible for both sign in and create account) */}
        <div
          ref={marketingSectionRef}
          className="min-h-screen flex items-start justify-center px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 lg:pt-24"
          style={{
            background: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.8))',
            scrollSnapAlign: 'start'
          }}
        >
          <div className="max-w-4xl w-full text-white text-left">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold px-4 leading-tight">
              We believe education should be{' '}
              <span
                className={animateWords ? 'animate-colorFade' : 'text-white'}
                style={{ animationDelay: '0.3s' }}
              >
                accessible
              </span>,{' '}
              <span
                className={animateWords ? 'animate-colorFade' : 'text-white'}
                style={{ animationDelay: '0.6s' }}
              >
                personalised
              </span>{' '}
              and{' '}
              <span
                className={animateWords ? 'animate-colorFade' : 'text-white'}
                style={{ animationDelay: '0.9s' }}
              >
                integrated
              </span>{' '}
              for everyone.
            </h2>

            <div className="mt-8 px-4 space-y-2 text-sm sm:text-base text-white">
              <p
                className={animateWords ? 'animate-slideUp' : 'opacity-0'}
                style={{ animationDelay: '1.2s', animationFillMode: 'forwards' }}
              >
                <span className="font-semibold text-white">Accessible</span> - Ignite is completely free with no educational prerequisite.
              </p>
              <p
                className={animateWords ? 'animate-slideUp' : 'opacity-0'}
                style={{ animationDelay: '1.4s', animationFillMode: 'forwards' }}
              >
                <span className="font-semibold text-white">Personalised:</span> Tailored tutoring though personalised feedback and 1:1 support
              </p>
              <p
                className={animateWords ? 'animate-slideUp' : 'opacity-0'}
                style={{ animationDelay: '1.6s', animationFillMode: 'forwards' }}
              >
                <span className="font-semibold text-white">Integrated:</span> Built by industry experts for in-demand skills and knowledge
              </p>
            </div>

            {/* Courses Section */}
            <div className="mt-16 px-4">
              <h3
                className={animateWords ? 'animate-slideUp text-2xl sm:text-3xl font-semibold text-white mb-4' : 'opacity-0'}
                style={{ animationDelay: '1.8s', animationFillMode: 'forwards' }}
              >
                See yourself as a
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Course Card 1 */}
                <div
                  className={animateWords ? 'animate-slideUp bg-white rounded-lg p-6 shadow-lg' : 'opacity-0'}
                  style={{ animationDelay: '2s', animationFillMode: 'forwards' }}
                >
                  <h4 className="text-lg font-semibold text-black mb-2">Product Management Fundamentals</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="px-2 py-1 bg-gray-100 rounded">Basic</span>
                    <span>8 hrs</span>
                  </div>
                  <p className="text-gray-700 text-sm mb-4">
                    Master the fundamentals of product management, from strategy to execution.
                  </p>
                  <button className="text-pink-500 font-semibold text-sm hover:text-pink-600 transition flex items-center gap-1">
                    See Details →
                  </button>
                  <div className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                </div>

                {/* Course Card 2 */}
                <div
                  className={animateWords ? 'animate-slideUp bg-white rounded-lg p-6 shadow-lg' : 'opacity-0'}
                  style={{ animationDelay: '2.15s', animationFillMode: 'forwards' }}
                >
                  <h4 className="text-lg font-semibold text-black mb-2">Data-Driven Decision Making</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="px-2 py-1 bg-gray-100 rounded">Intermediate</span>
                    <span>6 hrs</span>
                  </div>
                  <p className="text-gray-700 text-sm mb-4">
                    Learn how to leverage data and analytics to drive product decisions.
                  </p>
                  <button className="text-pink-500 font-semibold text-sm hover:text-pink-600 transition flex items-center gap-1">
                    See Details →
                  </button>
                  <div className="mt-4 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded"></div>
                </div>

                {/* Course Card 3 */}
                <div
                  className={animateWords ? 'animate-slideUp bg-white rounded-lg p-6 shadow-lg' : 'opacity-0'}
                  style={{ animationDelay: '2.3s', animationFillMode: 'forwards' }}
                >
                  <h4 className="text-lg font-semibold text-black mb-2">Agile Product Development</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <span className="px-2 py-1 bg-gray-100 rounded">Intermediate</span>
                    <span>5 hrs</span>
                  </div>
                  <p className="text-gray-700 text-sm mb-4">
                    Build products iteratively using agile methodologies and best practices.
                  </p>
                  <button className="text-pink-500 font-semibold text-sm hover:text-pink-600 transition flex items-center gap-1">
                    See Details →
                  </button>
                  <div className="mt-4 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded"></div>
                </div>
              </div>
            </div>

            {/* Learning Model Section */}
            <div className="mt-20 px-4">
              <h3
                className={animateWords ? 'animate-slideUp text-2xl sm:text-3xl font-semibold text-white text-left mb-6' : 'opacity-0'}
                style={{ animationDelay: '2.5s', animationFillMode: 'forwards' }}
              >
                Building a smarter, more personalised era of education.
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Left Column - Feature Cards */}
                <div className="space-y-6">
                  {/* Card 1 - Hands-on */}
                  <div
                    className={`${animateWords ? 'animate-slideUp' : 'opacity-0'} rounded-lg p-6 transition-all duration-500 ${
                      activeCard === 0
                        ? 'bg-white shadow-xl scale-105'
                        : 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-gray-700'
                    }`}
                    style={{ animationDelay: '2.7s', animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-pink-500 rounded-full p-2 flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className={`font-semibold text-lg mb-2 ${activeCard === 0 ? 'text-black' : 'text-white'}`}>
                          Hands-on, interactive courses
                        </h4>
                        <p className={`text-sm ${activeCard === 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                          Short videos are broken up by interactive exercises. Practice new skills immediately to retain information.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2 - Real-world projects */}
                  <div
                    className={`${animateWords ? 'animate-slideUp' : 'opacity-0'} rounded-lg p-6 transition-all duration-500 ${
                      activeCard === 1
                        ? 'bg-white shadow-xl scale-105'
                        : 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-gray-700'
                    }`}
                    style={{ animationDelay: '2.85s', animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="bg-green-500 rounded-full p-2 flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <h4 className={`font-semibold text-lg mb-2 ${activeCard === 1 ? 'text-black' : 'text-white'}`}>
                          Real-world projects
                        </h4>
                        <p className={`text-sm mb-4 ${activeCard === 1 ? 'text-gray-700' : 'text-gray-300'}`}>
                          Apply your learning in real situations, perfect for developing practical skills and building up your portfolio.
                        </p>
                        {activeCard === 1 && (
                          <button className="border-2 border-black text-black font-semibold px-4 py-2 rounded hover:bg-black hover:text-white transition text-sm">
                            Explore Projects →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card 3 - Certified professional */}
                  <div
                    className={`${animateWords ? 'animate-slideUp' : 'opacity-0'} rounded-lg p-6 transition-all duration-500 ${
                      activeCard === 2
                        ? 'bg-white shadow-xl scale-105'
                        : 'bg-gray-800 bg-opacity-50 backdrop-blur-sm border border-gray-700'
                    }`}
                    style={{ animationDelay: '3s', animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-purple-500 rounded-full p-2 flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className={`font-semibold text-lg mb-2 ${activeCard === 2 ? 'text-black' : 'text-white'}`}>
                          Become a certified professional
                        </h4>
                        <p className={`text-sm ${activeCard === 2 ? 'text-gray-700' : 'text-gray-300'}`}>
                          Prove you're job-ready. Earn industry-leading certifications built around in-demand roles.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Portfolio Preview */}
                <div
                  className={animateWords ? 'animate-slideUp flex items-center justify-center' : 'opacity-0'}
                  style={{ animationDelay: '2.7s', animationFillMode: 'forwards' }}
                >
                  <div className="bg-gray-800 bg-opacity-70 backdrop-blur-sm rounded-xl p-8 border border-gray-600 w-full max-w-md">
                    <h3 className="text-3xl sm:text-4xl font-semibold mb-4">
                      Build a <span className="text-green-400">career portfolio</span>
                    </h3>
                    <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                      <div className="mb-4 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Project Workspace</span>
                        <div className="flex gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm font-mono">
                        <div className="text-purple-400">// Building your portfolio</div>
                        <div className="text-gray-300">const <span className="text-blue-400">skills</span> = <span className="text-yellow-400">'Product Management'</span>;</div>
                        <div className="text-gray-300">const <span className="text-blue-400">projects</span> = <span className="text-yellow-400">completed</span>;</div>
                        <div className="text-gray-300">const <span className="text-blue-400">certification</span> = <span className="text-green-400">true</span>;</div>
                        <div className="mt-4 pt-4 border-t border-gray-700">
                          <button className="bg-green-500 text-white px-4 py-2 rounded text-xs font-sans font-semibold hover:bg-green-600 transition w-full">
                            Submit Project
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Section - Redefining Education */}
            <div className="mt-20 px-4 py-16 bg-gray-100 bg-opacity-10 backdrop-blur-sm rounded-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center max-w-6xl mx-auto">
                {/* Left Column - Image */}
                <div
                  className={animateWords ? 'animate-slideUp' : 'opacity-0'}
                  style={{ animationDelay: '3.2s', animationFillMode: 'forwards' }}
                >
                  <div className="relative">
                    <img
                      src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_6.png"
                      alt="Ignite Team"
                      className="w-full h-auto rounded-2xl shadow-2xl"
                      style={{ maxWidth: '500px', margin: '0 auto' }}
                    />
                  </div>
                </div>

                {/* Right Column - Text Content */}
                <div
                  className={animateWords ? 'animate-slideUp' : 'opacity-0'}
                  style={{ animationDelay: '3.4s', animationFillMode: 'forwards' }}
                >
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
                    We're re-defining{' '}
                    <span className="text-purple-400">post-18 education</span>
                  </h2>

                  <p className="text-gray-300 text-base sm:text-lg mb-6 leading-relaxed">
                    For too long, the post-18 education landscape has offered fragmented, inaccessible and outdated solutions, often unsuited for modern in-demand careers.
                  </p>

                  <p className="text-gray-300 text-base sm:text-lg mb-8 leading-relaxed">
                    We believe education should be accessible, personalised and integrated for everyone.
                  </p>

                  <button className="bg-pink-500 text-white font-semibold px-8 py-4 rounded-lg hover:bg-pink-600 transition-all shadow-lg hover:shadow-xl text-base sm:text-lg">
                    About Us
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
    </>
  );
};

export default Auth;
