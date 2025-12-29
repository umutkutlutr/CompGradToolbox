import { useState, useEffect, useMemo } from "react";
import { Search, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

type TAProfileStudentProps = {
  taId: number | null;
};

const API = "http://127.0.0.1:8000";

type AssignmentRow = {
  assignment_id: number;
  course_id: number;
  course_code: string;
  professors: string[];
  required_skills: string[];
};

export default function TAProfileStudent({ taId }: TAProfileStudentProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("fall-2025");

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentRow | null>(null);

  useEffect(() => {
    if (!taId) return;

    const fetchAssignments = async () => {
      try {
        setLoading(true);

        // ✅ You need to implement this endpoint (backend snippet below)
        const res = await fetch(`${API}/api/ta-assignments/by-ta?ta_id=${taId}`);
        if (!res.ok) throw new Error("Failed to fetch TA assignments");

        const data = await res.json();

        const normalized: AssignmentRow[] = (data ?? []).map((x: any) => ({
          assignment_id: Number(x.assignment_id),
          course_id: Number(x.course_id),
          course_code: x.course_code ?? "Unknown",
          professors: x.professors ?? [],
          required_skills: x.required_skills ?? [],
        }));

        setAssignments(normalized);
      } catch (e) {
        console.error(e);
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [taId]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assignments;

    return assignments.filter((a) => {
      const courseMatch = a.course_code.toLowerCase().includes(q);
      const profMatch = (a.professors ?? []).some((p) => p.toLowerCase().includes(q));
      const skillMatch = (a.required_skills ?? []).some((s) => s.toLowerCase().includes(q));
      return courseMatch || profMatch || skillMatch;
    });
  }, [assignments, searchQuery]);

  const hasAssignments = assignments.length > 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative border rounded">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Search by course, professor, or skill..."
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

          <div className="mt-3 text-xs text-neutral-500">
            This page shows your most recent TA assignment results.
          </div>
        </CardContent>
      </Card>

      {/* Assignments Table */}
      <Card>
        <CardHeader>
          <CardTitle>My TA Assignments</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-neutral-600">Loading assignments…</div>
          ) : !hasAssignments ? (
            <div className="text-sm text-neutral-500">
              No assignments yet. Once the coordinator runs the assignment algorithm, your assigned course(s) will appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200">
                    <th className="text-left py-3 px-4 text-sm text-neutral-600">Course</th>
                    <th className="text-left py-3 px-4 text-sm text-neutral-600">Professor(s)</th>
                    <th className="text-left py-3 px-4 text-sm text-neutral-600">Required Skills</th>
                    <th className="text-left py-3 px-4 text-sm text-neutral-600">Status</th>
                    <th className="text-left py-3 px-4 text-sm text-neutral-600">Details</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((a) => (
                    <tr key={a.assignment_id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-4 px-4">
                        <div className="text-sm text-neutral-900">{a.course_code}</div>
                        <div className="text-xs text-neutral-500">Assigned</div>
                      </td>

                      <td className="py-4 px-4">
                        {a.professors.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {a.professors.map((p, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400">Not set</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        {a.required_skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {a.required_skills.slice(0, 3).map((s, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {s}
                              </Badge>
                            ))}
                            {a.required_skills.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{a.required_skills.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400">None</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Assigned
                        </Badge>
                      </td>

                      <td className="py-4 px-4">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(a)}>
                          <Info className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={selectedAssignment !== null} onOpenChange={() => setSelectedAssignment(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assignment Details</DialogTitle>
            <DialogDescription>
              Course, professor(s), and required skills for your TA assignment.
            </DialogDescription>
          </DialogHeader>

          {selectedAssignment && (
            <div className="space-y-4 mt-4">
              <div className="rounded-xl border bg-neutral-50 p-4">
                <div className="text-xs text-neutral-500">Course</div>
                <div className="text-sm font-medium text-neutral-900 mt-1">
                  {selectedAssignment.course_code}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-neutral-500">Professor(s)</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedAssignment.professors.length ? (
                    selectedAssignment.professors.map((p, i) => (
                      <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-200">
                        {p}
                      </Badge>
                    ))
                  ) : (
                    <div className="text-sm text-neutral-500">Not set</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4">
                <div className="text-xs text-neutral-500">Required Skills</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedAssignment.required_skills.length ? (
                    selectedAssignment.required_skills.map((s, i) => (
                      <Badge key={i} variant="outline">
                        {s}
                      </Badge>
                    ))
                  ) : (
                    <div className="text-sm text-neutral-500">No required skills listed</div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button className="flex-1" onClick={() => setSelectedAssignment(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
