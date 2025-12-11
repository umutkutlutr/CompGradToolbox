import { Users, FileCheck, ArrowRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { UserRole } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useEffect, useState } from 'react';

interface DashboardProps {
  name: string;
  userRole: UserRole;
  onNavigate: (page: string) => void;
}
interface ActivityLog {
  action: string;
  user: string;
  type: "success" | "warning" | "info";
  minutes_ago: number;
}

export default function Dashboard({ name, userRole, onNavigate }: DashboardProps) {
  const getRoleLabel = () => {
    switch (userRole) {
      case 'faculty':
        return 'Faculty';
      case 'student':
        return 'TA / Student';
      case 'admin':
        return 'Administrator';
      default:
        return 'User';
    }
  };

  const [summary, setSummary] = useState({
    courses: 0,
    assigned: 0,
    unassigned: 0,
  });
  const [activity, setActivity] = useState<ActivityLog[]>([]);


  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();
        setSummary(data);
      } catch (err) {
        console.error("Failed to load dashboard summary:", err);
      }
    };
    fetchSummary();
  }, []);
  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await fetch("/api/logs");
        const data = await res.json();
        setActivity(data);
      } catch (err) {
        console.error("Failed to load activity logs:", err);
      }
    };
    fetchActivity();
  }, []);



  const recentActivity = [
    {
      action: 'TA Assignment run completed',
      user: 'Admin User',
      time: '2 hours ago',
      type: 'success' as const,
    },
    {
      action: 'COMP590 report uploaded',
      user: 'Alex Thompson',
      time: '3 hours ago',
      type: 'info' as const,
    },
    {
      action: 'TA override for COMP302',
      user: 'Dr. Sarah Chen',
      time: '5 hours ago',
      type: 'warning' as const,
    },
    {
      action: 'COMP291 report passed checks',
      user: 'Jamie Lee',
      time: '1 day ago',
      type: 'success' as const,
    },
    {
      action: 'Preferences updated for COMP421',
      user: 'Dr. Michael Park',
      time: '1 day ago',
      type: 'info' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-neutral-900 mb-1">Welcome, {name.split(' ')[0]}</h1>
        <p className="text-neutral-600">Role: {getRoleLabel()}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Cards */}
        <div className="lg:col-span-2 space-y-6">
          {/* TA Assignment Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-700" />
                  </div>
                  <div>
                    <CardTitle>TA Assignment</CardTitle>
                    <CardDescription>Fall 2025 Term</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl text-neutral-900">{summary.courses}</div>
                  <div className="text-sm text-neutral-500">Courses this term</div>
                </div>
                <div>
                  <div className="text-2xl text-green-600">{summary.assigned}</div>
                  <div className="text-sm text-neutral-500">TAs assigned</div>
                </div>
                <div>
                  <div className="text-2xl text-amber-600">{summary.unassigned}</div>
                  <div className="text-sm text-neutral-500">Unassigned positions</div>
                </div>
              </div>
              <div className="pt-2">
                <Button onClick={() => onNavigate('ta-assignment')} className="w-full sm:w-auto">
                  {userRole === 'admin' ? 'Run Assignment' : 'View TA Assignment'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* People Directory */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5 text-teal-700" />
                  </div>
                  <div>
                    <CardTitle>People Directory</CardTitle>
                    <CardDescription>Faculty & TA listings</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-neutral-600 text-sm">
                Browse all professors and TAs, view profiles, and update academic info.
              </p>

              <Button 
                onClick={() => onNavigate('people-directory')} 
                className="w-full sm:w-auto"
              >
                Open Directory
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>


          {/* Report Checkers Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-purple-700" />
                  </div>
                  <div>
                    <CardTitle>Report Checkers</CardTitle>
                    <CardDescription>Automated format validation</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* COMP590 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-neutral-900">COMP590 Seminar</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('comp590')}
                  >
                    Open
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <div className="text-lg text-neutral-900">24</div>
                    <div className="text-xs text-neutral-500">Reports uploaded</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-lg text-green-700">19</div>
                    <div className="text-xs text-green-600">Passed</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-lg text-amber-700">5</div>
                    <div className="text-xs text-amber-600">Issues found</div>
                  </div>
                </div>
              </div>

              {/* COMP291/391 */}
              <div className="space-y-3 pt-3 border-t border-neutral-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-neutral-900">COMP291/391 Internship</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate('comp291-391')}
                  >
                    Open
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-50 rounded-lg p-3">
                    <div className="text-lg text-neutral-900">31</div>
                    <div className="text-xs text-neutral-500">Reports uploaded</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-lg text-green-700">27</div>
                    <div className="text-xs text-green-600">Passed</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-lg text-amber-700">4</div>
                    <div className="text-xs text-amber-600">Issues found</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>System updates and actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
              {activity.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {item.type === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    {item.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-600" />}
                    {item.type === 'info' && <Clock className="w-4 h-4 text-blue-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-900">{item.action}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {item.user} • {item.minutes_ago} min ago
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
