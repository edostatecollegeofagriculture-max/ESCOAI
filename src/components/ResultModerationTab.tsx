import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CheckCircle, XCircle, RefreshCw, BookOpen } from 'lucide-react';

export const ResultModerationTab: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.request('/results');
      if (res.success) {
        const pending = (res.results || []).filter((r: any) => 
          r.status === 'PENDING' || r.status === 'SUBMITTED'
        );
        setResults(pending);
      }
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePublish = async (id: string) => {
    if (!confirm('Publish this result? It will become visible to the student.')) return;
    setMessage('');
    try {
      const res = await api.request(`/results/${id}/publish`, { method: 'PATCH' });
      if (res.success) {
        setMessage('Result published successfully!');
        loadData();
      } else {
        throw new Error(res.message || 'Publish failed');
      }
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('Reject this result?')) return;
    setMessage('');
    try {
      const res = await api.request(`/results/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'REJECTED' }),
      });
      if (res.success) {
        setMessage('Result rejected.');
        loadData();
      } else {
        throw new Error(res.message || 'Reject failed');
      }
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" /> Result Moderation
          </h2>
          <p className="text-sm text-slate-500">Publish pending results so students can view them.</p>
        </div>
        <button onClick={loadData} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {message}
        </div>
      )}

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="p-3">Course</th>
              <th className="p-3">Student</th>
              <th className="p-3">CA</th>
              <th className="p-3">Exam</th>
              <th className="p-3">Total</th>
              <th className="p-3">Grade</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {results.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-3 font-semibold text-emerald-700">{r.courseCode || r.courseId?.slice(0, 8)}</td>
                <td className="p-3 text-xs">{r.studentId?.slice(0, 8)}...</td>
                <td className="p-3">{r.caScore}</td>
                <td className="p-3">{r.examScore}</td>
                <td className="p-3 font-bold">{r.total || r.totalScore}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    (r.total || r.totalScore) >= 50 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {r.grade}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handlePublish(r.id)} 
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded flex items-center gap-1"
                    >
                      <CheckCircle className="w-3 h-3" /> Publish
                    </button>
                    <button 
                      onClick={() => handleReject(r.id)} 
                      className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">No pending results to moderate.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
