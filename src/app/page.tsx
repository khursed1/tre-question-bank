import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Folder } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: subjects, error } = await supabase
    .from("subjects")
    .select("*, questions(count)");

  if (error) {
    console.error("Error fetching subjects:", error);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
        <p className="text-gray-500 mt-2">Select a subject to browse questions.</p>
      </header>

      {(!subjects || subjects.length === 0) ? (
        <div className="bg-white p-8 rounded-lg border border-gray-200 text-center">
          <h2 className="text-xl font-medium text-gray-700 mb-4">No subjects found</h2>
          <p className="text-gray-500 mb-6">You can create a subject or import questions from a JSON file.</p>
          <div className="flex justify-center gap-4">
            <Link href="/subjects" className="bg-white border border-gray-300 px-4 py-2 rounded text-gray-700 hover:bg-gray-50">
              Manage Subjects
            </Link>
            <Link href="/import" className="bg-blue-600 px-4 py-2 rounded text-white hover:bg-blue-700">
              Import JSON
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject: any) => (
            <Link 
              key={subject.id} 
              href={`/subjects/${subject.id}`}
              className="bg-white border border-gray-200 p-6 rounded-lg hover:shadow-md transition-shadow group cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-3">
                <Folder className="text-blue-500 group-hover:text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-800">{subject.name}</h2>
              </div>
              <p className="text-gray-500 text-sm">
                {subject.questions?.[0]?.count || 0} questions
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
