import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPostBySlug, formatDate } from '../lib/blogApi';
import { supabase } from '../lib/supabase';
import SEO, { generateBlogPostStructuredData } from '../components/SEO';
import { Home, ChevronRight, Volume2, Pause, Link2, Check } from 'lucide-react';
import Lottie from 'lottie-react';
import { useAnimation } from '../contexts/AnimationContext';

// API URL for backend calls
const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { lottieData, isLoading: animationLoading } = useAnimation();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typedTitle, setTypedTitle] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // Narration state
  const [isReading, setIsReading] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [contentWords, setContentWords] = useState([]);
  const [preGeneratedAudio, setPreGeneratedAudio] = useState(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef(null);
  const wordTimerRef = useRef(null);
  const wordTimestampsRef = useRef([]);
  const whiteContentRef = useRef(null);
  const articleRef = useRef(null);
  const headerWordIndicesRef = useRef([]); // Tracks word indices where headers start
  const lastScrolledHeaderRef = useRef(-1); // Tracks which header we last scrolled to

  useEffect(() => {
    fetchPost();
  }, [slug]);

  // Track scroll progress - starts when white content passes bottom of nav bar (~58px)
  useEffect(() => {
    const handleScroll = () => {
      if (!whiteContentRef.current) return;

      const navBarHeight = 58; // Height of sticky nav bar
      const whiteContentTop = whiteContentRef.current.getBoundingClientRect().top;
      const whiteContentHeight = whiteContentRef.current.offsetHeight;
      const viewportHeight = window.innerHeight;

      // Only start progress when white content passes below the nav bar
      if (whiteContentTop > navBarHeight) {
        setScrollProgress(0);
        return;
      }

      // Calculate progress based on how much of white content has scrolled past the nav bar
      const scrolledPast = navBarHeight - whiteContentTop;
      const scrollableHeight = whiteContentHeight - viewportHeight + navBarHeight;

      if (scrollableHeight > 0) {
        const progress = Math.min(100, Math.max(0, (scrolledPast / scrollableHeight) * 100));
        setScrollProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchPost = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPostBySlug(slug);

      if (!data) {
        setError('Post not found');
        setLoading(false);
        return;
      }

      setPost(data);
      setLoading(false);
    } catch (err) {
      console.error('Error loading blog post:', err);
      setError('Unable to load blog post. Please try again later.');
      setLoading(false);
    }
  };

  // Typing animation for title (75ms per character to match Auth page, 1 second delay)
  useEffect(() => {
    if (!post) return;

    let currentIndex = 0;
    const titleText = post.title;

    // Add 1 second delay before starting typing
    setTimeout(() => {
      const typingInterval = setInterval(() => {
        if (currentIndex <= titleText.length) {
          setTypedTitle(titleText.substring(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
          setIsTypingComplete(true);
        }
      }, 75);
    }, 1000);

    return () => {};
  }, [post]);

  // Extract plain text from HTML content and split into words
  const extractTextFromHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Parse content into words when post loads and build header word index map
  useEffect(() => {
    if (post?.content) {
      const plainText = extractTextFromHtml(post.content);
      const words = plainText.split(/(\s+)/).filter(word => word.trim().length > 0);
      setContentWords(words);

      // Build a map of word indices where headers (h2, h3) start
      const div = document.createElement('div');
      div.innerHTML = post.content;
      const headerIndices = [];
      let wordIndex = 0;

      const walkNodes = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent;
          const nodeWords = text.split(/(\s+)/).filter(w => w.trim().length > 0);
          wordIndex += nodeWords.length;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = node.tagName.toLowerCase();
          // Record the word index at the start of h2 or h3
          if (tagName === 'h2' || tagName === 'h3') {
            headerIndices.push({ wordIndex, tagName });
          }
          Array.from(node.childNodes).forEach(walkNodes);
        }
      };

      Array.from(div.childNodes).forEach(walkNodes);
      headerWordIndicesRef.current = headerIndices;
    }
  }, [post]);

  // Fetch pre-generated audio when post loads
  useEffect(() => {
    const fetchPreGeneratedAudio = async () => {
      if (!post?.id) return;

      try {
        setIsLoadingAudio(true);
        const { data, error } = await supabase
          .from('blog_post_audio')
          .select('*')
          .eq('blog_post_id', post.id)
          .single();

        if (error) {
          if (error.code !== 'PGRST116') { // Not a "no rows" error
            console.error('Error fetching pre-generated audio:', error);
          }
          setPreGeneratedAudio(null);
        } else {
          setPreGeneratedAudio(data);
        }
      } catch (err) {
        console.error('Error fetching pre-generated audio:', err);
        setPreGeneratedAudio(null);
      } finally {
        setIsLoadingAudio(false);
      }
    };

    fetchPreGeneratedAudio();
  }, [post?.id]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (wordTimerRef.current) {
        cancelAnimationFrame(wordTimerRef.current);
      }
    };
  }, []);

  // Scroll to a header element with smooth animation (matching LearningHub style)
  const scrollToHeader = (headerIndex) => {
    if (!articleRef.current) return;

    // Find all h2 and h3 elements in the article
    const headers = articleRef.current.querySelectorAll('h2, h3');
    if (headerIndex >= headers.length) return;

    const targetHeader = headers[headerIndex];
    const navBarHeight = 100; // Account for sticky nav bar plus padding so header isn't touching nav
    const targetPosition = targetHeader.getBoundingClientRect().top + window.pageYOffset - navBarHeight;

    // Custom smooth scroll with easing (matching LearningHub)
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1200; // Longer duration for smoother scroll
    let startTime = null;

    // Ease in-out cubic function for smooth acceleration and deceleration
    const easeInOutCubic = (t) => {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const animateScroll = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startPosition + distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Check if current word is at a header and scroll if needed
  const checkAndScrollToHeader = (wordIndex) => {
    const headers = headerWordIndicesRef.current;
    for (let i = 0; i < headers.length; i++) {
      // If we just reached a header's first word and haven't scrolled to it yet
      if (wordIndex === headers[i].wordIndex && lastScrolledHeaderRef.current < i) {
        lastScrolledHeaderRef.current = i;
        scrollToHeader(i);
        break;
      }
    }
  };

  // Handle read aloud functionality
  const handleReadAloud = async () => {
    // If already reading, stop
    if (isReading) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (wordTimerRef.current) {
        cancelAnimationFrame(wordTimerRef.current);
      }
      setIsReading(false);
      setCurrentWordIndex(-1);
      lastScrolledHeaderRef.current = -1; // Reset scroll tracker
      return;
    }

    // Reset scroll tracker when starting fresh
    lastScrolledHeaderRef.current = -1;

    if (!post?.content) return;

    try {
      setIsReading(true);

      let audioUrl;
      let shouldRevokeUrl = false;

      // Check if pre-generated audio is available
      if (preGeneratedAudio?.audio_url) {
        // Use pre-generated audio
        audioUrl = preGeneratedAudio.audio_url;

        // Use pre-generated word timestamps if available
        if (preGeneratedAudio.word_timestamps) {
          wordTimestampsRef.current = preGeneratedAudio.word_timestamps;
        }
      } else {
        // Fall back to live TTS API
        const plainText = extractTextFromHtml(post.content);

        const response = await fetch(`${API_URL}/api/text-to-speech-timestamps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: plainText, voiceGender: 'male' })
        });

        if (!response.ok) {
          throw new Error('Failed to generate speech');
        }

        const data = await response.json();

        // Convert base64 audio to blob
        const audioData = atob(data.audio_base64);
        const arrayBuffer = new ArrayBuffer(audioData.length);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < audioData.length; i++) {
          view[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
        audioUrl = URL.createObjectURL(audioBlob);
        shouldRevokeUrl = true;

        // Store word timestamps
        if (data.word_timestamps) {
          wordTimestampsRef.current = data.word_timestamps;
        }
      }

      // Create and play audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsReading(false);
        setCurrentWordIndex(-1);
        if (shouldRevokeUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        audioRef.current = null;
      };

      audio.onerror = () => {
        setIsReading(false);
        setCurrentWordIndex(-1);
        if (shouldRevokeUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        audioRef.current = null;
      };

      await audio.play();

      // Start word highlighting
      const startWordHighlighting = () => {
        setCurrentWordIndex(0);
        let lastHighlightedWord = 0;

        const updateHighlight = () => {
          if (!audio || audio.paused || audio.ended) {
            return;
          }

          const currentTime = audio.currentTime;
          let wordToHighlight = lastHighlightedWord;

          for (let i = 0; i < wordTimestampsRef.current.length; i++) {
            const timestamp = wordTimestampsRef.current[i];
            if (currentTime >= timestamp.start && currentTime < timestamp.end) {
              wordToHighlight = i;
              break;
            }
            if (currentTime >= timestamp.end && i < wordTimestampsRef.current.length - 1) {
              const nextTimestamp = wordTimestampsRef.current[i + 1];
              if (currentTime < nextTimestamp.start) {
                wordToHighlight = i;
                break;
              }
            }
          }

          if (wordToHighlight !== lastHighlightedWord) {
            lastHighlightedWord = wordToHighlight;
            setCurrentWordIndex(wordToHighlight);
            // Check if we've reached a header and should scroll
            checkAndScrollToHeader(wordToHighlight);
          }

          wordTimerRef.current = requestAnimationFrame(updateHighlight);
        };

        wordTimerRef.current = requestAnimationFrame(updateHighlight);
      };

      if (audio.duration && !isNaN(audio.duration)) {
        startWordHighlighting();
      } else {
        audio.addEventListener('loadedmetadata', startWordHighlighting, { once: true });
      }

    } catch (error) {
      console.error('Error reading aloud:', error);
      setIsReading(false);
      setCurrentWordIndex(-1);
    }
  };

  // Render content with word highlighting
  const renderContentWithHighlighting = (html) => {
    if (!isReading || currentWordIndex < 0) {
      return <div dangerouslySetInnerHTML={{ __html: html }} />;
    }

    // Parse the HTML and wrap words with highlighting
    const div = document.createElement('div');
    div.innerHTML = html;

    let wordCounter = 0;

    const processNode = (node, insideH2 = false) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const words = text.split(/(\s+)/);
        const span = document.createElement('span');

        words.forEach((word) => {
          if (word.trim().length > 0) {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = word;
            // Don't highlight words inside h2 headings
            if (wordCounter === currentWordIndex && !insideH2) {
              wordSpan.style.backgroundColor = '#fde7f4';
              wordSpan.style.padding = '2px';
              wordSpan.style.margin = '-2px';
              wordSpan.style.borderRadius = '2px';
              wordSpan.style.transition = 'background-color 100ms';
            }
            span.appendChild(wordSpan);
            wordCounter++;
          } else {
            span.appendChild(document.createTextNode(word));
          }
        });

        return span;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const clone = node.cloneNode(false);
        const tagName = node.tagName?.toLowerCase();
        // Check if we're entering an h2 element
        const isH2 = tagName === 'h2';
        Array.from(node.childNodes).forEach((child) => {
          clone.appendChild(processNode(child, insideH2 || isH2));
        });
        return clone;
      }
      return node.cloneNode(true);
    };

    const processedDiv = document.createElement('div');
    Array.from(div.childNodes).forEach((child) => {
      processedDiv.appendChild(processNode(child));
    });

    return <div dangerouslySetInnerHTML={{ __html: processedDiv.innerHTML }} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div
          style={{
            opacity: lottieData && !animationLoading ? 1 : 0,
            transition: 'opacity 0.3s ease-out'
          }}
        >
          {lottieData && Object.keys(lottieData).length > 0 ? (
            <Lottie
              animationData={lottieData}
              loop={true}
              autoplay={true}
              style={{ width: 200, height: 200 }}
            />
          ) : (
            <div className="w-[200px] h-[200px]" />
          )}
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">
            {error === 'Post not found' ? '404 - Post Not Found' : 'Error Loading Post'}
          </h1>
          <p className="text-gray-400 mb-8">
            {error === 'Post not found'
              ? "The blog post you're looking for doesn't exist or has been removed."
              : 'Unable to load the blog post. Please try again later.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[#EF0B72] hover:bg-[#D10A64] text-white rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const fullUrl = `/blog/${post.slug}`;
  const structuredData = generateBlogPostStructuredData(post, fullUrl);

  return (
    <>
      <SEO
        title={`Ignite | ${post.title}`}
        description={post.meta_description || post.excerpt}
        image={post.og_image || post.featured_image}
        url={fullUrl}
        type="article"
        structuredData={structuredData}
      />

      <div className="min-h-screen bg-black">
        {/* Sticky Top Navigation Bar with Progress Indicator */}
        <div className="sticky top-0 z-50 bg-black">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="inline-block">
              <div
                className="w-32 h-10 bg-contain bg-no-repeat bg-left"
                style={{
                  backgroundImage: 'url(https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png)'
                }}
              />
            </Link>
            <a href="https://ignite.education" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
              <span className="text-white text-base font-medium">Discover</span>
              <div className="bg-white rounded-md flex items-center justify-center" style={{ width: '30px', height: '30px' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-[#EF0B72] transition-colors">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </a>
          </div>
          {/* Progress Bar - only shows pink line when scrolling */}
          {scrollProgress > 0 && (
            <div
              className="absolute bottom-0 left-0 h-1 bg-[#EF0B72] transition-all duration-150 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          )}
        </div>

        {/* Hero Section with Black Background */}
        <div className="bg-black">
          <div className="max-w-4xl mx-auto px-6 py-12 flex justify-center">
            <div className="w-full" style={{ maxWidth: '762px' }}>
              {/* Breadcrumb Navigation - Left aligned */}
              <nav className="flex items-center gap-2 text-sm mb-7" style={{ color: '#F0F0F2' }}>
                <Link to="/" className="hover:text-[#EF0B72] transition-colors flex items-center" style={{ color: '#F0F0F2' }}>
                  <Home className="w-4 h-4" />
                </Link>
                <ChevronRight className="w-4 h-4" style={{ color: '#F0F0F2' }} />
                <span style={{ color: '#F0F0F2' }}>Posts</span>
                <ChevronRight className="w-4 h-4" style={{ color: '#F0F0F2' }} />
                <span className="truncate max-w-md" style={{ color: '#F0F0F2' }}>{post.title}</span>
              </nav>

              {/* Title with typing animation - Left aligned */}
              {/* Container reserves space using invisible full title */}
              <div className="relative">
                {/* Invisible full title to reserve space */}
                <h1 className="text-5xl font-bold text-white mb-3.5 leading-tight text-left invisible" aria-hidden="true">
                  {post.title}
                </h1>
                {/* Visible typed title overlaid on top */}
                <h1 className="text-5xl font-bold text-white mb-3.5 leading-tight text-left absolute top-0 left-0 right-0">
                  {typedTitle}
                </h1>
              </div>

              {/* Subtitle/Excerpt - Left aligned - Ignite Pink */}
              <p className="text-xl text-[#EF0B72] mb-3.5 leading-relaxed text-left">
                {post.excerpt}
              </p>
            </div>
          </div>
        </div>

        {/* White Content Section - ref starts here so progress bar triggers when white goes behind nav */}
        <div ref={whiteContentRef}>
          {/* Featured Image - positioned at black/white transition, left aligned */}
          {post.featured_image && (
            <div className="relative">
              {/* Black top half behind image */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-black" />
              {/* White bottom half behind image */}
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-white" />
              <div className="relative max-w-4xl mx-auto px-6 flex justify-center">
                <div className="rounded-lg overflow-hidden w-full" style={{ maxWidth: '762px' }}>
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Main White Content */}
          <div className="bg-white">
          {/* Speaker Button and Listen Duration */}
          <div className="max-w-4xl mx-auto px-6 pt-4 flex justify-center">
            <div className="flex items-center gap-3 w-full" style={{ maxWidth: '762px' }}>
              <button
                onClick={handleReadAloud}
                className="rounded-lg flex items-center justify-center transition text-white"
                style={{
                  backgroundColor: isReading ? '#D10A64' : '#EF0B72',
                  width: '34px',
                  height: '34px'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#D10A64'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isReading ? '#D10A64' : '#EF0B72'; }}
                title={isReading ? 'Pause narration' : 'Listen to article'}
              >
                {isReading ? (
                  <Pause size={15} className="text-white" fill="white" />
                ) : (
                  <Volume2 size={15} className="text-white" />
                )}
              </button>
              <span style={{ fontSize: '1.05rem', fontWeight: 300, color: '#000000' }}>
                {preGeneratedAudio?.duration_seconds
                  ? `${Math.ceil(preGeneratedAudio.duration_seconds / 60)} minute narration`
                  : contentWords.length > 0
                    ? `${Math.ceil(contentWords.length / 150)} minute narration`
                    : ''}
              </span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 pb-16 flex justify-center">
            <article ref={articleRef} className="w-full" style={{ maxWidth: '762px' }}>
              {/* Article Body */}
              <div
                className="prose prose-lg max-w-none"
                style={{
                  color: '#000000',
                  fontSize: '18px',
                  lineHeight: '1.8',
                  textAlign: 'left'
                }}
              >
                <style>{`
                  .prose h2 {
                    background-color: black;
                    color: white;
                    font-size: 1.4rem;
                    font-weight: 500;
                    padding: 0.35rem 0.5rem;
                    border-radius: 0.2rem;
                    max-width: 750px;
                    width: fit-content;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    text-align: left;
                  }
                  .prose h3 {
                    color: #000000;
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-top: 2rem;
                    margin-bottom: 1rem;
                    text-align: left;
                  }
                  .prose p {
                    color: #000000;
                    margin-top: 0;
                    margin-bottom: 1rem;
                    text-align: left;
                  }
                  .prose ul, .prose ol {
                    margin-top: 1rem;
                    margin-bottom: 1rem;
                    padding-left: 1.5rem;
                  }
                  .prose li {
                    color: #000000;
                    margin-bottom: 0.75rem;
                  }
                  .prose strong {
                    color: #000000;
                    font-weight: 600;
                  }
                  .prose a {
                    color: #000000;
                    text-decoration: underline;
                    transition: all 0.2s;
                  }
                  .prose a:hover {
                    color: #EF0B72;
                  }
                  .prose blockquote {
                    border-left: 4px solid #EF0B72;
                    padding-left: 1.5rem;
                    font-style: italic;
                    color: #000000;
                  }
                  .prose br {
                    content: '';
                    display: block;
                    margin-top: 0.5em;
                  }
                `}</style>
                {renderContentWithHighlighting(post.content)}
              </div>

              {/* Share Section */}
              <div className="mt-6 pt-4">
                <p className="text-sm font-medium text-gray-600 mb-4">Share this article</p>
                <div className="flex items-center gap-3">
                  {/* Copy URL Button */}
                  <button
                    onClick={() => {
                      const shareUrl = `https://ignite.education/blog/${post.slug}`;
                      navigator.clipboard.writeText(shareUrl);
                      setCopied(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: copied ? '#10B981' : '#f3f4f6',
                      color: copied ? 'white' : '#374151'
                    }}
                  >
                    {copied ? <Check size={18} /> : <Link2 size={18} />}
                    <span className="text-sm font-medium">{copied ? 'Copied!' : 'Copy link'}</span>
                  </button>

                  {/* LinkedIn */}
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://ignite.education/blog/${post.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-3 py-2 rounded-lg bg-[#0A66C2] hover:bg-[#004182] transition-colors"
                    title="Share on LinkedIn"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>

                  {/* X (Twitter) */}
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://ignite.education/blog/${post.slug}`)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-3 py-2 rounded-lg bg-black hover:bg-gray-800 transition-colors"
                    title="Share on X"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>

                  {/* Facebook */}
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://ignite.education/blog/${post.slug}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-3 py-2 rounded-lg bg-[#1877F2] hover:bg-[#0d65d9] transition-colors"
                    title="Share on Facebook"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                </div>
              </div>

            </article>
          </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BlogPostPage;
