'use client';

import { useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface SurveyCustomerDetail {
  id: number;
  survey_id: number;
  order: number;
  type: number;
  text: string;
  placeholder?: string;
  is_prefilled?: boolean;
}

interface SurveyQuestionList {
  id: number;
  survey_question_detail_id: number;
  order: number;
  text: string;
  type: number;
}

interface SurveyQuestionDetail {
  id: number;
  survey_question_id: number;
  name: string;
  order: number;
  survey_question_list: SurveyQuestionList[];
}

interface SurveyQuestion {
  id: number;
  survey_id: number;
  name: string;
  order: number;
  survey_question_detail: SurveyQuestionDetail[];
}

interface SurveyDetail {
  id: number;
  name: string;
  description: string;
  status: string;
  survey_customer_detail: SurveyCustomerDetail[];
  survey_question: SurveyQuestion[];
}

interface SurveyDetailResponse {
  survey: SurveyDetail;
  semester: number;
  year: number;
  already_filled: boolean;
  survey_response_id: number | null;
}

export default function SurveyFormPage() {
  const router = useRouter();
  const params = useParams();
  const surveyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyDetailResponse | null>(null);
  const [customerDetailValues, setCustomerDetailValues] = useState<Record<number, string>>({});
  const [questionListValues, setQuestionListValues] = useState<Record<number, string>>({});
  const [signatureType, setSignatureType] = useState<'1' | '2'>('1');
  const [accessorName, setAccessorName] = useState('');
  const [accessorDuty, setAccessorDuty] = useState('');
  const [notes, setNotes] = useState('');
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [signatureDocument, setSignatureDocument] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    const fetchSurveyDetail = async () => {
      try {
        const response = await axios.get<SurveyDetailResponse>(
          `/api/survey/response-answer/${surveyId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        setSurveyData(response.data);

        if (response.data.already_filled) {
          alert('Survey ini sudah pernah diisi.');
          router.push('/survey');
          return;
        }

        // Initialize customer detail values with prefilled data
        const initialCustomerValues: Record<number, string> = {};
        response.data.survey.survey_customer_detail.forEach(detail => {
          if (detail.is_prefilled) {
            initialCustomerValues[detail.id] = `Semester ${response.data.semester} - ${response.data.year}`;
          }
        });
        setCustomerDetailValues(initialCustomerValues);

        // Initialize question list values with no default selection
        const initialQuestionValues: Record<number, string> = {};
        response.data.survey.survey_question.forEach(question => {
          question.survey_question_detail.forEach(detail => {
            detail.survey_question_list.forEach(list => {
              initialQuestionValues[list.id] = '';
            });
          });
        });
        setQuestionListValues(initialQuestionValues);

      } catch (error) {
        console.error('Error fetching survey:', error);
        const axiosError = error as AxiosError<{ message: string }>;
        if (axiosError.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/');
        } else if (axiosError.response?.status === 404) {
          alert(axiosError.response.data?.message || 'Survey period is not active');
          console.log(axiosError.response.data);
          router.push('/survey');
        } else {
          alert('Gagal memuat survey. Silakan coba lagi.');
          router.push('/survey');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSurveyDetail();
  }, [surveyId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!surveyData) return;

    // Validation
    const missingCustomerDetails = surveyData.survey.survey_customer_detail.filter(
      detail => !customerDetailValues[detail.id]
    );
    if (missingCustomerDetails.length > 0) {
      alert('Mohon lengkapi semua data pelanggan.');
      return;
    }

    if (!accessorName || !accessorDuty) {
      alert('Mohon lengkapi nama dan jabatan penandatangan.');
      return;
    }

    if (signatureType === '1' && !signatureImage) {
      alert('Mohon upload tanda tangan digital.');
      return;
    }

    if (signatureType === '2' && !signatureDocument) {
      alert('Mohon upload dokumen tanda tangan.');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/');
        return;
      }

      const formData = new FormData();

      // Customer details
      surveyData.survey.survey_customer_detail.forEach(detail => {
        formData.append(
          `response_customer_detail[${detail.id}][survey_customer_detail_id]`,
          detail.id.toString()
        );
        formData.append(
          `response_customer_detail[${detail.id}][value]`,
          customerDetailValues[detail.id] || ''
        );
      });

      // Question responses
      surveyData.survey.survey_question.forEach(question => {
        question.survey_question_detail.forEach(detail => {
          detail.survey_question_list.forEach(list => {
            formData.append(
              `response_question_list[${list.id}][survey_question_list_id]`,
              list.id.toString()
            );
            formData.append(
              `response_question_list[${list.id}][value]`,
              questionListValues[list.id] || '1'
            );
          });
        });
      });

      // Confirmation data
      formData.append('signature_type', signatureType);
      formData.append('accessor_name', accessorName);
      formData.append('accessor_duty', accessorDuty);
      if (notes) {
        formData.append('notes', notes);
      }

      if (signatureType === '1' && signatureImage) {
        formData.append('signature_image', signatureImage);
      } else if (signatureType === '2' && signatureDocument) {
        formData.append('signature_document', signatureDocument);
      }

      await axios.post(
        `/api/survey/response-answer/${surveyId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setSubmitting(false);
      alert('Survey berhasil dikirim!');
      router.push('/survey');

    } catch (error) {
      console.error('Error submitting survey:', error);
      const axiosError = error as AxiosError<{ message: string; errors?: any }>;
      if (axiosError.response?.status === 422) {
        const errors = axiosError.response.data.errors;
        if (errors) {
          const errorMessages = Object.values(errors).flat().join('\n');
          alert(`Validasi gagal:\n${errorMessages}`);
        } else {
          alert('Data tidak valid. Mohon periksa kembali.');
        }
      } else if (axiosError.response?.status === 403) {
        alert(axiosError.response.data?.message || 'Survey period is closed.');
      } else {
        alert('Gagal mengirim survey. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00CFE8]"></div>
      </div>
    );
  }

  if (!surveyData) {
    return null;
  }

  const totalSteps = 2; // Customer data + Questions + Confirmation
  const ratingLabels = ['Unsatisfied', 'Less Satisfied', 'Quite Satisfied', 'Satisfied', 'Very Satisfied'];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-6 bg-[#F8F8F8]">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-medium text-gray-900">
                  Isi Survey - {surveyData.survey.name}
                </h1>
                <button
                  onClick={() => router.push('/survey')}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress */}
              <div className="flex gap-2">
                {[...Array(totalSteps)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i < currentStep ? 'bg-[#00CFE8]' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {/* Customer Data */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">A. Customer Data</h2>
                <hr className="mb-6" />

                <div className="space-y-4">
                  {surveyData.survey.survey_customer_detail
                    .sort((a, b) => a.order - b.order)
                    .map((detail) => (
                      <div key={detail.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {detail.text} <span className="text-red-500">*</span>
                        </label>
                        {detail.type === 1 && (
                          <input
                            type="text"
                            value={customerDetailValues[detail.id] || ''}
                            onChange={(e) =>
                              setCustomerDetailValues({
                                ...customerDetailValues,
                                [detail.id]: e.target.value
                              })
                            }
                            placeholder={detail.placeholder}
                            readOnly={detail.is_prefilled}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00CFE8] ${
                              detail.is_prefilled ? 'bg-gray-100 cursor-not-allowed' : ''
                            }`}
                            required
                          />
                        )}
                        {detail.type === 2 && (
                          <textarea
                            value={customerDetailValues[detail.id] || ''}
                            onChange={(e) =>
                              setCustomerDetailValues({
                                ...customerDetailValues,
                                [detail.id]: e.target.value
                              })
                            }
                            placeholder={detail.placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
                            rows={3}
                            required
                          />
                        )}
                        {detail.type === 4 && (
                          <input
                            type="date"
                            value={customerDetailValues[detail.id] || ''}
                            onChange={(e) =>
                              setCustomerDetailValues({
                                ...customerDetailValues,
                                [detail.id]: e.target.value
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
                            required
                          />
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Questions */}
              {surveyData.survey.survey_question
                .sort((a, b) => a.order - b.order)
                .map((question) => (
                  <div key={question.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">{question.name}</h2>
                    <hr className="mb-6" />

                    <div className="space-y-6">
                      {question.survey_question_detail
                        .sort((a, b) => a.order - b.order)
                        .map((detail) => (
                          <div key={detail.id}>
                            <div className="bg-gray-100 rounded-md p-3 mb-4">
                              <p className="text-sm font-medium text-gray-700">{detail.name}</p>
                            </div>

                            {detail.survey_question_list
                              .sort((a, b) => a.order - b.order)
                              .map((list) => (
                                <div key={list.id} className="mb-6">
                                  <label className="block text-sm font-medium text-gray-700 mb-3">
                                    {list.text} <span className="text-red-500">*</span>
                                  </label>

                                  <div className="grid grid-cols-5 gap-3">
                                    {ratingLabels.map((label, index) => {
                                      const value = (index + 1).toString();
                                      return (
                                        <div
                                          key={index}
                                          onClick={() =>
                                            setQuestionListValues({
                                              ...questionListValues,
                                              [list.id]: value
                                            })
                                          }
                                          className={`cursor-pointer border-2 rounded-lg p-4 text-center transition-all ${
                                            questionListValues[list.id] === value
                                              ? 'border-[#00CFE8] bg-[#00CFE8]/10'
                                              : 'border-gray-300 hover:border-gray-400'
                                          }`}
                                        >
                                          <div className="text-2xl font-bold text-gray-900 mb-1">
                                            {index + 1}
                                          </div>
                                          <div className="text-xs text-gray-600">({label})</div>
                                          <input
                                            type="radio"
                                            name={`question_${list.id}`}
                                            value={value}
                                            checked={questionListValues[list.id] === value}
                                            onChange={() =>
                                              setQuestionListValues({
                                                ...questionListValues,
                                                [list.id]: value
                                              })
                                            }
                                            className="mt-2"
                                            required
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}

              {/* Confirmation */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Konfirmasi</h2>
                <hr className="mb-6" />

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Penandatangan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={accessorName}
                      onChange={(e) => setAccessorName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Jabatan Penandatangan <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={accessorDuty}
                      onChange={(e) => setAccessorDuty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Catatan (Opsional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipe Tanda Tangan <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="1"
                          checked={signatureType === '1'}
                          onChange={(e) => setSignatureType(e.target.value as '1' | '2')}
                          className="mr-2"
                        />
                        Digital (Upload Gambar)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="2"
                          checked={signatureType === '2'}
                          onChange={(e) => setSignatureType(e.target.value as '1' | '2')}
                          className="mr-2"
                        />
                        Dokumen (Upload PDF/DOC)
                      </label>
                    </div>
                  </div>

                  {signatureType === '1' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Tanda Tangan Digital <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSignatureImage(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Max 10MB</p>
                    </div>
                  )}

                  {signatureType === '2' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Dokumen Tanda Tangan <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => setSignatureDocument(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00CFE8]"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">PDF, DOC, DOCX, JPG, PNG - Max 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => router.push('/survey')}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#00CFE8] text-white rounded-md hover:bg-[#00b8cf] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      Kirim Survey
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
