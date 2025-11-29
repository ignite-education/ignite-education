import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPostBySlug, formatDate } from '../lib/blogApi';
import { supabase } from '../lib/supabase';
import SEO, { generateBlogPostStructuredData } from '../components/SEO';
import { Home, ChevronRight, Volume2, Pause } from 'lucide-react';
import Lottie from 'lottie-react';
import { useAnimation } from '../contexts/AnimationContext';

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

  // Parse content into words when post loads
  useEffect(() => {
    if (post?.content) {
      const plainText = extractTextFromHtml(post.content);
      const words = plainText.split(/(\s+)/).filter(word => word.trim().length > 0);
      setContentWords(words);
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
      return;
    }

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

        const response = await fetch('https://ignite-education-api.onrender.com/api/text-to-speech-timestamps', {
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

    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        const words = text.split(/(\s+)/);
        const span = document.createElement('span');

        words.forEach((word) => {
          if (word.trim().length > 0) {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = word;
            if (wordCounter === currentWordIndex) {
              wordSpan.className = 'bg-pink-200 rounded px-0.5 transition-colors duration-75';
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
        Array.from(node.childNodes).forEach((child) => {
          clone.appendChild(processNode(child));
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
              <span className="text-white text-sm font-medium">Discover</span>
              <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black group-hover:text-[#EF0B72] transition-colors">
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
          <div className="max-w-4xl mx-auto px-6 py-12">
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
            <h1 className="text-5xl font-bold text-white mb-3.5 leading-tight text-left">
              {typedTitle}
              {!isTypingComplete && <span className="animate-pulse" style={{ fontWeight: 300 }}>|</span>}
            </h1>

            {/* Subtitle/Excerpt - Left aligned - Ignite Pink */}
            <p className="text-xl text-[#EF0B72] mb-3.5 leading-relaxed text-left">
              {post.excerpt}
            </p>
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
              <div className="relative max-w-4xl mx-auto px-6">
                <div className="rounded-lg overflow-hidden" style={{ maxWidth: '720px' }}>
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
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
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
                  ? `${Math.ceil(preGeneratedAudio.duration_seconds / 60)} minute listen`
                  : contentWords.length > 0
                    ? `${Math.ceil(contentWords.length / 150)} minute listen`
                    : ''}
              </span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 pb-16">
            <article style={{ maxWidth: '762px' }}>
              {/* Article Body */}
              <div
                className="prose prose-lg max-w-none"
                style={{
                  color: '#000000',
                  fontSize: '18px',
                  lineHeight: '1.8',
                  textAlign: 'justify'
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
                    margin-top: 3rem;
                    margin-bottom: 0.5rem;
                    text-align: left;
                  }
                  .prose h3 {
                    color: #000000;
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin-top: 2rem;
                    margin-bottom: 0.5rem;
                    text-align: left;
                  }
                  .prose p {
                    color: #000000;
                    margin-bottom: 1.5rem;
                    text-align: justify;
                  }
                  .prose ul, .prose ol {
                    margin-top: 1.5rem;
                    margin-bottom: 1.5rem;
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
                    color: #EF0B72;
                    text-decoration: none;
                    border-bottom: 1px solid #EF0B72;
                    transition: all 0.2s;
                  }
                  .prose a:hover {
                    color: #D10A64;
                    border-bottom-color: #D10A64;
                  }
                  .prose blockquote {
                    border-left: 4px solid #EF0B72;
                    padding-left: 1.5rem;
                    font-style: italic;
                    color: #000000;
                  }
                `}</style>
                {renderContentWithHighlighting(post.content)}
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
