import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { toast, Toaster } from "sonner";
import EditCourseDialog from "./EditCourseDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Label } from "./ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

interface Course {
  course_id: number;
  course_code: string;
  num_tas_requested: number;
  skills: string[];
  assignedTAs?: string[];
  assigned_tas_count?: number; 
}

type CourseDetails = Course & { professors: string[] };

interface FacultyProfileProps {
  username: string;
}

export default function FacultyProfile({ username }: FacultyProfileProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [open, setOpen] = useState(false);


  //confirming delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // New course form state
  const [courseCode, setCourseCode] = useState("");
  const [numTAsRequested, setNumTAsRequested] = useState<number>(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [skillSelect, setSkillSelect] = useState<string>("");

  const [editOpen, setEditOpen] = useState(false);
  const [courseToEdit, setCourseToEdit] = useState<Course | null>(null);


  const existingSkills = useMemo(() => {
    const all = courses.flatMap(c => c.skills ?? []);
    return Array.from(new Set(all.map(s => s.trim()).filter(Boolean))).sort();
  }, [courses]);

  const [detailsOpen, setDetailsOpen] = useState(false);
const [detailsLoading, setDetailsLoading] = useState(false);
const [courseDetails, setCourseDetails] = useState<Course | null>(null);

// skills editing inside details dialog
const [editSkills, setEditSkills] = useState<string[]>([]);
const [detailSkillInput, setDetailSkillInput] = useState("");

const openCourseDetails = async (courseId: number) => {
  setDetailsOpen(true);
  setDetailsLoading(true);

  try {
    const res = await fetch(`http://127.0.0.1:8000/courses/${courseId}/details`);
    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();
    setCourseDetails(data);
    setEditSkills(data.skills ?? []);
  } catch (e) {
    console.error(e);
    toast.error("Failed to load course details");
    setDetailsOpen(false);
  } finally {
    setDetailsLoading(false);
  }
};

    const addDetailSkill = () => {
    const s = detailSkillInput.trim();
    if (!s) return;
    setEditSkills(prev => (prev.includes(s) ? prev : [...prev, s]));
    setDetailSkillInput("");
    };

    const removeDetailSkill = (s: string) => {
    setEditSkills(prev => prev.filter(x => x !== s));
    };

    const saveSkills = async () => {
    if (!courseDetails) return;

    const res = await fetch(
        `http://127.0.0.1:8000/courses/update?user=${username}`,
        {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            course_id: courseDetails.course_id,
            num_tas_requested: courseDetails.num_tas_requested ?? 0, // keep existing
            skills: editSkills,
        }),
        }
    );

    if (!res.ok) {
        let msg = "Failed to update skills";
        try {
        const j = await res.json();
        msg = j?.detail ?? msg;
        } catch {
        msg = await res.text();
        }
        toast.error(msg);
        return;
    }

    toast.success("Skills updated");

    // update dialog + list (so UI stays consistent)
    setCourseDetails(prev => (prev ? { ...prev, skills: editSkills } : prev));
    setCourses(prev =>
        prev.map(c => (c.course_id === courseDetails.course_id ? { ...c, skills: editSkills } : c))
    );
    };


  /* ================= FETCH COURSES ================= */
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/courses/by-professor?username=${username}`)
      .then(res => res.json())
      .then((data) => {
        // ensure skills always exists
        const normalized = (data ?? []).map((c: any) => ({
          ...c,
          skills: c.skills ?? [],
        }));
        setCourses(normalized);
      });
  }, [username]);

  const addSkill = (raw: string) => {
    const s = raw.trim();
    if (!s) return;
    setSelectedSkills(prev => (prev.includes(s) ? prev : [...prev, s]));
  };

  const removeSkill = (s: string) => {
    setSelectedSkills(prev => prev.filter(x => x !== s));
  };

  const resetForm = () => {
    setCourseCode("");
    setNumTAsRequested(0);
    setSelectedSkills([]);
    setSkillInput("");
    setSkillSelect("");
  };

  /* ================= ADD COURSE ================= */
    const addCourse = async () => {
    const res = await fetch(
        `http://127.0.0.1:8000/courses/add?username=${username}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            course_code: courseCode,
            num_tas_requested: numTAsRequested,
            skills: selectedSkills,
        }),
        }
    );

    if (!res.ok) {
        // Try to display backend detail nicely
        let msg = "Invalid request";
        try {
        const j = await res.json();
        msg = j?.detail ?? msg;
        } catch {
        msg = await res.text();
        }
        toast.error(msg || "Failed to add course");
        return;
    }

    toast.success("Course added");

    setCourseCode("");
    setOpen(false);

    const refreshed = await fetch(
        `http://127.0.0.1:8000/courses/by-professor?username=${username}`
    ).then(r => r.json());

    setCourses((refreshed ?? []).map((c: any) => ({ ...c, skills: c.skills ?? [] })));
    };


  /* ================= REMOVE COURSE ================= */
    const requestDelete = (course: Course) => {
        setCourseToDelete(course);
        setDeleteOpen(true);
    };

    const confirmDelete = async () => {
    if (!courseToDelete) return;

    const res = await fetch(
            `http://127.0.0.1:8000/courses/${courseToDelete.course_id}/professor?username=${username}`,
            { method: "DELETE" }
        );

        if (!res.ok) {
            let msg = "Failed to delete course";
            try {
            const j = await res.json();
            msg = j?.detail ?? msg;
            } catch {
            msg = await res.text();
            }
            toast.error(msg);
            return;
        }

        toast.success(`Deleted ${courseToDelete.course_code}`);
        setCourses(prev => prev.filter(c => c.course_id !== courseToDelete.course_id));
        setDeleteOpen(false);
        setCourseToDelete(null);
    };


  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <Toaster position="top-right" richColors />
          <h1 className="text-neutral-900">My Profile</h1>
          <p className="text-neutral-600">Courses you are teaching</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Course
        </Button>
      </div>

      {/* COURSES */}
      <Card>
        <CardHeader>
          <CardTitle>My Courses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-50 rounded-lg p-3">
                <div className="text-lg text-neutral-900">{courses.length}</div>
                <div className="text-xs text-neutral-500">Courses</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                <div className="text-lg text-green-700">
                    {courses.reduce((acc, c) => acc + (Array.isArray(c.assignedTAs) ? c.assignedTAs.length : Number(c.assigned_tas_count ?? 0)), 0)}
                </div>
                <div className="text-xs text-green-600">TAs assigned (total)</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-lg text-amber-700">
                    {courses.reduce((acc, c) => {
                    const req = Number(c.num_tas_requested ?? 0);
                    const asg = Array.isArray(c.assignedTAs) ? c.assignedTAs.length : Number(c.assigned_tas_count ?? 0);
                    return acc + Math.max(0, req - asg);
                    }, 0)}
                </div>
                <div className="text-xs text-amber-600">Empty positions (total)</div>
                </div>
            </div>

            {courses.map((course) => {
                const requested = Number(course.num_tas_requested ?? 0);

                const assigned = Array.isArray((course as any).assignedTAs)
                    ? (course as any).assignedTAs.length
                    : Number((course as any).assigned_tas_count ?? 0);

                const unassigned = Math.max(0, requested - assigned);

                return (
                    <div
                    key={course.course_id}
                    className="border rounded-xl p-4 bg-white cursor-pointer hover:bg-neutral-50 transition"
                    onClick={(e) => {
                            e.stopPropagation();
                            setCourseToEdit(course);
                            setEditOpen(true);
                        }}
                    >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* LEFT */}
                        <div className="min-w-0 flex-1">
                        <div className="font-medium text-neutral-900">{course.course_code}</div>
                        <div className="mt-2">
                            {unassigned > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 border border-amber-200">
                                TAs needed: <span className="ml-1 font-semibold">{unassigned}</span>
                            </span>
                            ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-green-100 text-green-700 border border-green-200">
                                Fully staffed
                            </span>
                            )}
                        </div>
                        </div>

                        {/* RIGHT stats + delete */}
                        <div className="flex items-center gap-3 md:justify-end">
                        <div className="grid grid-cols-3 gap-3 w-full md:w-[360px]">
                            <div className="bg-neutral-50 rounded-lg p-3">
                            <div className="text-lg text-neutral-900">{requested}</div>
                            <div className="text-xs text-neutral-500">Requested</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-lg text-green-700">{assigned}</div>
                            <div className="text-xs text-green-600">Assigned</div>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-3">
                            <div className="text-lg text-amber-700">{unassigned}</div>
                            <div className="text-xs text-amber-600">Unassigned</div>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                            e.stopPropagation();
                            requestDelete(course);
                            }}
                            className="shrink-0"
                            title="Delete course"
                        >
                            <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                        </div>
                    </div>
                    </div>
                );
                })}



        </CardContent>
      </Card>

      {/* ADD COURSE DIALOG */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
        <DialogContent className="w-[90vw] max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Course</DialogTitle>
            <DialogDescription>
              Add a course you teach, including TA count and required skills.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Course Code</Label>
              <Input
                value={courseCode}
                onChange={e => setCourseCode(e.target.value)}
                placeholder="COMP302"
              />
            </div>

            <div className="space-y-2">
              <Label>Number of TAs Requested</Label>
              <Input
                type="number"
                min={0}
                value={numTAsRequested}
                onChange={(e) => setNumTAsRequested(parseInt(e.target.value || "0", 10))}
              />
            </div>

            <div className="space-y-2">
              <Label>Skills Needed</Label>

              {/* Selected skills */}
              <div className="flex flex-wrap gap-2 p-3 border border-neutral-200 rounded-lg min-h-[52px]">
                {selectedSkills.length === 0 ? (
                  <span className="text-sm text-neutral-400">No skills added</span>
                ) : (
                  selectedSkills.map((s) => (
                    <Badge key={s} variant="outline" className="gap-1">
                      {s}
                      <X className="w-3 h-3 cursor-pointer" onClick={() => removeSkill(s)} />
                    </Badge>
                  ))
                )}
              </div>

              {/* Pick existing skill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={skillSelect} onValueChange={(v) => setSkillSelect(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select existing skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {existingSkills.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No existing skills yet
                      </SelectItem>
                    ) : (
                      existingSkills.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (skillSelect && skillSelect !== "__none") addSkill(skillSelect);
                    setSkillSelect("");
                  }}
                  type="button"
                >
                  Add Selected
                </Button>
              </div>

              {/* Add new skill */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Type new skill (e.g., Python)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill(skillInput);
                      setSkillInput("");
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => { addSkill(skillInput); setSkillInput(""); }}
                  type="button"
                >
                  Add New
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={addCourse}>
              Add Course
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setCourseToDelete(null); }}>
        <DialogContent className="w-[90vw] max-w-md">
            <DialogHeader>
            <DialogTitle>Delete course?</DialogTitle>
            <DialogDescription>
                This will remove <span className="font-medium text-neutral-900">{courseToDelete?.course_code}</span> from your profile.
                If no other professors are linked, the course will be deleted from the system.
            </DialogDescription>
            </DialogHeader>

            <div className="flex gap-3 pt-4">
            <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmDelete}
            >
                Yes, delete
            </Button>
            <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setDeleteOpen(false); setCourseToDelete(null); }}
            >
                Cancel
            </Button>
            </div>
        </DialogContent>
        </Dialog>

            <EditCourseDialog
                    open={editOpen}
                    onClose={() => {
                        setEditOpen(false);
                        setCourseToEdit(null);
                    }}
                    existingSkills={existingSkills}
                    course={courseToEdit}
                    username={username}
                    onSaved={(updated) => {
                        setCourses((prev) =>
                        prev.map((c) =>
                            c.course_id === courseToEdit?.course_id
                            ? { ...c, ...updated }
                            : c
                        )
                        );
                    }}
                    />


    </div>
  );
}
