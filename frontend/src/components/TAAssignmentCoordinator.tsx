import { useState, useEffect } from 'react';
import { Play, Download, Info, X, Backpack } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

import { AlertCircle } from 'lucide-react';

interface CourseAssignment {
  code: string;
  name: string;
  professor: string;
  tas: string[];
  violations: string;
}

interface TAAssignment {
  name: string;
  courses: string[];
  load: number;
  maxLoad: number;
}

interface TAAssignmentCoordinatorProps {
  name: string;
  onNavigate: (page: string) => void;
}

export default function TAAssignmentCoordinator({ name, onNavigate }: TAAssignmentCoordinatorProps) {
  const [skillWeight, setSkillWeight] = useState([70]);
  const [facultyPrefWeight, setFacultyPrefWeight] = useState([60]);
  const [taPrefWeight, setTaPrefWeight] = useState([50]);
  const [workloadWeight, setWorkloadWeight] = useState([80]);



  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseAssignment | null>(null);

  const [tasToRemove, setTasToRemove] = useState<string[]>([]);
  const [tasToAdd, setTasToAdd] = useState<string[]>([]);

  const allTANames = result?.workloads ? Object.keys(result.workloads) : [];

  const availableTAsForSelectedCourse =
    selectedCourse && result?.workloads
      ? allTANames.filter((taName) => !selectedCourse.tas.includes(taName))
      : [];





  // =====================================
  // FETCH WEIGHTS
  // =====================================
  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const res = await fetch('/api/weights');
        const data = await res.json();
        setSkillWeight([Math.round(data.course_pref * 100)]);
        setFacultyPrefWeight([Math.round(data.prof_pref * 100)]);
        setTaPrefWeight([Math.round(data.ta_pref * 100)]);
        setWorkloadWeight([Math.round(data.workload_balance * 100)]);
      } catch (err) {
        console.error("Failed to fetch weights", err);
      }
    };

    fetchWeights();
  }, []);

  // =====================================
