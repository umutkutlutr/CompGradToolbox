import { useEffect, useState } from "react";
import { GraduationCap, UserSquare2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";

interface TA {
  ta_id: number;
  name: string;
  program: string;
  level: "MS" | "PhD";
}

interface Professor {
  professor_id: number;
  name: string;
}

export default function PeopleDirectory() {
  const [tas, setTas] = useState<TA[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
    try {
        const [taRes, profRes] = await Promise.all([
        fetch("/api/tas"),
        fetch("/api/professors"),
        ]);

        if (!taRes.ok) {
        const text = await taRes.text();
        console.error("TA API returned:", text);
        throw new Error("TA API failed: " + taRes.status);
        }

        if (!profRes.ok) {
        const text = await profRes.text();
        console.error("Professor API returned:", text);
        throw new Error("Professor API failed: " + profRes.status);
        }

        const taData = await taRes.json();
        const profData = await profRes.json();

        setTas(taData);
        setProfessors(profData);
      } catch (err) {
        setError("Failed to load TA and professor data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex justify-center py-20 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-neutral-900 mb-1">People Directory</h1>
        <p className="text-neutral-600">
          Overview of available Teaching Assistants & Professors
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ------------------- TAs ------------------- */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-blue-800" />
                </div>
                <div>
                  <CardTitle>Available TAs</CardTitle>
                  <CardDescription>{tas.length} TA(s) listed</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {tas.map((ta) => (
            <div
                key={ta.ta_id}
                className="flex items-start justify-between border border-neutral-200 rounded-lg p-4"
            >
                <div className="space-y-1">
                <div className="text-neutral-900 font-medium">{ta.name}</div>
                <div className="text-sm text-neutral-600">
                    {ta.program} • {ta.level}
                </div>
                </div>
            </div>
            ))}


            {tas.length === 0 && (
              <p className="text-sm text-neutral-500">No TAs available.</p>
            )}
          </CardContent>
        </Card>

        {/* ------------------- Professors ------------------- */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <UserSquare2 className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <CardTitle>Available Professors</CardTitle>
                  <CardDescription>
                    {professors.length} Professor(s) listed
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {professors.map((prof) => (
            <div
                key={prof.professor_id}
                className="flex items-start justify-between border border-neutral-200 rounded-lg p-4"
            >
                <div className="space-y-1">
                <div className="text-neutral-900 font-medium">{prof.name}</div>
                </div>
            </div>
            ))}


            {professors.length === 0 && (
              <p className="text-sm text-neutral-500">No professors available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
