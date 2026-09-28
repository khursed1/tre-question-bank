"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BookOpen, Upload, Folder, Star, Menu, X, Library, LogOut } from "lucide-react";
import { logout } from "@/app/actions";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || 'CS';

  const closeSidebar = () => setSidebarOpen(false);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-4 print:hidden">
        <h1 className="text-xl font-bold flex items-center gap-2 text-gray-900">
          <BookOpen className="text-blue-600" /> Question Bank
        </h1>
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden"
          onClick={closeSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 ease-in-out print:hidden flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2 text-gray-900">
            <BookOpen className="text-blue-600" /> Question Bank
          </h1>
          <button onClick={closeSidebar} className="md:hidden text-gray-500 hover:text-gray-900">
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-2">
          <Link onClick={closeSidebar} href="/" className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 ${pathname === '/' && category !== 'General' ? 'bg-gray-100 font-medium' : ''}`}>
            <BookOpen size={18} /> CS Subjects
          </Link>
          <Link onClick={closeSidebar} href="/?category=General" className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 ${pathname === '/' && category === 'General' ? 'bg-gray-100 font-medium' : ''}`}>
            <Library size={18} /> General Subjects
          </Link>
          <Link onClick={closeSidebar} href="/subjects" className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 ${pathname === '/subjects' ? 'bg-gray-100 font-medium' : ''}`}>
            <Folder size={18} /> Manage Subjects
          </Link>
          <Link onClick={closeSidebar} href="/important" className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 ${pathname === '/important' ? 'bg-gray-100 font-medium' : ''}`}>
            <Star size={18} /> Important
          </Link>
          <Link onClick={closeSidebar} href="/import" className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700 ${pathname === '/import' ? 'bg-gray-100 font-medium' : ''}`}>
            <Upload size={18} /> Import JSON
          </Link>
        </nav>
        
        <div className="p-4 border-t border-gray-200 mt-auto">
          <form action={logout}>
            <button type="submit" className="flex items-center gap-3 px-3 py-2 w-full rounded-md hover:bg-red-50 text-red-600 font-medium transition-colors">
              <LogOut size={18} /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full md:ml-64 mt-16 md:mt-0 p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
