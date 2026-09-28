"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Upload, FileJson, Check, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [importAnswers, setImportAnswers] = useState(true);
  const [importExplanations, setImportExplanations] = useState(true);
  const [importCategory, setImportCategory] = useState("CS");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const router = useRouter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        let questions: any[] = [];
        if (Array.isArray(json)) {
          questions = json;
        } else if (json.questions && Array.isArray(json.questions)) {
          questions = json.questions;
        } else if (json.subjects && Array.isArray(json.subjects)) {
          // Extract from the nested subjects format
          json.subjects.forEach((subjGroup: any) => {
            if (subjGroup.questions && Array.isArray(subjGroup.questions)) {
              subjGroup.questions.forEach((q: any) => {
                questions.push({
                  ...q,
                  subject: q.subject || subjGroup.subject,
                });
              });
            }
          });
        }
        
        if (!Array.isArray(questions) || questions.length === 0) {
          throw new Error("Invalid JSON format. Expected an array of questions or a supported nested structure.");
        }

        // Generate preview stats
        const subjectCounts: Record<string, number> = {};
        questions.forEach((q) => {
          const subj = q.subject || q.Subject || "Uncategorized";
          subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
        });

        setPreview({
          totalQuestions: questions.length,
          subjects: subjectCounts,
          rawData: questions
        });
      } catch (err: any) {
        setError(err.message || "Failed to parse JSON file.");
        setPreview(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!preview || !preview.rawData) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch or create subjects
      const { data: existingSubjects, error: subjErr } = await supabase.from("subjects").select("id, name");
      if (subjErr) throw subjErr;
      
      const subjectMap = new Map(existingSubjects?.map((s) => [s.name, s.id]) || []);
      
      // 2. Fetch or create subtopics
      const { data: existingSubtopics, error: subErr } = await supabase.from("subtopics").select("id, subject_id, name");
      if (subErr) throw subErr;

      const subtopicMap = new Map(existingSubtopics?.map((s) => [`${s.subject_id}-${s.name}`, s.id]) || []);

      const questionsToInsert = [];

      for (const q of preview.rawData) {
        const subjectName = q.subject || q.Subject || "Uncategorized";
        const subtopicName = q.subtopic || q.Subtopic || null;
        
        let subjectId = subjectMap.get(subjectName);
        if (!subjectId) {
          const { data: newSubj, error: newSubjErr } = await supabase
            .from("subjects")
            .insert({ name: subjectName, category: importCategory })
            .select("id")
            .single();
          if (newSubjErr) throw newSubjErr;
          subjectId = newSubj.id;
          subjectMap.set(subjectName, subjectId);
        }

        let subtopicId = null;
        if (subtopicName) {
          const subKey = `${subjectId}-${subtopicName}`;
          subtopicId = subtopicMap.get(subKey);
          if (!subtopicId) {
            const { data: newSubt, error: newSubtErr } = await supabase
              .from("subtopics")
              .insert({ subject_id: subjectId, name: subtopicName })
              .select("id")
              .single();
            if (newSubtErr) throw newSubtErr;
            subtopicId = newSubt.id;
            subtopicMap.set(subKey, subtopicId);
          }
        }

        questionsToInsert.push({
          subject_id: subjectId,
          subtopic_id: subtopicId,
          question_text: q.question || q.Question || q.question_text || "",
          option_a: q.option_a || q.optionA || q.A || q.a || q.options?.A || q.options?.a || null,
          option_b: q.option_b || q.optionB || q.B || q.b || q.options?.B || q.options?.b || null,
          option_c: q.option_c || q.optionC || q.C || q.c || q.options?.C || q.options?.c || null,
          option_d: q.option_d || q.optionD || q.D || q.d || q.options?.D || q.options?.d || null,
          option_e: q.option_e || q.optionE || q.E || q.e || q.options?.E || q.options?.e || null,
          answer: importAnswers ? (q.answer || q.Answer || null) : null,
          explanation: importExplanations ? (q.explanation || q.Explanation || null) : null,
          exam: q.exam || q.Exam || null,
          year: q.year || q.Year ? parseInt(q.year || q.Year) : null,
        });
      }

      // Batch insert questions
      const { error: insertErr } = await supabase.from("questions").insert(questionsToInsert);
      if (insertErr) throw insertErr;

      setSuccess(true);
      setPreview(null);
      setFile(null);
      setTimeout(() => {
        router.push("/");
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || "An error occurred during import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Import Questions</h1>
        <p className="text-gray-500 mt-2">Upload a JSON file to bulk import questions into your Question Bank.</p>
      </header>

      {success ? (
        <div className="bg-green-50 border border-green-200 text-green-800 p-6 rounded-lg flex items-center gap-3">
          <Check className="text-green-600" />
          <div>
            <h3 className="font-semibold text-lg">Import Successful!</h3>
            <p className="text-green-700">Questions have been added to the database. Redirecting...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* File Upload Area */}
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <FileJson className="w-12 h-12 text-gray-400 mb-4" />
              <span className="text-lg font-medium text-gray-700 mb-1">
                {file ? file.name : "Click to select a JSON file"}
              </span>
              <span className="text-sm text-gray-500">
                Ensure the file contains an array of question objects.
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-md flex items-start gap-3 border border-red-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Import Preview & Settings */}
          {preview && (
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 border-b pb-2">Import Preview</h2>
              
              <div className="mb-6">
                <p className="text-lg font-medium text-gray-800 mb-3">
                  {preview.totalQuestions} questions found
                </p>
                <div className="bg-gray-50 p-4 rounded-md font-mono text-sm space-y-2">
                  {Object.entries(preview.subjects).map(([subj, count]) => (
                    <div key={subj} className="flex justify-between max-w-sm">
                      <span className="text-gray-700">{subj}</span>
                      <span className="text-gray-500">{String(count)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6 border-t pt-4">
                <h3 className="font-medium text-gray-800 mb-3">Import Settings</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject Category (for new subjects)
                    </label>
                    <select
                      value={importCategory}
                      onChange={(e) => setImportCategory(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 bg-white w-full max-w-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CS">CS Subjects</option>
                      <option value="General">General Subjects</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importAnswers}
                      onChange={(e) => setImportAnswers(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Import answers</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importExplanations}
                      onChange={(e) => setImportExplanations(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Import explanations</span>
                  </label>
                </div>
              </div>
            </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Importing...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Import Questions
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
