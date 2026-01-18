'use client';

import { useState, useEffect } from 'react';
import { LogOut, User as UserIcon, Bell, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Image from 'next/image';

export default function Header() {
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('External');
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Try to get user info from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserName(user.first_name ? `${user.first_name} ${user.last_name || ''}` : user.name || 'User');
        setUserRole(user.userInfo?.type === 1 ? 'Internal' : 'External');
        if (user.profile_picture) {
            setProfilePic(`/storage/profile/${user.profile_picture}`);
        }
      } catch (e) {
        console.error('Failed to parse user data', e);
      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await axios.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  };

  return (
    <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10">
      <div className="flex items-center">
        {/* Left side of header (breadcrumbs or title could go here) */}
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-500 hover:text-[#00CFE8] transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center space-x-3 focus:outline-none"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-semibold text-gray-700">{userName}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-transparent hover:border-[#00CFE8] transition-colors relative">
               {profilePic ? (
                  <Image 
                    src={profilePic} 
                    alt="Profile" 
                    fill 
                    className="object-cover"
                  />
               ) : (
                  <UserIcon className="w-6 h-6 text-gray-500" />
               )}
            </div>
            <div className="relative">
               <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
            </div>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
              <div 
                className="px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex items-center"
                onClick={() => {
                    router.push('/account');
                    setIsDropdownOpen(false);
                }}
              >
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-3 relative">
                    {profilePic ? (
                        <Image 
                            src={profilePic} 
                            alt="Profile" 
                            fill 
                            className="object-cover"
                        />
                    ) : (
                        <UserIcon className="w-6 h-6 text-gray-500" />
                    )}
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white"></div>
                </div>
                <div>
                    <p className="text-sm font-semibold text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500">{userRole}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
