import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { removeSavedCourse } from '../../lib/api';
import UserMemorySection from './UserMemorySection';

const resizeProfileImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        const srcSize = Math.min(img.width, img.height);
        const srcX = (img.width - srcSize) / 2;
        const srcY = (img.height - srcSize) / 2;
        const outSize = Math.min(srcSize, maxDim);
        canvas.width = outSize;
        canvas.height = outSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, outSize, outSize);
        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error('Compression failed')); return; }
            resolve(new File([blob], 'profile.jpg', { type: 'image/jpeg' }));
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const SettingsModal = ({ isOpen, onClose, progressPercentage = 0, courseData }) => {
  const { user: authUser, updateProfile, signOut, isInsider, hasUsedTrial, profilePicture, firstName } = useAuth();
  const navigate = useNavigate();
  const imageInputRef = useRef(null);
  const scrollRef = useRef(null);
  const checkoutRef = useRef(null);
  const memoryRef = useRef(null);

  const savedCoursesScrollRef = useRef(null);
  const savedCoursesRafRef = useRef(null);
  const [snappedSavedIndex, setSnappedSavedIndex] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [originalValues, setOriginalValues] = useState({
    firstName: '',
    lastName: '',
    email: '',
  });
  const [availableCourses, setAvailableCourses] = useState([]);
  const [enrolledCourse, setEnrolledCourse] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState(null);

  // Email preferences (synced with backend)
  const [emailPrefs, setEmailPrefs] = useState({
    profileUpdates: true,
    igniteUpdates: true,
    trialPromotions: true,
  });
  const [originalEmailPrefs, setOriginalEmailPrefs] = useState(null);

  // Stripe upgrade state
  const [showCheckout, setShowCheckout] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [upgradingToInsider, setUpgradingToInsider] = useState(false);

  // Preload upsell + insider images so they're ready when modal opens
  useEffect(() => {
    const img = new Image();
    img.src = 'https://auth.ignite.education/storage/v1/object/public/assets/Gemini_Generated_Image_4uq8su4uq8su4uq8%20(1).png';
    const img2 = new Image();
    img2.src = 'https://auth.ignite.education/storage/v1/object/public/assets/Gemini_Generated_Image_7pniju7pniju7pni%20(1).png';
  }, []);

  // Lock body scroll and prevent overscroll bounce inside modal
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!isOpen || !el) return;

    const onTouchMove = (e) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight;

      if (atTop && atBottom) {
        e.preventDefault();
      } else if (atTop) {
        if (el._lastTouchY && e.touches[0].clientY > el._lastTouchY) e.preventDefault();
      } else if (atBottom) {
        if (el._lastTouchY && e.touches[0].clientY < el._lastTouchY) e.preventDefault();
      }
      el._lastTouchY = e.touches[0].clientY;
    };

    const onTouchStart = (e) => {
      el._lastTouchY = e.touches[0].clientY;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const initValues = {
      firstName: authUser?.user_metadata?.first_name || '',
      lastName: authUser?.user_metadata?.last_name || '',
      email: authUser?.email || '',
    };
    setSettingsForm(initValues);
    setOriginalValues(initValues);

    // Reset scroll position
    if (scrollRef.current) scrollRef.current.scrollTop = 0;

    (async () => {
      if (!authUser?.id) return;
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('enrolled_course, linkedin_url')
          .eq('id', authUser.id)
          .single();

        const enrolledSlug = userData?.enrolled_course || '';
        setEnrolledCourse(enrolledSlug);
        setLinkedinUrl(userData?.linkedin_url || null);

        const { data: savedData } = await supabase
          .from('saved_courses')
          .select('course_id')
          .eq('user_id', authUser.id);

        const savedSlugs = savedData?.map(sc => sc.course_id) || [];

        if (enrolledSlug && !savedSlugs.includes(enrolledSlug)) {
          savedSlugs.push(enrolledSlug);
        }

        if (savedSlugs.length > 0) {
          const { data: coursesData, error } = await supabase
            .from('courses')
            .select('name, title, description, status')
            .in('name', savedSlugs)
            .order('display_order', { ascending: true });

          if (!error && coursesData) {
            setAvailableCourses(coursesData);
          }
        }
        // Fetch email preferences
        const prefsRes = await fetch(`${API_URL}/api/email-preferences/${authUser.id}`);
        if (prefsRes.ok) {
          const { preferences } = await prefsRes.json();
          const mapped = {
            profileUpdates: preferences.profile_updates !== false,
            igniteUpdates: preferences.ignite_updates !== false,
            trialPromotions: preferences.trial_promotions !== false,
          };
          setEmailPrefs(mapped);
          setOriginalEmailPrefs(mapped);
        }
      } catch (error) {
        console.error('Error fetching settings data:', error);
      }
    })();
  }, [isOpen]);

  // Mount Stripe Checkout
  useEffect(() => {
    let checkout = null;
    let cancelled = false;
    const mountCheckout = async () => {
      if (clientSecret && checkoutRef.current) {
        try {
          const stripe = await stripePromise;
          if (cancelled) return;
          checkout = await stripe.initEmbeddedCheckout({ clientSecret });
          if (cancelled) { checkout.destroy(); return; }
          checkout.mount(checkoutRef.current);
        } catch (error) {
          console.error('Error mounting Stripe checkout:', error);
          setUpgradingToInsider(false);
        }
      }
    };
    mountCheckout();
    return () => { cancelled = true; if (checkout) checkout.destroy(); };
  }, [clientSecret]);

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureError(null);

    if (!file.type.startsWith('image/')) {
      setPictureError('Please select an image file.');
      return;
    }
    if (file.size < 50 * 1024) {
      setPictureError('Image is too small. Please use a higher quality image (min 50KB).');
      return;
    }
    if (file.size > 3.5 * 1024 * 1024) {
      setPictureError('Image is too large. Please use an image under 3.5MB.');
      return;
    }

    try {
      setIsUploadingPicture(true);
      const resizedFile = await resizeProfileImage(file);
      const filePath = `profile_pictures/${authUser.id}.jpg`;
      const arrayBuffer = await resizedFile.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`;
      await updateProfile({ custom_avatar_url: publicUrl });
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setPictureError('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingPicture(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleClose = async () => {
    // Save any changed profile fields on close
    const changed = {};
    if (settingsForm.firstName !== originalValues.firstName || settingsForm.lastName !== originalValues.lastName) {
      changed.name = true;
    }
    if (settingsForm.email !== originalValues.email && settingsForm.email !== authUser?.email) {
      changed.email = true;
    }

    // Check if email preferences changed
    const emailPrefsChanged = originalEmailPrefs && (
      emailPrefs.profileUpdates !== originalEmailPrefs.profileUpdates ||
      emailPrefs.igniteUpdates !== originalEmailPrefs.igniteUpdates ||
      emailPrefs.trialPromotions !== originalEmailPrefs.trialPromotions
    );

    try {
      if (changed.name) {
        await updateProfile({
          first_name: settingsForm.firstName.trim(),
          last_name: settingsForm.lastName.trim(),
        });
      }
      if (changed.email) {
        await supabase.auth.updateUser({ email: settingsForm.email });
      }
      if (emailPrefsChanged) {
        await fetch(`${API_URL}/api/email-preferences`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authUser.id,
            preferences: {
              profile_updates: emailPrefs.profileUpdates,
              ignite_updates: emailPrefs.igniteUpdates,
              trial_promotions: emailPrefs.trialPromotions,
            },
          }),
        });
      }
    } catch (error) {
      console.error('Error saving profile on close:', error);
    }

    memoryRef.current?.save();
    setIsClosing(true);
    setShowCheckout(false);
    setClientSecret(null);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 250);
  };


  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/welcome');
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
      alert('Failed to log out');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) return;
    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) return;

    try {
      const response = await fetch(`${API_URL}/api/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id })
      });

      if (response.ok) {
        await signOut();
        navigate('/welcome');
      } else {
        throw new Error('Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      alert('Failed to delete account. Please contact support.');
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await fetch(`${API_URL}/api/create-billing-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id }),
      });
      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error(data.error || 'Failed to create billing portal session');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert(`Failed to open subscription management: ${error.message}`);
    }
  };

  const handleStartCheckout = async () => {
    if (!authUser) return;
    setShowCheckout(true);
    setUpgradingToInsider(true);
    try {
      const response = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: authUser.id }),
      });
      const data = await response.json();
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        localStorage.setItem('pendingPaymentRefresh', Date.now().toString());
        setUpgradingToInsider(false);
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      setShowCheckout(false);
      setClientSecret(null);
      setUpgradingToInsider(false);
    }
  };

  const handleLinkProvider = async (provider) => {
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider,
        options: { skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error(`Error linking ${provider}:`, error);
      alert(`Failed to link ${provider} account: ${error.message}`);
    }
  };


  const handleStartCourse = async (courseSlug) => {
    const course = availableCourses.find(c => c.name === courseSlug);
    if (course?.status === 'coming_soon') return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ enrolled_course: courseSlug })
        .eq('id', authUser.id);
      if (error) throw error;
      try { sessionStorage.removeItem('enrollment_status_cache'); } catch {}
      window.location.reload();
    } catch (error) {
      console.error('Error switching course:', error);
      alert('Failed to switch course. Please try again.');
    }
  };

  const handleRemoveCourse = async (courseSlug) => {
    try {
      await removeSavedCourse(authUser.id, courseSlug);
      setAvailableCourses(prev => prev.filter(c => c.name !== courseSlug));
    } catch (error) {
      console.error('Error removing course:', error);
      alert('Failed to remove course. Please try again.');
    }
  };

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);

  const handleMouseDown = (e) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.pageX - savedCoursesScrollRef.current.offsetLeft;
    dragScrollLeftRef.current = savedCoursesScrollRef.current.scrollLeft;
    savedCoursesScrollRef.current.style.scrollBehavior = 'auto';
    savedCoursesScrollRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const x = e.pageX - savedCoursesScrollRef.current.offsetLeft;
    const walk = x - dragStartXRef.current;
    savedCoursesScrollRef.current.scrollLeft = dragScrollLeftRef.current - walk;
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    savedCoursesScrollRef.current.style.scrollBehavior = 'smooth';
    savedCoursesScrollRef.current.style.cursor = 'grab';
  };

  const handleSavedCoursesScroll = () => {
    if (savedCoursesRafRef.current) cancelAnimationFrame(savedCoursesRafRef.current);
    savedCoursesRafRef.current = requestAnimationFrame(() => {
      if (!savedCoursesScrollRef.current) return;
      const scrollPos = savedCoursesScrollRef.current.scrollLeft;
      const cardWidth = 250;
      const gap = 12;
      const index = Math.min(
        Math.round(scrollPos / (cardWidth + gap)),
        Math.max(0, availableCourses.filter(c => c.name !== enrolledCourse).length - 1)
      );
      setSnappedSavedIndex(index);
    });
  };

  if (!isOpen) return null;

  const enrolledCourseData = courseData || availableCourses.find(c => c.name === enrolledCourse);
  const savedCourses = availableCourses.filter(c => c.name !== enrolledCourse);
  const isGoogleLinked = authUser?.identities?.some(id => id.provider === 'google');
  const isLinkedInLinked = authUser?.identities?.some(id => id.provider === 'linkedin_oidc');

  // If checkout is active, show Stripe embedded checkout
  if (showCheckout) {
    return (
      <div
        className="fixed inset-0 flex justify-center items-center"
        style={{
          backdropFilter: 'blur(2.4px)',
          WebkitBackdropFilter: 'blur(2.4px)',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
          zIndex: 9999,
          animation: isClosing ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out',
          padding: '2rem',
        }}
        onClick={handleClose}
      >
        <div className="relative w-full" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
          <h2 className="font-semibold text-white pl-1" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '0.15rem' }}>Upgrade</h2>
          <div
            className="bg-white relative"
            style={{
              animation: isClosing ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
              borderRadius: '0.3rem',
              padding: '1.5rem',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <button onClick={handleClose} className="absolute top-4 right-4 text-gray-600 hover:text-black z-10">
              <X size={20} strokeWidth={2} />
            </button>
            {upgradingToInsider ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500">Loading checkout...</p>
                </div>
              </div>
            ) : (
              <div ref={checkoutRef} style={{ minHeight: '400px' }} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 flex justify-center items-center ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 9999,
        padding: '2rem',
      }}
      onClick={handleClose}
    >
      <div className="relative" style={{ width: '975px', maxWidth: '90vw' }}>
        {/* Settings Card */}
        <div
          ref={scrollRef}
          className={`bg-white text-black relative ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
          style={{
            borderRadius: '0.3rem',
            padding: '2rem 2.25rem 1.5rem 2.25rem',
            maxHeight: '75vh',
            overflowY: 'auto',
            overscrollBehavior: 'none',
            scrollbarWidth: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            .settings-scroll::-webkit-scrollbar { display: none; }
            .settings-toggle::after { border-radius: 6px !important; }
          `}</style>

          {/* Close button */}
          <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10">
            <X size={20} strokeWidth={2} />
          </button>

          {/* Title inside the card */}
          <h2 className="text-[1.85rem] text-black leading-tight mb-4" style={{ fontFamily: 'Geist, sans-serif', letterSpacing: '-1%', fontWeight: 600 }}>Settings</h2>

          {/* ==================== PROFILE ==================== */}
          <div className="mb-6">
            <h3 className="font-semibold mb-[5px] pt-[5px]" style={{ fontSize: '1.5rem', letterSpacing: '-0.01em' }}>Profile</h3>

            {/* Profile Picture */}
            <div className="flex items-stretch gap-7 mb-4">
              <div className="flex flex-col items-center justify-between">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="object-cover"
                    style={{ width: '100px', height: '100px', borderRadius: '0.25rem' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className="bg-[#7714E0] flex items-center justify-center text-white font-bold"
                    style={{ width: '100px', height: '100px', fontSize: '24px', borderRadius: '0.25rem' }}
                  >
                    {(firstName || 'U')[0].toUpperCase()}
                  </div>
                )}
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleProfilePictureUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingPicture}
                  className="text-black transition disabled:opacity-50 py-1 cursor-pointer"
                  style={{ borderRadius: '0.3rem', backgroundColor: 'white', width: '100px', height: '35px', fontSize: '0.9rem', fontWeight: 400, letterSpacing: '-0.02em', boxShadow: '0 0 6px rgba(103,103,103,0.35)' }}
                  onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.45)'}
                  onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'}
                >
                  {isUploadingPicture ? 'Uploading...' : 'Edit'}
                </button>
                {pictureError && (
                  <p className="text-xs text-red-500 max-w-[120px] text-center">{pictureError}</p>
                )}
              </div>

              {/* Name + Email */}
              <div className="flex-1 space-y-2.5">
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-center gap-3">
                    <label className="whitespace-nowrap shrink-0" style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '-1%', minWidth: '80px' }}>First Name</label>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={settingsForm.firstName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, firstName: e.target.value })}
                        className="w-full bg-gray-100 text-black py-2 focus:outline-none"
                        style={{ borderRadius: '0.3rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', fontWeight: 300 }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="whitespace-nowrap shrink-0" style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '-1%', minWidth: '80px' }}>Last Name</label>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={settingsForm.lastName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, lastName: e.target.value })}
                        className="w-full bg-gray-100 text-black py-2 focus:outline-none"
                        style={{ borderRadius: '0.3rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', fontWeight: 300 }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="whitespace-nowrap shrink-0" style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '-1%', minWidth: '80px' }}>Email</label>
                  <div className="relative flex-1">
                    <input
                      type="email"
                      value={settingsForm.email}
                      onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                      className="w-full bg-gray-100 text-black py-2 focus:outline-none"
                      style={{ borderRadius: '0.3rem', paddingLeft: '0.75rem', paddingRight: '0.75rem', fontWeight: 300 }}
                    />
                  </div>
                </div>

                {/* Linked Accounts */}
                <div className="flex items-center gap-3">
                  <label className="whitespace-nowrap shrink-0" style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '-1%', minWidth: '80px' }}>Accounts</label>
                  <div className="grid grid-cols-2 gap-3 flex-1">
                  <button
                    type="button"
                    onClick={() => isGoogleLinked ? undefined : handleLinkProvider('google')}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 transition ${isGoogleLinked ? 'cursor-default' : 'cursor-pointer'}`}
                    style={{
                      borderRadius: '0.5rem',
                      backgroundColor: isGoogleLinked ? '#F3F4F6' : 'white',
                      boxShadow: isGoogleLinked ? 'none' : '0 0 6px rgba(103,103,103,0.35)',
                    }}
                    onMouseEnter={(e) => { if (!isGoogleLinked) e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.45)'; }}
                    onMouseLeave={(e) => { if (!isGoogleLinked) e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                  >
                    <span style={{ fontSize: '1rem', fontWeight: isGoogleLinked ? 300 : 400, letterSpacing: '-0.02em', color: isGoogleLinked ? 'black' : undefined }}>{isGoogleLinked ? 'Connected with Google' : 'Connect with Google'}</span>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => isLinkedInLinked ? undefined : handleLinkProvider('linkedin_oidc')}
                    className={`flex items-center justify-center gap-2 px-4 py-2.5 transition ${isLinkedInLinked ? 'cursor-default' : 'cursor-pointer'}`}
                    style={{
                      borderRadius: '0.5rem',
                      backgroundColor: isLinkedInLinked ? '#F3F4F6' : 'white',
                      boxShadow: isLinkedInLinked ? 'none' : '0 0 6px rgba(103,103,103,0.35)',
                    }}
                    onMouseEnter={(e) => { if (!isLinkedInLinked) e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.45)'; }}
                    onMouseLeave={(e) => { if (!isLinkedInLinked) e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'; }}
                  >
                    <span style={{ fontSize: '1rem', fontWeight: isLinkedInLinked ? 300 : 400, letterSpacing: '-0.02em', color: isLinkedInLinked ? 'black' : undefined }}>{isLinkedInLinked ? 'Connected with LinkedIn' : 'Connect with LinkedIn'}</span>
                    <svg className="w-4 h-4" fill="#0077B5" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================== ACCOUNT / SUBSCRIPTION ==================== */}
          <div className="mb-8">
            <h3 className="font-semibold" style={{ fontSize: '1.5rem', letterSpacing: '-0.01em', marginBottom: '2px', paddingTop: '10px' }}>Account</h3>

            {!isInsider ? (
              /* Upsell Card — trial or re-subscribe */
              <>
              <h4 className="font-medium text-purple-700 mb-[10px]" style={{ fontSize: '1.3rem', letterSpacing: '-0.01em' }}>
                {hasUsedTrial ? 'Subscribe to Ignite Insider' : 'Try Ignite Insider for free'}
              </h4>
              <div className="flex gap-4">
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <img src="https://auth.ignite.education/storage/v1/object/public/assets/Gemini_Generated_Image_4uq8su4uq8su4uq8%20(1).png" alt={hasUsedTrial ? 'Subscribe' : 'Free trial'} className="mb-1" style={{ width: '100px', height: '100px', objectFit: 'contain' }} />
                  {hasUsedTrial ? (
                    <p className="text-black mb-3" style={{ fontWeight: 500, fontSize: '1rem', lineHeight: 1.2 }}>£4.99/month</p>
                  ) : (
                    <>
                      <p style={{ fontWeight: 500, fontSize: '1rem', lineHeight: 1.2 }}>Two weeks free</p>
                      <p className="text-black mb-3" style={{ fontWeight: 300, fontSize: '0.9rem', lineHeight: 1.2 }}>then £4.99/month</p>
                    </>
                  )}
                  <button
                    onClick={handleStartCheckout}
                    className="text-white px-5 py-2 transition cursor-pointer"
                    style={{ borderRadius: '0.3rem', backgroundColor: '#8200EA', fontSize: '1rem', fontWeight: 500 }}
                    onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 8px rgba(103,103,103,0.55)'}
                    onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                  >
                    {hasUsedTrial ? 'Subscribe — £4.99/month' : `Get ${firstName ? `${firstName}'s` : 'your'} Free Trial`}
                  </button>
                  <p className="text-black mt-2.5 leading-snug" style={{ fontSize: '0.85rem', fontWeight: 300 }}>Access all Ignite features.<br />Cancel anytime.</p>
                </div>
                <div className="p-4 flex flex-col items-center justify-center text-center" style={{ borderRadius: '0.3rem', width: '60%', backgroundColor: '#F6F6F6' }}>
                  <p className="text-black mb-3 text-balance" style={{ fontSize: '1rem', fontWeight: 300, letterSpacing: '-1%', maxWidth: '90%' }}>
                    Build real, career-ready skills with access to professional office hours, job notifications and AI-powered learning tools.
                  </p>
                  <ul className="space-y-1.5 text-black inline-flex flex-col items-center" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '-1%' }}>
                    {['1:1 Office Hours with industry professionals', 'Weekly hand-pick job opportunities', 'AI Tool Prompt highlights'].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8200EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              </>
            ) : (
              /* Ignite Insider Card */
              <div>
                <h4 className="font-medium text-purple-700 mb-[2px]" style={{ fontSize: '1.3rem', letterSpacing: '-0.01em' }}>Ignite Insider</h4>
                <div className="flex gap-4">
                  <div style={{ width: '70%' }}>
                    <p className="text-black" style={{ fontSize: '1rem', fontWeight: 300, marginBottom: '20px' }}>
                      You have exclusive access to Ignite Insider features to accelerate your learning.
                    </p>
                    <ul className="space-y-1.5 text-black" style={{ fontSize: '1rem', fontWeight: 500, letterSpacing: '-1%' }}>
                      {['1:1 Office Hours with industry professionals', 'Weekly hand-pick job opportunities', 'AI Tool Prompt highlights'].map(feature => (
                        <li key={feature} className="flex items-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8200EA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={handleManageSubscription}
                      className="text-black transition cursor-pointer"
                      style={{ borderRadius: '0.3rem', backgroundColor: 'white', padding: '6px 24px', fontSize: '0.9rem', fontWeight: 400, letterSpacing: '-0.02em', boxShadow: '0 0 6px rgba(103,103,103,0.35)', marginTop: '16px', marginBottom: '3px', alignSelf: 'flex-start' }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.45)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'}
                    >
                      Manage
                    </button>
                  </div>
                  <div className="flex flex-col items-center justify-center" style={{ width: '30%' }}>
                    <img
                      src="https://auth.ignite.education/storage/v1/object/public/assets/Gemini_Generated_Image_7pniju7pniju7pni%20(1).png"
                      alt="Ignite Insider"
                      style={{ width: '150px', height: '150px', objectFit: 'contain' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ==================== EMAIL PREFERENCES ==================== */}
          <div className="mb-7">
            <h3 className="font-medium mb-3" style={{ fontSize: '1.3rem', letterSpacing: '-0.01em' }}>Email Preferences</h3>
            <div className="flex items-center gap-6">
              {[
                { key: 'profileUpdates', label: 'Profile Updates' },
                { key: 'igniteUpdates', label: 'Ignite Updates' },
                { key: 'trialPromotions', label: 'Trial & Promotions' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setEmailPrefs(prev => ({ ...prev, [key]: !prev[key] }))}>
                  <span style={{ fontSize: '1rem', fontWeight: 300 }}>{label}</span>
                  <div className="flex items-center justify-center" style={{ width: '16px', height: '16px', borderRadius: '3px', backgroundColor: '#F6F6F6' }}>
                    {emailPrefs[key] && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8200EA" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ==================== COURSES ==================== */}
          <div className="mb-6">
            <h3 className="font-semibold" style={{ fontSize: '1.5rem', letterSpacing: '-0.01em', marginBottom: '5px', paddingTop: '10px' }}>Courses</h3>

            <div className="flex gap-6 items-start">
              {/* Current enrolled course */}
              {enrolledCourseData && (
                <div className="shrink-0" style={{ minWidth: '35%' }}>
                  <h4 className="font-medium mb-2" style={{ fontSize: '1.3rem', letterSpacing: '-0.01em' }}>Current</h4>
                  <div className="p-4" style={{ borderRadius: '0.3rem', backgroundColor: '#F6F6F6' }}>
                    <p className="mb-1" style={{ fontSize: '1.1rem', fontWeight: 500 }}>{enrolledCourseData.title || enrolledCourseData.name}</p>
                    <p className="text-black" style={{ fontSize: '1rem', fontWeight: 300 }}>
                      You're <span className="font-semibold text-black">{progressPercentage}%</span> through the course
                    </p>
                  </div>
                </div>
              )}

              {/* Saved courses */}
              {savedCourses.length > 0 && (
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium mb-2" style={{ fontSize: '1.3rem', letterSpacing: '-0.01em' }}>Saved</h4>
                  <div
                    ref={savedCoursesScrollRef}
                    className="overflow-x-auto overflow-y-hidden select-none"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      scrollBehavior: 'smooth',
                      WebkitOverflowScrolling: 'touch',
                      scrollSnapType: 'x mandatory',
                      cursor: 'grab',
                    }}
                    onScroll={handleSavedCoursesScroll}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  >
                    <div className="flex gap-3">
                    {savedCourses.map((course, index) => (
                      <div
                        key={course.name}
                        className="p-4 shrink-0 relative"
                        style={{ borderRadius: '0.3rem', scrollSnapAlign: 'start', minWidth: '250px', backgroundColor: '#F6F6F6' }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            backdropFilter: 'blur(0.75px)',
                            WebkitBackdropFilter: 'blur(0.75px)',
                            borderRadius: '0.3rem',
                            pointerEvents: 'none',
                            opacity: index !== snappedSavedIndex ? 1 : 0,
                            transition: 'opacity 0.3s ease-in-out',
                          }}
                        />
                        <div className="flex justify-between" style={{ gap: '2rem' }}>
                          <div className="flex-1">
                            <p className="mb-1" style={{ fontSize: '1.1rem', fontWeight: 500 }}>{course.title || course.name}</p>
                            <p className="text-black" style={{ fontSize: '1rem', fontWeight: 300 }}>
                              {course.status === 'coming_soon' ? 'Coming Soon' : 'Saved for later'}
                            </p>
                          </div>
                          <div className="flex flex-col shrink-0" style={{ justifyContent: course.status !== 'coming_soon' ? 'flex-end' : 'center', gap: '0.5rem' }}>
                            {course.status !== 'coming_soon' && (
                              <button
                                onClick={() => handleStartCourse(course.name)}
                                className="text-white px-3 py-1 hover:opacity-90 transition cursor-pointer"
                                style={{ borderRadius: '0.3rem', backgroundColor: '#22C55E', fontSize: '0.85rem', fontWeight: 400 }}
                              >
                                Start
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveCourse(course.name)}
                              className="text-white px-3 py-1 hover:opacity-90 transition cursor-pointer"
                              style={{ borderRadius: '0.3rem', backgroundColor: '#FFAF00', fontSize: '0.85rem', fontWeight: 400 }}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {savedCourses.length > 1 && (
                      <div style={{ minWidth: 'calc(100% - 250px)', flexShrink: 0 }} />
                    )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ==================== MEMORY ==================== */}
          <div className="mb-6">
            <UserMemorySection ref={memoryRef} userId={authUser?.id} linkedinUrl={linkedinUrl} />
          </div>

          {/* ==================== BOTTOM ACTIONS ==================== */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-white px-6 py-2 transition disabled:opacity-50 cursor-pointer"
              style={{ borderRadius: '0.3rem', backgroundColor: '#FFAF00', fontSize: '0.9rem', fontWeight: 400 }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 6px rgba(103,103,103,0.35)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
            >
              Log Out
            </button>
            <button
              onClick={handleDeleteAccount}
              className="px-6 py-2 bg-gray-100 text-black transition cursor-pointer hover:opacity-100"
              style={{ borderRadius: '0.3rem', fontSize: '0.9rem', fontWeight: 300 }}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
