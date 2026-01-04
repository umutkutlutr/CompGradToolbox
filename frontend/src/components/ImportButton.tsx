import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Upload } from "lucide-react";
import { toast } from "sonner"; // if you're using sonner already

export function ExcelImportCard() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Please select a .xlsx file");
      e.target.value = "";
      return;
    }

    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/import/excel", {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "Import failed");

      toast.success("Import completed");
      console.log("Import summary:", data.summary);
    } catch (err: any) {
      toast.error(err?.message || "Import failed");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Excel</CardTitle>
        <CardDescription>
          Upload TA Needs Planning + COMP TA List to create courses, professors, TAs, and preferences.
        </CardDescription>
      </CardHeader>

      <CardContent className="flex items-center justify-between gap-3">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={onFileChange}
        />

        <Button onClick={onPick} disabled={importing} className="gap-2">
          <Upload className="w-4 h-4" />
          {importing ? "Importing..." : "Import .xlsx"}
        </Button>

        <div className="text-xs text-neutral-500">
          Splits faculty like <span className="font-medium">“X1, X2”</span> into two professors.
        </div>
      </CardContent>
    </Card>
  );
}
