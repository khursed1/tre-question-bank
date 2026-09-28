"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Save, X, ImagePlus, Loader2, Trash2 } from "lucide-react";
import MarkdownTextarea from "@/components/MarkdownTextarea";

export default function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const questionId = unwrappedParams.id;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subtopics, setSubtopics] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    subject_id: "",
    subtopic_id: "",
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    option_e: "",
    answer: "",
    explanation: "",
    exam: "",
    year: "",
    image_url: "",
    option_a_image_url: "",
    option_b_image_url: "",
    option_c_image_url: "",
    option_d_image_url: "",
    option_e_image_url: "",
  });

  useEffect(() => {
    fetchData();
  }, [questionId]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch subjects
    const { data: subjs } = await supabase.from("subjects").select("*").order("name");
    if (subjs) setSubjects(subjs);

    // Fetch question
    const { data: q } = await supabase.from("questions").select("*").eq("id", questionId).single();
    if (q) {
      setFormData({
        subject_id: q.subject_id || "",
        subtopic_id: q.subtopic_id || "",
        question_text: q.question_text || "",
        option_a: q.option_a || "",
        option_b: q.option_b || "",
        option_c: q.option_c || "",
        option_d: q.option_d || "",
        option_e: q.option_e || "",
        answer: q.answer || "",
        explanation: q.explanation || "",
        exam: q.exam || "",
        year: q.year || "",
        image_url: q.image_url || "",
        option_a_image_url: q.option_a_image_url || "",
        option_b_image_url: q.option_b_image_url || "",
        option_c_image_url: q.option_c_image_url || "",
        option_d_image_url: q.option_d_image_url || "",
        option_e_image_url: q.option_e_image_url || "",
      });

      // Fetch subtopics for this subject
      if (q.subject_id) {
        const { data: subs } = await supabase.from("subtopics").select("*").eq("subject_id", q.subject_id).order("name");
        if (subs) setSubtopics(subs);
      }
    }
    
    setLoading(false);
  };

  const handleSubjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subjId = e.target.value;
    setFormData({ ...formData, subject_id: subjId, subtopic_id: "" });
    
    if (subjId) {
      const { data: subs } = await supabase.from("subtopics").select("*").eq("subject_id", subjId).order("name");
      setSubtopics(subs || []);
    } else {
      setSubtopics([]);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingField(field);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${questionId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('question_images')
      .upload(filePath, file);

    if (uploadError) {
      alert("Error uploading image: " + uploadError.message);
      setUploadingField(null);
      return;
    }

    const { data } = supabase.storage.from('question_images').getPublicUrl(filePath);
    
    setFormData(prev => ({ ...prev, [field]: data.publicUrl }));
    setUploadingField(null);
  };

  const removeImage = (field: string) => {
    setFormData(prev => ({ ...prev, [field]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const updateData = {
      ...formData,
      subtopic_id: formData.subtopic_id || null,
      year: formData.year ? parseInt(formData.year as string) : null,
    };

    const { error } = await supabase.from("questions").update(updateData).eq("id", questionId);
    
    setSaving(false);
    
    if (!error) {
      sessionStorage.clear(); // Clear cache so new edits show up instantly
      router.refresh(); // Clear Next.js router cache
      router.push(`/subjects/${formData.subject_id}?highlight=${questionId}`);
    } else {
      alert("Error saving question: " + error.message);
    }
  };

  const renderImageUpload = (field: string, label: string) => {
    const isUploading = uploadingField === field;
    const currentUrl = formData[field as keyof typeof formData] as string;

    return (
      <div className="mt-2">
        {currentUrl ? (
          <div className="relative inline-block border border-gray-200 rounded p-1">
            <img src={currentUrl} alt={label} className="max-h-32 object-contain rounded" />
            <button 
              type="button" 
              onClick={() => removeImage(field)}
              className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-sm"
              title="Remove image"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, field)}
              className="hidden" 
              id={`upload-${field}`}
              disabled={isUploading}
            />
            <label 
              htmlFor={`upload-${field}`} 
              className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50 ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              {isUploading ? "Uploading..." : `Add Image to ${label}`}
            </label>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="p-8">Loading question data...</div>;

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2">
            <X size={18} /> Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
            <Save size={18} /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <select required value={formData.subject_id} onChange={handleSubjectChange} className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select Subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtopic</label>
              <select value={formData.subtopic_id} onChange={e => setFormData({...formData, subtopic_id: e.target.value})} className="w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None</option>
                {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">Question</label>
            <MarkdownTextarea required rows={4} value={formData.question_text} onChange={val => setFormData({...formData, question_text: val})} />
            {renderImageUpload("image_url", "Question")}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Options (Leave C & D blank for True/False)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Option A</label>
                <MarkdownTextarea rows={2} value={formData.option_a} onChange={val => setFormData({...formData, option_a: val})} className="mb-2" placeholder="Markdown supported" />
                {renderImageUpload("option_a_image_url", "Option A")}
              </div>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Option B</label>
                <MarkdownTextarea rows={2} value={formData.option_b} onChange={val => setFormData({...formData, option_b: val})} className="mb-2" placeholder="Markdown supported" />
                {renderImageUpload("option_b_image_url", "Option B")}
              </div>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Option C</label>
                <MarkdownTextarea rows={2} value={formData.option_c} onChange={val => setFormData({...formData, option_c: val})} className="mb-2" placeholder="Leave empty if not applicable" />
                {renderImageUpload("option_c_image_url", "Option C")}
              </div>
              <div className="bg-gray-50 p-4 rounded border border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Option D</label>
                <MarkdownTextarea rows={2} value={formData.option_d} onChange={val => setFormData({...formData, option_d: val})} className="mb-2" placeholder="Leave empty if not applicable" />
                {renderImageUpload("option_d_image_url", "Option D")}
              </div>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Option E</label>
                <MarkdownTextarea rows={2} value={formData.option_e} onChange={val => setFormData({...formData, option_e: val})} className="mb-2" placeholder="Leave empty if not applicable" />
                {renderImageUpload("option_e_image_url", "Option E")}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Answer</label>
              <MarkdownTextarea rows={2} placeholder="e.g. A, B, or exact text. Markdown supported." value={formData.answer} onChange={val => setFormData({...formData, answer: val})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Exam & Year</label>
              <div className="flex gap-2">
                <input type="text" placeholder="Exam (e.g. GATE)" value={formData.exam} onChange={e => setFormData({...formData, exam: e.target.value})} className="flex-1 border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="number" placeholder="Year" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-24 border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Explanation</label>
            <MarkdownTextarea rows={3} value={formData.explanation} onChange={val => setFormData({...formData, explanation: val})} />
          </div>
        </form>
      </div>
    </div>
  );
}
