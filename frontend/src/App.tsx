import { useState } from 'react';
import { Home, Users, FileCheck, Settings, BarChart3, Shield } from 'lucide-react';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import TAAssignmentFaculty from './components/TAAssignmentFaculty';
import TAProfileStudent from './components/TAProfileStudent';
import TAAssignmentCoordinator from './components/TAAssignmentCoordinator';
import ReportChecker from './components/ReportChecker';
import RulesAndWeights from './components/RulesAndWeights';
import AuditLogs from './components/AuditLogs';
import PeopleDirectory from './components/PeopleDirectory';

export type UserRole = 'faculty' | 'student' | 'admin';

export type NavigationItem = {
  id: string;
  label: string;
  icon: any;
  children?: { id: string; label: string }[];
};

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'ta-assignment', label: 'TA Assignment', icon: Users },
  {
    id: 'report-checkers',
    label: 'Report Checkers',
    icon: FileCheck,
    children: [
      { id: 'comp590', label: 'COMP590 Seminar' },
      { id: 'comp291-391', label: 'COMP291/391 Internship' },
    ],
  },
  {
    id: 'admin',
    label: 'Admin & Settings',
    icon: Settings,
    children: [
      { id: 'rules-weights', label: 'Rules & Weights' },
      { id: 'audit-logs', label: 'Audit Logs' },
    ],
  },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('faculty');
  const [userName, setUserName] = useState('Dr. Sarah Chen');
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleLogin = (role: UserRole) => {
    setIsLoggedIn(true);
    setUserRole(role);
    if (role === 'faculty') {
      setUserName('Dr. Sarah Chen');
    } else if (role === 'student') {
      setUserName('Alex Thompson');
    } else {
      setUserName('Admin User');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard userName={userName} userRole={userRole} onNavigate={setCurrentPage} />;
      case 'ta-assignment':
        if (userRole === 'student') {
          return <TAProfileStudent />;
        } else if (userRole === 'admin') {
          return <TAAssignmentCoordinator />;
        }
        return <TAAssignmentFaculty />;
      case 'comp590':
        return <ReportChecker type="comp590" />;
      case 'comp291-391':
        return <ReportChecker type="comp291-391" />;
      case 'rules-weights':
        return <RulesAndWeights />;
      case 'audit-logs':
        return <AuditLogs />;
      case 'people-directory':
        return <PeopleDirectory />;
      default:
        return <Dashboard userName={userName} userRole={userRole} onNavigate={setCurrentPage} />;
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'ta-assignment':
        if (userRole === 'student') return 'My TA Profile';
        if (userRole === 'admin') return 'TA Assignment – Coordinator';
        return 'TA Assignment – Faculty View';
      case 'comp590':
        return 'COMP590 Seminar Report Checker';
      case 'comp291-391':
        return 'COMP291/391 Internship Report Checker';
      case 'rules-weights':
        return 'Rules & Weights Configuration';
      case 'audit-logs':
        return 'Audit Logs';
      default:
        return 'Dashboard';
    }
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar
        navigationItems={navigationItems}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          pageTitle={getPageTitle()}
          userName={userName}
          userRole={userRole}
          onLogout={handleLogout}
        />
        <main className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto p-6 md:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}
