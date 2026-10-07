import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import {
  GraduationCap,
  LayoutDashboard,
  Building2,
  Briefcase,
  FileCheck,
  User,
  LogOut,
  BarChart3,
  LogIn,
  UserPlus,
} from 'lucide-react';

const Navbar = () => {
  const { user, isAuthenticated, isOfficer, isStudent, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">
            <GraduationCap size={22} />
          </div>
          <span>PlacementPortal</span>
        </Link>

        <nav>
          <ul className="nav-links">
            {/* Public Links */}
            {!isAuthenticated && (
              <>
                <li>
                  <NavLink
                    to="/"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    Home
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <LogIn size={16} />
                    Login
                  </NavLink>
                </li>
                <li>
                  <Link to="/register" className="btn btn-primary btn-sm">
                    <UserPlus size={16} />
                    Register
                  </Link>
                </li>
              </>
            )}

            {/* Student Navigation Links */}
            {isAuthenticated && isStudent && (
              <>
                <li>
                  <NavLink
                    to="/student/dashboard"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/student/drives"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <Briefcase size={16} />
                    Placement Drives
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/student/applications"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <FileCheck size={16} />
                    My Applications
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/student/profile"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <User size={16} />
                    Profile
                  </NavLink>
                </li>
              </>
            )}

            {/* Placement Officer Navigation Links */}
            {isAuthenticated && isOfficer && (
              <>
                <li>
                  <NavLink
                    to="/officer/dashboard"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <LayoutDashboard size={16} />
                    Overview
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/officer/companies"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <Building2 size={16} />
                    Companies
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/officer/drives"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <Briefcase size={16} />
                    Manage Drives
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to="/officer/reports"
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <BarChart3 size={16} />
                    Analytics & Reports
                  </NavLink>
                </li>
              </>
            )}

            {/* Authenticated User Menu */}
            {isAuthenticated && (
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem' }}>
                <NotificationBell />
                <div className="user-badge">
                  <span>{user.name.split(' ')[0]}</span>
                  <span className={`role-pill ${user.role}`}>
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  title="Logout"
                  style={{ padding: '0.35rem 0.65rem' }}
                >
                  <LogOut size={15} />
                  <span>Logout</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
