import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

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

const SettingsModal = ({ isOpen, onClose }) => {
  const { user: authUser, updateProfile, signOut, isAdFree, profilePicture, firstName } = useAuth();
  const navigate = useNavigate();
  const imageInputRef = useRef(null);

  const [isClosing, setIsClosing] = useState(false);
  const [settingsTab, setSettingsTab] = useState('account');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureError, setPictureError] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    selectedCourse: 'product-manager',
    marketingEmails: true
  });
  const [availableCourses, setAvailableCourses] = useState([]);

  // Initialize form and fetch courses when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setSettingsTab('account');
    setSettingsForm({
      firstName: authUser?.user_metadata?.first_name || '',
      lastName: authUser?.user_metadata?.last_name || '',
      email: authUser?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      selectedCourse: '',
      marketingEmails: authUser?.user_metadata?.marketing_emails !== false
    });

    (async () => {
      if (!authUser?.id) return;
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('enrolled_course')
          .eq('id', authUser.id)
          .single();

        const enrolledSlug = userData?.enrolled_course || '';

        if (enrolledSlug) {
          setSettingsForm(prev => ({
            ...prev,
            selectedCourse: enrolledSlug
          }));
        }

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
            .select('name, title, status')
            .in('name', savedSlugs)
            .order('display_order', { ascending: true });

          if (!error && coursesData) {
            setAvailableCourses(coursesData);
          }
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    })();
  }, [isOpen]);

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

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    try {
      const updates = {
        first_name: settingsForm.firstName,
        last_name: settingsForm.lastName
      };

      if (settingsForm.email !== authUser?.email) {
        await supabase.auth.updateUser({ email: settingsForm.email });
      }

      if (settingsForm.newPassword) {
        if (settingsForm.newPassword !== settingsForm.confirmPassword) {
          alert('New passwords do not match');
          return;
        }
        await supabase.auth.updateUser({ password: settingsForm.newPassword });
      }

      await updateProfile(updates);
      alert('Account updated successfully!');
      handleClose();
    } catch (error) {
      console.error('Error updating account:', error);
      alert(`Failed to update account: ${error.message}`);
    }
  };

  const handleUpdatePreferences = async (e) => {
    e.preventDefault();
    try {
      const selectedCourseData = availableCourses.find(c => c.name === settingsForm.selectedCourse);
      if (selectedCourseData?.status === 'coming_soon') {
        alert('This course is not yet available. Please select a live course.');
        return;
      }

      await updateProfile({
        marketing_emails: settingsForm.marketingEmails
      });

      if (authUser?.id) {
        const { error: courseError } = await supabase
          .from('users')
          .update({ enrolled_course: settingsForm.selectedCourse })
          .eq('id', authUser.id);

        if (courseError) throw courseError;
      }

      try { sessionStorage.removeItem('enrollment_status_cache'); } catch {}

      window.location.reload();
    } catch (error) {
      console.error('Error updating preferences:', error);
      alert(`Failed to update preferences: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      setIsLoggingOut(false);
      alert('Failed to log out');
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }
    if (!confirm('This will permanently delete all your data. Are you absolutely sure?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/delete-account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: authUser.id })
      });

      if (response.ok) {
        await signOut();
        navigate('/auth');
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: authUser.id,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create billing portal session');
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert(`Failed to open subscription management: ${error.message}`);
    }
  };

  const handleLinkProvider = async (provider) => {
    try {
      const { data, error } = await supabase.auth.linkIdentity({ provider });
      if (error) throw error;
      alert(`${provider} account linked successfully!`);
    } catch (error) {
      console.error(`Error linking ${provider}:`, error);
      alert(`Failed to link ${provider} account: ${error.message}`);
    }
  };

  const handleUnlinkProvider = async (provider) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const identity = user.identities?.find(id => id.provider === provider);

      if (!identity) {
        alert(`No ${provider} account linked`);
        return;
      }

      const { error } = await supabase.auth.unlinkIdentity(identity);
      if (error) throw error;
      alert(`${provider} account unlinked successfully!`);
    } catch (error) {
      console.error(`Error unlinking ${provider}:`, error);
      alert(`Failed to unlink ${provider} account: ${error.message}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex justify-center items-center animate-fadeIn"
      style={{
        backdropFilter: 'blur(2.4px)',
        WebkitBackdropFilter: 'blur(2.4px)',
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.25), rgba(0,0,0,0.3))',
        zIndex: 9999,
        animation: isClosing ? 'fadeOut 0.2s ease-out' : 'fadeIn 0.2s ease-out',
        padding: '2rem',
        overflowY: 'auto'
      }}
      onClick={handleClose}
    >
      <div className="relative w-full px-4" style={{ maxWidth: '700px', marginBottom: '2rem' }}>
        {/* Title above the box */}
        <h2 className="font-semibold text-white pl-1" style={{ fontSize: '1.6rem', letterSpacing: '-1%', marginBottom: '0.15rem' }}>Settings</h2>

        {/* Settings Card */}
        <div
          className="bg-white text-black relative"
          style={{
            animation: isClosing ? 'scaleDown 0.2s ease-out' : 'scaleUp 0.2s ease-out',
            borderRadius: '0.3rem',
            padding: '1.5rem',
            minHeight: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-black"
          >
            <X size={24} />
          </button>

          {/* Tabs */}
          <div className="flex gap-4 mb-4 border-b border-gray-200">
            <button
              onClick={() => setSettingsTab('account')}
              className={`pb-2 px-1 font-medium transition ${settingsTab === 'account' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Account
            </button>
            <button
              onClick={() => setSettingsTab('preferences')}
              className={`pb-2 px-1 font-medium transition ${settingsTab === 'preferences' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Preferences
            </button>
            <button
              onClick={() => setSettingsTab('danger')}
              className={`pb-2 px-1 font-medium transition ${settingsTab === 'danger' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Account Actions
            </button>
            {isAdFree && (
              <button
                onClick={() => setSettingsTab('subscription')}
                className={`pb-2 px-1 font-medium transition ${settingsTab === 'subscription' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Subscription
              </button>
            )}
          </div>

          {/* Account Tab */}
          {settingsTab === 'account' && (
            <form onSubmit={handleUpdateAccount} className="space-y-3">
              {/* Profile Picture Upload */}
              <div className="flex items-center gap-4 pb-3 border-b border-gray-200">
                <div>
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="object-cover"
                      style={{ width: '72px', height: '72px', borderRadius: '0.2rem' }}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div
                      className="bg-[#7714E0] flex items-center justify-center text-white font-bold"
                      style={{ width: '72px', height: '72px', fontSize: '22px', borderRadius: '0.2rem' }}
                    >
                      {(firstName || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
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
                    className="px-4 py-1.5 text-sm font-medium border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
                    style={{ borderRadius: '0.25rem' }}
                  >
                    {isUploadingPicture ? 'Uploading...' : 'Change Photo'}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG, or GIF. Max 3.5MB.</p>
                  {pictureError && (
                    <p className="text-xs text-red-500 mt-1">{pictureError}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-0.5">First Name</label>
                  <input
                    type="text"
                    value={settingsForm.firstName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, firstName: e.target.value })}
                    className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    style={{ borderRadius: '0.3rem' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-0.5">Last Name</label>
                  <input
                    type="text"
                    value={settingsForm.lastName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, lastName: e.target.value })}
                    className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    style={{ borderRadius: '0.3rem' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-0.5">Email</label>
                <input
                  type="email"
                  value={settingsForm.email}
                  onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                  className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                  style={{ borderRadius: '0.3rem' }}
                />
                <p className="text-xs text-gray-500 mt-0.5">You'll need to verify your new email address</p>
              </div>

              {authUser?.app_metadata?.provider === 'email' && (
                <>
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <h3 className="font-semibold mb-2">Change Password</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-0.5">New Password</label>
                        <input
                          type="password"
                          value={settingsForm.newPassword}
                          onChange={(e) => setSettingsForm({ ...settingsForm, newPassword: e.target.value })}
                          className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          style={{ borderRadius: '0.3rem' }}
                          placeholder="Leave blank to keep current"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-0.5">Confirm New Password</label>
                        <input
                          type="password"
                          value={settingsForm.confirmPassword}
                          onChange={(e) => setSettingsForm({ ...settingsForm, confirmPassword: e.target.value })}
                          className="w-full bg-gray-100 text-black px-4 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500"
                          style={{ borderRadius: '0.3rem' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="border-t border-gray-200 pt-3 mt-3">
                <h3 className="font-semibold mb-2">Linked Accounts</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      <span className="text-sm">Google</span>
                    </div>
                    {authUser?.identities?.some(id => id.provider === 'google') ? (
                      <button
                        type="button"
                        onClick={() => handleUnlinkProvider('google')}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Unlink
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLinkProvider('google')}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        Link
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="#0077B5" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                      <span className="text-sm">LinkedIn</span>
                    </div>
                    {authUser?.identities?.some(id => id.provider === 'linkedin_oidc') ? (
                      <button
                        type="button"
                        onClick={() => handleUnlinkProvider('linkedin_oidc')}
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        Unlink
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleLinkProvider('linkedin_oidc')}
                        className="text-xs text-purple-600 hover:text-purple-700"
                      >
                        Link
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full text-white px-5 py-3 text-sm font-semibold transition"
                style={{ borderRadius: '0.3rem', backgroundColor: '#EF0B72' }}
              >
                Save Changes
              </button>
            </form>
          )}

          {/* Preferences Tab */}
          {settingsTab === 'preferences' && (
            <form onSubmit={handleUpdatePreferences} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Current Course</label>
                <div className="relative">
                  <select
                    value={settingsForm.selectedCourse}
                    onChange={(e) => setSettingsForm({ ...settingsForm, selectedCourse: e.target.value })}
                    className="w-full bg-gray-100 text-black px-4 py-3 pr-10 focus:outline-none focus:ring-1 focus:ring-pink-500 appearance-none cursor-pointer font-medium"
                    style={{ borderRadius: '0.3rem' }}
                  >
                    {availableCourses.length > 0 ? (
                      availableCourses.map((course) => (
                        <option key={course.name} value={course.name} disabled={course.status === 'coming_soon'}>
                          {course.title || course.name}{course.status === 'coming_soon' ? ' (Coming Soon)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No courses saved</option>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Switch between your saved courses.{' '}
                  <a href="/courses" className="text-purple-600 hover:text-purple-700 underline">Browse all courses</a>
                </p>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                <h3 className="font-semibold mb-3">Email Preferences</h3>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Marketing Emails</p>
                    <p className="text-xs text-gray-500">Receive updates about new courses and features</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.marketingEmails}
                      onChange={(e) => setSettingsForm({ ...settingsForm, marketingEmails: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full text-white px-5 py-3 text-sm font-semibold transition"
                style={{ borderRadius: '0.3rem', backgroundColor: '#EF0B72' }}
              >
                Save Preferences
              </button>
            </form>
          )}

          {/* Account Actions Tab */}
          {settingsTab === 'danger' && (
            <div className="space-y-[0.5rem]">
              <div className="pt-[0.5rem] px-4 pb-4">
                <h3 className="font-semibold text-black mb-0.8">Log Out</h3>
                <p className="text-sm text-gray-700 mb-3">Sign out of your account on this device.</p>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-5 py-1.5 bg-yellow-500 text-white font-semibold text-sm rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Log Out
                </button>
              </div>

              <div className="pt-[0.5rem] px-4 pb-4">
                <h3 className="font-semibold text-black mb-0.8">Delete Account</h3>
                <p className="text-sm text-gray-700 mb-3">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className="px-5 py-1.5 bg-red-600 text-white font-semibold text-sm rounded-lg hover:bg-red-700 transition"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {settingsTab === 'subscription' && (
            <div className="space-y-4">
              {/* Subscription Status Card */}
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-purple-900 mb-1">Premium Subscriber ✨</h3>
                    <p className="text-sm text-purple-700 mb-2">
                      You have access to exclusive features including office hours and ad-free learning.
                    </p>
                    <div className="flex flex-col gap-1 text-xs text-purple-600">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Ad-free experience</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Book office hours with industry experts</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Priority support</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manage Subscription Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold text-black mb-2">Manage Subscription</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Update your payment method, view billing history, or cancel your subscription through our secure billing portal.
                </p>
                <button
                  onClick={handleManageSubscription}
                  className="w-full bg-purple-600 text-white px-5 py-3 text-sm font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
                  style={{ borderRadius: '0.3rem' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Open Billing Portal
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  You'll be redirected to Stripe's secure portal
                </p>
              </div>

              {/* Cancellation Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 text-sm mb-1">About Cancellation</h4>
                <p className="text-xs text-blue-700">
                  If you cancel your subscription, you'll continue to have access to premium features until the end of your current billing period. After that, your account will revert to the free plan.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
