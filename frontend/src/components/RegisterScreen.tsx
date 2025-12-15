import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { GraduationCap } from "lucide-react";
import { UserRole } from "../App";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "./ui/command";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Badge } from "./ui/badge";


/* ================= TYPES ================= */

type Step = "account" | "ta" | "faculty";

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

  const [step, setStep] = useState<Step>("account");
  const isNonEmpty = (v: string) => v.trim().length > 0;


  /* ---------- Account ---------- */
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
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
  const [search, setSearch] = useState("");
  const filteredProfessors = professors.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
    );


  /* ---------- Faculty onboarding ---------- */
  const [tas, setTas] = useState<TA[]>([]);
  const [selectedTaIds, setSelectedTaIds] = useState<number[]>([]);
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
    isBackgroundValid &&
    isAdmitTermValid &&
    isSkillsValid &&
    isProfessorValid;

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
  }, [step]);

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
  }, [step]);

  /* ================= HELPERS ================= */

  const parseCsvStrings = (s: string) =>
    s.split(",").map((x) => x.trim()).filter(Boolean);

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

  /* ================= HANDLERS ================= */

  const handleAccountNext = async () => {
    try {
      setError("");

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

  /* ================= UI ================= */

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-blue-900 text-xl mb-1">
            {step === "account"
              ? "Create Account"
              : step === "ta"
              ? "TA Onboarding"
              : "Faculty Onboarding"}
          </h1>
        </div>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        {/* ACCOUNT */}
        {step === "account" && (
          <div className="space-y-4">
            <input className="w-full p-3 border rounded-lg" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full p-3 border rounded-lg" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <input type="password" className="w-full p-3 border rounded-lg" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <select className="w-full p-3 border rounded-lg" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              <option value="student">TA / Student</option>
              <option value="faculty">Faculty</option>
            </select>

            <Button onClick={handleAccountNext} className="w-full h-12">
              Continue
            </Button>
            <Button variant="outline" onClick={onBackToLogin} className="w-full h-12">
              Back to Login
            </Button>
          </div>
        )}

        {/* TA */}
        {step === "ta" && (
          <div className="space-y-4">
            <input className="w-full p-3 border rounded-lg" placeholder="Program" value={program} onChange={(e) => setProgram(e.target.value)} />
            <select className="w-full p-3 border rounded-lg" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="MS">MS</option>
              <option value="PhD">PhD</option>
            </select>
            <input
            type="text"
            placeholder="Background (e.g., Systems)"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            className={`w-full p-3 border rounded-lg transition
                ${
                background === ""
                    ? ""
                    : isBackgroundValid
                    ? "border-green-500"
                    : "border-red-500"
                }`}
            />
            {background !== "" && !isBackgroundValid && (
            <p className="text-xs text-red-500 mt-1">
                Background is required
            </p>
            )}


            <input
            type="text"
            placeholder="Admit Term (e.g., Fall 2024)"
            value={admitTerm}
            onChange={(e) => setAdmitTerm(e.target.value)}
            className={`w-full p-3 border rounded-lg transition
                ${
                admitTerm === ""
                    ? ""
                    : isAdmitTermValid
                    ? "border-green-500"
                    : "border-red-500"
                }`}
            />
            {admitTerm !== "" && !isAdmitTermValid && (
            <p className="text-xs text-red-500 mt-1">
                Admit term is required
            </p>
            )}


            <input type="number" className="w-full p-3 border rounded-lg" placeholder="Standing" value={standing} onChange={(e) => setStanding(Number(e.target.value))} />
            <input type="number" className="w-full p-3 border rounded-lg" placeholder="Max Hours" value={maxHours} onChange={(e) => setMaxHours(Number(e.target.value))} />
            <input
            type="text"
            placeholder="Skills (comma-separated)"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            className={`w-full p-3 border rounded-lg transition
                ${
                skillsText === ""
                    ? ""
                    : isSkillsValid
                    ? "border-green-500"
                    : "border-red-500"
                }`}
            />
            {skillsText !== "" && !isSkillsValid && (
            <p className="text-xs text-red-500 mt-1">
                Enter at least one skill
            </p>
            )}

            <div className="space-y-2">
                {!isProfessorValid && (
                <p className="text-xs text-red-500 mt-1">
                    Select at least one professor
                </p>
                )}


                {/* Search */}
                <input
                    type="text"
                    placeholder="Search professors..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                />

                {/* List */}
                <div className="max-h-56 overflow-y-auto space-y-2">
                    {filteredProfessors.map((prof) => {
                    const selected = selectedProfessorIds.includes(prof.professor_id);

                    return (
                        <div
                        key={prof.professor_id}
                        onClick={() =>
                            setSelectedProfessorIds((prev) =>
                            selected
                                ? prev.filter((id) => id !== prof.professor_id)
                                : [...prev, prof.professor_id]
                            )
                        }
                        className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition
                            ${
                            selected
                                ? "bg-blue-50 border-blue-500"
                                : "hover:bg-neutral-50"
                            }`}
                        >
                        <span className="text-sm text-neutral-900">
                            {prof.name}
                        </span>

                        {selected && (
                            <span className="text-blue-600 text-sm font-medium">
                            Selected
                            </span>
                        )}
                        </div>
                    );
                    })}

                    {filteredProfessors.length === 0 && (
                    <p className="text-sm text-neutral-500 text-center py-4">
                        No professors found
                    </p>
                    )}
                </div>
            </div>


            <Button
            onClick={handleTAOnboard}
            className="w-full h-12"
            disabled={!isTAFormValid}
            >
            Finish TA Onboarding
            </Button>


          </div>
        )}

        {/* FACULTY */}
        {step === "faculty" && (
        <div className="space-y-4">
            <label className="text-sm font-medium text-neutral-700">
            Preferred TAs
            </label>

            {/* Search */}
            <input
            type="text"
            placeholder="Search TAs..."
            value={taSearch}
            onChange={(e) => setTaSearch(e.target.value)}
            className="w-full p-3 border rounded-lg text-sm"
            />

            {/* TA cards */}
            <div className="max-h-56 overflow-y-auto space-y-2">
            {filteredTAs.map((ta) => {
                const selected = selectedTaIds.includes(ta.ta_id);

                return (
                <div
                    key={ta.ta_id}
                    onClick={() =>
                    setSelectedTaIds((prev) =>
                        selected
                        ? prev.filter((id) => id !== ta.ta_id)
                        : [...prev, ta.ta_id]
                    )
                    }
                    className={`cursor-pointer rounded-lg border p-3 flex items-center justify-between transition
                    ${
                        selected
                        ? "bg-blue-50 border-blue-500"
                        : "hover:bg-neutral-50"
                    }`}
                >
                    <span className={`text-sm ${
                        selected
                        ? "text-blue-600"
                        : "text-neutral-900"
                    }`}>
                    {ta.name}
                    </span>

                    {selected && (
                    <span className="text-blue-600 text-sm font-medium">
                        Selected
                    </span>
                    )}
                </div>
                );
            })}

            {filteredTAs.length === 0 && (
                <p className="text-sm text-neutral-500 text-center py-4">
                No TAs found
                </p>
            )}
            </div>

            {/* Validation message */}
            {!isFacultyFormValid && (
            <p className="text-xs text-red-500">
                Select at least one TA
            </p>
            )}

            {/* Submit */}
            <Button
            onClick={handleFacultyOnboard}
            className="w-full h-12"
            disabled={!isFacultyFormValid}
            >
            Finish Faculty Onboarding
            </Button>
        </div>
        )}

      </div>
    </div>
  );
}
