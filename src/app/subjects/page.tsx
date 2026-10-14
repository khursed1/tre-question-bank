"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { Folder, Plus, Trash2, Edit, Save, X, GitMerge, CheckSquare, Square, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";

function SubjectsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") === "General" ? "General" : searchParams.get("category") === "CS" ? "CS" : "All";

  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubject, setNewSubject] = useState("");
  const [newSubjectCategory, setNewSubjectCategory] = useState(initialCategory === "General" ? "General" : "CS");
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("CS");
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Merge State
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);
  const [mergeName, setMergeName] = useState("");
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  // Sync category tab with query param if it changes
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat === "General") {
      setSelectedCategory("General");
      setNewSubjectCategory("General");
    } else if (cat === "CS") {
      setSelectedCategory("CS");
      setNewSubjectCategory("CS");
    }
  }, [searchParams]);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subjects")
      .select("*, questions(count)")
      .order("name");
    
    if (!error && data) {
      setSubjects(data);
    }
    setLoading(false);
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;

    const { error } = await supabase
      .from("subjects")
      .insert({ name: newSubject.trim(), category: newSubjectCategory });
    
    if (!error) {
      setNewSubject("");
      fetchSubjects();
    } else {
      alert("Error adding subject: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete all subtopics and questions under this subject.")) return;
    
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (!error) {
      fetchSubjects();
    } else {
      alert("Error deleting subject: " + error.message);
    }
  };

  const handleEditClick = (id: string, currentName: string, currentCategory: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditCategory(currentCategory || "CS");
  };

  const handleRenameSubmit = async (id: string) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    const { error } = await supabase
      .from("subjects")
      .update({ name: editName.trim(), category: editCategory })
      .eq("id", id);
    if (!error) {
      setEditingId(null);
      fetchSubjects();
    } else {
      alert("Error renaming subject: " + error.message);
    }
  };

  const handleTouchStart = (id: string, currentName: string, currentCategory: string) => {
    if (editingId === id) return; // Prevent resetting while already editing
    const timer = setTimeout(() => {
      handleEditClick(id, currentName, currentCategory);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }, 600); // 600ms long press
    setPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  // Merge Logic
  const toggleMergeSelection = (id: string) => {
    if (selectedForMerge.includes(id)) {
      setSelectedForMerge(selectedForMerge.filter(s => s !== id));
    } else {
      setSelectedForMerge([...selectedForMerge, id]);
    }
  };

  const openMergeModal = () => {
    setSelectedForMerge([]);
    setMergeName("");
    setShowMergeModal(true);
  };

  const handleMergeSubmit = async () => {
    if (selectedForMerge.length < 2) {
      alert("Please select at least 2 subjects to merge.");
      return;
    }
    if (!mergeName.trim()) {
      alert("Please enter a name for the merged subject.");
      return;
    }

    setMerging(true);
    try {
      const firstSelected = subjects.find(s => selectedForMerge.includes(s.id));
      const targetCategory = firstSelected?.category || (selectedCategory === "General" ? "General" : "CS");

      // 1. Determine target subject (existing or new)
      let { data: existingSubj } = await supabase.from("subjects").select("*").eq("name", mergeName.trim()).single();
      let targetSubjectId = existingSubj?.id;

      if (!targetSubjectId) {
        const { data: newSubj, error: createErr } = await supabase
          .from("subjects")
          .insert({ name: mergeName.trim(), category: targetCategory })
          .select()
          .single();
        if (createErr) throw createErr;
        targetSubjectId = newSubj.id;
      }

      // 2. Fetch target subject's subtopics to handle unique constraints safely
      const { data: targetSubtopics } = await supabase.from("subtopics").select("*").eq("subject_id", targetSubjectId);
      const targetSubtopicMap = new Map((targetSubtopics || []).map(st => [st.name.toLowerCase(), st.id]));

      // 3. Migrate subtopics and questions from selected subjects
      const sourcesToMigrate = selectedForMerge.filter(id => id !== targetSubjectId);

      for (const sourceId of sourcesToMigrate) {
        const { data: sourceSubtopics } = await supabase.from("subtopics").select("*").eq("subject_id", sourceId);

        for (const st of (sourceSubtopics || [])) {
          const stNameLower = st.name.toLowerCase();
          if (targetSubtopicMap.has(stNameLower)) {
            // Subtopic collision! Reassign questions to the existing target subtopic
            const existingStId = targetSubtopicMap.get(stNameLower);
            await supabase.from("questions").update({ subtopic_id: existingStId }).eq("subtopic_id", st.id);
            // Delete the duplicate subtopic from the source
            await supabase.from("subtopics").delete().eq("id", st.id);
          } else {
            // No collision, safely migrate the subtopic to the target subject
            await supabase.from("subtopics").update({ subject_id: targetSubjectId }).eq("id", st.id);
            targetSubtopicMap.set(stNameLower, st.id); // Add it to map for future collisions in this loop
          }
        }

        // Move all remaining questions to target subject
        await supabase.from("questions").update({ subject_id: targetSubjectId }).eq("subject_id", sourceId);

        // Delete the original source subject
        await supabase.from("subjects").delete().eq("id", sourceId);
      }

      // Cleanup & Refresh
      setShowMergeModal(false);
      setSelectedForMerge([]);
      setMergeName("");
      fetchSubjects();

    } catch (err: any) {
      alert("Error during merge: " + err.message);
    } finally {
      setMerging(false);
    }
  };

  const csCount = subjects.filter(s => s.category !== 'General').length;
  const generalCount = subjects.filter(s => s.category === 'General').length;

  const filteredSubjects = subjects.filter((s) => {
    const matchesCategory =
      selectedCategory === "All"
        ? true
        : selectedCategory === "General"
        ? s.category === "General"
        : s.category !== "General";
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Subjects</h1>
          <p className="text-gray-500 mt-2">Create, rename, categorize, merge or remove subjects.</p>
        </div>
        <button 
          onClick={openMergeModal}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm shrink-0"
        >
          <GitMerge size={18} /> Merge Subjects
        </button>
      </header>

      {/* Add New Subject */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Add New Subject</h2>
        <form onSubmit={handleAddSubject} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="e.g., General Studies or Computer Networks"
            className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select
            value={newSubjectCategory}
            onChange={(e) => setNewSubjectCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="CS">CS Subject</option>
            <option value="General">General Subject</option>
          </select>
          <button
            type="submit"
            disabled={!newSubject.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add
          </button>
        </form>
      </div>

      {/* Category Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex border-b border-gray-200 gap-1 w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              selectedCategory === "All"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Subjects
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-normal">
              {subjects.length}
            </span>
          </button>
          <button
            onClick={() => {
              setSelectedCategory("CS");
              setNewSubjectCategory("CS");
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              selectedCategory === "CS"
                ? "border-blue-600 text-blue-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            CS Subjects
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {csCount}
            </span>
          </button>
          <button
            onClick={() => {
              setSelectedCategory("General");
              setNewSubjectCategory("General");
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              selectedCategory === "General"
                ? "border-purple-600 text-purple-600 font-semibold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            General Subjects
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {generalCount}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subjects..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Subjects List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
        <div className="p-4 bg-gray-50 border-b border-gray-200 font-medium text-gray-700 flex justify-between">
          <span>
            {selectedCategory === "All" ? "All Subjects" : selectedCategory === "General" ? "General Subjects" : "CS Subjects"}
            <span className="text-gray-500 font-normal ml-2">({filteredSubjects.length})</span>
          </span>
          <span className="hidden sm:inline">Actions</span>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading subjects...</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchQuery ? "No subjects match your search." : `No ${selectedCategory === "All" ? "" : selectedCategory + " "}subjects found.`}
          </div>
        ) : (
          <ul className="divide-y divide-gray-200 select-none">
            {filteredSubjects.map((subject) => (
              <li 
                key={subject.id} 
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 gap-4"
                onTouchStart={() => handleTouchStart(subject.id, subject.name, subject.category)}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchEnd}
                onMouseDown={() => handleTouchStart(subject.id, subject.name, subject.category)}
                onMouseUp={handleTouchEnd}
                onMouseLeave={handleTouchEnd}
              >
                {editingId === subject.id ? (
                  <div 
                    className="flex-1 flex flex-col sm:flex-row gap-2 w-full" 
                    onClick={e => e.stopPropagation()}
                    onTouchStart={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <input 
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit(subject.id)}
                      className="flex-1 border border-blue-300 rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="border border-blue-300 rounded px-3 py-1.5 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CS">CS Subject</option>
                      <option value="General">General Subject</option>
                    </select>
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => handleRenameSubmit(subject.id)}
                        className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
                        title="Save"
                      >
                        <Save size={18} />
                      </button>
                      <button 
                        onClick={() => setEditingId(null)}
                        className="bg-gray-200 text-gray-700 p-2 rounded hover:bg-gray-300"
                        title="Cancel"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 cursor-pointer sm:cursor-default w-full sm:w-auto overflow-hidden">
                      <Folder className={subject.category === 'General' ? "text-purple-500 shrink-0" : "text-blue-500 shrink-0"} size={20} />
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-800 truncate block">{subject.name}</span>
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 mr-2 border font-medium ${
                            subject.category === 'General'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {subject.category === 'General' ? 'General' : 'CS'}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full inline-block mt-1">
                            {subject.questions?.[0]?.count || 0} questions
                          </span>
                        </div>
                      </div>
                    </div>
                    <div 
                      className="flex items-center gap-1 justify-end shrink-0" 
                      onClick={e => e.stopPropagation()}
                      onTouchStart={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleEditClick(subject.id, subject.name, subject.category)}
                        className="text-blue-500 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50"
                        title="Rename / Recategorize Subject"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                        title="Delete Subject"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50 shrink-0">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                <GitMerge size={20} className="text-blue-600" /> Merge Subjects
              </h3>
              <button onClick={() => setShowMergeModal(false)} className="text-gray-500 hover:bg-gray-200 p-1 rounded">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-gray-600 mb-4 text-sm">
                Select the subjects you want to combine into one. All questions and subtopics will be migrated safely.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Subjects to Merge:</label>
                <div className="border border-gray-200 rounded-md max-h-48 overflow-y-auto bg-gray-50">
                  {subjects.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No subjects available.</div>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {subjects.map((s) => (
                        <li 
                          key={s.id}
                          onClick={() => toggleMergeSelection(s.id)}
                          className="p-3 flex items-center justify-between hover:bg-gray-100 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {selectedForMerge.includes(s.id) ? (
                              <CheckSquare size={18} className="text-blue-600 shrink-0" />
                            ) : (
                              <Square size={18} className="text-gray-400 shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-800 truncate">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                              s.category === 'General'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {s.category === 'General' ? 'General' : 'CS'}
                            </span>
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                              {s.questions?.[0]?.count || 0} qs
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Merged Subject Name:</label>
                <input 
                  type="text"
                  value={mergeName}
                  onChange={(e) => setMergeName(e.target.value)}
                  placeholder="e.g., General Studies"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-400 mt-1 block">
                  You can type an existing subject's name to merge into it, or type a new name.
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMergeModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={merging || selectedForMerge.length < 2 || !mergeName.trim()}
                  onClick={handleMergeSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {merging ? "Merging..." : "Confirm & Merge"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SubjectsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <SubjectsContent />
    </Suspense>
  );
}
