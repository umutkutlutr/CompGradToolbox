import { useEffect, useMemo, useState } from "react";
import { GraduationCap, Users, User } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { UserRole } from "../App";
import { Slider } from "./ui/slider";

import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";

/* ================= TYPES ================= */

type Step = "role" | "account" | "ta" | "faculty";

type Professor = {
  professor_id: number;
  name: string;
};

type TA = {
  ta_id: number;
  name: string;
};

interface RegisterScreenProps {
  onBackToLogin: () => void;
  onAutoLogin: (
    role: UserRole,
    userId: number,
    name: string,
    username: string,
    onboardingRequired: boolean
  ) => void;
}

/* ================= COMPONENT ================= */

export default function RegisterScreen({
  onBackToLogin,
  onAutoLogin,
}: RegisterScreenProps) {
  const apiBase = useMemo(() => "http://localhost:8000", []);

  const [step, setStep] = useState<Step>("role");
  const isNonEmpty = (v: string) => v.trim().length > 0;

  type TASubStep = "basics" | "preferences";
  const [taSubStep, setTaSubStep] = useState<TASubStep>("basics");
  
  /* ---------- Account ---------- */
  const [role, setRole] = useState<UserRole>("student");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState<number | null>(null);

  /* ---------- TA onboarding ---------- */
  const [program, setProgram] = useState("CS");
  const [level, setLevel] = useState("MS");
  const [background, setBackground] = useState("");
  const [admitTerm, setAdmitTerm] = useState("");
  const [standing, setStanding] = useState(1);
  const [maxHours, setMaxHours] = useState(20);
  const [skillsText, setSkillsText] = useState("");

  const [professors, setProfessors] = useState<Professor[]>([]);
  const [selectedProfessorIds, setSelectedProfessorIds] = useState<number[]>([]);
  const [profPopoverOpen, setProfPopoverOpen] = useState(false);
  const [profSearch, setProfSearch] = useState("");

  const filteredProfessors = professors.filter((p) =>
    p.name.toLowerCase().includes(profSearch.toLowerCase())
  );

  /* ---------- Faculty onboarding ---------- */
  const [tas, setTas] = useState<TA[]>([]);
  const [selectedTaIds, setSelectedTaIds] = useState<number[]>([]);
  const [taPopoverOpen, setTaPopoverOpen] = useState(false);
  const [taSearch, setTaSearch] = useState("");

  const filteredTAs = tas.filter((ta) =>
    ta.name.toLowerCase().includes(taSearch.toLowerCase())
  );

  /* ---------- UI ---------- */
  const [error, setError] = useState("");

  const isBackgroundValid = isNonEmpty(background);
  const isAdmitTermValid = isNonEmpty(admitTerm);
  const isSkillsValid = isNonEmpty(skillsText);
  const isProfessorValid = selectedProfessorIds.length > 0;

  const isTAFormValid =
    isBackgroundValid && isAdmitTermValid && isSkillsValid && isProfessorValid;

  // keep "optional" behavior consistent with your current implementation:
  const isFacultyFormValid = selectedTaIds.length >= 0;

  /* ================= DATA FETCH ================= */

  useEffect(() => {
    if (step === "ta") {
      fetch(`${apiBase}/api/professors`)
        .then((res) => res.json())
        .then((data) =>
          setProfessors(
            data.map((p: any) => ({
              professor_id: p.professor_id,
              name: p.name,
            }))
          )
        )
        .catch(console.error);
    }
  }, [step, apiBase]);

  useEffect(() => {
    if (step === "faculty") {
      fetch(`${apiBase}/api/tas`)
        .then((res) => res.json())
        .then((data) =>
          setTas(
            data.map((t: any) => ({
              ta_id: t.ta_id,
              name: t.name,
            }))
          )
        )
        .catch(console.error);
    }
  }, [step, apiBase]);

  /* ================= HELPERS ================= */

  const parseCsvStrings = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const parsedSkills = parseCsvStrings(skillsText);

  const autoLogin = async () => {
    const res = await fetch(`${apiBase}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Auto-login failed");

    onAutoLogin(
      data.user_type,
      data.ta_id || data.professor_id || 0,
      data.name,
      data.username,
      data.onboarding_required
    );
  };

  const pickRole = (picked: UserRole) => {
    setError("");
    setRole(picked);
    setStep("account");
  };

  /* ================= HANDLERS ================= */

  const handleAccountNext = async () => {
    try {
      setError("");

      if (!isNonEmpty(name)) throw new Error("Name is required");
      if (!isNonEmpty(username)) throw new Error("Username is required");
      if (!isNonEmpty(password)) throw new Error("Password is required");

      const res = await fetch(`${apiBase}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      if (!data.user_id) throw new Error("user_id missing from response");
      setUserId(data.user_id);

      setStep(role === "student" ? "ta" : "faculty");
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleTAOnboard = async () => {
    try {
      if (!userId) throw new Error("Missing userId");

      const skills = parseCsvStrings(skillsText);

      const res = await fetch(`${apiBase}/api/ta/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name,
          program,
          level,
          background,
          admit_term: admitTerm,
          standing,
          max_hours: maxHours,
          skills,
          preferred_professors: selectedProfessorIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "TA onboarding failed");

      await autoLogin();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleFacultyOnboard = async () => {
    try {
      if (!userId) throw new Error("Missing userId");

      const res = await fetch(`${apiBase}/api/faculty/onboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          name,
          preferred_tas: selectedTaIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Faculty onboarding failed");

      await autoLogin();
    } catch (e: any) {
      setError(e.message);
    }
  };

  /* ================= SMALL UI HELPERS ================= */

  const Title = () => {
    if (step === "role") return "Choose your account type";
    if (step === "account") return "Create your account";
    if (step === "ta") return "TA onboarding";
    return "Faculty onboarding";
  };

  const Subtitle = () => {
    if (step === "role") return "You can change this later, but it helps us tailor your setup.";
    if (step === "account") return "Use a username you'll remember.";
    if (step === "ta") return "Add your academic details and preferences.";
    return "Pick preferred TAs (optional) to speed up matching.";
  };

  const SelectedBadges = ({
    items,
    onRemove,
  }: {
    items: { id: number; label: string }[];
    onRemove: (id: number) => void;
  }) => {
    if (items.length === 0) {
      return (
        <div className="text-neutral-500">
          None selected yet
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <Badge key={it.id} variant="outline" className="gap-1.5 py-1.5 px-3 bg-white border-neutral-300 hover:border-neutral-400 transition-colors">
            {it.label}
            <button
              type="button"
              onClick={() => onRemove(it.id)}
              className="ml-1 rounded-full hover:bg-neutral-200 p-0.5 transition-colors"
              aria-label={`Remove ${it.label}`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
    );
  };

  const selectedProfessors = selectedProfessorIds
    .map((id) => {
      const p = professors.find((x) => x.professor_id === id);
      return p ? { id, label: p.name } : null;
    })
    .filter(Boolean) as { id: number; label: string }[];

  const selectedTAs = selectedTaIds
    .map((id) => {
      const t = tas.find((x) => x.ta_id === id);
      return t ? { id, label: t.name } : null;
    })
    .filter(Boolean) as { id: number; label: string }[];
  
  const containerWidth =
  step === "ta" || step === "faculty" ? "max-w-lg" : "max-w-md";

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-6">
     <div className={`${containerWidth} bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/50 p-6 md:p-8`}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl mb-4 shadow-lg shadow-blue-500/30">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-blue-900 mb-1.5">{Title()}</h1>
          <p className="text-neutral-600">{Subtitle()}</p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100/50 px-5 py-4 text-red-700 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="font-bold">!</span>
              </div>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* ROLE CHOICE */}
        {step === "role" && (
          <div className="space-y-4">
            <button
              className="w-full rounded-2xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 text-left hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100/50 transition-all duration-300 group"
              onClick={() => pickRole("student")}
              type="button"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300">
                  <User className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-neutral-900 mb-1">
                    TA / Student
                  </div>
                  <div className="text-neutral-600">
                    Create your TA profile and preferences
                  </div>
                </div>
              </div>
            </button>

            <button
              className="w-full rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 text-left hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300 group"
              onClick={() => pickRole("faculty")}
              type="button"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-neutral-900 mb-1">
                    Faculty
                  </div>
                  <div className="text-neutral-600">
                    Select preferred TAs (optional)
                  </div>
                </div>
              </div>
            </button>

            <div className="pt-4">
              <Button
                variant="outline"
                onClick={onBackToLogin}
                className="w-full h-12 rounded-xl border-2"
              >
                Back to Login
              </Button>
            </div>
          </div>
        )}

        {/* ACCOUNT */}
        {step === "account" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/30 px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                    {role === "student" ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Users className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <span className="font-semibold text-neutral-900">
                    {role === "student" ? "TA / Student" : "Faculty"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("role")}
                  className="text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  change
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-neutral-700 font-medium mb-2">
                  Full Name
                </label>
                <input
                  className="w-full p-4 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-neutral-700 font-medium mb-2">
                  Username
                </label>
                <input
                  className="w-full p-4 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-neutral-700 font-medium mb-2">
                  Password
                </label>
                <input
                  type="password"
                  className="w-full p-4 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button onClick={handleAccountNext} className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30">
                Continue
              </Button>

              <Button
                variant="outline"
                onClick={onBackToLogin}
                className="w-full h-12 rounded-xl border-2"
              >
                Back to Login
              </Button>
            </div>
          </div>
        )}

        {/* TA */}
        {step === "ta" && (
        <div className="space-y-6">
          {/* Sub-step header with progress */}
          <div className="flex items-center justify-between gap-3 mb-2">
            <div>
              <div className="font-semibold text-neutral-900">TA setup</div>
              <div className="text-neutral-600">
                {taSubStep === "basics"
                  ? "Step 1 of 2 — Basic details"
                  : "Step 2 of 2 — Skills & preferences"}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTaSubStep("basics")}
                className={`px-4 py-1.5 rounded-full border-2 transition-all ${
                  taSubStep === "basics"
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                Basics
              </button>
              <button
                type="button"
                onClick={() => setTaSubStep("preferences")}
                className={`px-4 py-1.5 rounded-full border-2 transition-all ${
                  taSubStep === "preferences"
                    ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                Preferences
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500 ease-out"
              style={{ width: taSubStep === "basics" ? "50%" : "100%" }}
            />
          </div>

          {/* Form content - single column layout */}
          <div className="space-y-6">
            {/* ===== BASICS ===== */}
            {taSubStep === "basics" && (
              <div className="rounded-2xl border-2 border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-6 space-y-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold text-neutral-900 mb-1">
                      Basic Information
                    </div>
                    <div className="text-neutral-600">
                      Keep it short — you can refine later.
                    </div>
                  </div>
                </div>

                {/* Grid fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-medium text-neutral-700">
                      Program
                    </label>
                    <input
                      className="w-full p-3.5 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="e.g., CS"
                      value={program}
                      onChange={(e) => setProgram(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="font-medium text-neutral-700">
                      Level
                    </label>
                    <select
                      className="w-full p-3.5 border-2 border-neutral-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all bg-white"
                      value={level}
                      onChange={(e) => setLevel(e.target.value)}
                    >
                      <option value="MS">MS</option>
                      <option value="PhD">PhD</option>
                    </select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="font-medium text-neutral-700">
                      Admit term
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Fall 2024"
                      value={admitTerm}
                      onChange={(e) => setAdmitTerm(e.target.value)}
                      className={`w-full p-3.5 border-2 rounded-xl transition-all ${
                        admitTerm === ""
                          ? "border-neutral-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          : isAdmitTermValid
                          ? "border-green-500 focus:border-green-600 focus:ring-4 focus:ring-green-100 bg-green-50/30"
                          : "border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-100 bg-red-50/30"
                      } focus:outline-none`}
                    />
                    {admitTerm !== "" && !isAdmitTermValid && (
                      <p className="text-red-600 mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-red-600"></span>
                        Admit term is required
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-neutral-700">
                        Background / Focus area
                      </label>
                      <div className="text-neutral-500">
                        {background.trim().length}/120
                      </div>
                    </div>
                    <textarea
                      placeholder="e.g., Systems, ML, Security... (short)"
                      value={background}
                      onChange={(e) => setBackground(e.target.value.slice(0, 120))}
                      className={`w-full min-h-[100px] p-3.5 border-2 rounded-xl transition-all resize-none ${
                        background === ""
                          ? "border-neutral-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                          : isBackgroundValid
                          ? "border-green-500 focus:border-green-600 focus:ring-4 focus:ring-green-100 bg-green-50/30"
                          : "border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-100 bg-red-50/30"
                      } focus:outline-none`}
                    />
                    {background !== "" && !isBackgroundValid && (
                      <p className="text-red-600 mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-red-600"></span>
                        Background is required
                      </p>
                    )}
                  </div>

                  {/* Modern sliders */}
                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-neutral-700">
                        Standing
                      </label>
                      <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">{standing}</div>
                    </div>
                    <Slider
                      value={[standing]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(v) => setStanding(v[0])}
                      className="py-2"
                    />
                    <div className="text-neutral-500">
                      1 = new, 10 = very experienced
                    </div>
                  </div>

                  <div className="space-y-3 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-neutral-700">
                        Max hours / week
                      </label>
                      <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">{maxHours}</div>
                    </div>
                    <Slider
                      value={[maxHours]}
                      min={1}
                      max={40}
                      step={1}
                      onValueChange={(v) => setMaxHours(v[0])}
                      className="py-2"
                    />
                    <div className="text-neutral-500">
                      Typical range is 10–20
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl border-2"
                    onClick={() => setStep("account")}
                  >
                    Back
                  </Button>
                  <Button
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30"
                    onClick={() => setTaSubStep("preferences")}
                    disabled={!isBackgroundValid || !isAdmitTermValid}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}

            {/* ===== PREFERENCES ===== */}
            {taSubStep === "preferences" && (
              <div className="rounded-2xl border-2 border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-6 space-y-6 shadow-sm">
                <div>
                  <div className="font-semibold text-neutral-900 mb-1">
                    Preferences
                  </div>
                  <div className="text-neutral-600">
                    These help matching quality.
                  </div>
                </div>

                {/* Skills */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-neutral-700">
                      Skills
                    </label>
                    {!isSkillsValid && skillsText !== "" && (
                      <div className="text-red-600 font-medium">Required</div>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Comma-separated: Python, C++, Data Structures..."
                    value={skillsText}
                    onChange={(e) => setSkillsText(e.target.value)}
                    className={`w-full p-3.5 border-2 rounded-xl transition-all ${
                      skillsText === ""
                        ? "border-neutral-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        : isSkillsValid
                        ? "border-green-500 focus:border-green-600 focus:ring-4 focus:ring-green-100 bg-green-50/30"
                        : "border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-100 bg-red-50/30"
                    } focus:outline-none`}
                  />
                  {parsedSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                      {parsedSkills.map((s) => (
                        <Badge key={s} variant="outline" className="bg-white border-blue-200 text-blue-700">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Professors multi-select */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-neutral-700">
                      Preferred professors
                    </label>
                    {!isProfessorValid && (
                      <div className="text-red-600 font-medium">Select at least one</div>
                    )}
                  </div>

                  <Popover open={profPopoverOpen} onOpenChange={setProfPopoverOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`w-full rounded-xl border-2 px-4 py-3.5 text-left flex items-center justify-between hover:bg-neutral-50 transition-all ${
                          selectedProfessorIds.length > 0
                            ? "border-blue-300 bg-blue-50/30"
                            : "border-neutral-200"
                        }`}
                      >
                        <span className="text-neutral-700 font-medium">
                          {selectedProfessorIds.length > 0
                            ? `${selectedProfessorIds.length} selected`
                            : "Select professors..."}
                        </span>
                        <ChevronsUpDown className="w-4 h-4 text-neutral-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                      <Command>
                        <CommandInput
                          placeholder="Search professors..."
                          value={profSearch}
                          onValueChange={setProfSearch}
                        />
                        <CommandEmpty>No professors found.</CommandEmpty>
                        <CommandGroup>
                          {filteredProfessors.map((p) => {
                            const selected = selectedProfessorIds.includes(
                              p.professor_id
                            );
                            return (
                              <CommandItem
                                key={p.professor_id}
                                onSelect={() => {
                                  setSelectedProfessorIds((prev) =>
                                    selected
                                      ? prev.filter((id) => id !== p.professor_id)
                                      : [...prev, p.professor_id]
                                  );
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selected ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {p.name}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  <SelectedBadges
                    items={selectedProfessors}
                    onRemove={(id) =>
                      setSelectedProfessorIds((prev) => prev.filter((x) => x !== id))
                    }
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="w-full h-12 rounded-xl border-2"
                    onClick={() => setTaSubStep("basics")}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleTAOnboard}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isTAFormValid}
                  >
                    Finish TA Onboarding
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
        
        {/* FACULTY */}
        {step === "faculty" && (
          <div className="space-y-6">
            <div className="rounded-2xl border-2 border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-6 space-y-5 shadow-sm">
              <div>
                <div className="font-semibold text-neutral-900 mb-1">
                  Preferred TAs{" "}
                  <span className="text-neutral-500 font-normal">(optional)</span>
                </div>
                <div className="text-neutral-600">
                  Select TAs you'd like to work with for better matching
                </div>
              </div>

              <div className="space-y-3">
                <Popover open={taPopoverOpen} onOpenChange={setTaPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={`w-full rounded-xl border-2 px-4 py-3.5 text-left flex items-center justify-between hover:bg-neutral-50 transition-all ${
                        selectedTaIds.length > 0
                          ? "border-indigo-300 bg-indigo-50/30"
                          : "border-neutral-200"
                      }`}
                    >
                      <span className="text-neutral-700 font-medium">
                        {selectedTaIds.length > 0
                          ? `${selectedTaIds.length} selected`
                          : "Select TAs..."}
                      </span>
                      <ChevronsUpDown className="w-4 h-4 text-neutral-500" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]">
                    <Command>
                      <CommandInput
                        placeholder="Search TAs..."
                        value={taSearch}
                        onValueChange={setTaSearch}
                      />
                      <CommandEmpty>No TAs found.</CommandEmpty>
                      <CommandGroup>
                        {filteredTAs.map((t) => {
                          const selected = selectedTaIds.includes(t.ta_id);
                          return (
                            <CommandItem
                              key={t.ta_id}
                              onSelect={() => {
                                setSelectedTaIds((prev) =>
                                  selected
                                    ? prev.filter((id) => id !== t.ta_id)
                                    : [...prev, t.ta_id]
                                );
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selected ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {t.name}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <SelectedBadges
                  items={selectedTAs}
                  onRemove={(id) =>
                    setSelectedTaIds((prev) => prev.filter((x) => x !== id))
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleFacultyOnboard}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/30"
                disabled={!isFacultyFormValid}
              >
                Finish Faculty Onboarding
              </Button>

              <Button
                variant="outline"
                onClick={() => setStep("account")}
                className="w-full h-12 rounded-xl border-2"
              >
                Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}