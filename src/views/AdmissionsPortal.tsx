import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AdmissionApplication, Programme } from '../types';
import { FileText, CheckCircle, Clock, XCircle, Award, Send, Printer, ChevronRight, AlertCircle, Sparkles, Plus, Trash2, Info } from 'lucide-react';

interface Props {
  onOpenPrintModal: (type: any, data: any) => void;
  onGoToStudentWorkspace: () => void;
  onOpenLoginModal: () => void;
}

const SUBJECT_OPTIONS = [
  'English Language', 'Mathematics', 'Agricultural Science', 'Biology', 'Chemistry',
  'Physics', 'Economics', 'Government', 'Literature in English', 'Christian Religious Studies',
  'Islamic Religious Studies', 'Geography', 'Further Mathematics', 'Technical Drawing',
  'Food and Nutrition', 'Home Management', 'Commerce', 'Financial Accounting',
  'Marketing', 'Office Practice', 'Animal Husbandry', 'Fisheries', 'Civic Education',
];

const GRADE_OPTIONS = ['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'];

interface OLevelResult {
  subject: string;
  grade: string;
}

export const AdmissionsPortal: React.FC<Props> = ({
  onOpenPrintModal,
  onGoToStudentWorkspace,
  onOpenLoginModal,
}) => {
  const { user, settings, refreshUserData } = useAuth();
  const [schools, setSchools] = useState<any[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [myApp, setMyApp] = useState<AdmissionApplication | null>(null);
  const [allApps, setAllApps] = useState<AdmissionApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptingOffer, setAcceptingOffer] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // --- SUPER ADMIN EDIT / DELETE STATE & HANDLERS ---
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingApp, setEditingApp] = useState<any | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const handleDeleteApp = async (app: AdmissionApplication) => {
    if (!window.confirm('Delete application ' + app.applicationNumber + '?\n\nThe application row will be removed, but the login account is retained.')) return;
    setDeletingId(app.id);
    try {
      const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
      const token = localStorage.getItem('edocasti_token');
      const response = await fetch(base + '/api/v1/admissions/' + app.id, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token }
      });
      const res = await response.json();
      if (res.success) {
        setAllApps(prev => prev.filter(a => a.id !== app.id));
        setSuccessMsg(res.message || 'Application deleted successfully.');
      } else {
        throw new Error(res.message || 'Failed to delete');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingApp) return;
    setSavingEdit(true);
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
      const token = localStorage.getItem('edocasti_token');
      const response = await fetch(base + '/api/v1/admissions/' + editingApp.id, {
        method: 'PUT',
        headers: { 
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const res = await response.json();
      if (res.success) {
        setAllApps(prev => prev.map(a => a.id === editingApp.id ? res.application : a));
        setEditingApp(null);
        setSuccessMsg('Applicant record updated successfully.');
      } else {
        throw new Error(res.message || 'Update failed');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Update failed');
    } finally {
      setSavingEdit(false);
    }
  };
  // --- END SUPER ADMIN LOGIC ---

  // Guard so the auto-navigation to the student workspace fires only once per acceptance.
  const transitionNavigatedRef = useRef(false);

  // Registration Form State
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Application Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    otherNames: '',
    gender: '',
    dob: '',
    phone: '',
    programmeId: '',
    stateOfOrigin: '',
    lga: '',
    residentialAddress: '',
  });

  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setPhotoError(null);
    try {
      const res = await api.uploadFile(file, 'applicant-photos');
      if (res.success && res.url) {
        setProfileImageUrl(res.url);
      } else {
        setPhotoError('Photo upload failed. Please try again.');
      }
    } catch (err: any) {
      setPhotoError(err?.message || 'Photo upload failed.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const [oLevelResults, setOLevelResults] = useState<OLevelResult[]>([
    { subject: '', grade: '' },
    { subject: '', grade: '' },
    { subject: '', grade: '' },
    { subject: '', grade: '' },
    { subject: '', grade: '' },
  ]);

  const [examType, setExamType] = useState('');
  const [examNumber, setExamNumber] = useState('');

  const [decisionStatus, setDecisionStatus] = useState<'OFFERED' | 'REJECTED' | 'UNDER_REVIEW'>('OFFERED');
  const [screeningNotes, setScreeningNotes] = useState('');

  const isStaff =
    user && ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER'].includes(user.role);

  const isApplicant = user && user.role === 'USER' && user.category === 'APPLICANT';

  const loadData = async () => {
    setLoading(true);
    try {
      const progRes = await api.getProgrammes();
      if (progRes.success) setProgrammes(progRes.programmes);

      const schoolRes = await api.getSchools();
      if (schoolRes.success) setSchools(schoolRes.schools);

      if (user) {
        if (isStaff) {
          const appsRes = await api.getApplications();
          if (appsRes.success) setAllApps(appsRes.applications);
        } else {
          try {
            const myRes = await api.getMyApplication();
            if (myRes.success) setMyApp(myRes.application);
          } catch {
            setMyApp(null);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterMessage(null);
    try {
      const res = await api.registerApplicant(registerForm);
      if (res.success) {
        api.setToken(res.token);
        localStorage.setItem('edocasti_token', res.token);
        setRegisterMessage('Account created successfully! You can now submit your application.');
        setRegisterForm({ fullName: '', email: '', password: '', phone: '' });
        window.location.reload();
      } else {
        setRegisterMessage('Registration failed.');
      }
    } catch (err: any) {
      setRegisterMessage(err.message || 'Registration failed.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const validResults = oLevelResults.filter(r => r.subject && r.grade);
    if (validResults.length < 5) {
      setErrorMsg('Please provide at least 5 O-Level subjects with grades.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        profileImageUrl: profileImageUrl || '',
        oLevelResults: validResults.map(r => ({
          subject: r.subject,
          grade: r.grade,
          examNumber: examNumber,
          examType: examType,
        })),
      };
      const res = await api.submitApplication(payload);
      if (res.success) {
        setMyApp(res.application);
        setSuccessMsg('Your admission application has been submitted successfully! Check your status below.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionSubmit = async (appId: string) => {
    setLoading(true);
    try {
      const res = await api.reviewApplication(appId, {
        status: decisionStatus,
        screeningNotes: screeningNotes || 'Candidate screened and vetted against institutional quotas.',
      });
      if (res.success) {
        setSuccessMsg(`Decision '${decisionStatus}' successfully recorded for application ${res.application.applicationNumber}`);
        setSelectedApp(null);
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record decision');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (appId: string) => {
    if (acceptingOffer) return;

    if (!appId || !String(appId).trim()) {
      setErrorMsg('The application reference could not be identified. Please refresh the page and try again.');
      return;
    }

    setAcceptingOffer(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.acceptOffer(String(appId));

      if (!res || res.success !== true) {
        setErrorMsg(res?.message || 'The admission offer could not be accepted. Please try again.');
        return;
      }

      setMyApp((prev: any) => prev ? { ...prev, status: 'ACCEPTED' } : null);
      setSuccessMsg(
        res.message || 'Congratulations! Your admission offer has been accepted and your student profile is active.'
      );

      await loadData();

      // Rehydrate AuthContext.user so category flips APPLICANT -> STUDENT
      // before the student workspace mounts. Otherwise StudentPortal would
      // render with a stale applicant context.
      await refreshUserData();

      // Auto-navigate to the student workspace once, only after the reload succeeded.
      if (!transitionNavigatedRef.current) {
        transitionNavigatedRef.current = true;
        onGoToStudentWorkspace();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to accept your admission offer. Please try again.');
    } finally {
      setAcceptingOffer(false);
    }
  };

  const addSubjectRow = () => {
    setOLevelResults([...oLevelResults, { subject: '', grade: '' }]);
  };

  const removeSubjectRow = (index: number) => {
    if (oLevelResults.length <= 5) return;
    setOLevelResults(oLevelResults.filter((_, i) => i !== index));
  };

  const updateSubject = (index: number, field: 'subject' | 'grade', value: string) => {
    const updated = [...oLevelResults];
    updated[index][field] = value;
    setOLevelResults(updated);
  };

  // Not logged in → Show registration form
  if (!user) {
    return (
      <div className='p-6 bg-gray-50 min-h-screen'>
        <div className='max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs'>
          <h2 className='text-lg font-bold text-slate-900 mb-4'>Create Applicant Account</h2>
          <p className='text-xs text-slate-500 mb-4'>Register to apply for admission.</p>
          <form onSubmit={handleRegister} className='space-y-3 text-xs'>
            <div>
              <label className='block text-slate-600 font-semibold mb-1'>Full Name</label>
              <input
                type='text'
                required
                value={registerForm.fullName}
                onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                placeholder='e.g. John Doe'
                className='w-full p-2 border border-slate-300 rounded-lg text-xs'
              />
            </div>
            <div>
              <label className='block text-slate-600 font-semibold mb-1'>Email</label>
              <input
                type='email'
                required
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                placeholder='e.g. john@example.com'
                className='w-full p-2 border border-slate-300 rounded-lg text-xs'
              />
            </div>
            <div>
              <label className='block text-slate-600 font-semibold mb-1'>Password (min 12 chars)</label>
              <input
                type='password'
                required
                minLength={12}
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                placeholder='••••••••'
                className='w-full p-2 border border-slate-300 rounded-lg text-xs'
              />
            </div>
            <div>
              <label className='block text-slate-600 font-semibold mb-1'>Phone (optional)</label>
              <input
                type='text'
                value={registerForm.phone}
                onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                placeholder='e.g. +234 803 000 1234'
                className='w-full p-2 border border-slate-300 rounded-lg text-xs'
              />
            </div>
            <button
              type='submit'
              disabled={registerLoading}
              className='w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg cursor-pointer'
            >
              Register Account
            </button>
          </form>
          {registerMessage && <p className='mt-3 text-xs text-center text-emerald-700'>{registerMessage}</p>}
          <p className='mt-4 text-xs text-center text-slate-500'>
            Already have an account? <button onClick={onOpenLoginModal} className='text-emerald-700 font-bold'>Sign In</button>
          </p>
        </div>
      </div>
    );
  }

  // Logged in as Applicant with no application → Show application form
  if (isApplicant && !myApp) {
    return (
      <div className='p-6 bg-gray-50 min-h-screen'>
        <div className='max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs'>
          <h2 className='text-lg font-bold text-slate-900 mb-4'>Submit Admission Application</h2>
          <p className='text-xs text-slate-500 mb-4'>Fill in your details and qualifications to apply.</p>
          <form onSubmit={handleSubmitApplication} className='space-y-4 text-xs'>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-slate-600 font-semibold mb-1'>First Name</label>
                <input
                  type='text'
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className='w-full p-2 border border-slate-300 rounded-lg text-xs'
                />
              </div>
              <div>
                <label className='block text-slate-600 font-semibold mb-1'>Last Name</label>
                <input
                  type='text'
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className='w-full p-2 border border-slate-300 rounded-lg text-xs'
                />
              </div>
            </div>
            <div>
              <label className='block text-slate-600 font-semibold mb-1'>Phone</label>
              <input
                type='text'
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className='w-full p-2 border border-slate-300 rounded-lg text-xs'
              />
            </div>
            <div>
              <label className='block text-slate-600 font-semibold mb-1'>Passport Photograph (for Student ID)</label>
              <input
                type='file'
                accept='image/*'
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className='w-full p-2 border border-slate-300 rounded-lg text-xs file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-emerald-800 file:text-white file:font-semibold file:cursor-pointer'
              />
              {uploadingPhoto && <p className='mt-1 text-xs text-slate-500'>Uploading photo…</p>}
              {photoError && <p className='mt-1 text-xs text-red-600'>{photoError}</p>}
              {profileImageUrl && (
                <div className='mt-2 flex items-center gap-2'>
                  <img src={profileImageUrl} alt='Preview' className='w-16 h-16 rounded-lg object-cover border border-slate-300' />
                  <button
                    type='button'
                    onClick={() => setProfileImageUrl('')}
                    className='text-xs text-red-600 font-semibold'
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className='block text-slate-600 font-semibold mb-1'>Programme</label>
              <select
                required
                value={formData.programmeId}
                onChange={(e) => setFormData({ ...formData, programmeId: e.target.value })}
                className='w-full p-2 border border-slate-300 rounded-lg text-xs'
              >
                <option value=''>Select Programme</option>
                {programmes.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className='border-t border-slate-200 pt-4'>
              <h3 className='text-sm font-bold text-slate-800 mb-3'>O-Level Examination Records</h3>
              <div className='grid grid-cols-2 gap-4 mb-3'>
                <div>
                  <label className='block text-slate-600 font-semibold mb-1'>Examination Body</label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className='w-full p-2 border border-slate-300 rounded-lg text-xs'
                  >
                    <option value=''>Select Examination Body</option>
                    <option value='WAEC'>WAEC (SSCE)</option>
                    <option value='NECO'>NECO (SSCE)</option>
                    <option value='NABTEB'>NABTEB</option>
                  </select>
                </div>
                <div>
                  <label className='block text-slate-600 font-semibold mb-1'>Candidate Exam Number</label>
                  <input
                    type='text'
                    value={examNumber}
                    onChange={(e) => setExamNumber(e.target.value)}
                    placeholder='e.g. 4201992011'
                    className='w-full p-2 border border-slate-300 rounded-lg text-xs font-mono'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                {oLevelResults.map((result, index) => (
                  <div key={index} className='flex gap-2 items-center'>
                    <select
                      value={result.subject}
                      onChange={(e) => updateSubject(index, 'subject', e.target.value)}
                      className='flex-1 p-2 border border-slate-300 rounded-lg text-xs'
                    >
                      <option value=''>Select Subject</option>
                      {SUBJECT_OPTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select
                      value={result.grade}
                      onChange={(e) => updateSubject(index, 'grade', e.target.value)}
                      className='w-24 p-2 border border-slate-300 rounded-lg text-xs font-bold font-mono'
                    >
                      <option value=''>Grade</option>
                      {GRADE_OPTIONS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                    {oLevelResults.length > 5 && (
                      <button
                        type='button'
                        onClick={() => removeSubjectRow(index)}
                        className='text-red-600 hover:text-red-800'
                      >
                        <Trash2 className='w-4 h-4' />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type='button'
                onClick={addSubjectRow}
                className='mt-3 text-xs text-emerald-700 font-semibold flex items-center gap-1'
              >
                <Plus className='w-3 h-3' /> Add Another Subject
              </button>
            </div>

            <button
              type='submit'
              disabled={loading}
              className='w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg cursor-pointer'
            >
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
          {successMsg && <p className='mt-3 text-xs text-center text-emerald-700'>{successMsg}</p>}
          {errorMsg && <p className='mt-3 text-xs text-center text-red-700'>{errorMsg}</p>}
        </div>
      </div>
    );
  }

  // Logged in as Applicant with an application → Show status
  if (isApplicant && myApp) {
    return (
      <div className='p-6 bg-gray-50 min-h-screen'>
        <div className='max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 shadow-xs'>
          <h2 className='text-lg font-bold text-slate-900 mb-4'>Your Application Status</h2>
          {successMsg && (
            <div role='status' className='mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-sm text-emerald-900'>
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div role='alert' className='mb-4 p-3 bg-red-50 border border-red-300 rounded-xl text-sm text-red-900'>
              {errorMsg}
            </div>
          )}
          <div className='p-4 bg-emerald-50 border border-emerald-200 rounded-lg'>
            <p className='text-sm font-semibold text-emerald-800'>Application Number: {myApp.applicationNumber}</p>
            <p className='text-xs text-emerald-600 mt-1'>Status: {myApp.status}</p>
            <p className='text-xs text-emerald-600'>Session: {myApp.session}</p>
          </div>
          {myApp.status === 'OFFERED' && (
            <div className='mt-4 p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3'>
              <div className='flex items-center gap-2 text-emerald-900 font-bold text-sm'>
                <Award className='w-5 h-5 text-amber-600' /> Provisional Offer Ready!
              </div>
              <p className='text-xs text-slate-600 leading-relaxed'>
                You have been officially offered admission into EDOCASTI. Accept the offer below to proceed to matriculation and student profile activation.
              </p>
              <div className='flex flex-col gap-2 pt-1'>
                <button
                  onClick={() => onOpenPrintModal('ADMISSION_LETTER', myApp)}
                  className='w-full py-2 bg-white hover:bg-slate-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer'
                >
                  <Printer className='w-4 h-4' /> View / Print Offer Letter
                </button>
                <button
                  type='button'
                  onClick={() => handleAcceptOffer(String(myApp.id || ''))}
                  disabled={acceptingOffer}
                  aria-busy={acceptingOffer}
                  className='w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
                >
                  {acceptingOffer ? (
                    <><Clock className='w-4 h-4 animate-spin' /> Processing...</>
                  ) : (
                    <><CheckCircle className='w-4 h-4' /> Accept Admission Offer Now</>
                  )}
                </button>
              </div>
            </div>
          )}
          {myApp.status === 'ACCEPTED' && (
            <div className='mt-4 p-4 bg-emerald-100 border border-emerald-300 rounded-xl space-y-2 text-xs text-emerald-900'>
              <div className='font-bold flex items-center gap-1'>
                <CheckCircle className='w-4 h-4' /> Admission Offer Accepted
              </div>
              <p>Your student profile is active. You can now access course registration and fee settlement.</p>
              <div className='flex flex-col gap-2 pt-1'>
                <button
                  onClick={() => onOpenPrintModal('ADMISSION_LETTER', myApp)}
                  className='w-full py-2 bg-white hover:bg-slate-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer'
                >
                  <Printer className='w-4 h-4' /> View / Print Admission Letter
                </button>
                <button
                  onClick={onGoToStudentWorkspace}
                  className='w-full py-2 bg-emerald-800 text-white font-semibold rounded-lg cursor-pointer'
                >
                  Go to Student Workspace →
                </button>
              </div>
            </div>
          )}
          {myApp.status === 'UNDER_REVIEW' && (
            <div className='mt-4 p-4 bg-blue-50 border border-blue-300 rounded-xl space-y-2 text-xs text-blue-900'>
              <div className='font-bold flex items-center gap-1'>
                <Clock className='w-4 h-4' /> Application Under Review
              </div>
              <p>Your application is currently being reviewed by the admissions committee. You will be notified once a decision is made.</p>
            </div>
          )}
          {myApp.status === 'REJECTED' && (
            <div className='mt-4 p-4 bg-red-50 border border-red-300 rounded-xl space-y-2 text-xs text-red-900'>
              <div className='font-bold flex items-center gap-1'>
                <XCircle className='w-4 h-4' /> Application Not Successful
              </div>
              <p>Unfortunately, your application was not successful in this admission cycle. Please contact the admissions office for further guidance.</p>
            </div>
          )}
          {myApp.status !== 'OFFERED' && myApp.status !== 'ACCEPTED' && myApp.status !== 'UNDER_REVIEW' && myApp.status !== 'REJECTED' && (
            <div className='mt-4 p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2 text-xs text-slate-700'>
              <div className='font-bold flex items-center gap-1'>
                <Info className='w-4 h-4' /> Application Submitted
              </div>
              <p>Your application has been received. Please wait while it is being processed. Check back later for an update on your status.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Staff → Show admissions registry with full table
  if (isStaff) {
    return (
      <div className='p-6 bg-gray-50 min-h-screen'>
        <div className='max-w-6xl mx-auto'>
          <div className='mb-6'>
            <p className='text-sm text-green-700 font-semibold'>ADMISSIONS REGISTRY</p>
            <h1 className='text-2xl font-bold text-gray-900'>Admissions Committee Screening Portal</h1>
            <p className='text-gray-600'>Official National Diploma (ND) and Higher National Diploma (HND) application processing.</p>
          </div>

          {successMsg && (
            <div className='mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between'>
              <span>{successMsg}</span>
              <button onClick={() => setSuccessMsg(null)} className='font-bold text-emerald-700'>✕</button>
            </div>
          )}

          {errorMsg && (
            <div className='mb-4 p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 flex items-center justify-between'>
              <span>{errorMsg}</span>
              <button onClick={() => setErrorMsg(null)} className='font-bold text-red-700'>✕</button>
            </div>
          )}

          <div className='bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-base font-bold text-slate-900'>Submitted Applicant Register</h2>
                <p className='text-xs text-slate-500'>Screen credentials, inspect O-Level grades, and record admission decisions.</p>
              </div>
              <span className='px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg'>
                Total Applicants: {allApps.length}
              </span>
            </div>

            <div className='overflow-x-auto border border-slate-200 rounded-xl'>
              <table className='w-full text-xs text-left'>
                <thead className='bg-slate-100 text-slate-700 uppercase font-bold text-[11px]'>
                  <tr>
                    <th className='p-3'>Ref Number</th>
                    <th className='p-3'>Applicant Name</th>
                    <th className='p-3'>Programme</th>
                    <th className='p-3'>O-Level Highlights</th>
                    <th className='p-3'>Status</th>
                    <th className='p-3 text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-200'>
                  {allApps.map((app) => (
                    <tr key={app.id} className='hover:bg-slate-50'>
                      <td className='p-3 font-mono font-bold text-emerald-900'>{app.applicationNumber}</td>
                      <td className='p-3 font-semibold text-slate-900 uppercase'>
                        {app.firstName} {app.lastName}
                      </td>
                      <td className='p-3 text-slate-700'>
                        {programmes.find((p) => p.id === app.programmeId)?.name || 'Programme'}
                      </td>
                      <td className='p-3'>
                        <span className='text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-mono'>
                          {app.oLevelResults?.length || 5} Subjects Verified
                        </span>
                      </td>
                      <td className='p-3'>
                        <span
                          className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                            app.status === 'OFFERED'
                              ? 'bg-amber-100 text-amber-800'
                              : app.status === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className='p-3 text-right space-x-2'>
                        <button
                          onClick={() => {
                            setSelectedApp(app);
                            setDecisionStatus(app.status === 'REJECTED' ? 'REJECTED' : 'OFFERED');
                            setScreeningNotes(app.screeningNotes || '');
                          }}
                          className='px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded cursor-pointer text-xs'
                        >
                          Screen & Decide
                        </button>
                        <button
                          onClick={() => onOpenPrintModal('ADMISSION_LETTER', app)}
                          className='px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer text-xs'
                        >
                          Letter
                        </button>
                        
                        {/* SUPER ADMIN EDIT / DELETE BUTTONS */}
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => setEditingApp(app)}
                              className='px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded cursor-pointer text-xs'
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteApp(app)}
                              disabled={deletingId === app.id}
                              className='px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded cursor-pointer text-xs'
                            >
                              {deletingId === app.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedApp && (
              <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4'>
                <div className='bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl'>
                  <div className='flex justify-between items-start border-b border-slate-100 pb-3'>
                    <div>
                      <h3 className='font-bold text-slate-900 text-base'>
                        Screening Application: {selectedApp.applicationNumber}
                      </h3>
                      <p className='text-xs text-slate-500 uppercase'>
                        {selectedApp.firstName} {selectedApp.lastName}
                      </p>
                    </div>
                    <button onClick={() => setSelectedApp(null)} className='text-slate-400 hover:text-slate-700'>✕</button>
                  </div>

                  <div className='space-y-3'>
                    <div>
                      <span className='text-xs font-bold text-slate-700 uppercase block mb-1'>
                        Submitted O-Level Results:
                      </span>
                      <div className='bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-60 overflow-y-auto'>
                        <div className='space-y-2'>
                          {selectedApp.oLevelResults?.map((r: any, i: number) => (
                            <div key={i} className='flex justify-between items-center border-b border-slate-200 pb-2 last:border-0'>
                              <span className='text-slate-700 font-medium'>{r.subject}</span>
                              <span className='font-bold font-mono text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200'>
                                {r.grade}
                              </span>
                            </div>
                          ))}
                        </div>
                        {(!selectedApp.oLevelResults || selectedApp.oLevelResults.length === 0) && (
                          <p className='text-xs text-slate-500'>No O-Level results submitted.</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className='text-xs font-bold text-slate-700 uppercase block mb-1'>
                        Admission Decision
                      </label>
                      <select
                        value={decisionStatus}
                        onChange={(e: any) => setDecisionStatus(e.target.value)}
                        className='w-full text-xs p-2 border border-slate-300 rounded-lg'
                      >
                        <option value='OFFERED'>Grant Provisional Offer of Admission (OFFERED)</option>
                        <option value='UNDER_REVIEW'>Place Under Review (UNDER_REVIEW)</option>
                        <option value='REJECTED'>Decline Application (REJECTED)</option>
                      </select>
                    </div>

                    <div>
                      <label className='text-xs font-bold text-slate-700 uppercase block mb-1'>
                        Screening Notes & Comments
                      </label>
                      <textarea
                        rows={3}
                        value={screeningNotes}
                        onChange={(e) => setScreeningNotes(e.target.value)}
                        placeholder='Add official screening comments...'
                        className='w-full text-xs p-2 border border-slate-300 rounded-lg'
                      />
                    </div>
                  </div>

                  <div className='flex justify-end gap-2 pt-3 border-t border-slate-100'>
                    <button
                      onClick={() => setSelectedApp(null)}
                      className='px-4 py-2 text-xs bg-slate-100 text-slate-700 rounded-lg font-semibold cursor-pointer'
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDecisionSubmit(selectedApp.id)}
                      className='px-4 py-2 text-xs bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg cursor-pointer'
                    >
                      Confirm & Publish Decision
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* EDIT MODAL */}
            {editingApp && (
              <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4'>
                <form onSubmit={handleEditSave} className='bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-2xl'>
                  <div className='flex justify-between items-start border-b border-slate-100 pb-3'>
                    <div>
                      <h3 className='font-bold text-slate-900 text-base'>Edit Application</h3>
                      <p className='text-xs text-slate-500 uppercase'>{editingApp.applicationNumber}</p>
                    </div>
                    <button type='button' onClick={() => setEditingApp(null)} className='text-slate-400 hover:text-slate-700'>✕</button>
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='text-xs font-bold text-slate-700 block mb-1'>First Name</label>
                      <input name='firstName' defaultValue={editingApp.firstName ?? ''} className='w-full text-xs p-2 border border-slate-300 rounded-lg' />
                    </div>
                    <div>
                      <label className='text-xs font-bold text-slate-700 block mb-1'>Last Name</label>
                      <input name='lastName' defaultValue={editingApp.lastName ?? ''} className='w-full text-xs p-2 border border-slate-300 rounded-lg' />
                    </div>
                    <div>
                      <label className='text-xs font-bold text-slate-700 block mb-1'>Phone</label>
                      <input name='phone' defaultValue={editingApp.phone ?? ''} className='w-full text-xs p-2 border border-slate-300 rounded-lg' />
                    </div>
                    <div>
                      <label className='text-xs font-bold text-slate-700 block mb-1'>Status</label>
                      <select name='status' defaultValue={editingApp.status ?? 'SUBMITTED'} className='w-full text-xs p-2 border border-slate-300 rounded-lg'>
                        <option value='SUBMITTED'>SUBMITTED</option>
                        <option value='UNDER_REVIEW'>UNDER_REVIEW</option>
                        <option value='OFFERED'>OFFERED</option>
                        <option value='REJECTED'>REJECTED</option>
                      </select>
                    </div>
                  </div>

                  <div className='flex justify-end gap-2 pt-3 border-t border-slate-100'>
                    <button type='button' onClick={() => setEditingApp(null)} className='px-4 py-2 text-xs bg-slate-100 text-slate-700 rounded-lg font-semibold cursor-pointer'>Cancel</button>
                    <button type='submit' disabled={savingEdit} className='px-4 py-2 text-xs bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg cursor-pointer disabled:opacity-50'>
                      {savingEdit ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <div className='max-w-6xl mx-auto'>
        <h1 className='text-2xl font-bold text-gray-900'>Admissions Portal</h1>
        <p className='text-gray-600'>Welcome to the EDOCASTI Admissions Portal.</p>
      </div>
    </div>
  );
};