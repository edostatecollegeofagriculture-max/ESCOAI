import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Save, Plus, Trash2, BookOpen, UserCheck, Edit, X } from 'lucide-react';

export const CourseManagementTab: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // Form state for new course
  const [formData, setFormData] = useState({
    code: '',
    title: '',
    units: 3,
    departmentId: '',
    level: 'ND I',
    semester: 'First',
    lecturerId: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [crsRes, deptRes, staffRes] = await Promise.all([
        api.getCourses(),
        api.getDepartments(),
        api.getLeadership(), // Assuming staff/lecturers are stored here
      ]);
      if (crsRes.success) setCourses(crsRes.courses);
      if (deptRes.success) setDepartments(deptRes.departments);
      if (staffRes.success) setLecturers(staffRes.leadership.filter((l: any) => l.role === 'LECTURER' || l.title?.toLowerCase().includes('lecturer')));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.request('/academics/courses', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      if (res.success) {
        setMessage('Course created successfully!');
        setFormData({ code: '', title: '', units: 3, departmentId: '', level: 'ND I', semester: 'First', lecturerId: '' });
        loadData();
      } else {
        throw new Error(res.message || 'Failed to create course');
      }
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    }
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setEditFormData({ ...course });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await api.request(`/academics/courses/${editingCourse.id}`, {
        method: 'PUT',
        body: JSON.stringify(editFormData),
      });
      if (res.success) {
        setMessage('Course updated successfully!');
        setEditingCourse(null);
        setEditFormData({});
        loadData();
      } else {
        throw new Error(res.message || 'Update failed');
      }
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await api.request(`/academics/courses/${id}`, { method: 'DELETE' });
      setMessage('Course deleted.');
      loadData();
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" /> Course Management (Dean & HOD)
        </h2>
        <p className="text-sm text-slate-500">Create courses, assign them to departments, and assign lecturers.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${message.startsWith('Error') ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {message}
        </div>
      )}

      {/* Create Course Form */}
      <form onSubmit={handleCreateCourse} className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Course Code</label>
          <input required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="e.g. AGR 101" className="w-full p-2 border rounded-lg text-sm" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Course Title</label>
          <input required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Introduction to Agriculture" className="w-full p-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Units</label>
          <input type="number" min="1" max="6" required value={formData.units} onChange={(e) => setFormData({ ...formData, units: Number(e.target.value) })} className="w-full p-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Department</label>
          <select required value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} className="w-full p-2 border rounded-lg text-sm">
            <option value="">Select Dept</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Assign Lecturer (HOD Role)</label>
          <select value={formData.lecturerId} onChange={(e) => setFormData({ ...formData, lecturerId: e.target.value })} className="w-full p-2 border rounded-lg text-sm">
            <option value="">Unassigned</option>
            {lecturers.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Level</label>
          <select value={formData.level} onChange={(e) => setFormData({ ...formData, level: e.target.value })} className="w-full p-2 border rounded-lg text-sm">
            <option value="ND I">ND I</option>
            <option value="ND II">ND II</option>
            <option value="HND I">HND I</option>
            <option value="HND II">HND II</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Semester</label>
          <select value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })} className="w-full p-2 border rounded-lg text-sm">
            <option value="First">First</option>
            <option value="Second">Second</option>
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Create Course
          </button>
        </div>
      </form>

      {/* Course List */}
      <div>
        <h3 className="font-bold text-slate-700 mb-3">Existing Courses</h3>
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="p-3">Code</th>
                <th className="p-3">Title</th>
                <th className="p-3">Units</th>
                <th className="p-3">Level/Sem</th>
                <th className="p-3">Lecturer</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-emerald-700">{c.code}</td>
                  <td className="p-3">{c.title}</td>
                  <td className="p-3">{c.units}</td>
                  <td className="p-3">{c.level} / {c.semester}</td>
                  <td className="p-3">{c.lecturerName || <span className="text-slate-400 italic">Unassigned</span>}</td>
                  <td className="p-3 text-right flex items-center justify-end gap-1">
                    <button onClick={() => handleEditCourse(c)} className="text-blue-500 hover:text-blue-700 p-1" title="Edit">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteCourse(c.id)} className="text-red-500 hover:text-red-700 p-1" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">No courses created yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-slate-800">Edit Course</h3>
              <button onClick={() => setEditingCourse(null)} className="text-slate-500 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Course Code</label>
                <input required value={editFormData.code || ''} onChange={(e) => setEditFormData({ ...editFormData, code: e.target.value })} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Units</label>
                <input type="number" min="1" max="6" required value={editFormData.units || 3} onChange={(e) => setEditFormData({ ...editFormData, units: Number(e.target.value) })} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Course Title</label>
                <input required value={editFormData.title || ''} onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })} className="w-full p-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Department</label>
                <select value={editFormData.departmentId || ''} onChange={(e) => setEditFormData({ ...editFormData, departmentId: e.target.value })} className="w-full p-2 border rounded-lg text-sm">
                  <option value="">Select Dept</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Lecturer</label>
                <select value={editFormData.lecturerId || ''} onChange={(e) => setEditFormData({ ...editFormData, lecturerId: e.target.value })} className="w-full p-2 border rounded-lg text-sm">
                  <option value="">Unassigned</option>
                  {lecturers.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Level</label>
                <select value={editFormData.level || 'ND I'} onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })} className="w-full p-2 border rounded-lg text-sm">
                  <option value="ND I">ND I</option>
                  <option value="ND II">ND II</option>
                  <option value="HND I">HND I</option>
                  <option value="HND II">HND II</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase">Semester</label>
                <select value={editFormData.semester || 'First'} onChange={(e) => setEditFormData({ ...editFormData, semester: e.target.value })} className="w-full p-2 border rounded-lg text-sm">
                  <option value="First">First</option>
                  <option value="First Semester">First Semester</option>
                  <option value="Second">Second</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setEditingCourse(null)} className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
