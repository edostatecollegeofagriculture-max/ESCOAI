import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';

export const RegistrationApprovalTab: React.FC = () => {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [regRes, crsRes, stdRes] = await Promise.all([
        api.request('/registrations', { method: 'GET' }), // Get all registrations
        api.getCourses(),
        api.request('/users', { method: 'GET' }) // Get students
      ]);
      
      if (regRes.success) setRegistrations(regRes.registrations || []);
      if (crsRes.success) setCourses(crsRes.courses || []);
      if (stdRes.success) setStudents(stdRes.users || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to mark this registration as ${status}?`)) return;
    setMessage('');
    try {
      const res = await api.request(`/registrations/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      if (res.success) {
        setMessage(`Registration ${status.toLowerCase()} successfully!`);
        loadData();
      } else {
        throw new Error(res.message || 'Action failed');
      }
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    }
  };

  const getStudentName = (studentId: string) => {
    const s = students.find(x => x.id === studentId);
    if (s) return s.fullName;
    // Fallback: look in registration payload
    const reg = registrations.find(r => r.studentId === studentId);
    return reg?.studentName || reg?.matricNumber || 'Unknown Student';
  };

  const getCourseDetails = (courseIds: string[]) => {
    return courseIds.map(id => {
      const c = courses.find(x => x.id === id);
      return c ? `${c.code} (${c.units} units)` : 'Unknown Course';
    }).join(', ');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">HOD / Exam Officer Approvals</h2>
          <p className="text-sm text-slate-500">Review and approve course registrations submitted by students.</p>
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
              <th className="p-3">Student</th>
              <th className="p-3">Courses Requested</th>
              <th className="p-3">Total Units</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registrations.map((reg) => (
              <tr key={reg.id} className="hover:bg-slate-50">
                <td className="p-3 font-semibold text-slate-800">{getStudentName(reg.studentId)}</td>
                <td className="p-3 text-xs text-slate-600">{getCourseDetails(reg.courseIds || [])}</td>
                <td className="p-3">{reg.totalUnits} units</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    reg.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                    reg.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {reg.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {reg.status === 'PENDING' && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleApprove(reg.id, 'APPROVED')} className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleApprove(reg.id, 'REJECTED')} className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {registrations.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">No registrations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
