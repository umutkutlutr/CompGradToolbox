import { useState, useEffect } from 'react';
import { Play, Download, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface CourseAssignment {
  code: string;
  name: string;
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
  onNavigate: (page: string) => void;
}

export default function TAAssignmentCoordinator({ onNavigate }: TAAssignmentCoordinatorProps) {
  const [skillWeight, setSkillWeight] = useState([70]);
  const [facultyPrefWeight, setFacultyPrefWeight] = useState([60]);
  const [taPrefWeight, setTaPrefWeight] = useState([50]);
  const [workloadWeight, setWorkloadWeight] = useState([80]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

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
  // RUN ASSIGNMENT ALGORITHM
  // =====================================
  const runAssignment = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/run-assignment");
      const data = await res.json();

      saveWeights();
      setResult(data);  // SHOW RESULTS IN SAME PAGE
      console.log("Assignment result:", data);
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
    ? Object.entries(result.assignments).map(([courseCode, tas]) => ({
        code: courseCode,
        name: courseCode,
        tas: tas as string[],
        violations: "none",
      }))
    : [];

  const assignmentsByTA: TAAssignment[] = result
    ? Object.entries(result.workloads).map(([taName, load]) => ({
        name: taName,
        courses: Object.entries(result.assignments)
          .filter(([_, tas]) => (tas as string[]).includes(taName))
          .map(([courseCode]) => courseCode),
        load: load as number,
        maxLoad: 20,
      }))
    : [];

  const handleViewDetails = (course: any) => {
    setSelectedCourse(course);
    setDetailsOpen(true);
  };

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

            <Button variant="outline" size="lg" className="gap-2">
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
                        <th className="text-left py-3 px-4">Assigned TAs</th>
                        <th className="text-left py-3 px-4">Status</th>
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

                          {/* TAs */}
                          <td className="py-4 px-4">
                            <div className="flex flex-wrap gap-1">
                              {course.tas.map((ta: string, i: number) => (
                                <Badge key={i} variant="outline">{ta}</Badge>
                              ))}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <Badge className="bg-green-100 text-green-700 border-green-200">OK</Badge>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4">
                            <Button size="sm" variant="ghost" onClick={() => handleViewDetails(course)}>
                              View Details
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
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Assignment Details</SheetTitle>
            <SheetDescription>
              {selectedCourse?.code} — {selectedCourse?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">

            {/* Assigned TAs */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-neutral-900">Assigned TAs</h4>

              {selectedCourse?.tas?.map((ta: string, index: number) => (
                <div key={index} className="p-4 bg-neutral-50 rounded-lg space-y-2">
                  <div className="font-medium">{ta}</div>
                  <div className="text-xs text-neutral-600">
                    Strong skill match; meets workload and schedule constraints.
                  </div>
                </div>
              ))}
            </div>

            {/* Manual Override */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="text-sm font-medium text-neutral-900">Manual Override</h4>

              <div className="space-y-3">

                <div>
                  <Label>Replace TA</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select TA to replace" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCourse?.tas?.map((ta: string, i: number) => (
                        <SelectItem key={i} value={ta}>{ta}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>With TA</Label>
                  <Select>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select new TA" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pat-wilson">Pat Wilson</SelectItem>
                      <SelectItem value="chris-brown">Chris Brown</SelectItem>
                      <SelectItem value="sam-davis">Sam Davis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Reason for Override</Label>
                  <Textarea rows={3} placeholder="Explain why override is needed..." />
                </div>

                <Button className="w-full">Save Override</Button>
              </div>

            </div>

          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}
