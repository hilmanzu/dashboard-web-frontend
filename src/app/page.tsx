'use client';

import Image from 'next/image';
import { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use the proxy configured in next.config.ts
      const response = await axios.post('/api/auth/login', {
        email,
        password,
      });

      // Store token and redirect
      // Assuming response.data contains access_token
      const { access_token, user } = response.data;
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      // Redirect to survey or dashboard
      // The user mentioned "survey", checking api routes...
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      const axiosError = err as AxiosError<{ message: string }>;
      setError(axiosError.response?.data?.message || 'Invalid login credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full h-screen bg-white text-gray-800">
      {/* Left Side - Image */}
      <div className="hidden md:flex md:w-[60%] p-4 h-full">
        <div className="relative w-full h-full">
          <Image
            src="/images/login.png"
            alt="Login Visual"
            fill
            className="object-cover rounded-[20px]"
            priority
          />
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-[40%] flex justify-center items-center">
        <div className="w-full max-w-md px-8 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-8">
            <Image
              src="/images/Logo.jpg"
              alt="PGN Logo"
              width={171}
              height={48}
              className="h-12 w-auto"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-[26px] font-medium text-[#4B465C] leading-tight">
              Login Dashboard
              <br />
              PGN-LNG
            </h1>
            {error && (
              <div className="mt-2 text-red-500 font-bold text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-[#4B465C]">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00CFE8] focus:border-transparent"
                placeholder="Masukkan email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-[#4B465C]">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00CFE8] focus:border-transparent"
                  placeholder="············"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00CFE8] text-white font-bold text-base py-3 rounded hover:bg-[#00b8cf] transition-colors disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <div className="text-center mt-8">
              <a href="/forget-password" className="text-[#003D80] font-bold underline text-sm hover:text-[#002d60]">
                Lupa Password?
              </a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
