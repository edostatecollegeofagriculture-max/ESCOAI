import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DocumentTemplatesTab } from './DocumentTemplatesTab';
import { CourseManagementTab } from './CourseManagementTab';
import { RegistrationApprovalTab } from './RegistrationApprovalTab';
import { ResultModerationTab } from './ResultModerationTab';

type Tab = 'slides' | 'news' | 'leadership' | 'faqs' | 'calendar' | 'schools' | 'departments' | 'programmes' | 'courses' | 'registrations' | 'settings' | 'moderation' | 'documents';

export const ContentManagementModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('slides');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [slides, setSlides] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [leadership, setLeadership] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});

  const [formData, setFormData] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'slides') { const res = await api.getSlides(); if (res.success) setSlides(res.slides); }
      if (activeTab === 'news') { const res = await api.getNews(); if (res.success) setNews(res.articles); }
      if (activeTab === 'leadership') { const res = await api.getLeadership(); if (res.success) setLeadership(res.leadership); }
      if (activeTab === 'faqs') { const res = await api.getFaqs(); if (res.success) setFaqs(res.faqs); }
      if (activeTab === 'calendar') { const res = await api.getAcademicCalendar(); if (res.success) setCalendar(res.calendar); }
      if (activeTab === 'schools') { const res = await api.getSchools(); if (res.success) setSchools(res.schools); }
      if (activeTab === 'departments') {
        const [schoolRes, deptRes] = await Promise.all([api.getSchools(), api.getDepartments()]);
        if (schoolRes.success) setSchools(schoolRes.schools);
        if (deptRes.success) setDepartments(deptRes.departments);
      }
      if (activeTab === 'programmes') {
        const [deptRes, progRes] = await Promise.all([api.getDepartments(), api.getProgrammes()]);
        if (deptRes.success) setDepartments(deptRes.departments);
        if (progRes.success) setProgrammes(progRes.programmes);
      }
      if (activeTab === 'settings') { const res = await api.getSettings(); if (res.success) setSettings(res.settings); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [activeTab]);

  const handleCreate = async () => {
    setMessage('');
    try {
      if (activeTab === 'slides') { await api.createSlide(formData); }
      if (activeTab === 'news') { await api.createNewsArticle(formData); }
      if (activeTab === 'leadership') { await api.createLeadership(formData); }
      if (activeTab === 'faqs') { await api.createFaq(formData); }
      if (activeTab === 'calendar') { await api.createCalendarEvent(formData); }
      if (activeTab === 'schools') { await api.request('/academics/schools', { method: 'POST', body: JSON.stringify(formData) }); }
      if (activeTab === 'departments') { await api.request('/academics/departments', { method: 'POST', body: JSON.stringify(formData) }); }
      if (activeTab === 'programmes') { await api.request('/academics/programmes', { method: 'POST', body: JSON.stringify(formData) }); }
      setMessage('Created successfully!');
      setFormData({});
      loadData();
    } catch (e: any) { setMessage('Error: ' + e.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    setMessage('');
    try {
      if (activeTab === 'slides') { await api.deleteSlide(id); }
      if (activeTab === 'news') { await api.deleteNewsArticle(id); }
      if (activeTab === 'leadership') { await api.deleteLeadership(id); }
      if (activeTab === 'faqs') { await api.deleteFaq(id); }
      if (activeTab === 'calendar') { await api.deleteCalendarEvent(id); }
      if (activeTab === 'departments') { await api.request('/academics/departments/' + id, { method: 'DELETE' }); }
      if (activeTab === 'programmes') { await api.request('/academics/programmes/' + id, { method: 'DELETE' }); }
      setMessage('Deleted successfully!');
      loadData();
    } catch (e: any) { setMessage('Error: ' + e.message); }
  };

  const handleUpdateSettings = async () => {
    setMessage('');
    try {
      await api.updateSettings(formData);
      setMessage('Settings updated successfully!');
      loadData();
    } catch (e: any) { setMessage('Error: ' + e.message); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'slides', label: 'Slides' },
    { id: 'news', label: 'News' },
    { id: 'leadership', label: 'Leadership' },
    { id: 'faqs', label: 'FAQs' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'schools', label: 'Schools' },
    { id: 'departments', label: 'Departments' },
    { id: 'programmes', label: 'Programmes' },
    { id: 'courses', label: 'Course Management' },
    { id: 'registrations', label: 'Course Registrations' },
    { id: 'moderation', label: 'Result Moderation' },
    { id: 'documents', label: 'Document Templates' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <h1 className='text-3xl font-bold text-gray-900 mb-6'>Content Management System</h1>

      {message && <div className='mb-4 p-4 bg-blue-100 text-blue-800 rounded'>{message}</div>}

      <div className='flex flex-wrap gap-2 mb-6'>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setFormData({}); setMessage(''); }}
            className={`px-4 py-2 rounded-lg font-semibold ${activeTab === tab.id ? 'bg-green-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className='text-center p-10'>Loading...</div>
      ) : (
        <div className='bg-white rounded-lg shadow p-6'>

          {activeTab === 'slides' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Manage Hero Slides</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <input placeholder='Title' className='border p-2 rounded' value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                <input placeholder='Subtitle' className='border p-2 rounded' value={formData.subtitle || ''} onChange={e => setFormData({...formData, subtitle: e.target.value})} />
                <div className='md:col-span-2'>
                  <label className='block text-sm font-semibold text-gray-700 mb-1'>Image (Upload from computer or paste URL)</label>
                  <input
                    type='file'
                    accept='image/*'
                    className='border p-2 rounded w-full mb-2'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({ ...formData, imageUrl: reader.result as string });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <input
                    placeholder='Or paste an Image URL'
                    className='border p-2 rounded w-full mb-2'
                    value={formData.imageUrl && formData.imageUrl.startsWith('http') ? formData.imageUrl : ''}
                    onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  />
                  {formData.imageUrl && (
                    <img src={formData.imageUrl} alt='Preview' className='h-32 w-full object-cover rounded border' />
                  )}
                </div>
                <input placeholder='Button Text' className='border p-2 rounded' value={formData.buttonText || ''} onChange={e => setFormData({...formData, buttonText: e.target.value})} />
                <input placeholder='Button Link' className='border p-2 rounded' value={formData.buttonLink || ''} onChange={e => setFormData({...formData, buttonLink: e.target.value})} />
              </div>
              <button onClick={handleCreate} className='bg-green-700 text-white px-4 py-2 rounded mb-6'>Add Slide</button>
              <div className='space-y-2'>
                {slides.map(s => (
                  <div key={s.id} className='flex justify-between items-center p-3 bg-gray-50 rounded'>
                    <div className='flex items-center gap-4'>
                      {s.imageUrl && <img src={s.imageUrl} alt={s.title} className='w-20 h-12 object-cover rounded' />}
                      <span>{s.title}</span>
                    </div>
                    <button onClick={() => handleDelete(s.id)} className='text-red-600 font-semibold'>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'news' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Manage News Articles</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <input placeholder='Title' className='border p-2 rounded' value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                <input placeholder='Category' className='border p-2 rounded' value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})} />
                <textarea placeholder='Excerpt' className='border p-2 rounded md:col-span-2' value={formData.excerpt || ''} onChange={e => setFormData({...formData, excerpt: e.target.value})} />
                <textarea placeholder='Content' className='border p-2 rounded md:col-span-2' rows={4} value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} />
              </div>
              <button onClick={handleCreate} className='bg-green-700 text-white px-4 py-2 rounded mb-6'>Publish Article</button>
              <div className='space-y-2'>
                {news.map(n => (
                  <div key={n.id} className='flex justify-between items-center p-3 bg-gray-50 rounded'>
                    <div><span className='font-bold'>{n.title}</span> <span className='text-sm text-gray-500 ml-2'>{n.status}</span></div>
                    <button onClick={() => handleDelete(n.id)} className='text-red-600 font-semibold'>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'leadership' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Manage Leadership Profiles</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <input placeholder='Full Name' className='border p-2 rounded' value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                <input placeholder='Title (e.g. Rector & Provost)' className='border p-2 rounded' value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                <textarea placeholder='Biography' className='border p-2 rounded md:col-span-2' value={formData.bio || ''} onChange={e => setFormData({...formData, bio: e.target.value})} />
              </div>
              <button onClick={handleCreate} className='bg-green-700 text-white px-4 py-2 rounded mb-6'>Add Profile</button>
              <div className='space-y-2'>
                {leadership.map(l => (
                  <div key={l.id} className='flex justify-between items-center p-3 bg-gray-50 rounded'>
                    <span>{l.fullName} - {l.title}</span>
                    <button onClick={() => handleDelete(l.id)} className='text-red-600 font-semibold'>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'faqs' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Manage FAQs</h2>
              <div className='grid grid-cols-1 gap-4 mb-6'>
                <input placeholder='Question' className='border p-2 rounded' value={formData.question || ''} onChange={e => setFormData({...formData, question: e.target.value})} />
                <textarea placeholder='Answer' className='border p-2 rounded' value={formData.answer || ''} onChange={e => setFormData({...formData, answer: e.target.value})} />
              </div>
              <button onClick={handleCreate} className='bg-green-700 text-white px-4 py-2 rounded mb-6'>Add FAQ</button>
              <div className='space-y-2'>
                {faqs.map(f => (
                  <div key={f.id} className='flex justify-between items-center p-3 bg-gray-50 rounded'>
                    <span>{f.question}</span>
                    <button onClick={() => handleDelete(f.id)} className='text-red-600 font-semibold'>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'calendar' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Manage Academic Calendar</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <input placeholder='Event Title' className='border p-2 rounded' value={formData.title || ''} onChange={e => setFormData({...formData, title: e.target.value})} />
                <input placeholder='Date (YYYY-MM-DD)' className='border p-2 rounded' value={formData.date || ''} onChange={e => setFormData({...formData, date: e.target.value})} />
                <textarea placeholder='Description' className='border p-2 rounded md:col-span-2' value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <button onClick={handleCreate} className='bg-green-700 text-white px-4 py-2 rounded mb-6'>Add Event</button>
              <div className='space-y-2'>
                {calendar.map(c => (
                  <div key={c.id} className='flex justify-between items-center p-3 bg-gray-50 rounded'>
                    <span>{c.title} - {c.date}</span>
                    <button onClick={() => handleDelete(c.id)} className='text-red-600 font-semibold'>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'schools' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Manage Schools</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <input placeholder='School Code (e.g. SAGR)' className='border p-2 rounded' value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                <input placeholder='School Name' className='border p-2 rounded' value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                <textarea placeholder='Description' className='border p-2 rounded md:col-span-2' value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <button onClick={handleCreate} className='bg-green-700 text-white px-4 py-2 rounded mb-6'>Add School</button>
              <div className='space-y-2'>
                {schools.map(s => (
                  <div key={s.id} className='flex justify-between items-center p-3 bg-gray-50 rounded'>
                    <span><strong>{s.code}</strong> - {s.name}</span>
                    <button onClick={() => handleDelete(s.id)} className='text-red-600 font-semibold'>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'departments' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Manage Departments</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <select className='border p-2 rounded md:col-span-2' value={formData.schoolId || ''} onChange={e => setFormData({...formData, schoolId: e.target.value})}>
                  <option value=''>Select School</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <input placeholder='Department Code (e.g. AGRIC)' className='border p-2 rounded' value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                <input placeholder='Department Name' className='border p-2 rounded' value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                <textarea placeholder='Description' className='border p-2 rounded md:col-span-2' value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <button onClick={handleCreate} className='bg-green-700 text-white px-4 py-2 rounded mb-6'>Add Department</button>
              <div className='space-y-2'>
                {departments.map(d => (
                  <div key={d.id} className='flex justify-between items-center p-3 bg-gray-50 rounded'>
                    <span><strong>{d.code}</strong> - {d.name}</span>
                    <button onClick={() => handleDelete(d.id)} className='text-red-600 font-semibold'>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'programmes' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Manage Academic Programmes</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <input placeholder='Programme Name (e.g. ND Agricultural Technology)' className='border p-2 rounded md:col-span-2' value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                <input placeholder='Programme Code (e.g. ND-AGRIC)' className='border p-2 rounded' value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                <select className='border p-2 rounded' value={formData.qualification || ''} onChange={e => setFormData({...formData, qualification: e.target.value})}>
                  <option value=''>Select Qualification</option>
                  <option value='ND'>ND</option>
                  <option value='HND'>HND</option>
                  <option value='Certificate'>Certificate</option>
                </select>
                <input type='number' placeholder='Duration (Years)' className='border p-2 rounded' value={formData.durationYears || ''} onChange={e => setFormData({...formData, durationYears: Number(e.target.value)})} />
                <select className='border p-2 rounded' value={formData.departmentId || ''} onChange={e => setFormData({...formData, departmentId: e.target.value})}>
                  <option value=''>Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <textarea placeholder='Description' className='border p-2 rounded md:col-span-2' value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <button onClick={handleCreate} className='bg-green-700 text-white px-4 py-2 rounded mb-6'>Add Programme</button>
              <div className='space-y-2'>
                {programmes.map(p => (
                  <div key={p.id} className='flex justify-between items-center p-3 bg-gray-50 rounded'>
                    <span><strong>{p.code}</strong> - {p.name} ({p.qualification})</span>
                    <button onClick={() => handleDelete(p.id)} className='text-red-600 font-semibold'>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENT TEMPLATES TAB */}
          {activeTab === 'courses' && <CourseManagementTab />}
          {activeTab === 'registrations' && <RegistrationApprovalTab />}
          {activeTab === 'moderation' && <ResultModerationTab />}
          {activeTab === 'documents' && <DocumentTemplatesTab />}

          {activeTab === 'settings' && (
            <div>
              <h2 className='text-xl font-bold mb-4'>Institution Settings</h2>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
                <input placeholder='Institution Name' className='border p-2 rounded' value={formData.institutionName || settings.institutionName || ''} onChange={e => setFormData({...formData, institutionName: e.target.value})} />
                <input placeholder='Short Name' className='border p-2 rounded' value={formData.shortName || settings.shortName || ''} onChange={e => setFormData({...formData, shortName: e.target.value})} />
                <input placeholder='Current Session' className='border p-2 rounded' value={formData.currentSession || settings.currentSession || ''} onChange={e => setFormData({...formData, currentSession: e.target.value})} />
                <input placeholder='Current Semester' className='border p-2 rounded' value={formData.currentSemester || settings.currentSemester || ''} onChange={e => setFormData({...formData, currentSemester: e.target.value})} />
                <input placeholder='Contact Email' className='border p-2 rounded' value={formData.contactEmail || settings.contactEmail || ''} onChange={e => setFormData({...formData, contactEmail: e.target.value})} />
                <input placeholder='Contact Phone' className='border p-2 rounded' value={formData.contactPhone || settings.contactPhone || ''} onChange={e => setFormData({...formData, contactPhone: e.target.value})} />
                <textarea placeholder='Address' className='border p-2 rounded md:col-span-2' value={formData.address || settings.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              <button onClick={handleUpdateSettings} className='bg-green-700 text-white px-4 py-2 rounded'>Save Settings</button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};