// FETCH SAVED ASSIGNMENTS ON REFRESH
// =====================================
useEffect(() => {
  const fetchSaved = async () => {
    try {
      const res = await fetch("/api/get-assignments");
      const data = await res.json();

      if (data && Object.keys(data.assignments || {}).length > 0) {
        setResult(data);
      }
    } catch (err) {
      console.error("Failed to load saved assignments", err);
    }
  };

  fetchSaved();
}, []);

  
  const saveWeights = async () => {
    try {
      const payload = {
        ta_pref: taPrefWeight[0] / 100,
        prof_pref: facultyPrefWeight[0] / 100,
        course_pref: skillWeight[0] / 100,
        workload_balance: workloadWeight[0] / 100,
      };
      await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Failed to save weights", err);
    }
  };


  // =====================================
  // Override any ta changes with modal
  // =====================================
  const saveOverride = async () => {
    if (!selectedCourse) return;

    try {
      const payload = {
        course_code: selectedCourse.code,
        remove_tas: tasToRemove,   
        add_tas: tasToAdd,    
        user: name,     
      };

      const res = await fetch("/api/override-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save override");

      // Refresh assignments
      const updated = await fetch("/api/get-assignments");
      const updatedData = await updated.json();
      setResult(updatedData);

      // Close modal and reset UI state
      setDetailsOpen(false);
      setTasToRemove([]);
      setTasToAdd([]);
      setSelectedCourse(null);

    } catch (err) {
      console.error("Error saving override:", err);
    }
  };



  // =====================================
  // RUN ASSIGNMENT ALGORITHM
  // =====================================
  const runAssignment = async () => {
    setLoading(true);
    try {
      await fetch(`/api/run-assignment?user=Admin`);

      const saved = await fetch("/api/get-assignments");
      const savedData = await saved.json();

      setResult(savedData);
      saveWeights();

      console.log("Updated assignment result:", savedData);
    } catch (err) {
      console.error("Failed to run assignment", err);
    } finally {
      setLoading(false);
    }
  };



  // =====================================
  // DERIVE STRUCTURES FROM RESULT
  // =====================================
  const assignmentsByCourse: CourseAssignment[] = result
    ? Object.entries(result.assignments).map(([courseCode, info]) => ({
        code: courseCode,
        name: courseCode,
        professor: info.professor,
        tas: info.tas,
        violations: "none",
      }))
    : [];

  const assignmentsByTA: TAAssignment[] = result
    ? Object.entries(result.workloads).map(([taName, load]) => ({
        name: taName,
        courses: Object.entries(result.assignments)
          .filter(([courseCode, info]) => info.tas.includes(taName))
          .map(([courseCode]) => courseCode),
        load: load as number,
        maxLoad: 20,
      }))
    : [];

      // Handle View Details -> Opening Modal
    const handleViewDetails = (course: CourseAssignment) => {
    setSelectedCourse(course);
    setTasToRemove([]);
    setTasToAdd([]);
    setDetailsOpen(true);
    };

    //helpers for toggle and removal
    const toggleRemoveTA = (taName: string) => {
      setTasToRemove((prev) =>
        prev.includes(taName)
          ? prev.filter((t) => t !== taName)
          : [...prev, taName]
      );
    };

    const toggleAddTA = (taName: string) => {
      setTasToAdd((prev) =>
        prev.includes(taName)
          ? prev.filter((t) => t !== taName)
          : [...prev, taName]
      );
    };

    console.log("Received name in TAAssignmentCoordinator:", name);






  // =====================================
  // MAIN UI RENDER
  // =====================================
  return (
    <div className="space-y-6">
      {/* =======================
          WEIGHTS CONFIGURATION
          ======================= */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Weights Configuration</CardTitle>
          <CardDescription>
            Adjust the importance of each factor in the TA assignment algorithm
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">

            {/* Skill Match */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Skill Match</Label>
                <span>{skillWeight[0]}%</span>
              </div>
              <Slider value={skillWeight} onValueChange={(v: number[]) => { setSkillWeight(v); saveWeights(); }} max={100} step={5} />
            </div>

            {/* Faculty Pref */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Faculty Preference</Label>
                <span>{facultyPrefWeight[0]}%</span>
              </div>
              <Slider value={facultyPrefWeight} onValueChange={(v: number[]) => { setFacultyPrefWeight(v); saveWeights(); }} max={100} step={5} />
            </div>

            {/* TA Pref */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>TA Preference</Label>
                <span>{taPrefWeight[0]}%</span>
              </div>
              <Slider value={taPrefWeight} onValueChange={(v: number[]) => { setTaPrefWeight(v); saveWeights(); }} max={100} step={5} />
            </div>

            {/* Workload */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Fair Workload Distribution</Label>
                <span>{workloadWeight[0]}%</span>
              </div>
              <Slider value={workloadWeight} onValueChange={(v: number[]) => { setWorkloadWeight(v); saveWeights(); }} max={100} step={5} />
            </div>

          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border">
            <div className="flex gap-2">
              <Info className="w-5 h-5 text-blue-700 mt-0.5" />
              <div className="text-blue-900 text-sm">
                <p>Hard constraints must always be satisfied.</p>
                <p>Weights only influence soft preference optimization.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button size="lg" className="gap-2" onClick={runAssignment} disabled={loading}>
              <Play className="w-4 h-4" />
              {loading ? "Running..." : "Run Assignment"}
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              onClick={() => window.open("http://127.0.0.1:8000/api/export-assignments-xlsx", "_blank")}
              disabled={!result}
            >
              <Download className="w-4 h-4" />
              Export Results
            </Button>





          </div>
        </CardContent>
      </Card>

      {/* =======================
          ASSIGNMENT RESULTS
          ======================= */}
      <Card>
        <CardHeader>
          <CardTitle>Assignment Results</CardTitle>
          <CardDescription>Review and manage TA assignments</CardDescription>
        </CardHeader>

        <CardContent>

          {!result && (
            <p className="text-neutral-500 text-sm">Run assignment to see results.</p>
          )}

          {result && (
            <Tabs defaultValue="by-course">
              <TabsList className="mb-4">
                <TabsTrigger value="by-course">By Course</TabsTrigger>
                <TabsTrigger value="by-ta">By TA</TabsTrigger>
              </TabsList>

              {/* ================== BY COURSE ================== */}
              <TabsContent value="by-course">
                <div className="overflow-x-auto">
                  <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Course</th>
                      <th className="text-left py-3 px-4">Professor</th>
                      <th className="text-left py-3 px-4">Assigned TAs</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                    <tbody>
                      {assignmentsByCourse.map(course => (
                        <tr key={course.code} className="border-b hover:bg-neutral-50">

                          {/* Course */}
                          <td className="py-4 px-4">
                            <div className="font-medium">{course.code}</div>
                            <div className="text-xs text-neutral-500">{course.name}</div>
                          </td>
                          {/* Professor */}
                          <td className="py-4 px-4">
                            <span className="inline-block px-2 py-1 rounded-md text-blue-700 bg-blue-50 border border-blue-200 text-sm font-sm">
                              {course.professor}
                            </span>
                          </td>
                          {/* TAs */}
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {course.tas.map((ta: string, i: number) => (
                                <Badge key={i} variant="outline">{ta}</Badge>
                              ))}
                            </div>
                          </td>
                          {/* Actions */}
                          <td className="py-4 px-4 ">
                            <Button className="border rounded bg-amber-100 border-amber-200" size="sm" variant="ghost" onClick={() => handleViewDetails(course)}>
                              <AlertCircle className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              {/* ================== BY TA ================== */}
              <TabsContent value="by-ta">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">TA</th>
                        <th className="text-left py-3 px-4">Courses</th>
                        <th className="text-left py-3 px-4">Load</th>
                        <th className="text-left py-3 px-4">Workload</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignmentsByTA.map((ta, i) => (
                        <tr key={i} className="border-b hover:bg-neutral-50">

                          {/* TA Name */}
                          <td className="py-4 px-4">{ta.name}</td>

                          {/* Courses */}
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {ta.courses.map((course, i) => (
                                <Badge key={i} variant="outline">{course}</Badge>
                              ))}
                            </div>
                          </td>

                          {/* Load */}
                          <td className="py-4 px-4">
                            <div>{ta.load} hrs / {ta.maxLoad} hrs</div>
                          </td>

                          {/* Workload Bar */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-neutral-200 h-2 rounded-full">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${(ta.load / ta.maxLoad) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-neutral-600">
                                {Math.round((ta.load / ta.maxLoad) * 100)}%
                              </span>
                            </div>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

            </Tabs>
          )}

        </CardContent>
      </Card>

      {/* DETAILS SHEET */}
      {/* DETAILS MODAL */}
      <Dialog open={detailsOpen} onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) {
            setSelectedCourse(null);
            setTasToRemove([]);
            setTasToAdd([]);
          }
        }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              {selectedCourse
                ? `${selectedCourse.code} — ${selectedCourse.name} (Professor: ${selectedCourse.professor})`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <div className="space-y-6 mt-6">

              {/* Assigned TAs with removable X */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-neutral-900">Assigned TAs</h4>

                {selectedCourse.tas.length === 0 && (
                  <p className="text-xs text-neutral-500">No TAs assigned yet.</p>
                )}

                <div className="space-y-2">
                  {selectedCourse.tas.map((ta) => {
                    const marked = tasToRemove.includes(ta);
                    return (
                      <div
                        key={ta}
                        className="flex items-center justify-between rounded-md border px-3 py-2 bg-neutral-50"
                      >
                        <div className="flex flex-col">
                          <span
                            className={
                              "text-sm " +
                              (marked ? "line-through text-neutral-400" : "text-neutral-900")
                            }
                          >
                            {ta}
                          </span>
                          {marked && (
                            <span className="text-[10px] uppercase tracking-wide text-red-500">
                              Marked for removal
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleRemoveTA(ta)}
                          className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 p-1 hover:bg-red-100"
                        >
                          <X className="w-3 h-3 text-red-600" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Available TAs to assign */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="text-sm font-medium text-neutral-900">Available TAs to Assign</h4>

                {availableTAsForSelectedCourse.length === 0 && (
                  <p className="text-xs text-neutral-500">
                    No additional TAs available for assignment.
                  </p>
                )}

                <div className="space-y-2">
                  {availableTAsForSelectedCourse.map((taName) => {
                    const currentLoad = result.workloads?.[taName] ?? 0;
                    const maxLoad = 20;
                    const percentage = Math.round((currentLoad / maxLoad) * 100);
                    const selected = tasToAdd.includes(taName);

                    return (
                      <button
                        key={taName}
                        type="button"
                        onClick={() => toggleAddTA(taName)}
                        className={
                          "w-full text-left rounded-md border px-3 py-2 bg-white hover:bg-neutral-50 transition " +
                          (selected ? "border-blue-400 ring-1 ring-blue-300" : "border-neutral-200")
                        }
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-neutral-900">
                            {taName}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {currentLoad} / {maxLoad} hrs ({percentage}%)
                          </span>
                        </div>

                        <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-blue-600"
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>

                        {selected && (
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-blue-600">
                            Selected to assign
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* (Stub) Save button – hook to backend later */}
              <div className="pt-4">
                <Button className="w-full" onClick={saveOverride}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>


    </div>
    
  );
}


