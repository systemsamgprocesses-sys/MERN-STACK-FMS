import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, LayoutDashboard, ClipboardList, Package, Archive } from 'lucide-react';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white flex flex-col shadow-lg">
        <div className="flex items-center justify-center h-20 shadow-md bg-gray-900 px-4">
          <img
            src="http://localhost:3000/assets/AMG LOGO.webp"
            alt="AMG Logo"
            className="h-12 w-12 object-contain rounded-lg mr-3"
          />
          <h1 className="text-lg font-bold">HR Portal</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Request Dashboard
          </NavLink>

          <NavLink
            to="/inventory"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <Package className="mr-3 h-5 w-5" />
            Inventory Master
          </NavLink>

          <NavLink
            to="/issue-log"
            className={({ isActive }) =>
              `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <Archive className="mr-3 h-5 w-5" />
            Issue Log
          </NavLink>
        </nav>

        <div className="p-4 border-t border-gray-700 bg-gray-900">
          <div className="flex items-center mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold mr-3">
              {user?.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

