import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Student, Course, CourseRegistration, AssessmentResult, Invoice } from '../types';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CreditCard,
  Printer,
  CheckCircle,
  Clock,
  Award,
  AlertCircle,
  FileText,
  ShieldCheck,
  Send,
} from 'lucide-react';

interface Props {
  onOpenPrintModal: (type: any, data: any) => void;
}

export const StudentPortal: React.FC<Props> = ({ onOpenPrintModal }) => {
  const { user, settings } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [myApplication, setMyApplication] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'courses' | 'results' | 'finance' | 'idcard'>('courses');
  const [eligibleCourses, setEligibleCourses] = useState<Course[]>([]);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [currentReg, setCurrentReg] = useState<CourseRegistration | null>(null);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const stdRes = await api.getMyStudentProfile();
      const appRes = await api.getMyApplication();
      if (appRes.success) setMyApplication(appRes.application);
      if (stdRes.success) {
        setStudent(stdRes.student);

        if (!stdRes.student) {
          console.warn('[StudentPortal] No student record for this user — skipping course/registration/results/invoice load.');
        }

        const crsRes = await api.getCourses({ departmentId: stdRes.student?.departmentId, level: stdRes.student?.level, semester: settings?.currentSemester || 'First' });
        if (crsRes.success) {
          setEligibleCourses(crsRes.courses);
        }

        const regRes = await api.getMyRegistration();
        if (regRes.success && regRes.registration) {
          setCurrentReg(regRes.registration);
          setSelectedCourseIds(regRes.registration.courseIds || []);
        } else {
          if (crsRes.success) {
            setSelectedCourseIds(crsRes.courses.map((c) => c.id));
          }
        }

        const resRes = await api.getMyResults();
        if (resRes.success) {
          setResults(resRes.results);
        }

        const invRes = await api.getInvoices();
        if (invRes.success) {
          setInvoices(invRes.invoices);
        }
      }
    } catch (err: any) {
      console.error('Failed to load student details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentData();
  }, [user]);

  const toggleCourse = (id: string) => {
    if (currentReg?.status === 'APPROVED_BY_HOD') return;
    if (selectedCourseIds.includes(id)) {
      setSelectedCourseIds(selectedCourseIds.filter((cid) => cid !== id));
    } else {
      setSelectedCourseIds([...selectedCourseIds, id]);
    }
  };

  const handleRegisterCourses = async () => {
    if (selectedCourseIds.length === 0) {
      setStatusMessage('Please select at least one course.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.registerCourses(selectedCourseIds);
      if (res.success) {
        setCurrentReg(res.registration);
        setStatusMessage('Course registration submitted successfully! Awaiting HOD sign-off.');
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const res = await api.payInvoice(invoiceId, 'Remita');
      if (res.success) {
        setStatusMessage('Payment settled and verified via Remita. Electronic receipt generated.');
        loadStudentData();
        onOpenPrintModal('PAYMENT_RECEIPT', res.transaction);
      }
    } catch (err: any) {
      setStatusMessage(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const totalSelectedCredits = eligibleCourses
    .filter((c) => selectedCourseIds.includes(c.id))
    .reduce((sum, c) => sum + Number(c.units || c.creditUnits || 0), 0);

  const calculateGPA = () => {
    if (!results || results.length === 0) return { gpa: 'N/A', credits: 0 };
    const approvedResults = results.filter((r: any) => r.status === 'APPROVED' || r.status === 'PUBLISHED');
    if (approvedResults.length === 0) return { gpa: 'N/A', credits: 0 };

    let totalPoints = 0;
    let totalCredits = 0;

    approvedResults.forEach((r: any) => {
      const gradePoints: Record<string, number> = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
      const point = gradePoints[r.grade] || 0;
      const credits = r.creditUnits || 3;
      totalPoints += (point * credits);
      totalCredits += credits;
    });

    if (totalCredits === 0) return { gpa: 'N/A', credits: 0 };
    return { gpa: (totalPoints / totalCredits).toFixed(2), credits: totalCredits };
  };

  const gpaData = calculateGPA();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Student Banner */}
      <div className="bg-linear-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-wrap items-center justify-between gap-6 border border-emerald-800">
        <div className="flex items-center gap-4">
          {student?.profileImageUrl ? (
            <img
              src={student.profileImageUrl}
              alt={student.fullName || 'Student'}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400 shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-amber-300 flex items-center justify-center font-bold text-3xl border-2 border-amber-400 shadow-md">
              🎓
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-400 text-slate-950 uppercase">
                {student?.level || 'ND I'} Student
              </span>
              <span className="text-xs text-emerald-300 font-semibold">
                Status: {student?.academicStatus || 'Good Standing'}
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-1 text-white uppercase tracking-tight">
              {student?.fullName || user?.fullName}
            </h1>
            <p className="text-xs text-emerald-200 font-mono mt-0.5">
              Matriculation No: <strong>{student?.matricNumber || 'EDOCASTI/ND/2024/0101'}</strong>
            </p>
            <p className="text-xs text-emerald-300/80 mt-0.5">
              {student?.programmeName || 'National Diploma in Agricultural Technology'} • {student?.departmentName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/10 px-5 py-3 rounded-2xl backdrop-blur-xs border border-white/10">
          <div className="text-right">
            <span className="text-xs text-emerald-200 block uppercase font-semibold">Cumulative GPA</span>
            <span className="text-2xl font-black text-amber-400">{student?.cgpa || gpaData.gpa}</span>
            <span className="text-[10px] text-emerald-300 block">Scale: 5.00</span>
          </div>
          <div className="h-10 w-[1px] bg-white/20"></div>
          <div className="text-right">
            <span className="text-xs text-emerald-200 block uppercase font-semibold">Session</span>
            <span className="text-sm font-bold text-white">{settings?.currentSession || '2025/2026'}</span>
            <span className="text-[10px] text-emerald-300 block">{settings?.currentSemester}</span>
          </div>
        </div>
      </div>

      {/* Document Actions: Admission Letter & Application Form */}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          onClick={() => onOpenPrintModal('ADMISSION_LETTER', { 
            ...student, 
            applicationNumber: student?.matricNumber || 'EDOCASTI/2026/2C3549',
            firstName: student?.fullName?.split(' ')[0] || 'Student',
            lastName: student?.fullName?.split(' ')[1] || '',
            programmeName: student?.programmeName || 'National Diploma in Agricultural Technology',
            profileImageUrl: student?.profileImageUrl
          })}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 flex items-center gap-2 shadow-sm cursor-pointer transition"
        >
          <Printer className="w-4 h-4" /> View / Print Admission Letter
        </button>

        <button
          onClick={() => onOpenPrintModal('APPLICATION_FORM', { 
            ...myApplication,
            profileImageUrl: myApplication?.profileImageUrl || student?.profileImageUrl,
            programmeName: student?.programmeName || 'National Diploma in Agricultural Technology',
            status: myApplication?.status || 'ACCEPTED'
          })}
          className="px-4 py-2 bg-white hover:bg-slate-50 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 flex items-center gap-2 shadow-sm cursor-pointer transition"
        >
          <FileText className="w-4 h-4" /> View / Print Application Form
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold text-emerald-700">✓</button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSection('courses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSection === 'courses'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Course Enrolment & Slips
        </button>

        <button
          onClick={() => setActiveSection('results')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSection === 'results'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" /> Examination Results & Transcripts
        </button>

        <button
          onClick={() => setActiveSection('finance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSection === 'finance'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" /> Bursary Fees & Payments
        </button>

        <button
          onClick={() => setActiveSection('idcard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSection === 'idcard'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Student ID Card
        </button>
      </div>

      {/* Section 1: Course Registration */}
      {activeSection === 'courses' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {settings?.currentSession} Course Registration Register
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select your required departmental courses. Institutional semester credit limits: 10 - 24 units.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg">
                Selected: {totalSelectedCredits} Credit Units
              </span>

              {currentReg && (
                <button
                  onClick={() =>
                    onOpenPrintModal('COURSE_REGISTRATION', {
                      student,
                      totalCredits: currentReg.totalCredits,
                      coursesList: eligibleCourses.filter((c) => currentReg.courseIds.includes(c.id)),
                    })
                  }
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Print Course Slip
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3 w-10">Select</th>
                  <th className="p-3">Course Code</th>
                  <th className="p-3">Course Title</th>
                  <th className="p-3 text-center">Units</th>
                  <th className="p-3">Lecturer</th>
                  <th className="p-3">Level / Semester</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {eligibleCourses.map((crs) => {
                  const isChecked = selectedCourseIds.includes(crs.id);
                  const isApproved = currentReg?.status === 'APPROVED_BY_HOD';
                  return (
                    <tr
                      key={crs.id}
                      className={`transition ${isChecked ? 'bg-emerald-50/40' : 'hover:bg-slate-50'}`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isApproved}
                          onChange={() => toggleCourse(crs.id)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-bold font-mono text-emerald-900">{crs.code}</td>
                      <td className="p-3 font-semibold text-slate-900">{crs.title}</td>
                      <td className="p-3 text-center font-bold">{crs.creditUnits}</td>
                      <td className="p-3 text-slate-600">{crs.lecturerName || 'Faculty Assigned'}</td>
                      <td className="p-3 text-slate-500">
                        {crs.level} • {crs.semester}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Registration Status:{' '}
              <strong className="text-emerald-800">
                {currentReg?.status || 'NOT_SUBMITTED'}
              </strong>
            </div>

            {currentReg?.status !== 'APPROVED_BY_HOD' && (
              <button
                onClick={handleRegisterCourses}
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-sm transition"
              >
                <Send className="w-4 h-4" /> Submit Course Registration to HOD
              </button>
            )}
          </div>
        </div>
      )}

      {/* Section 2: Results */}
      {activeSection === 'results' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Published Academic Results & Continuous Assessment
              </h2>
              <p className="text-xs text-slate-500">
                Senate approved grades and GPA breakdown for {settings?.currentSession}.
              </p>
            </div>

            {results.length > 0 && (
              <button
                onClick={() =>
                  onOpenPrintModal('RESULT_SLIP', {
                    student,
                    resultsList: results,
                  })
                }
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Download Official Result Slip
              </button>
            )}
          </div>

          {results.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-800 text-white uppercase text-[11px]">
                  <tr>
                    <th className="p-3">Course Code</th>
                    <th className="p-3">Course Title</th>
                    <th className="p-3 text-center">CA ({settings?.caMaxMarks || 40})</th>
                    <th className="p-3 text-center">Exam ({settings?.examMaxMarks || 60})</th>
                    <th className="p-3 text-center">Total (100)</th>
                    <th className="p-3 text-center">Grade</th>
                    <th className="p-3 text-center">Grade Point</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {results.map((r) => {
                    const crs = eligibleCourses.find((c) => c.id === r.courseId);
                    
  // Calculate GPA dynamically from approved results
  const calculateGPA = () => {
    if (!results || results.length === 0) return { gpa: 'N/A', credits: 0 };
    
    // We only calculate GPA from approved results
    const approvedResults = results.filter((r: any) => r.status === 'APPROVED' || r.status === 'PUBLISHED');
    if (approvedResults.length === 0) return { gpa: 'N/A', credits: 0 };

    let totalPoints = 0;
    let totalCredits = 0;

    approvedResults.forEach((r: any) => {
      // Assume grade is A, B, C, D, E, F and creditUnits is available
      const gradePoints: Record<string, number> = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'E': 1, 'F': 0 };
      const point = gradePoints[r.grade] || 0;
      const credits = r.creditUnits || 3; // fallback to 3 if missing
      
      totalPoints += (point * credits);
      totalCredits += credits;
    });

    if (totalCredits === 0) return { gpa: 'N/A', credits: 0 };
    return { gpa: (totalPoints / totalCredits).toFixed(2), credits: totalCredits };
  };

  const gpaData = calculateGPA();

return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-bold text-emerald-900">{crs?.code || r.courseId}</td>
                        <td className="p-3 text-slate-800 font-medium">{crs?.title || 'Academic Course'}</td>
                        <td className="p-3 text-center">{r.caScore}</td>
                        <td className="p-3 text-center">{r.examScore}</td>
                        <td className="p-3 text-center font-bold text-slate-900">{r.totalScore}</td>
                        <td className="p-3 text-center font-black text-emerald-800 text-sm">{r.grade}</td>
                        <td className="p-3 text-center font-bold">{r.gradePoint.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs space-y-2">
              <p>No published examination results yet for this semester.</p>
              <p className="text-slate-400">Results will appear once verified by HOD and approved by Academic Board/Senate.</p>
            </div>
          )}
        </div>
      )}

      {/* Section 3: Finance & Invoices */}
      {activeSection === 'finance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Student Fee Invoices & Bursary Clearance</h2>
            <p className="text-xs text-slate-500">
              Settle tuition, acceptance, and departmental levies securely via integrated payment channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono font-bold text-slate-500">{inv.invoiceNumber}</span>
                    <span
                      className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm mt-2">{inv.title}</h3>
                  <div className="text-2xl font-black text-emerald-950 mt-1">
                    â‚¦{inv.amount.toLocaleString('en-NG')}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Due Date: {inv.dueDate}</div>
                </div>

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  {inv.status === 'PAID' ? (
                    <button
                      onClick={() =>
                        onOpenPrintModal('PAYMENT_RECEIPT', {
                          reference: `EDOCASTI-TX-${inv.id.slice(-6)}`,
                          amount: inv.amount,
                          paidAt: inv.createdAt,
                          channel: 'Remita Verified',
                          providerReference: 'RRR-8819-201',
                        })
                      }
                      className="w-full py-2 bg-white hover:bg-slate-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Download Official Receipt
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePayInvoice(inv.id)}
                      disabled={loading}
                      className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <CreditCard className="w-4 h-4" /> Pay â‚¦{inv.amount.toLocaleString('en-NG')} via Remita
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Student ID Card */}
      {activeSection === 'idcard' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6 text-center">
          <div>
            <h2 className="text-base font-bold text-slate-900">Student Identity Verification Card</h2>
            <p className="text-xs text-slate-500">Official institutional digital identity credential.</p>
          </div>

          <div className="flex justify-center py-4">
            <button
              onClick={async () => {
                let s: any = (student || {});
                try {
                  const fresh: any = await api.getMyStudentProfile();
                  const incoming = fresh?.student || fresh?.data?.student || (fresh as any);
                  if (incoming && (incoming.id || incoming.matricNumber || incoming.userId)) {
                    s = incoming;
                  }
                  console.log('[ID CARD] fresh student payload:', s);
                } catch (e) {
                  console.warn('Could not refresh student record before opening ID card', e);
                }
                const u = (user || {}) as any;
                const photo =
                  s.profileImageUrl ||
                  s.photo ||
                  s.photoUrl ||
                  s.image ||
                  s.avatarUrl ||
                  u.profileImageUrl ||
                  u.photo ||
                  u.photoUrl ||
                  u.image ||
                  u.avatarUrl ||
                  '';
                onOpenPrintModal('STUDENT_ID', { student: { ...s, profileImageUrl: photo } });
              }}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" /> Print / Save Full-Scale ID Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
