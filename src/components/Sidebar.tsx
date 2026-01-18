'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="w-64 bg-[#283046] min-h-screen flex flex-col shadow-lg transition-all duration-300">
      <div className="h-16 flex items-center justify-center px-4 bg-[#283046] border-b border-gray-700">
        <Link href="/survey" className="flex items-center space-x-2">
          <Image 
            src="/images/logo.png" 
            alt="PGN Logo" 
            width={120} 
            height={40} 
            className="object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          SURVEY & PELAPORAN
        </div>
        <Link 
          href="/survey" 
          className="flex items-center px-4 py-3 text-white bg-gradient-to-r from-[#00CFE8] to-[#00b8cf] rounded-md shadow-md transition-all group"
        >
          <LayoutDashboard className="w-5 h-5 mr-3" />
          <span className="font-medium">Survey Kepuasan</span>
        </Link>
      </nav>
    </div>
  );
}
