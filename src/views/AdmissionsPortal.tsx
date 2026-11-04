import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { AdmissionApplication, Programme } from '../types';
import {
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Award,
  Send,
  Printer,
  ChevronRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface Props {
  onOpenPrintModal: (type: any, data: any) => void;
  onGoToStudentWorkspace: () => void;
  onOpenLoginModal: () => void;
}

export const AdmissionsPortal: React.FC<Props> = ({
  onOpenPrintModal,
  onGoToStudentWorkspace,
  onOpenLoginModal,
}) => {
  const { user, settings } = useAuth();
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [myApp, setMyApp] = useState<AdmissionApplication | null>(null);
  const [allApps, setAllApps] = useState<AdmissionApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: user?.fullName.split(' ')[0] || '',
    lastName: user?.fullName.split(' ')[1] || '',
    otherNames: '',
    gender: 'Male',
    dob: '2005-06-15',
    phone: user?.phone || '+234 810 000 0000',
    programmeId: 'prog-nd-agric',
    stateOfOrigin: 'Edo State',
    lga: 'Oredo',
    residentialAddress: 'Benin City, Edo State',
    oLevel1Subject: 'English Language',
    oLevel1Grade: 'C4',
    oLevel2Subject: 'Mathematics',
    oLevel2Grade: 'B3',
    oLevel3Subject: 'Agricultural Science',
    oLevel3Grade: 'A1',
    oLevel4Subject: 'Biology',
    oLevel4Grade: 'B2',
    oLevel5Subject: 'Chemistry',
    oLevel5Grade: 'C5',
    examType: 'WAEC',
    examNumber: '420199201',
  });

  // Review decision state for staff
  const [decisionStatus, setDecisionStatus] = useState<'OFFERED' | 'REJECTED' | 'UNDER_REVIEW'>('OFFERED');
  const [screeningNotes, setScreeningNotes] = useState('');

  const isStaff =
    user && ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'REGISTRAR', 'ADMISSIONS_OFFICER'].includes(user.role);

  const loadData = async () => {
    setLoading(true);
    try {
      const progRes = await api.getProgrammes();
      if (progRes.success) setProgrammes(progRes.programmes);

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

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onOpenLoginModal();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        otherNames: formData.otherNames,
        gender: formData.gender,
        dob: formData.dob,
        phone: formData.phone,
        programmeId: formData.programmeId,
        stateOfOrigin: formData.stateOfOrigin,
        lga: formData.lga,
        residentialAddress: formData.residentialAddress,
        oLevelResults: [
          { subject: formData.oLevel1Subject, grade: formData.oLevel1Grade, examNumber: formData.examNumber, examType: formData.examType },
          { subject: formData.oLevel2Subject, grade: formData.oLevel2Grade, examNumber: formData.examNumber, examType: formData.examType },
          { subject: formData.oLevel3Subject, grade: formData.oLevel3Grade, examNumber: formData.examNumber, examType: formData.examType },
          { subject: formData.oLevel4Subject, grade: formData.oLevel4Grade, examNumber: formData.examNumber, examType: formData.examType },
          { subject: formData.oLevel5Subject, grade: formData.oLevel5Grade, examNumber: formData.examNumber, examType: formData.examType },
        ],
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
    setLoading(true);
    try {
      const res = await api.acceptOffer(appId);
      if (res.success) {
        setSuccessMsg('Congratulations! Admission offer accepted. You are now fully onboarded as an EDOCASTI student!');
        loadData();
        setTimeout(() => {
          onGoToStudentWorkspace();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to accept offer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Admissions Registry
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {isStaff ? 'Admissions Committee Screening Portal' : '2025/2026 Online Admission & Screening'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official National Diploma (ND) and Higher National Diploma (HND) application processing.
          </p>
        </div>

        {myApp && (
          <button
            onClick={() => onOpenPrintModal('ADMISSION_LETTER', myApp)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Print Application Slip
          </button>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="font-bold text-emerald-600">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-red-600">✕</button>
        </div>
      )}

      {/* STAFF VIEW: Applications Table */}
      {isStaff && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden space-y-4 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Submitted Applicant Register</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Screen credentials, inspect O-Level grades, and record admission decisions.</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-lg">
              Total Applicants: {allApps.length}
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3">Ref Number</th>
                  <th className="p-3">Applicant Name</th>
                  <th className="p-3">Programme</th>
                  <th className="p-3">O-Level Highlights</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {allApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="p-3 font-mono font-bold text-emerald-900 dark:text-emerald-400">{app.applicationNumber}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white uppercase">
                      {app.firstName} {app.lastName}
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      {programmes.find((p) => p.id === app.programmeId)?.name || 'Agricultural Technology'}
                    </td>
                    <td className="p-3">
                      <span className="text-[11px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono">
                        {app.oLevelResults?.length || 5} Subjects Verified
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-full ${
                          app.status === 'OFFERED'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : app.status === 'ACCEPTED'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : app.status === 'REJECTED'
                            ? 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setDecisionStatus(app.status === 'REJECTED' ? 'REJECTED' : 'OFFERED');
                          setScreeningNotes(app.screeningNotes || '');
                        }}
                        className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold rounded cursor-pointer text-xs"
                      >
                        Screen & Decide
                      </button>
                      <button
                        onClick={() => onOpenPrintModal('ADMISSION_LETTER', app)}
                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer text-xs"
                      >
                        Letter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Decision Modal / Drawer */}
          {selectedApp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      Screening Application: {selectedApp.applicationNumber}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                      {selectedApp.firstName} {selectedApp.lastName} • {selectedApp.stateOfOrigin} ({selectedApp.lga})
                    </p>
                  </div>
                  <button onClick={() => setSelectedApp(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">✕</button>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Submitted O-Level Results (WAEC/NECO):
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      {selectedApp.oLevelResults?.map((r, i) => (
                        <div key={i} className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
                          <span className="text-slate-600 dark:text-slate-400">{r.subject}:</span>
                          <span className="font-bold font-mono text-emerald-800 dark:text-emerald-400">{r.grade}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Admission Decision
                    </label>
                    <select
                      value={decisionStatus}
                      onChange={(e: any) => setDecisionStatus(e.target.value)}
                      className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg"
                    >
                      <option value="OFFERED">Grant Provisional Offer of Admission (OFFERED)</option>
                      <option value="UNDER_REVIEW">Place Under Review (UNDER_REVIEW)</option>
                      <option value="REJECTED">Decline Application (REJECTED)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block mb-1">
                      Screening Notes & Comments
                    </label>
                    <textarea
                      rows={3}
                      value={screeningNotes}
                      onChange={(e) => setScreeningNotes(e.target.value)}
                      placeholder="Add official screening comments regarding qualification eligibility..."
                      className="w-full text-xs p-2 border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="px-4 py-2 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDecisionSubmit(selectedApp.id)}
                    className="px-4 py-2 text-xs bg-emerald-800 hover:bg-emerald-900 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold rounded-lg cursor-pointer"
                  >
                    Confirm & Publish Decision
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* APPLICANT VIEW: Application Status or Admission Form */}
      {!isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Tracker Card (if application exists) */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-800" /> Application Status
              </h2>

              {myApp ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reference:</span>
                      <span className="font-mono font-bold text-emerald-900">{myApp.applicationNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Applicant:</span>
                      <span className="font-semibold uppercase">{myApp.firstName} {myApp.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Programme:</span>
                      <span className="font-semibold text-right">
                        {programmes.find((p) => p.id === myApp.programmeId)?.name || 'Agricultural Technology'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Status:</span>
                      <span
                        className={`px-2.5 py-0.5 font-bold rounded-full text-[11px] ${
                          myApp.status === 'OFFERED'
                            ? 'bg-amber-100 text-amber-800'
                            : myApp.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : myApp.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {myApp.status}
                      </span>
                    </div>
                  </div>

                  {myApp.status === 'OFFERED' && (
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                        <Award className="w-5 h-5 text-amber-600" /> Provisional Offer Ready!
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        You have been officially offered admission into EDOCASTI. Accept the offer below to proceed to matriculation and student profile activation.
                      </p>

                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          onClick={() => onOpenPrintModal('ADMISSION_LETTER', myApp)}
                          className="w-full py-2 bg-white hover:bg-slate-50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" /> View / Print Offer Letter
                        </button>

                        <button
                          onClick={() => handleAcceptOffer(myApp.id)}
                          className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" /> Accept Admission Offer Now
                        </button>
                      </div>
                    </div>
                  )}

                  {myApp.status === 'ACCEPTED' && (
                    <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-xl space-y-2 text-xs text-emerald-900">
                      <div className="font-bold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Admission Offer Accepted
                      </div>
                      <p>Your student profile is active. You can now access course registration and fee settlement.</p>
                      <button
                        onClick={onGoToStudentWorkspace}
                        className="w-full py-2 bg-emerald-800 text-white font-semibold rounded-lg mt-2 cursor-pointer"
                      >
                        Go to Student Workspace →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 space-y-3">
                  <p>You have not submitted an admission application yet for the {settings?.currentSession || '2025/2026'} academic session.</p>
                  <p className="text-slate-400">Fill in the form on the right to apply.</p>
                </div>
              )}
            </div>

            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 text-xs text-amber-900 space-y-2">
              <span className="font-bold uppercase tracking-wider block">Admissions Helpdesk</span>
              <p>For inquiries regarding O-Level subject combinations, contact the admissions office at <strong>admissions@edocasti.edu.ng</strong>.</p>
            </div>
          </div>

          {/* Admission Application Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
              <div>
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Online Screening Form
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                  National Diploma (ND) / HND Application
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Ensure all supplied biodata and O-Level examination results are accurate according to your WAEC/NECO certificates.
                </p>
              </div>

              <form onSubmit={handleSubmitApplication} className="space-y-6 text-xs">
                {/* Step 1: Biodata */}
                <div className="space-y-3 border-b border-slate-100 pb-5">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-emerald-800">
                    1. Applicant Personal Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Last Name / Surname</label>
                      <input
                        type="text"
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Date of Birth</label>
                      <input
                        type="date"
                        required
                        value={formData.dob}
                        onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">State of Origin</label>
                      <input
                        type="text"
                        required
                        value={formData.stateOfOrigin}
                        onChange={(e) => setFormData({ ...formData, stateOfOrigin: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">LGA of Origin</label>
                      <input
                        type="text"
                        required
                        value={formData.lga}
                        onChange={(e) => setFormData({ ...formData, lga: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Programme Choice */}
                <div className="space-y-3 border-b border-slate-100 pb-5">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-emerald-800">
                    2. Programme of Choice
                  </h3>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Select Academic Programme</label>
                    <select
                      value={formData.programmeId}
                      onChange={(e) => setFormData({ ...formData, programmeId: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      {programmes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.qualification} - {p.durationYears} Years)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Step 3: O-Level Examination Grades */}
                <div className="space-y-3 border-b border-slate-100 pb-5">
                  <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-emerald-800">
                    3. O-Level Examination Records (WAEC / NECO / NABTEB)
                  </h3>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Examination Body</label>
                      <select
                        value={formData.examType}
                        onChange={(e) => setFormData({ ...formData, examType: e.target.value })}
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                      >
                        <option value="WAEC">WAEC (SSCE)</option>
                        <option value="NECO">NECO (SSCE)</option>
                        <option value="NABTEB">NABTEB</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Candidate Exam Number</label>
                      <input
                        type="text"
                        required
                        value={formData.examNumber}
                        onChange={(e) => setFormData({ ...formData, examNumber: e.target.value })}
                        placeholder="e.g. 4201992011"
                        className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-3 gap-2 font-semibold text-slate-600 pb-1">
                      <span className="col-span-2">Subject Name</span>
                      <span>Grade Attained</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                      <input
                        type="text"
                        value={formData.oLevel1Subject}
                        readOnly
                        className="col-span-2 p-2 bg-white border border-slate-200 rounded text-xs"
                      />
                      <select
                        value={formData.oLevel1Grade}
                        onChange={(e) => setFormData({ ...formData, oLevel1Grade: e.target.value })}
                        className="p-2 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                      >
                        {['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                      <input
                        type="text"
                        value={formData.oLevel2Subject}
                        readOnly
                        className="col-span-2 p-2 bg-white border border-slate-200 rounded text-xs"
                      />
                      <select
                        value={formData.oLevel2Grade}
                        onChange={(e) => setFormData({ ...formData, oLevel2Grade: e.target.value })}
                        className="p-2 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                      >
                        {['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                      <input
                        type="text"
                        value={formData.oLevel3Subject}
                        onChange={(e) => setFormData({ ...formData, oLevel3Subject: e.target.value })}
                        className="col-span-2 p-2 bg-white border border-slate-300 rounded text-xs"
                      />
                      <select
                        value={formData.oLevel3Grade}
                        onChange={(e) => setFormData({ ...formData, oLevel3Grade: e.target.value })}
                        className="p-2 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                      >
                        {['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                      <input
                        type="text"
                        value={formData.oLevel4Subject}
                        onChange={(e) => setFormData({ ...formData, oLevel4Subject: e.target.value })}
                        className="col-span-2 p-2 bg-white border border-slate-300 rounded text-xs"
                      />
                      <select
                        value={formData.oLevel4Grade}
                        onChange={(e) => setFormData({ ...formData, oLevel4Grade: e.target.value })}
                        className="p-2 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                      >
                        {['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2 items-center">
                      <input
                        type="text"
                        value={formData.oLevel5Subject}
                        onChange={(e) => setFormData({ ...formData, oLevel5Subject: e.target.value })}
                        className="col-span-2 p-2 bg-white border border-slate-300 rounded text-xs"
                      />
                      <select
                        value={formData.oLevel5Grade}
                        onChange={(e) => setFormData({ ...formData, oLevel5Grade: e.target.value })}
                        className="p-2 bg-white border border-slate-300 rounded text-xs font-bold font-mono"
                      >
                        {['A1', 'B2', 'B3', 'C4', 'C5', 'C6', 'D7', 'E8', 'F9'].map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Send className="w-4 h-4" />
                    {myApp ? 'Update & Re-Submit Application' : 'Submit Admission Application Online'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
