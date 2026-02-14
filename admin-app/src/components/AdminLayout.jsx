import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  FileEdit,
  BarChart3,
  BookOpen,
  Newspaper,
  FileText,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { path: '/curriculum', label: 'Curriculum', icon: FileEdit, roles: ['admin', 'teacher'] },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin'] },
  { path: '/courses', label: 'Courses', icon: BookOpen, roles: ['admin'] },
  { path: '/blog', label: 'Blog', icon: Newspaper, roles: ['admin'] },
  { path: '/release-notes', label: 'Release Notes', icon: FileText, roles: ['admin'] },
];

const AdminLayout = ({ children }) => {
  const { userRole, firstName, profilePicture, signOut } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex w-60 border-r border-gray-700/50 flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <img
              src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png"
              alt="Ignite"
              className="h-6 object-contain"
            />
            <span className="text-sm font-medium text-gray-400">Admin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {visibleItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-pink-500/10 text-pink-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-gray-700/50 space-y-1">
          <a
            href="https://ignite.education/progress"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ExternalLink size={18} />
            Back to Ignite
          </a>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors w-full"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-gray-700/50 flex items-center justify-between px-5 flex-shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Page title from nav */}
          <h1 className="text-sm font-medium text-gray-300 hidden md:block">
            {visibleItems.find(item => location.pathname.startsWith(item.path))?.label || 'Admin'}
          </h1>

          {/* User info */}
          <div className="flex items-center gap-3">
            {profilePicture ? (
              <img src={profilePicture} alt="" className="w-7 h-7 rounded-full" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">
                {firstName?.[0] || '?'}
              </div>
            )}
            <span className="text-sm text-gray-300 hidden sm:block">{firstName || 'Admin'}</span>
          </div>
        </header>

        {/* Mobile sidebar overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-60 h-full bg-gray-900 border-r border-gray-700/50 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-700/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src="https://yjvdakdghkfnlhdpbocg.supabase.co/storage/v1/object/public/assets/ignite_Logo_MV_4.png"
                    alt="Ignite"
                    className="h-6 object-contain"
                  />
                  <span className="text-sm font-medium text-gray-400">Admin</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-1">
                {visibleItems.map(({ path, label, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-pink-500/10 text-pink-400'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </nav>

              <div className="p-3 border-t border-gray-700/50 space-y-1">
                <a
                  href="https://ignite.education/progress"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <ExternalLink size={18} />
                  Back to Ignite
                </a>
                <button
                  onClick={signOut}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors w-full"
                >
                  <LogOut size={18} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
