"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trash2, Star, Edit, Download, X } from "lucide-react";
import Link from "next/link";
import MarkdownRenderer from "@/components/MarkdownRenderer";

export default function ImportantQuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    questions: true,
    options: true,
    answers: false,
    explanations: false,
    blankSpace: false,
  });

  const [visibleAnswers, setVisibleAnswers] = useState<Set<string>>(new Set());

  const toggleAnswer = (id: string) => {
    setVisibleAnswers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetchImportantQuestions();
  }, []);

  const fetchImportantQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*, subjects(name), subtopics(name)")
      .eq("is_important", true)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setQuestions(data);
    }
    setLoading(false);
  };

  const toggleImportant = async (id: string, currentStatus: boolean) => {
    await supabase.from("questions").update({ is_important: !currentStatus }).eq("id", id);
    setQuestions(questions.filter(q => q.id !== id));
  };

  const generatePDF = () => {
    setShowExportModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <>
      <div className="max-w-6xl mx-auto print:hidden">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="text-yellow-500" fill="currentColor" /> Important Questions
            </h1>
            <p className="text-gray-500 mt-2">Questions you have bookmarked.</p>
          </div>
          <button 
            onClick={() => setShowExportModal(true)}
            disabled={questions.length === 0}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Download size={18} /> Export PDF
          </button>
        </header>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading questions...</div>
        ) : questions.length === 0 ? (
          <div className="bg-white p-12 rounded-lg border border-gray-200 text-center text-gray-500 shadow-sm">
            No important questions yet. Bookmark questions using the star icon!
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((q) => (
              <div key={q.id} className="bg-white p-5 rounded-lg border border-yellow-200 shadow-sm relative group">
                <div className="absolute right-4 top-4 flex gap-2">
                  <button onClick={() => toggleImportant(q.id, q.is_important)} className="p-1.5 bg-yellow-50 rounded hover:bg-yellow-100 text-yellow-600 transition-colors" title="Remove bookmark">
                    <Star size={16} fill="currentColor" />
                  </button>
                </div>

                <div className="flex gap-2 text-xs text-gray-500 mb-3 flex-wrap pr-12">
                  <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100 font-medium">
                    {q.subjects?.name}
                  </span>
                  {q.subtopics?.name && <span className="bg-gray-100 px-2 py-1 rounded">{q.subtopics.name}</span>}
                  {q.exam && <span className="bg-gray-100 px-2 py-1 rounded">{q.exam} {q.year}</span>}
                </div>

                <div className="mb-4">
                  <MarkdownRenderer content={q.question_text} className="text-gray-900 font-medium" />
                </div>
                
                {q.image_url && (
                  <div className="mb-4">
                    <img src={q.image_url} alt="Question image" className="max-h-48 rounded border border-gray-200" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-gray-700 mb-4 text-sm">
                  {(q.option_a || q.option_a_image_url) && (
                    <div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-500 mr-2 mt-0.5">A.</span> 
                        <MarkdownRenderer content={q.option_a} className="flex-1" />
                      </div>
                      {q.option_a_image_url && <img src={q.option_a_image_url} alt="Option A" className="mt-2 max-h-32 rounded border border-gray-200" />}
                    </div>
                  )}
                  {(q.option_b || q.option_b_image_url) && (
                    <div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-500 mr-2 mt-0.5">B.</span> 
                        <MarkdownRenderer content={q.option_b} className="flex-1" />
                      </div>
                      {q.option_b_image_url && <img src={q.option_b_image_url} alt="Option B" className="mt-2 max-h-32 rounded border border-gray-200" />}
                    </div>
                  )}
                  {(q.option_c || q.option_c_image_url) && (
                    <div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-500 mr-2 mt-0.5">C.</span> 
                        <MarkdownRenderer content={q.option_c} className="flex-1" />
                      </div>
                      {q.option_c_image_url && <img src={q.option_c_image_url} alt="Option C" className="mt-2 max-h-32 rounded border border-gray-200" />}
                    </div>
                  )}
                  {(q.option_d || q.option_d_image_url) && (
                    <div>
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-500 mr-2 mt-0.5">D.</span> 
                        <MarkdownRenderer content={q.option_d} className="flex-1" />
                      </div>
                      {q.option_d_image_url && <img src={q.option_d_image_url} alt="Option D" className="mt-2 max-h-32 rounded border border-gray-200" />}
                    </div>
                  )}
                  {(q.option_e || q.option_e_image_url) && (
                    <div className="md:col-span-2 lg:col-span-1">
                      <div className="flex items-start">
                        <span className="font-semibold text-gray-500 mr-2 mt-0.5">E.</span> 
                        <MarkdownRenderer content={q.option_e} className="flex-1" />
                      </div>
                      {q.option_e_image_url && <img src={q.option_e_image_url} alt="Option E" className="mt-2 max-h-32 rounded border border-gray-200" />}
                    </div>
                  )}
                </div>

                {(q.answer || q.explanation) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
                    <button 
                      onClick={() => toggleAnswer(q.id)}
                      className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1 mb-2"
                    >
                      {visibleAnswers.has(q.id) ? "Hide Answer & Explanation" : "Show Answer & Explanation"}
                    </button>
                    {visibleAnswers.has(q.id) && (
                      <div className="bg-gray-50 p-4 rounded border border-gray-200 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        {q.answer && (
                          <div className="mb-2 flex items-start gap-2">
                            <span className="font-semibold text-green-700 shrink-0">Answer:</span>
                            <MarkdownRenderer content={q.answer} className="text-gray-800 flex-1" />
                          </div>
                        )}
                        {q.explanation && (
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-blue-700 shrink-0">Explanation:</span>
                            <MarkdownRenderer content={q.explanation} className="text-gray-600 flex-1" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export PDF Modal (no-print) */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800">Export PDF Settings</h3>
              <button onClick={() => setShowExportModal(false)} className="text-gray-500 hover:bg-gray-200 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Exporting {questions.length} Important questions.
              </p>
              
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={exportSettings.questions} 
                    onChange={e => setExportSettings({...exportSettings, questions: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-gray-800">Include Questions</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={exportSettings.options} 
                    onChange={e => setExportSettings({...exportSettings, options: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-gray-800">Include Options</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={exportSettings.answers} 
                    onChange={e => setExportSettings({...exportSettings, answers: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-gray-800">Include Answers</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={exportSettings.explanations} 
                    onChange={e => setExportSettings({...exportSettings, explanations: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-gray-800">Include Explanations</span>
                </label>
                <div className="border-t border-gray-100 my-2 pt-2"></div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={exportSettings.blankSpace} 
                    onChange={e => setExportSettings({...exportSettings, blankSpace: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                  />
                  <span className="text-gray-800">Leave blank space for notes</span>
                </label>
              </div>

              <div className="bg-blue-50 p-3 rounded-md text-sm text-blue-800 border border-blue-100 mb-6">
                Tip: The PDF will automatically format to be clean and readable. Use your browser's Print dialog to save as PDF!
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowExportModal(false)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100">
                  Cancel
                </button>
                <button onClick={generatePDF} className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 flex items-center gap-2">
                  <Download size={18} /> Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="hidden print:block p-8 bg-white text-black font-sans absolute top-0 left-0 w-full z-50 min-h-screen">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="text-black" fill="currentColor" /> Important Questions</h1>
          <p className="text-gray-600">Question Bank Export - {questions.length} questions</p>
        </div>
        
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div key={q.id} className="break-inside-avoid border-b border-gray-100 pb-6 mb-6 last:border-0">
              <div className="flex items-start gap-2 mb-2">
                <span className="font-bold text-gray-800">{idx + 1}.</span>
                <div>
                  {exportSettings.questions && (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{q.subjects?.name}</span>
                        {q.subtopics?.name && <span className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-600">{q.subtopics.name}</span>}
                      </div>
                      <MarkdownRenderer content={q.question_text} className="font-medium" />
                      {q.image_url && <img src={q.image_url} className="mt-2 max-h-40 object-contain" alt="Question image" />}
                    </>
                  )}
                </div>
              </div>
              
              {exportSettings.options && (
                <div className="pl-6 mt-3 space-y-2 text-sm text-gray-800">
                  {(q.option_a || q.option_a_image_url) && (
                    <div className="flex gap-2">
                      <span className="font-medium">A)</span> 
                      <div className="flex-1">
                        <MarkdownRenderer content={q.option_a} />
                        {q.option_a_image_url && <img src={q.option_a_image_url} className="mt-1 max-h-24 object-contain" alt="Option A" />}
                      </div>
                    </div>
                  )}
                  {(q.option_b || q.option_b_image_url) && (
                    <div className="flex gap-2">
                      <span className="font-medium">B)</span> 
                      <div className="flex-1">
                        <MarkdownRenderer content={q.option_b} />
                        {q.option_b_image_url && <img src={q.option_b_image_url} className="mt-1 max-h-24 object-contain" alt="Option B" />}
                      </div>
                    </div>
                  )}
                  {(q.option_c || q.option_c_image_url) && (
                    <div className="flex gap-2">
                      <span className="font-medium">C)</span> 
                      <div className="flex-1">
                        <MarkdownRenderer content={q.option_c} />
                        {q.option_c_image_url && <img src={q.option_c_image_url} className="mt-1 max-h-24 object-contain" alt="Option C" />}
                      </div>
                    </div>
                  )}
                  {(q.option_d || q.option_d_image_url) && (
                    <div className="flex gap-2">
                      <span className="font-medium">D)</span> 
                      <div className="flex-1">
                        <MarkdownRenderer content={q.option_d} />
                        {q.option_d_image_url && <img src={q.option_d_image_url} className="mt-1 max-h-24 object-contain" alt="Option D" />}
                      </div>
                    </div>
                  )}
                  {(q.option_e || q.option_e_image_url) && (
                    <div className="flex gap-2">
                      <span className="font-medium">E)</span> 
                      <div className="flex-1">
                        <MarkdownRenderer content={q.option_e} />
                        {q.option_e_image_url && <img src={q.option_e_image_url} className="mt-1 max-h-24 object-contain" alt="Option E" />}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(exportSettings.answers || exportSettings.explanations) && (
                <div className="pl-6 mt-4 pt-3 text-sm">
                  {exportSettings.answers && q.answer && (
                    <div className="mb-2 flex gap-2">
                      <strong>Answer:</strong> 
                      <MarkdownRenderer content={q.answer} className="flex-1" />
                    </div>
                  )}
                  {exportSettings.explanations && q.explanation && (
                    <div className="flex gap-2">
                      <strong>Explanation:</strong> 
                      <MarkdownRenderer content={q.explanation} className="flex-1" />
                    </div>
                  )}
                </div>
              )}

              {exportSettings.blankSpace && (
                <div className="pl-6 mt-6 pt-4 border-t border-dashed border-gray-300">
                  <div className="text-gray-400 italic text-sm mb-16">Notes / Written Explanation:</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
