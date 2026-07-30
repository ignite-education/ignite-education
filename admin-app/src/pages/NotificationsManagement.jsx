import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Trash2, Bell, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

// Rows the Progress Hub bell shows, newest first
const MAX_PREVIEW = 3;

// Which types come from database triggers rather than this page. Deleting one
// is fine, but it'll come back next time the source event fires.
const TRIGGER_TYPES = {
  certificate: 'Certificate issued',
  release_note: 'Release published',
  blog_post: 'Blog published',
  office_hours: 'Office hours live',
};

const formatWhen = (iso) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const NotificationsManagement = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({ title: '', body: '', link_url: '' });

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not signed in');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_URL}/api/notifications/admin`, { headers: await authHeaders() });
      if (!res.ok) throw new Error((await res.json()).error || `Request failed (${res.status})`);
      const { notifications: rows } = await res.json();
      setNotifications(rows || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePublish = async () => {
    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }
    if (!confirm(`Publish "${formData.title.trim()}" to every user?`)) return;

    try {
      setIsSending(true);
      const res = await fetch(`${API_URL}/api/notifications/broadcast`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({
          title: formData.title,
          body: formData.body,
          linkUrl: formData.link_url,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Request failed (${res.status})`);

      setFormData({ title: '', body: '', link_url: '' });
      await loadNotifications();
      alert('Published! It appears in every user’s bell immediately.');
    } catch (err) {
      console.error('Error publishing notification:', err);
      alert('Error: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error((await res.json()).error || `Request failed (${res.status})`);
      await loadNotifications();
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Error: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-sm text-gray-400 mt-1">
              Published notifications appear in the bell on every user&rsquo;s Progress Hub.
            </p>
          </div>
          <button
            onClick={loadNotifications}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Composer */}
          <div className="col-span-12 lg:col-span-5">
            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-5">New notification</h2>

              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., New course just launched"
                  maxLength={80}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
                />
                <p className="text-xs text-gray-500 mt-1.5">{formData.title.length}/80</p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Text</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => handleInputChange('body', e.target.value)}
                  placeholder="A short sentence explaining what happened."
                  rows={3}
                  maxLength={200}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72] resize-none"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  {formData.body.length}/200 &middot; clamped to 2 lines in the bell
                </p>
              </div>

              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Link</label>
                <input
                  type="text"
                  value={formData.link_url}
                  onChange={(e) => handleInputChange('link_url', e.target.value)}
                  placeholder="/courses  or  https://example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#EF0B72]"
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Opens in a new tab. Leave blank to make it unclickable.
                </p>
              </div>

              {/* Live preview of how the row renders in the bell */}
              <div className="mb-5">
                <label className="block text-sm font-medium mb-2">Preview</label>
                <div className="bg-white rounded-[0.3rem] p-3 pl-7 relative">
                  <span className="absolute left-3 top-[15px] w-1.5 h-1.5 rounded-full bg-[#EF0B72]" />
                  <p className="text-black text-sm font-medium leading-tight">
                    {formData.title.trim() || 'Title goes here'}
                  </p>
                  {formData.body.trim() && (
                    <p className="text-black text-[13px] font-light leading-snug mt-0.5 line-clamp-2">
                      {formData.body.trim()}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handlePublish}
                disabled={isSending || !formData.title.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#EF0B72] hover:bg-[#D10A64] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Publishing…' : 'Publish to all users'}
              </button>
            </div>
          </div>

          {/* Existing notifications */}
          <div className="col-span-12 lg:col-span-7">
            <div className="bg-white/5 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-1">All notifications</h2>
              <p className="text-xs text-gray-400 mb-5">
                Includes ones created automatically by certificates, releases, blog posts and
                office hours. Only the newest {MAX_PREVIEW} show in a user&rsquo;s bell.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4 text-sm text-red-300">
                  {error}
                </div>
              )}

              {loading ? (
                <p className="text-gray-400 text-sm py-8 text-center">Loading…</p>
              ) : notifications.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
                  {notifications.map((n, idx) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-lg border ${
                        idx < MAX_PREVIEW
                          ? 'bg-white/[0.07] border-white/10'
                          : 'bg-white/[0.02] border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${
                              TRIGGER_TYPES[n.type]
                                ? 'bg-gray-600/40 text-gray-300'
                                : 'bg-[#EF0B72]/20 text-pink-300'
                            }`}>
                              {TRIGGER_TYPES[n.type] || 'Manual'}
                            </span>
                            {n.audience === 'all' ? (
                              <span className="text-[10px] text-gray-500">Everyone</span>
                            ) : (
                              <span className="text-[10px] text-gray-500">One user</span>
                            )}
                            {idx < MAX_PREVIEW && (
                              <span className="text-[10px] text-green-400">Visible in bell</span>
                            )}
                          </div>
                          <h3 className="font-medium text-sm truncate">{n.title}</h3>
                          {n.body && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[11px] text-gray-500">{formatWhen(n.created_at)}</span>
                            {n.link_url && (
                              <span className="text-[11px] text-gray-500 truncate">{n.link_url}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(n.id, n.title)}
                          className="p-1.5 hover:bg-red-500/20 rounded flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsManagement;
