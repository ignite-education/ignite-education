import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  BarChart3,
  BookOpen,
  Newspaper,
  Lightbulb,
  FileText,
  Link2,
  Video,
  Bell,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  // Courses, lessons, requests and coaches all live on one page — see its
  // sub-nav. There used to be a separate /courses dashboard that duplicated
  // course CRUD without writing module_structure.
  { path: '/courses', label: 'Courses', icon: BookOpen, roles: ['admin', 'teacher'] },
  { path: '/office-hours', label: 'Office Hours', icon: Video, roles: ['admin', 'teacher'] },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { path: '/blog', label: 'Blog', icon: Newspaper, roles: ['admin'] },
  { path: '/prompts', label: 'Prompts', icon: Lightbulb, roles: ['admin'] },
  { path: '/release-notes', label: 'Release Notes', icon: FileText, roles: ['admin'] },
  { path: '/resources', label: 'Resources', icon: Link2, roles: ['admin'] },
  { path: '/notifications', label: 'Notifications', icon: Bell, roles: ['admin'] },
];

const LOGO = 'https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png';

/**
 * Admin chrome.
 *
 * Navigation sits in a single top row rather than a sidebar so pages get the
 * full viewport width — the lesson canvas mirrors the student player's
 * two-column layout and needs the horizontal room to stay faithful.
 *
 * Active state is a bottom border, which reads correctly on a horizontal axis
 * where the sidebar's filled pill would not.
 */
const AdminLayout = ({ children }) => {
  const { userRole, firstName, profilePicture, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const visibleItems = navItems.filter(item => item.roles.includes(userRole));

  // Close the overflow menu on navigation and on outside click.
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  // On black, pink-500 is the accent that still reads; gray-400 is the lowest
  // body weight that stays legible. Hairlines are white at 12% rather than a
  // grey, so they sit on the black instead of looking like a lighter band.
  const tabClass = ({ isActive }) =>
    `flex items-center gap-1.5 px-3 h-full text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
      isActive
        ? 'border-pink-500 text-white'
        : 'border-transparent text-gray-400 hover:text-white'
    }`;

  const HAIRLINE = 'rgba(255,255,255,0.12)';

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">
      <header
        className="relative flex items-stretch flex-shrink-0"
        style={{ height: 52, background: '#000000', borderBottom: `1px solid ${HAIRLINE}` }}
      >
        {/* Brand */}
        <div className="flex items-center gap-2 pl-4 pr-3 flex-shrink-0">
          <img src={LOGO} alt="Ignite" className="h-5 object-contain" />
          <span className="text-sm font-medium text-gray-400 hidden sm:block">Admin</span>
        </div>

        <div className="w-px my-3 flex-shrink-0" style={{ background: HAIRLINE }} />

        {/* Primary nav — scrolls horizontally rather than wrapping if the
            window is narrow, so the header stays exactly one row tall. */}
        <nav className="hidden md:flex items-stretch flex-1 min-w-0 overflow-x-auto hide-scrollbar px-1">
          {visibleItems.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} className={tabClass}>
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile nav trigger */}
        <div className="flex md:hidden items-center flex-1 px-2 static" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-medium text-gray-200 hover:bg-white/10"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
            {visibleItems.find(i => location.pathname.startsWith(i.path))?.label || 'Admin'}
          </button>

          {menuOpen && (
            <div
              className="absolute left-0 right-0 top-[52px] z-50 p-2"
              style={{ background: '#000000', borderBottom: `1px solid ${HAIRLINE}` }}
            >
              {visibleItems.map(({ path, label, icon: Icon }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-pink-500/20 text-pink-400' : 'text-gray-400 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={16} />
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="flex items-center gap-1 pr-3 pl-2 flex-shrink-0">
          <a
            href="https://ignite.education/progress"
            title="Back to Ignite"
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ExternalLink size={16} />
          </a>
          <button
            onClick={signOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
          >
            <LogOut size={16} />
          </button>

          <div className="w-px h-5 mx-1.5" style={{ background: HAIRLINE }} />

          {profilePicture ? (
            <img src={profilePicture} alt="" className="w-6 h-6 rounded-full" />
          ) : (
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-gray-200" style={{ background: 'rgba(255,255,255,0.12)' }}>
              {firstName?.[0] || '?'}
            </div>
          )}
          <span className="text-sm text-gray-300 hidden lg:block ml-1.5">{firstName || 'Admin'}</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
