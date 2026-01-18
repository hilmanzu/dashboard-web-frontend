'use client';

import { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { Survey, SurveyResponse } from '@/types/survey';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function SurveyPage() {
  const [newSurveys, setNewSurveys] = useState<Survey[]>([]);
  const [filledSurveys, setFilledSurveys] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'new' | 'filled'>('new');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` }
        };

        const [newRes, filledRes] = await Promise.allSettled([
          axios.get('/api/survey/response', config),
          axios.get('/api/survey/filled', config)
        ]);

        if (newRes.status === 'fulfilled') {
          setNewSurveys(newRes.value.data.data);
        }
        if (filledRes.status === 'fulfilled') {
          setFilledSurveys(filledRes.value.data.data);
        }

      } catch (error) {
        console.error('Error fetching surveys:', error);
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleDownload = async (id: number, surveyName: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`/api/survey/response-download/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob', // Important for PDF download
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${surveyName.replace(/\s+/g, '_')}_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert('Gagal mengunduh survey. Pastikan backend sudah mendukung fitur ini.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus survey ini?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`/api/survey/response-delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from state
      setFilledSurveys(filledSurveys.filter(s => s.id !== id));
      alert('Survey berhasil dihapus.');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Gagal menghapus survey. Pastikan backend sudah mendukung fitur ini.');
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
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 bg-[#F8F8F8]">
          <div className="mb-6">
            <h1 className="text-xl font-medium text-gray-600">Survey Kepuasan Pelanggan</h1>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex px-6">
                <button
                  onClick={() => setActiveTab('new')}
                  className={`${
                    activeTab === 'new'
                      ? 'border-[#00CFE8] text-[#00CFE8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors mr-4`}
                >
                  Survey Baru
                </button>
                <button
                  onClick={() => setActiveTab('filled')}
                  className={`${
                    activeTab === 'filled'
                      ? 'border-[#00CFE8] text-[#00CFE8]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm transition-colors`}
                >
                  Survey Terisi
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'new' ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {newSurveys.length > 0 ? (
                    newSurveys.map((survey) => (
                      <div key={survey.id} className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="px-4 py-5 sm:p-6">
                          <div className="flex items-center justify-between mb-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {survey.semester} {survey.year}
                            </span>
                          </div>
                          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                            {survey.name}
                          </h3>
                          <p className="text-sm text-gray-500 mb-4 line-clamp-3">
                            {survey.description}
                          </p>
                          <button 
                            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#00CFE8] hover:bg-[#00b8cf] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00CFE8] transition-colors shadow-sm"
                            onClick={() => alert('Survey detail not implemented in this demo')}
                          >
                            Isi Survey
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak ada survey baru</h3>
                      <p className="mt-1 text-sm text-gray-500">Saat ini tidak ada periode survey yang aktif.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden">
                  {filledSurveys.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              No
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kategori
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Waktu Pengisian
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Periode
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tahun
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tindakan
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filledSurveys.map((response, index) => (
                            <tr key={response.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {index + 1}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-[#00CFE8]">{response.survey_name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{new Date(response.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">Semester {response.semester}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{response.year}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <div className="flex justify-center space-x-2">
                                  <button
                                    onClick={() => handleDownload(response.id, response.survey_name)}
                                    className="text-gray-500 hover:text-[#00CFE8] transition-colors"
                                    title="Download PDF"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDelete(response.id)}
                                    className="text-gray-500 hover:text-red-600 transition-colors"
                                    title="Hapus"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                       <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Belum ada survey terisi</h3>
                      <p className="mt-1 text-sm text-gray-500">Anda belum mengisi survey apapun.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
