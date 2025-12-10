import { useState, useEffect } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Slider } from './ui/slider';

type TAProfileStudentProps = {
  taId: number | null;
};

type Course = {
  course_id: number;
  course_code: string;
  ps_lab_sections: string;
  enrollment_capacity: number;
  actual_enrollment: number;
  num_tas_requested: number;
  assigned_tas_count: number;
  skills: string[];
};

type CourseInterestLevel = 'High' | 'Medium' | 'Low' | null;

export default function TAProfileStudent({ taId }: TAProfileStudentProps) {
  const [loading, setLoading] = useState(true);
  const [taData, setTaData] = useState<any>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [workload, setWorkload] = useState([50]);
  const [courseInterests, setCourseInterests] = useState<Record<string, CourseInterestLevel>>({});
  const [saving, setSaving] = useState(false);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);

  // Fetch courses
  useEffect(() => {
    fetch('http://localhost:8000/courses/')
      .then(res => res.json())
      .then((data: Course[]) => {
        setCourses(data);

        // Extract ALL distinct skills from all courses
        const allSkills = new Set<string>();
        data.forEach(course => {
          course.skills?.forEach(skill => allSkills.add(skill));
        });

        setAvailableSkills(Array.from(allSkills));
      })
      .catch(err => console.error('Error fetching courses:', err));
  }, []);

  // Fetch TA data after courses are loaded
  useEffect(() => {
    if (!taId || courses.length === 0) return;

    setLoading(true);
    fetch(`http://localhost:8000/api/tas/${taId}`)
      .then(res => res.json())
      .then(data => {
        setTaData(data);
        setSkills(data.skills || []);
        const sliderVal = data.max_hours ? Math.round(((data.max_hours - 5) / 15) * 100) : 50;
        setWorkload([sliderVal]);

        // Initialize course interests for all courses
        const interests: Record<string, CourseInterestLevel> = {};
        courses.forEach(course => {
          interests[course.course_code] = data.course_interests?.[course.course_code] ?? null;
        });
        setCourseInterests(interests);
      })
      .catch(err => console.error('Error fetching TA data:', err))
      .finally(() => setLoading(false));
  }, [taId, courses]);

  const getInterestColor = (interest: string) => {
    switch (interest) {
      case 'High': return 'bg-green-600 hover:bg-green-700';
      case 'Medium': return 'bg-amber-600 hover:bg-amber-700';
      case 'Low': return 'bg-neutral-400 hover:bg-neutral-500';
      default: return 'bg-neutral-200 hover:bg-neutral-300';
    }
  };

  const handleAddSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleSaveProfile = async () => {
    if (!taId) return;

    setSaving(true);
    try {
      const maxHours = Math.round((workload[0] / 100) * 15 + 5);
      
      const payload = {
        skills,
        max_hours: maxHours,
        course_interests: courseInterests
      };

      const response = await fetch(`http://localhost:8000/api/tas/${taId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save profile');
      }

      const updatedData = await response.json();
      setTaData(updatedData);
      alert('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !taData || courses.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your basic profile details (read-only)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-neutral-500">Full Name</Label>
              <div className="text-sm text-neutral-900 mt-1">{taData.name}</div>
            </div>
            <div>
              <Label className="text-xs text-neutral-500">Program</Label>
              <div className="text-sm text-neutral-900 mt-1">{taData.program}</div>
            </div>
            <div>
              <Label className="text-xs text-neutral-500">Level</Label>
              <div className="text-sm text-neutral-900 mt-1">{taData.level}</div>
            </div>
            <div>
              <Label className="text-xs text-neutral-500">Max Hours/Week</Label>
              <div className="text-sm text-neutral-900 mt-1">{taData.max_hours}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills & Expertise */}
      <Card>
        <CardHeader>
          <CardTitle>Skills & Expertise</CardTitle>
          <CardDescription>Add relevant courses, programming languages, and technical skills</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Current Skills */}
          <div className="flex flex-wrap gap-2 p-4 border border-neutral-200 rounded-lg min-h-[100px]">
            {skills.map((skill, index) => (
              <Badge key={index} variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
                {skill}
                <button onClick={() => setSkills(skills.filter((_, i) => i !== index))}>
                  <X className="w-3 h-3 cursor-pointer hover:text-blue-900" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Available Skills from all courses */}
          {availableSkills.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Available Skills (Click to Add)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-neutral-50">
                {availableSkills
                  .filter(skill => !skills.includes(skill))
                  .map((skill, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="gap-1 cursor-pointer border-blue-300 text-blue-700 hover:bg-blue-100"
                      onClick={() => setSkills(prev => [...prev, skill])}
                    >
                      {skill}
                      <Plus className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* Course Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Course Preferences</CardTitle>
          <CardDescription>Indicate your interest level for being a TA for each course</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {courses.map(course => {
              const interest = courseInterests[course.course_code] ?? null;
              return (
                <div key={course.course_code} className="flex items-center justify-between py-3 px-4 bg-neutral-50 rounded-lg">
                  <div>
                    <div className="text-sm text-neutral-900">{course.course_code}</div>
                    <div className="text-xs text-neutral-500">{course.ps_lab_sections}</div>
                  </div>
                  <div className="flex gap-2">
                    {(['High', 'Medium', 'Low'] as const).map(level => (
                      <Button
                        key={level}
                        size="sm"
                        variant={interest === level ? 'default' : 'outline'}
                        className={interest === level ? getInterestColor(level) : ''}
                        onClick={() => setCourseInterests(prev => ({ ...prev, [course.course_code]: level }))}
                      >
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg" className="gap-2" onClick={handleSaveProfile} disabled={saving}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}