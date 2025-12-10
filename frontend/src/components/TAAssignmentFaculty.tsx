import { useState, useEffect } from 'react';
import { Search, Edit, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

import { Label } from './ui/label';
import { Textarea } from './ui/textarea';

interface TAAssignmentFacultyProps {
  userName: string;
}

type CourseStatus = 'assigned' | 'partial' | 'unassigned';

interface Course {
  id: string;
  code: string;
  name: string;
  requiredTAs: number;
  assignedTAs: string[];
  skills: string[];
  status: CourseStatus;
}


export default function TAAssignmentFaculty({ userName }: TAAssignmentFacultyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('fall-2025');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [numTAs, setnumTAs] = useState(0);

  useEffect(() => {
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://127.0.0.1:8000/courses/by-professor?username=${userName}`
      );
      if (!response.ok) throw new Error('Failed to fetch courses');

      const data = await response.json();

      // Normalize API data: provide defaults for missing fields
      const normalizedCourses: Course[] = data.map((c: any) => ({
        id: c.course_id?.toString() ?? '',
        code: c.course_code ?? 'Unknown',
        name: c.name ?? '',
        requiredTAs: c.num_tas_requested ?? 0,
        assignedTAs: c.assignedTAs ?? [], // default empty array
        skills: c.skills ?? [],           // default empty array
        status: c.status ?? 'unassigned',
      }));

      setCourses(normalizedCourses);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  fetchCourses();
  }, [userName]);

    async function updateCourseInDB(updated: Course) {
    try {
      const response = await fetch("http://127.0.0.1:8000/courses/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: Number(updated.id),
          num_tas_requested: updated.requiredTAs,
          skills: updated.skills,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update course");
      }

      return await response.json();
    } catch (err) {
      console.error("Update error:", err);
    }
  }



  const getStatusBadge = (requiredTAs: number, assignedTAs: string[]) => {
    if (assignedTAs.length >= requiredTAs && requiredTAs > 0) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Assigned</Badge>;
    } else if (assignedTAs.length > 0 && assignedTAs.length < requiredTAs) {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Partially Assigned</Badge>;
    } else {
      return <Badge className="bg-neutral-100 text-neutral-700 border-neutral-200">Not Assigned</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fall-2025">Fall 2025</SelectItem>
                  <SelectItem value="winter-2026">Winter 2026</SelectItem>
                  <SelectItem value="summer-2025">Summer 2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Courses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3 px-4 text-sm text-neutral-600">Course</th>
                  <th className="text-left py-3 px-4 text-sm text-neutral-600">Required TAs</th>
                  <th className="text-left py-3 px-4 text-sm text-neutral-600">Preferred Skills</th>
                  <th className="text-left py-3 px-4 text-sm text-neutral-600">Assigned TAs</th>
                  <th className="text-left py-3 px-4 text-sm text-neutral-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-neutral-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                    <td className="py-4 px-4">
                      <div className="text-sm text-neutral-900">{course.code}</div>
                      <div className="text-xs text-neutral-500">{course.name}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-sm text-neutral-900">{course.requiredTAs}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {course.skills.slice(0, 2).map((skill, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {course.skills.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{course.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {course.assignedTAs.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {course.assignedTAs.map((ta, i) => (
                            <div
                              key={i}
                              className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs"
                            >
                              {ta}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-neutral-400">None</span>
                      )}
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(course.requiredTAs, course.assignedTAs)}</td>
                    <td className="py-4 px-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {setEditingCourse(course), setSkills(course.skills), setnumTAs(course.requiredTAs);}}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Preferences Sheet */}
      <Dialog open={editingCourse !== null} onOpenChange={() => setEditingCourse(null)}>
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto border-4 border-red-500">
          <DialogHeader>
            <DialogTitle>Edit TA Preferences {editingCourse?.code} {editingCourse?.name}</DialogTitle>
            <DialogDescription>
              Set your requirements and preferences for TA assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-6">
            {/* Number of TAs */}
            <div className="space-y-2">
              <Label htmlFor="num-tas">Number of TAs Needed</Label>
          <Input
            id="num-tas"
            type="number"
            value={numTAs}
            onChange={(e) => setnumTAs(Number(e.target.value))}
          />            
          </div>

            {/* Preferred Skills */}
            <div className="space-y-2">
              <Label>Preferred Skills (tags)</Label>
              <div className="flex flex-wrap gap-2 p-3 border rounded-lg min-h-[80px]">
                {skills.length === 0 && (
                  <p className="text-neutral-400 text-sm">No skills added.</p>
                )}

                {skills.map((skill, i) => (
                  <Badge key={i} variant="outline" className="gap-1 pointer-events-auto">
                    {skill}
                    <span className="pointer-events-auto">
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSkills(prev => prev.filter((_, idx) => idx !== i));
                        }}
                      />
                    </span>

                  </Badge>

                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const newSkill = prompt("Enter a new skill:");
                  if (newSkill) setSkills((prev) => [...prev, newSkill]);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Skill
              </Button>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes for Coordinator</Label>
              <Textarea
                id="notes"
                placeholder="Any additional preferences or requirements..."
                rows={4}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              onClick={async () => {
                if (!editingCourse) return;

                const updated = {
                  ...editingCourse,
                  requiredTAs: numTAs,
                  skills: skills,
                };

                // 1. Update backend
                await updateCourseInDB(updated);

                // 2. Update local state
                setCourses(prev =>
                  prev.map(c => (c.id === updated.id ? updated : c))
                );

                // 3. Close modal
                setEditingCourse(null);
              }}
            >
              Save Preferences
            </Button>

              <Button variant="outline" onClick={() => setEditingCourse(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}