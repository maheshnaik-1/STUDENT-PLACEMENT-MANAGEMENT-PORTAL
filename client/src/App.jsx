import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';

// Student Module Pages
import StudentDashboard from './pages/student/StudentDashboard';
import AvailableDrives from './pages/student/AvailableDrives';
import DriveDetails from './pages/student/DriveDetails';
import MyApplications from './pages/student/MyApplications';
import StudentProfile from './pages/student/StudentProfile';

// Officer Module Pages
import OfficerDashboard from './pages/officer/OfficerDashboard';
import ManageCompanies from './pages/officer/ManageCompanies';
import ManageDrives from './pages/officer/ManageDrives';
import DriveApplicants from './pages/officer/DriveApplicants';
import PlacementReports from './pages/officer/PlacementReports';

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Student Protected Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/drives"
            element={
              <ProtectedRoute allowedRole="student">
                <AvailableDrives />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/drives/:id"
            element={
              <ProtectedRoute allowedRole="student">
                <DriveDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/applications"
            element={
              <ProtectedRoute allowedRole="student">
                <MyApplications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRole="student">
                <StudentProfile />
              </ProtectedRoute>
            }
          />

          {/* Placement Officer Protected Routes */}
          <Route
            path="/officer/dashboard"
            element={
              <ProtectedRoute allowedRole="officer">
                <OfficerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/companies"
            element={
              <ProtectedRoute allowedRole="officer">
                <ManageCompanies />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/drives"
            element={
              <ProtectedRoute allowedRole="officer">
                <ManageDrives />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/drives/:driveId/applicants"
            element={
              <ProtectedRoute allowedRole="officer">
                <DriveApplicants />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/reports"
            element={
              <ProtectedRoute allowedRole="officer">
                <PlacementReports />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
