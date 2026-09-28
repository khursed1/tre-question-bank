"use client";

import { useState, useEffect, use, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Filter, Edit, Trash2, Star, Download, ChevronLeft, ChevronRight, X, FolderInput, CheckSquare, Square, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import MarkdownRenderer from "@/components/MarkdownRenderer";

export default function SubjectQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const subjectId = unwrappedParams.id;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');
  
  const [subject, setSubject] = useState<any>(null);
  const [subtopics, setSubtopics] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const getInitialState = (key: string, defaultVal: any) => {
    if (typeof window === 'undefined') return defaultVal;
    const cached = sessionStorage.getItem(`view_state_${subjectId}`);
    if (cached) {
      try {
         const parsed = JSON.parse(cached);
         return parsed[key] !== undefined ? parsed[key] : defaultVal;
      } catch(e) {}
    }
    return defaultVal;
  };

  // Filters
  const [search, setSearch] = useState(() => getInitialState('search', ""));
  const [selectedSubtopic, setSelectedSubtopic] = useState(() => getInitialState('selectedSubtopic', "all"));
  const [examFilter, setExamFilter] = useState<string[]>(() => {
    const init = getInitialState('examFilter', []);
    return Array.isArray(init) ? init : (init ? [init] : []);
  });
  const [availableExams, setAvailableExams] = useState<string[]>([]);
  const [yearFilter, setYearFilter] = useState(() => getInitialState('yearFilter', ""));
  const [hasAnswerFilter, setHasAnswerFilter] = useState(() => getInitialState('hasAnswerFilter', "all"));
  const [sortOrder, setSortOrder] = useState(() => getInitialState('sortOrder', "newest"));
  
  // Pagination
  const [page, setPage] = useState(() => getInitialState('page', 1));
  const itemsPerPage = 20;

  // Toggle Answers
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
    sessionStorage.setItem(`view_state_${subjectId}`, JSON.stringify({
      search, selectedSubtopic, examFilter, yearFilter, hasAnswerFilter, sortOrder, page
    }));
  }, [search, selectedSubtopic, examFilter, yearFilter, hasAnswerFilter, sortOrder, page, subjectId]);

  useEffect(() => {
    if (highlightId && !loading && questions.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`q-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, [highlightId, loading, questions]);

  // PDF Export Modal State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    questions: true,
    options: true,
    answers: false,
    explanations: false,
    blankSpace: false,
  });

  // Bulk Actions State
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [targetSubtopics, setTargetSubtopics] = useState<any[]>([]);
  const [moveTargetSubject, setMoveTargetSubject] = useState("");
  const [moveTargetSubtopic, setMoveTargetSubtopic] = useState("");

  useEffect(() => {
    fetchSubjectData();
  }, [subjectId]);

  useEffect(() => {
    fetchQuestions();
  }, [subjectId, selectedSubtopic, examFilter, yearFilter, hasAnswerFilter, search, sortOrder]);

  const fetchSubjectData = async () => {
    const cacheKey = `subject_data_${subjectId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      setSubject(parsed.subj);
      setSubtopics(parsed.subs);
    }

    const { data: subj } = await supabase.from("subjects").select("*").eq("id", subjectId).single();
    const { data: subs } = await supabase.from("subtopics").select("*").eq("subject_id", subjectId).order("name");
    const { data: qData } = await supabase.from("questions").select("exam").eq("subject_id", subjectId).not("exam", "is", null);
    
    if (subj) setSubject(subj);
    if (subs) setSubtopics(subs);
    if (qData) {
      const exams = Array.from(new Set(qData.map(q => q.exam).filter(Boolean))).sort();
      setAvailableExams(exams as string[]);
    }
    
    if (subj && subs) {
      sessionStorage.setItem(cacheKey, JSON.stringify({ subj, subs }));
    }
  };

  const fetchQuestions = async () => {
    const examKey = Array.isArray(examFilter) ? examFilter.join(',') : '';
    const cacheKey = `questions_${subjectId}_${selectedSubtopic}_${examKey}_${yearFilter}_${hasAnswerFilter}_${search}_${sortOrder}`;
    const cachedData = sessionStorage.getItem(cacheKey);
    
    if (cachedData) {
      setQuestions(JSON.parse(cachedData));
      setLoading(false); // Instant UI from cache
    } else {
      setLoading(true); // Show loader only if no cache
    }

    let query = supabase.from("questions").select("*, subtopics(name)").eq("subject_id", subjectId);

    if (selectedSubtopic !== "all") {
      query = query.eq("subtopic_id", selectedSubtopic);
    }
    if (examFilter.length > 0) {
      query = query.in("exam", examFilter);
    }
    if (yearFilter) {
      query = query.eq("year", parseInt(yearFilter));
    }
    if (hasAnswerFilter === "yes") {
      query = query.not("answer", "is", null);
    } else if (hasAnswerFilter === "no") {
      query = query.is("answer", null);
    }
    if (search) {
      query = query.ilike("question_text", `%${search}%`);
    }

    if (sortOrder === "oldest") {
      query = query.order("created_at", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    if (!error && data) {
      setQuestions(data);
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    }
    
    if (!cachedData) {
      setPage(1); // Only reset page if it's a completely new filter
      setSelectedQuestions([]); 
    }
    setLoading(false);
  };

  const updateCache = (newQuestions: any[]) => {
    const examKey = Array.isArray(examFilter) ? examFilter.join(',') : '';
    const cacheKey = `questions_${subjectId}_${selectedSubtopic}_${examKey}_${yearFilter}_${hasAnswerFilter}_${search}_${sortOrder}`;
    sessionStorage.setItem(cacheKey, JSON.stringify(newQuestions));
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    setIsProcessing(true);
    await supabase.from("questions").delete().eq("id", id);
    const updated = questions.filter(q => q.id !== id);
    setQuestions(updated);
    setSelectedQuestions(selectedQuestions.filter(sq => sq !== id));
    updateCache(updated);
    setIsProcessing(false);
  };

  const toggleImportant = async (id: string, currentStatus: boolean) => {
    setIsProcessing(true);
    await supabase.from("questions").update({ is_important: !currentStatus }).eq("id", id);
    const updated = questions.map(q => q.id === id ? { ...q, is_important: !currentStatus } : q);
    setQuestions(updated);
    updateCache(updated);
    setIsProcessing(false);
  };

  const generatePDF = () => {
    setShowExportModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Bulk Actions Logic
  const handleTouchStart = (id: string) => {
    longPressTimer.current = setTimeout(() => {
      if (!selectedQuestions.includes(id)) {
        setSelectedQuestions(prev => [...prev, id]);
        if (window.navigator && window.navigator.vibrate) window.navigator.vibrate(50);
      }
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const toggleSelectAll = () => {
    if (selectedQuestions.length === currentQuestions.length && currentQuestions.length > 0) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(currentQuestions.map(q => q.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedQuestions.includes(id)) {
      setSelectedQuestions(selectedQuestions.filter(qId => qId !== id));
    } else {
      setSelectedQuestions([...selectedQuestions, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedQuestions.length} selected questions?`)) return;
    setIsProcessing(true);
    await supabase.from("questions").delete().in("id", selectedQuestions);
    const updated = questions.filter(q => !selectedQuestions.includes(q.id));
    setQuestions(updated);
    setSelectedQuestions([]);
    updateCache(updated);
    setIsProcessing(false);
  };

  const handleBulkImportant = async () => {
    setIsProcessing(true);
    await supabase.from("questions").update({ is_important: true }).in("id", selectedQuestions);
    const updated = questions.map(q => selectedQuestions.includes(q.id) ? { ...q, is_important: true } : q);
    setQuestions(updated);
    setSelectedQuestions([]);
    updateCache(updated);
    setIsProcessing(false);
  };

  const openMoveModal = async () => {
    setIsProcessing(true);
    const { data } = await supabase.from("subjects").select("*").order("name");
    if (data) setAllSubjects(data);
    setMoveTargetSubject("");
    setTargetSubtopics([]);
    setShowMoveModal(true);
    setIsProcessing(false);
  };

  const handleMoveTargetSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjId = e.target.value;
    setMoveTargetSubject(subjId);
    setMoveTargetSubtopic("");
    if (subjId) {
      const { data } = await supabase.from("subtopics").select("*").eq("subject_id", subjId).order("name");
      if (data) setTargetSubtopics(data);
    } else {
      setTargetSubtopics([]);
    }
  };

  const handleBulkMoveSubmit = async () => {
    if (!moveTargetSubject) return alert("Please select a target subject.");
    setIsProcessing(true);
    
    await supabase.from("questions").update({ 
      subject_id: moveTargetSubject,
      subtopic_id: moveTargetSubtopic || null 
    }).in("id", selectedQuestions);

    sessionStorage.clear(); // Clear all caches since items moved between subjects
    setShowMoveModal(false);
    setSelectedQuestions([]);
    setIsProcessing(false);
    fetchQuestions(); // Refresh list to remove moved questions
  };

  // Pagination logic
  const totalPages = Math.ceil(questions.length / itemsPerPage);
  const currentQuestions = questions.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (!subject) return <div className="p-8">Loading...</div>;

  return (
    <>
      <div className="max-w-6xl mx-auto print:hidden pb-24">
        <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:underline mb-2 inline-block">&larr; Back to Subjects</Link>
            <h1 className="text-3xl font-bold text-gray-900">{subject.name}</h1>
            <p className="text-gray-500 mt-1">{questions.length} questions</p>
          </div>
          <button 
            onClick={() => setShowExportModal(true)}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm"
          >
            <Download size={18} /> Export PDF
          </button>
        </header>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search questions..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <select 
            value={selectedSubtopic} 
            onChange={(e) => { setSelectedSubtopic(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Subtopic: All</option>
            {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select 
            value={hasAnswerFilter} 
            onChange={(e) => { setHasAnswerFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Answers: All</option>
            <option value="yes">Has Answer</option>
            <option value="no">No Answer</option>
          </select>

          <select 
            value={sortOrder} 
            onChange={(e) => { setSortOrder(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
          
          <input 
            type="number" 
            placeholder="Year" 
            value={yearFilter}
            onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
            className="w-24 border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          />

          {availableExams.length > 0 && (
            <div className="w-full flex flex-wrap gap-2 mt-2 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500 font-medium py-1">Exams:</span>
              {availableExams.map(ex => (
                <button
                  key={ex}
                  onClick={() => {
                    setExamFilter(prev => prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    Array.isArray(examFilter) && examFilter.includes(ex) 
                      ? 'bg-blue-600 text-white border-blue-600' 
                      : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selection Bar */}
        {currentQuestions.length > 0 && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-100 p-3 rounded-lg">
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-blue-700 hover:text-blue-800 font-medium text-sm focus:outline-none"
              >
                {selectedQuestions.length === currentQuestions.length ? (
                  <CheckSquare size={18} />
                ) : (
                  <Square size={18} />
                )}
                {selectedQuestions.length === currentQuestions.length ? "Deselect All" : "Select All on Page"}
              </button>
              {selectedQuestions.length > 0 && (
                <span className="text-sm text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                  {selectedQuestions.length} selected
                </span>
              )}
            </div>

            {selectedQuestions.length > 0 && (
              <div className="flex gap-2">
                <button 
                  onClick={handleBulkImportant}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-yellow-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <Star size={14} className="text-yellow-500" /> Mark Important
                </button>
                <button 
                  onClick={openMoveModal}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <FolderInput size={14} className="text-blue-500" /> Move
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-red-600 border border-red-700 rounded text-sm text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Questions List */}
        {loading ? (
          <div className="py-12 text-center text-gray-500">Loading questions...</div>
        ) : currentQuestions.length === 0 ? (
          <div className="bg-white p-12 rounded-lg border border-gray-200 text-center text-gray-500">
            No questions found matching your filters.
          </div>
        ) : (
          <div className="space-y-4">
            {currentQuestions.map((q, idx) => (
              <div 
                key={q.id} 
                id={`q-${q.id}`}
                className={`bg-white p-5 rounded-lg border shadow-sm relative group transition-all duration-700
                  ${selectedQuestions.includes(q.id) ? 'border-blue-400 ring-1 ring-blue-400' : 'border-gray-200'}
                  ${highlightId === q.id ? 'ring-4 ring-yellow-300 bg-yellow-50/30' : ''}
                `}
                onTouchStart={() => handleTouchStart(q.id)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                {/* Selection Checkbox */}
                <div className={`absolute left-4 top-5 ${selectedQuestions.length > 0 ? "block" : "hidden md:block"}`}>
                  <input 
                    type="checkbox" 
                    checked={selectedQuestions.includes(q.id)}
                    onChange={() => toggleSelect(q.id)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Actions */}
                <div className="absolute right-4 top-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleImportant(q.id, q.is_important)} className="p-1.5 bg-gray-100 rounded hover:bg-yellow-100 text-gray-600 hover:text-yellow-600 transition-colors">
                    <Star size={16} fill={q.is_important ? "currentColor" : "none"} className={q.is_important ? "text-yellow-500" : ""} />
                  </button>
                  <Link href={`/questions/${q.id}/edit`} className="p-1.5 bg-gray-100 rounded hover:bg-blue-100 text-gray-600 hover:text-blue-600 transition-colors">
                    <Edit size={16} />
                  </Link>
                  <button onClick={() => handleDelete(q.id)} className="p-1.5 bg-gray-100 rounded hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex gap-2 text-xs text-gray-500 mb-3 pl-8">
                  {q.subtopics?.name && <span className="bg-gray-100 px-2 py-1 rounded">{q.subtopics.name}</span>}
                  {q.exam && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">{q.exam} {q.year}</span>}
                  <span className="text-gray-400">#{(page - 1) * itemsPerPage + idx + 1}</span>
                </div>

                <div className="mb-4 pl-8">
                  <MarkdownRenderer content={q.question_text} className="text-gray-900 font-medium" />
                </div>
                
                {q.image_url && (
                  <div className="mb-4 pl-8">
                    <img src={q.image_url} alt="Question image" className="max-h-48 rounded border border-gray-200" />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-gray-700 mb-4 text-sm pl-8">
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
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm pl-8">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button 
              onClick={() => { setPage(p => Math.max(1, p - 1)); setSelectedQuestions([]); }}
              disabled={page === 1}
              className="p-2 border border-gray-300 rounded bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-gray-600 font-medium">Page {page} of {totalPages}</span>
            <button 
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setSelectedQuestions([]); }}
              disabled={page === totalPages}
              className="p-2 border border-gray-300 rounded bg-white text-gray-600 disabled:opacity-50 hover:bg-gray-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Bulk Move Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <FolderInput size={20} className="text-blue-600" /> Move {selectedQuestions.length} Questions
              </h3>
              <button onClick={() => setShowMoveModal(false)} className="text-gray-500 hover:bg-gray-200 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Subject *</label>
                <select 
                  value={moveTargetSubject} 
                  onChange={handleMoveTargetSubjectChange} 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Subject...</option>
                  {allSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              
              {moveTargetSubject && targetSubtopics.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Subtopic (Optional)</label>
                  <select 
                    value={moveTargetSubtopic} 
                    onChange={e => setMoveTargetSubtopic(e.target.value)} 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">None / Uncategorized</option>
                    {targetSubtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex gap-3 justify-end">
              <button onClick={() => setShowMoveModal(false)} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100">
                Cancel
              </button>
              <button 
                onClick={handleBulkMoveSubmit} 
                disabled={!moveTargetSubject || isProcessing}
                className="px-4 py-2 bg-blue-600 rounded text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? "Moving..." : "Confirm Move"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                Exporting {questions.length} questions from <strong>{subject.name}</strong> 
                {selectedSubtopic !== 'all' && " (Filtered)"}
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
          <h1 className="text-2xl font-bold">{subject.name}</h1>
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
      {/* Global Processing Loader */}
      {isProcessing && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-sm z-[100] flex flex-col items-center justify-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800">Processing...</h2>
          <p className="text-gray-500">Please wait while the action completes.</p>
        </div>
      )}
    </>
  );
}
