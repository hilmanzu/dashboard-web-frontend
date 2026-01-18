'use client';

import { useState, useEffect, useRef } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Image from 'next/image';
import { User } from '@/types/user';

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'account'>('info');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  // Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [previewProfile, setPreviewProfile] = useState<string | null>(null);
  const [previewSignature, setPreviewSignature] = useState<string | null>(null);

  // Password Form States
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/');
          return;
        }

        const response = await axios.post('/api/auth/me', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const userData = response.data;
        setUser(userData);
        
        // Initialize form fields
        setFirstName(userData.first_name || '');
        setLastName(userData.last_name || '');
        // Note: userInfo might be missing if API doesn't return it
        setPhoneNumber(userData.userInfo?.phone_number || '');
        setAddress(userData.userInfo?.address || '');
        
        if (userData.profile_picture) {
          setPreviewProfile(`/storage/profile/${userData.profile_picture}`);
        }
        if (userData.signature) {
          setPreviewSignature(`/storage/signature/${userData.signature}`);
        }

      } catch (error) {
        console.error('Error fetching user:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('phone_number', phoneNumber);
      formData.append('address', address);
      
      if (profilePicture) {
        formData.append('profile_picture', profilePicture);
      }
      if (signature) {
        formData.append('signature', signature);
      }

      const response = await axios.post('/api/account/update-profile', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setUser(response.data.user);
      setMessage({ text: 'Profile updated successfully.', type: 'success' });
      
      // Update local storage user data if needed
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
    } catch (error) {
      console.error('Update error:', error);
      const axiosError = error as AxiosError<{ message: string }>;
      setMessage({ 
        text: axiosError.response?.data?.message || 'Failed to update profile.', 
        type: 'error' 
      });
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'New password confirmation does not match.', type: 'error' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/account/change-password', {
        old_password: oldPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage({ text: 'Password changed successfully.', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      const axiosError = error as AxiosError<{ message: string, errors?: any }>;
      setMessage({ 
        text: axiosError.response?.data?.message || 'Failed to change password.', 
        type: 'error' 
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'signature') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'profile') {
        setProfilePicture(file);
        setPreviewProfile(URL.createObjectURL(file));
      } else {
        setSignature(file);
        setPreviewSignature(URL.createObjectURL(file));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CFE8]"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-[#6E6B7B]">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-8">
          <div className="bg-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h5 className="text-lg font-medium text-[#5E5873]">Pengaturan Akun</h5>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex justify-center -mb-px" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'info'
                      ? 'border-[#00CFE8] text-[#00CFE8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Informasi Pengguna
                </button>
                <button
                  onClick={() => setActiveTab('account')}
                  className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'account'
                      ? 'border-[#00CFE8] text-[#00CFE8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Informasi Akun
                </button>
              </nav>
            </div>

            <div className="p-6">
              {message && (
                <div className={`mb-6 p-4 rounded-md ${
                  message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message.text}
                </div>
              )}

              {activeTab === 'info' ? (
                <form onSubmit={handleProfileUpdate}>
                  <div className="flex flex-col items-center mb-8">
                    <div className="relative w-32 h-32 mb-4">
                      <Image
                        src={previewProfile || '/images/user-placeholder.png'}
                        alt="Profile"
                        fill
                        className="rounded-full object-cover border-4 border-white shadow-lg cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-[#00CFE8] hover:underline font-medium"
                    >
                      Ubah Foto
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'profile')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Nama Depan</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Nama Belakang</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Nomor Telepon</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Tipe Pengguna</label>
                      <input
                        type="text"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                        value={user?.userInfo?.type === 1 ? 'Internal' : user?.userInfo?.type === 2 ? 'External' : '-'}
                      />
                    </div>
                    <div className="col-span-full">
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Alamat</label>
                      <textarea
                        required
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                    
                    {user?.userInfo?.type !== 2 && (
                      <div>
                        <label className="block text-sm font-medium text-[#5E5873] mb-1">Tandatangan</label>
                        <div className="mt-1 flex items-center">
                           {previewSignature ? (
                            <div className="relative w-32 h-20 mr-4 border border-gray-200 rounded">
                              <Image
                                src={previewSignature}
                                alt="Signature"
                                fill
                                className="object-contain"
                              />
                            </div>
                           ) : (
                             <div className="w-32 h-20 mr-4 border border-gray-200 rounded bg-gray-50 flex items-center justify-center text-xs text-gray-400">
                               No Signature
                             </div>
                           )}
                           <input
                            ref={signatureInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png"
                            className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#00CFE8]/10 file:text-[#00CFE8] hover:file:bg-[#00CFE8]/20"
                            onChange={(e) => handleFileChange(e, 'signature')}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#00CFE8] text-white rounded-md hover:bg-[#00b8cf] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00CFE8] transition-colors"
                    >
                      Simpan
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePasswordChange}>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Email Pengguna</label>
                      <input
                        type="email"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                        value={user?.email || ''}
                      />
                    </div>
                    <div className="col-span-full border-t border-gray-200 pt-6 mt-2">
                       <h3 className="text-lg font-medium text-[#5E5873] mb-4">Ubah Password</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Password Lama</label>
                      <input
                        type="password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                      />
                    </div>
                     <div className="hidden md:block"></div>
                    <div>
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Password Baru</label>
                      <input
                        type="password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#5E5873] mb-1">Konfirmasi Password</label>
                      <input
                        type="password"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#00CFE8]"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                   <div className="mt-8 flex justify-end">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-[#00CFE8] text-white rounded-md hover:bg-[#00b8cf] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00CFE8] transition-colors"
                    >
                      Ubah Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
