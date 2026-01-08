import React, { useEffect, useMemo, useState } from "react";
import { X, Save } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { apiUrl } from "../lib/api";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

type UserRole = "faculty" | "student" | "admin";

type InterestLevel = "High" | "Medium" | "Low";

type ProfessorMini = { professor_id: number; name: string };
type TAMini = { ta_id: number; name: string };
type CourseMini = { course_id: number; course_code: string };

type TAProfile = {
  ta_id: number;
  name: string;
  max_hours: number;
  skills: string[];
  preferred_professors: ProfessorMini[];
  course_interests: Record<string, InterestLevel>;
};

type ProfessorProfile = {
  professor_id: number;
  name: string;
  preferred_tas: TAMini[];
};

type UserRow = {
  user_id: number;
  username: string;
  user_type: UserRole;
  ta_id: number | null;
  professor_id: number | null;
};

export default function ProfilePage({
  userRole,
  userId,
  username,
  onNameUpdated,
}: {
  userRole: UserRole;
  userId: number | null; // this is user.user_id
  username: string;
  onNameUpdated: (n: string) => void;
}) {
  const isStudent = userRole === "student";
  const isFaculty = userRole === "faculty";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // picklists
  const [allSkills, setAllSkills] = useState<string[]>([]);
  const [allCourses, setAllCourses] = useState<CourseMini[]>([]);
  const [allProfessors, setAllProfessors] = useState<ProfessorMini[]>([]);
  const [allTAs, setAllTAs] = useState<TAMini[]>([]);

  // IMPORTANT: map user_id -> ta_id / professor_id and keep them for saves
  const [taId, setTaId] = useState<number | null>(null);
  const [professorId, setProfessorId] = useState<number | null>(null);

  // student state
  const [taName, setTaName] = useState("");
  const [maxHours, setMaxHours] = useState<number>(20);
  const [skills, setSkills] = useState<string[]>([]);
  const [preferredProfessorIds, setPreferredProfessorIds] = useState<number[]>([]);
  const [coursePrefs, setCoursePrefs] = useState<Record<string, InterestLevel>>({});

  // faculty state
  const [profName, setProfName] = useState("");
  const [preferredTaIds, setPreferredTaIds] = useState<number[]>([]);

  const canRender = useMemo(
    () => userId !== null && (isStudent || isFaculty),
    [userId, isStudent, isFaculty]
  );

  useEffect(() => {
    if (!canRender) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Load picklists in parallel
        const [skillsRes, coursesRes, profsRes, tasRes] = await Promise.all([
          fetch(apiUrl('/api/skills')),
          fetch(apiUrl('/courses/')),  // Use trailing slash to avoid redirect
          fetch(apiUrl('/api/professors')),
          fetch(apiUrl('/api/tas')),
        ]);

        if (skillsRes.ok) setAllSkills(await skillsRes.json());

        if (coursesRes.ok) {
          const c = await coursesRes.json();
          setAllCourses(
            (c ?? []).map((x: any) => ({
              course_id: x.course_id,
              course_code: x.course_code,
            }))
          );
        }

        if (profsRes.ok) {
          const p = await profsRes.json();
          setAllProfessors(
            (p ?? []).map((x: any) => ({
              professor_id: x.professor_id,
              name: x.name,
            }))
          );
        }

        if (tasRes.ok) {
          const t = await tasRes.json();
          setAllTAs(
            (t ?? []).map((x: any) => ({
              ta_id: x.ta_id,
              name: x.name,
            }))
          );
        }

        // 2) Fetch user row FIRST (user_id -> ta_id/professor_id)
        const userRes = await fetch(apiUrl(`/api/users/${userId}`));
        if (!userRes.ok) {
          const errorText = await userRes.text();
          throw new Error(`Failed to load user record: ${errorText || userRes.statusText}`);
        }
        const user: UserRow = await userRes.json();

        if (!user) {
          throw new Error("User record not found");
        }

        setTaId(user.ta_id ?? null);
        setProfessorId(user.professor_id ?? null);

        // 3) Then fetch the correct profile by ta_id / professor_id
        if (isStudent) {
          if (!user.ta_id) {
            throw new Error("This user has not completed TA onboarding. Please complete onboarding first.");
          }
          const res = await fetch(apiUrl(`/api/tas/${user.ta_id}`));
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to load TA profile: ${errorText || res.statusText}`);
          }
          const data: TAProfile = await res.json();

          setTaName(data.name ?? "");
          setMaxHours(data.max_hours ?? 20);
          setSkills(data.skills ?? []);
          setPreferredProfessorIds(
            (data.preferred_professors ?? []).map((p) => p.professor_id)
          );
          setCoursePrefs(data.course_interests ?? {});
        }

        if (isFaculty) {
          if (!user.professor_id) {
            throw new Error("This user has not completed faculty onboarding. Please complete onboarding first.");
          }
          const res = await fetch(apiUrl(`/api/professors/${user.professor_id}`));
          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Failed to load professor profile: ${errorText || res.statusText}`);
          }
          const data: ProfessorProfile = await res.json();

          setProfName(data.name ?? "");
          setPreferredTaIds((data.preferred_tas ?? []).map((t) => t.ta_id));
        }
      } catch (err: any) {
        console.error("Profile load error:", err);
        setError(err.message || "Failed to load profile. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canRender, isStudent, isFaculty, userId]);

  const addUnique = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr : [...arr, v]);
  const removeItem = <T,>(arr: T[], v: T) => arr.filter((x) => x !== v);

  const saveStudent = async () => {
    if (taId == null) {
      alert("Cannot save: missing TA id for this user.");
      return;
    }

    const payload = {
      name: taName,
      max_hours: maxHours,
      skills,
      course_interests: coursePrefs,
      preferred_professor_ids: preferredProfessorIds,
    };

    const res = await fetch(apiUrl(`/api/tas/${taId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to save TA profile");
      return;
    }

    // Only update "display name" outside this page on explicit save
    onNameUpdated(taName);
    alert("Saved!");
  };

  const saveFaculty = async () => {
    if (professorId == null) {
      alert("Cannot save: missing professor id for this user.");
      return;
    }

    const payload = {
      name: profName,
      preferred_ta_ids: preferredTaIds,
    };

    const res = await fetch(apiUrl(`/api/professors/${professorId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to save professor profile");
      return;
    }

    onNameUpdated(profName);
    alert("Saved!");
  };

  if (!canRender) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-neutral-600">
          Profile is only available for Student (TA) and Faculty users.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return <div className="text-sm text-neutral-600">Loading profile…</div>;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Error</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-red-600 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>Refresh Page</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* BASIC INFO */}
      <Card>
        <CardHeader>
          <CardTitle>{isStudent ? "Student (TA) Profile" : "Faculty Profile"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-sm text-neutral-700">Name</Label>
                <Input
                  value={isStudent ? taName : profName}
                  onChange={(e) =>
                    isStudent ? setTaName(e.target.value) : setProfName(e.target.value)
                  }
                  className="border-neutral-200 focus-visible:ring-1 focus-visible:ring-neutral-300"
                />
              </div>
            </div>

            {/* Username */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="space-y-2">
                <Label className="text-sm text-neutral-700">Username</Label>
                <Input
                  value={username}
                  disabled
                  className="border-neutral-200 bg-neutral-50 text-neutral-600"
                />
              </div>
            </div>

            {/* Max Hours (student only) */}
            {isStudent && (
              <div className="rounded-xl bg-white p-4 shadow-sm md:col-span-2">
                <div className="space-y-2">
                  <Label className="text-sm text-neutral-700">Max Hours</Label>
                  <Input
                    type="number"
                    value={maxHours}
                    onChange={(e) => setMaxHours(parseInt(e.target.value || "0", 10))}
                    className="border-neutral-200 focus-visible:ring-1 focus-visible:ring-neutral-300"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* STUDENT ONLY */}
      {isStudent && (
        <>
          {/* Skills */}
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Selected skill pills */}
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center bg-blue-50 text-blue-900 gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-900 shadow-sm"
                  >
                    <span className="max-w-[220px] truncate">{s}</span>
                    <button
                      type="button"
                      onClick={() => setSkills(removeItem(skills, s))}
                      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-emerald-100"
                      aria-label={`Remove ${s}`}
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}

                {skills.length === 0 && (
                  <div className="text-sm text-neutral-500">No skills added yet.</div>
                )}
              </div>

              <SkillPickerWithBrowse
                allSkills={allSkills}
                selected={skills}
                onAdd={(skill) => setSkills(addUnique(skills, skill))}
              />
            </CardContent>
          </Card>

          {/* Preferred Courses */}
          <Card>
            <CardHeader>
              <CardTitle>Preferred Courses</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Selected course pills */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(coursePrefs).map(([courseCode, interest]) => {
                  const interestLevel = interest as InterestLevel;
                  return (
                    <span
                    key={courseCode}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm shadow-sm ${pillClassForInterest(
                      interestLevel
                    )}`}
                  >
                    <span className="max-w-[140px] truncate font-medium">{courseCode}</span>

                    <Select
                      value={interestLevel}
                      onValueChange={(v) =>
                        setCoursePrefs({ ...coursePrefs, [courseCode]: v as InterestLevel })
                      }
                    >
                      <SelectTrigger className="h-7 w-[120px] rounded-full bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>

                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...coursePrefs };
                        delete next[courseCode];
                        setCoursePrefs(next);
                      }}
                      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/5"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                  );
                })}

                {Object.entries(coursePrefs).length === 0 && (
                  <div className="text-sm text-neutral-500">No course preferences yet.</div>
                )}
              </div>

              <CoursePickerWithBrowse
                allCourses={allCourses}
                selectedCourseCodes={Object.keys(coursePrefs)}
                onAdd={(courseCode) => setCoursePrefs({ ...coursePrefs, [courseCode]: "Medium" })}
              />
            </CardContent>
          </Card>

          {/* Preferred Professors */}
          <Card>
            <CardHeader>
              <CardTitle>Preferred Professors</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Selected pills */}
              <div className="flex flex-wrap gap-2">
                {preferredProfessorIds.map((pid) => {
                  const p = allProfessors.find((x) => x.professor_id === pid);
                  const label = p ? p.name : `Professor #${pid}`;

                  return (
                    <span
                      key={pid}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-900 shadow-sm"
                    >
                      <span className="max-w-[220px] truncate">{label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreferredProfessorIds(removeItem(preferredProfessorIds, pid))
                        }
                        className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-blue-100"
                        aria-label={`Remove ${label}`}
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  );
                })}

                {preferredProfessorIds.length === 0 && (
                  <div className="text-sm text-neutral-500">No preferred professors selected.</div>
                )}
              </div>

              <ProfessorPickerWithBrowse
                allProfessors={allProfessors}
                selectedIds={preferredProfessorIds}
                onAdd={(pid) => setPreferredProfessorIds(addUnique(preferredProfessorIds, pid))}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* FACULTY ONLY */}
      {isFaculty && (
        <Card>
          <CardHeader>
            <CardTitle>Preferred TAs</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Selected TA pills */}
            <div className="flex flex-wrap gap-2">
              {preferredTaIds.map((tid) => {
                const t = allTAs.find((x) => x.ta_id === tid);
                const label = t ? t.name : `TA #${tid}`;

                return (
                  <span
                    key={tid}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-100 px-3 py-1 text-sm text-purple-700 shadow-sm"
                  >
                    <span className="max-w-[220px] truncate">{label}</span>
                    <button
                      type="button"
                      onClick={() => setPreferredTaIds(removeItem(preferredTaIds, tid))}
                      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-purple-200/60"
                      aria-label={`Remove ${label}`}
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                );
              })}

              {preferredTaIds.length === 0 && (
                <div className="text-sm text-neutral-500">No preferred TAs selected.</div>
              )}
            </div>

            <TAPickerWithBrowse
              allTAs={allTAs}
              selectedIds={preferredTaIds}
              onAdd={(tid) => setPreferredTaIds(addUnique(preferredTaIds, tid))}
            />
          </CardContent>
        </Card>
      )}

      <div className="pt-2">
        <Button onClick={isStudent ? saveStudent : saveFaculty} className="gap-2">
          <Save className="w-4 h-4" />
          Save Profile
        </Button>
      </div>
    </div>
  );
}

function ProfessorPickerWithBrowse({
  allProfessors,
  selectedIds,
  onAdd,
}: {
  allProfessors: { professor_id: number; name: string }[];
  selectedIds: number[];
  onAdd: (pid: number) => void;
}) {
  const [q, setQ] = useState("");

  const remaining = useMemo(() => {
    return allProfessors.filter((p) => !selectedIds.includes(p.professor_id));
  }, [allProfessors, selectedIds]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return remaining;
    return remaining.filter((p) => p.name.toLowerCase().includes(query));
  }, [q, remaining]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input
          value={q}
          placeholder="Search and add professors..."
          onChange={(e) => setQ(e.target.value)}
        />

        <div className="text-xs text-neutral-500">Click a professor pill below to add.</div>
      </div>

      <div className="rounded-xl border bg-neutral-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-neutral-800">{q.trim() ? "Matches" : "All Professors"}</div>
          <div className="text-xs text-neutral-500">{filtered.length} available</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-neutral-500 py-4 text-center">No matches found.</div>
        ) : (
          <div className="max-h-56 overflow-auto pr-1 [scrollbar-gutter:stable]">
            <div className="flex flex-wrap gap-2">
              {filtered.map((p) => (
                <button
                  key={p.professor_id}
                  type="button"
                  onClick={() => onAdd(p.professor_id)}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-800 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 transition"
                  title="Click to add"
                >
                  <span className="max-w-[220px] truncate">{p.name}</span>
                  <span className="text-xs text-neutral-400">+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkillPickerWithBrowse({
  allSkills,
  selected,
  onAdd,
}: {
  allSkills: string[];
  selected: string[];
  onAdd: (skill: string) => void;
}) {
  const [q, setQ] = useState("");

  const remaining = useMemo(() => {
    return allSkills.filter((s) => !selected.includes(s));
  }, [allSkills, selected]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return remaining;
    return remaining.filter((s) => s.toLowerCase().includes(query));
  }, [q, remaining]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input value={q} placeholder="Search and add skills..." onChange={(e) => setQ(e.target.value)} />
        <div className="text-xs text-neutral-500">Click a skill pill below to add.</div>
      </div>

      <div className="rounded-xl border bg-neutral-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-neutral-800">{q.trim() ? "Matches" : "All Skills"}</div>
          <div className="text-xs text-neutral-500">{filtered.length} available</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-neutral-500 py-4 text-center">No matches found.</div>
        ) : (
          <div className="max-h-56 overflow-auto pr-1 [scrollbar-gutter:stable]">
            <div className="flex flex-wrap gap-2">
              {filtered.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onAdd(s)}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-800 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-900 transition"
                  title="Click to add"
                >
                  <span className="max-w-[220px] truncate">{s}</span>
                  <span className="text-xs text-neutral-400">+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CoursePickerWithBrowse({
  allCourses,
  selectedCourseCodes,
  onAdd,
}: {
  allCourses: { course_id: number; course_code: string }[];
  selectedCourseCodes: string[];
  onAdd: (courseCode: string) => void;
}) {
  const [q, setQ] = useState("");

  const remaining = useMemo(() => {
    return allCourses.filter((c) => !selectedCourseCodes.includes(c.course_code));
  }, [allCourses, selectedCourseCodes]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return remaining;
    return remaining.filter((c) => c.course_code.toLowerCase().includes(query));
  }, [q, remaining]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input value={q} placeholder="Search and add courses..." onChange={(e) => setQ(e.target.value)} />
        <div className="text-xs text-neutral-500">
          Click a course pill below to add (defaults to Medium).
        </div>
      </div>

      <div className="rounded-xl border bg-neutral-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-neutral-800">{q.trim() ? "Matches" : "All Courses"}</div>
          <div className="text-xs text-neutral-500">{filtered.length} available</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-neutral-500 py-4 text-center">No matches found.</div>
        ) : (
          <div className="max-h-56 overflow-auto pr-1 [scrollbar-gutter:stable]">
            <div className="flex flex-wrap gap-2">
              {filtered.map((c) => (
                <button
                  key={c.course_id}
                  type="button"
                  onClick={() => onAdd(c.course_code)}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-800 shadow-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-900 transition"
                  title="Click to add"
                >
                  <span className="max-w-[220px] truncate">{c.course_code}</span>
                  <span className="text-xs text-neutral-400">+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function pillClassForInterest(i: InterestLevel) {
  if (i === "High") return "pill-high";
  if (i === "Low") return "pill-low";
  return "pill-med";
}

function TAPickerWithBrowse({
  allTAs,
  selectedIds,
  onAdd,
}: {
  allTAs: { ta_id: number; name: string }[];
  selectedIds: number[];
  onAdd: (tid: number) => void;
}) {
  const [q, setQ] = useState("");

  const remaining = useMemo(() => {
    return allTAs.filter((t) => !selectedIds.includes(t.ta_id));
  }, [allTAs, selectedIds]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return remaining;
    return remaining.filter((t) => t.name.toLowerCase().includes(query));
  }, [q, remaining]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Input value={q} placeholder="Search and add TAs..." onChange={(e) => setQ(e.target.value)} />
        <div className="text-xs text-neutral-500">Click a TA pill below to add.</div>
      </div>

      <div className="rounded-xl border bg-neutral-50 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-neutral-800">{q.trim() ? "Matches" : "All TAs"}</div>
          <div className="text-xs text-neutral-500">{filtered.length} available</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-sm text-neutral-500 py-4 text-center">No matches found.</div>
        ) : (
          <div className="max-h-56 overflow-auto pr-1 [scrollbar-gutter:stable]">
            <div className="flex flex-wrap gap-2">
              {filtered.map((t) => (
                <button
                  key={t.ta_id}
                  type="button"
                  onClick={() => onAdd(t.ta_id)}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-sm text-neutral-800 shadow-sm hover:border-purple-200 hover:bg-purple-100 hover:text-purple-700 transition"
                  title="Click to add"
                >
                  <span className="max-w-[220px] truncate">{t.name}</span>
                  <span className="text-xs text-neutral-400">+</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
