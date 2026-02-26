'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ClipboardList } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'DASHBOARD',
      items: [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ]
    },
    {
      label: 'SURVEY & PELAPORAN',
      items: [
        { href: '/survey', label: 'Survey Kepuasan', icon: ClipboardList },
      ]
    }
  ];

  return (
    <div className="w-64 bg-[#283046] min-h-screen flex flex-col shadow-lg transition-all duration-300">
      <div className="h-16 flex items-center justify-center px-4 bg-[#283046] border-b border-gray-700">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Image
            src="/images/logo.png"
            alt="PGN Logo"
            width={120}
            height={40}
            className="object-contain"
          />
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-4">
        {menuItems.map((section) => (
          <div key={section.label}>
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {section.label}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-md transition-all group mb-1 ${isActive
                      ? 'text-white bg-gradient-to-r from-[#00CFE8] to-[#00b8cf] shadow-md'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
