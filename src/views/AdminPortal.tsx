import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  AuditLog,
  Course,
  Department,
  PaymentTransaction,
  AssessmentResult,
  User,
} from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Shield,
  Settings,
  Users,
  BookOpen,
  Award,
  Wallet,
  Activity,
  Plus,
  Search,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { ContentManagementModule } from '../components/ContentManagementModule';

interface Props {
  onOpenPrintModal: (type: any, data: any) => void;
}

export const AdminPortal: React.FC<Props> = ({ onOpenPrintModal }) => {
  const { user, settings, refreshSettings } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<
    'analytics' | 'settings' | 'users' | 'academics' | 'results' | 'finance' | 'audit' | 'cms' | 'people'
  >('analytics');

  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [peopleKind, setPeopleKind] = useState<'students' | 'applications'>('students');
  const [peopleStudents, setPeopleStudents] = useState<any[]>([]);
  const [peopleApplications, setPeopleApplications] = useState<any[]>([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleEditing, setPeopleEditing] = useState<any>(null);
  const [peopleDraft, setPeopleDraft] = useState('');
  const [peopleDeleteTarget, setPeopleDeleteTarget] = useState<any>(null);
  const [peopleLoading, setPeopleLoading] = useState(false);
const [peopleSaving, setPeopleSaving] = useState(false);
const [peopleDeleting, setPeopleDeleting] = useState(false);
  const [peopleError, setPeopleError] = useState<string | null>(null);

  const loadPeopleRecords = async () => {
    if (user?.role !== 'SUPER_ADMIN') return;

    setPeopleLoading(true);
    setPeopleError(null);

    try {
      const [studentResponse, applicationResponse] = await Promise.all([
        api.getStudents(),
        api.getApplications(),
      ]);

      if (studentResponse.success) {
        setPeopleStudents(studentResponse.students || []);
      }

      if (applicationResponse.success) {
        setPeopleApplications(applicationResponse.applications || []);
      }
    } catch (error: any) {
      setPeopleError(error?.message || 'Unable to load student and applicant records.');
    } finally {
      setPeopleLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'people' && user?.role === 'SUPER_ADMIN') {
      loadPeopleRecords();
    }
  }, [activeSubTab, user]);

  const getPeopleDisplayName = (record: any) => {
    const directName = String(
      record.fullName ||
      [record.firstName, record.otherNames, record.lastName].filter(Boolean).join(' ')
    ).trim();

    if (directName) return directName;

    if (peopleKind === 'students') {
      const linkedApplication = peopleApplications.find((application: any) =>
        (
          record.applicationId &&
          String(application.id) === String(record.applicationId)
        ) ||
        (
          record.userId &&
          String(application.userId || '') === String(record.userId)
        )
      );

      if (linkedApplication) {
        const recoveredName = [
          linkedApplication.firstName,
          linkedApplication.otherNames,
          linkedApplication.lastName,
        ].filter(Boolean).join(' ').trim();

        if (recoveredName) return recoveredName;
      }
    }

    return record.matricNumber || record.applicationNumber || 'Unnamed record';
  };

  const openPeopleEditor = (record: any) => {
    const editableRecord = { ...record };

    if (peopleKind === 'students' && !editableRecord.fullName) {
      const recoveredName = getPeopleDisplayName(record);

      if (
        recoveredName !== 'Unnamed record' &&
        recoveredName !== record.matricNumber
      ) {
        editableRecord.fullName = recoveredName;
      }
    }

    setPeopleEditing(editableRecord);
    setPeopleDraft(JSON.stringify(editableRecord, null, 2));
    setPeopleError(null);
  };

  const updatePeopleEditingField = (field: string, value: string) => {
    setPeopleEditing((current: any) =>
      current ? { ...current, [field]: value } : current
    );
  };

  const savePeopleRecord = async () => {
    if (!peopleEditing || peopleSaving) return;

    setPeopleError(null);

    try {
      setPeopleSaving(true);

      if (peopleKind === 'students') {
        const matricNumber = String(peopleEditing.matricNumber || '').trim();

        if (!matricNumber) {
          throw new Error('Matriculation number cannot be empty.');
        }

        const cgpaText = String(peopleEditing.cgpa ?? '').trim();
        const creditsText = String(peopleEditing.totalCreditsEarned ?? '').trim();

        if (cgpaText !== '') {
          const cgpa = Number(cgpaText);

          if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 5) {
            throw new Error('CGPA must be a number between 0 and 5.');
          }
        }

        if (creditsText !== '') {
          const credits = Number(creditsText);

          if (!Number.isInteger(credits) || credits < 0) {
            throw new Error('Total credits must be a non-negative whole number.');
          }
        }

        const payload: any = {
          fullName: String(peopleEditing.fullName || '').trim(),
          matricNumber,
          phone: peopleEditing.phone || '',
          profileImageUrl: peopleEditing.profileImageUrl || '',
          programmeId: peopleEditing.programmeId || '',
          departmentId: peopleEditing.departmentId || '',
          schoolId: peopleEditing.schoolId || '',
          level: peopleEditing.level || '',
          sessionAdmitted: peopleEditing.sessionAdmitted || '',
          academicStatus: peopleEditing.academicStatus || 'Good Standing',
          gender: peopleEditing.gender || '',
          dob: peopleEditing.dob || '',
          emergencyContact: peopleEditing.emergencyContact || '',
          nextOfKin: peopleEditing.nextOfKin || '',
        };

        if (cgpaText !== '') {
          payload.cgpa = Number(cgpaText);
        }

        if (creditsText !== '') {
          payload.totalCreditsEarned = Number(creditsText);
        }

        await api.updateStudent(String(peopleEditing.id), payload);
      } else {
        let parsed: any;

        try {
          parsed = JSON.parse(peopleDraft);

          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            throw new Error('The record must be a JSON object.');
          }
        } catch (error: any) {
          throw new Error(error?.message || 'Invalid applicant JSON.');
        }

        await api.updateApplication(String(peopleEditing.id), parsed);
      }

      setPeopleEditing(null);
      setPeopleDraft('');

      await loadPeopleRecords();

      setMessage('Record updated successfully.');
    } catch (error: any) {
      setPeopleError(error?.message || 'The record could not be updated.');
    } finally {
      setPeopleSaving(false);
    }
  };

  const deletePeopleRecord = async (record: any) => {
    if (peopleDeleting) return;

    setPeopleDeleting(true);
    setPeopleError(null);

    try {
      if (peopleKind === 'students') {
        await api.deleteStudent(String(record.id));
      } else {
        await api.deleteApplication(String(record.id));
      }

      if (peopleEditing?.id === record.id) {
        setPeopleEditing(null);
        setPeopleDraft('');
      }

      await loadPeopleRecords();

      setMessage('Record deleted. Linked account and history were retained.');
    } catch (error: any) {
      setPeopleError(error?.message || 'The record could not be deleted.');
    } finally {
      setPeopleDeleting(false);
    }
  };
  const visiblePeopleRecords = (peopleKind === 'students' ? peopleStudents : peopleApplications)
    .filter((record: any) => {
      if (peopleKind === 'applications') {
        const status = String(record.status || '').toUpperCase();
        const alreadyStudent = peopleStudents.some(
          (student: any) => String(student.userId || '') === String(record.userId || '')
        );
        if (status === 'OFFERED' || status === 'ACCEPTED' || alreadyStudent) return false;
      }
      return true;
    })
    .filter((record: any) => {
      const query = peopleSearch.trim().toLowerCase();
      return !query || JSON.stringify(record).toLowerCase().includes(query);
    });


  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    institutionName: settings?.institutionName || '',
    shortName: settings?.shortName || '',
    currentSession: settings?.currentSession || '2025/2026',
    currentSemester: settings?.currentSemester || 'First Semester',
    admissionsOpen: settings?.admissionsOpen ?? true,
    courseRegistrationOpen: settings?.courseRegistrationOpen ?? true,
    caMaxMarks: settings?.caMaxMarks || 40,
    examMaxMarks: settings?.examMaxMarks || 60,
  });

  // User form modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'LECTURER',
    phone: '',
  });

  // Course form modal
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourse, setNewCourse] = useState({
    code: '',
    title: '',
    creditUnits: 3,
    departmentId: 'dept-agric',
    level: 'ND I',
    semester: 'First Semester',
    lecturerName: '',
  });

  const loadData = async () => {
    setLoading(true);
    try {
      // Always fetch audit logs (regardless of active tab)
      const auditRes = await api.getAuditLogs({ limit: 40 }).catch(() => ({ success: false, logs: [] }));
      if (auditRes.success && auditRes.logs) {
        setAuditLogs(auditRes.logs);
      }

      // Fetch other data based on active tab or user role
      const [statsRes, coursesRes, deptsRes] = await Promise.all([
        api.getDashboardStats().catch(() => ({ success: false, stats: null })),
        api.getCourses().catch(() => ({ success: false, courses: [] })),
        api.getDepartments().catch(() => ({ success: false, departments: [] })),
      ]);

      if (statsRes.success && statsRes.stats) setStats(statsRes.stats);
      if (coursesRes.success && coursesRes.courses) setCourses(coursesRes.courses);
      if (deptsRes.success && deptsRes.departments) setDepartments(deptsRes.departments);

      if (user && ['SUPER_ADMIN', 'INSTITUTION_ADMIN', 'REGISTRAR'].includes(user.role)) {
        const uRes = await api.getUsers().catch(() => ({ success: false, users: [] }));
        if (uRes.success && uRes.users) setUsersList(uRes.users);
      }

      if (user && ['SUPER_ADMIN', 'BURSAR', 'RECTOR'].includes(user.role)) {
        const pRes = await api.getPayments().catch(() => ({ success: false, payments: [] }));
        if (pRes.success && pRes.payments) setPayments(pRes.payments);
      }

      const rRes = await api.getResults().catch(() => ({ success: false, results: [] }));
      if (rRes.success && rRes.results) setResults(rRes.results);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Re-fetch audit logs when the audit tab is clicked
  useEffect(() => {
    if (activeSubTab === 'audit') {
      loadData();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        institutionName: settings.institutionName,
        shortName: settings.shortName,
        currentSession: settings.currentSession,
        currentSemester: settings.currentSemester,
        admissionsOpen: settings.admissionsOpen,
        courseRegistrationOpen: settings.courseRegistrationOpen,
        caMaxMarks: settings.caMaxMarks,
        examMaxMarks: settings.examMaxMarks,
      });
    }
  }, [settings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.updateSettings(settingsForm);
      if (res.success) {
        await refreshSettings();
        setMessage('Institution settings updated and audit trail recorded.');
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage(err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createUser(newUser);
      if (res.success) {
        setMessage(`New user ${newUser.fullName} (${newUser.role}) successfully created.`);
        setShowAddUserModal(false);
        setNewUser({ email: '', password: '', fullName: '', role: 'LECTURER', phone: '' });
        loadData();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserLock = async (u: User) => {
    try {
      await api.toggleUserStatus(u.id, { isLocked: !u.isLocked });
      loadData();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createCourse(newCourse);
      if (res.success) {
        setMessage(`Course ${newCourse.code} created and added to catalogue.`);
        setShowAddCourseModal(false);
        setNewCourse({
          code: '',
          title: '',
          creditUnits: 3,
          departmentId: 'dept-agric',
          level: 'ND I',
          semester: 'First Semester',
          lecturerName: '',
        });
        loadData();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      setMessage(err.message || 'Failed to add course');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResult = async (resultId: string) => {
    try {
      const res = await api.publishResult(resultId);
      if (res.success) {
        setMessage('Result approved and published to student portal.');
        loadData();
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Recharts Chart Data
  const enrollmentData = [
    { name: 'Agric Tech', students: 48, fill: '#059669' },
    { name: 'Computer Sci', students: 62, fill: '#0284c7' },
    { name: 'SLT', students: 35, fill: '#7c3aed' },
    { name: 'Animal Health', students: 28, fill: '#d97706' },
    { name: 'Fisheries', students: 22, fill: '#0d9488' },
  ];

  const financialData = [
    { name: 'Tuition Fees', value: 3200000 },
    { name: 'Acceptance', value: 850000 },
    { name: 'Farm Practicum', value: 650000 },
    { name: 'ICT Levy', value: 420000 },
  ];
  const COLORS = ['#059669', '#d97706', '#2563eb', '#7c3aed'];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Institutional Administration & Governance
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Management Portal & System Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configurable academic rules, user role access, audit logs, and executive analytics.
          </p>
        </div>

        <button
          onClick={loadData}
          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Live Data
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-emerald-700">✕</button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'analytics'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" /> Executive Analytics
        </button>

        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'settings'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" /> Academic Settings
        </button>

        <button
          onClick={() => setActiveSubTab('users')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'users'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" /> Users & RBAC
        </button>

        <button
          onClick={() => setActiveSubTab('academics')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'academics'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Course Catalogue
        </button>

        <button
          onClick={() => setActiveSubTab('results')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'results'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" /> Senate Result Moderation
        </button>

        <button
          onClick={() => setActiveSubTab('finance')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'finance'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" /> Bursary Ledger
        </button>

        <button
          onClick={() => setActiveSubTab('audit')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-emerald-800 text-white dark:bg-emerald-700'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Shield className="w-4 h-4" /> Security Audit Trail
        </button>

        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={() => setActiveSubTab('people')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'people'
                ? 'bg-emerald-800 text-white dark:bg-emerald-700'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Student & Applicant Management
          </button>
        )}

        <button
          onClick={() => setActiveSubTab('cms')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeSubTab === 'cms'
              ? 'bg-emerald-900 text-amber-400 border border-amber-400 dark:bg-emerald-800'
              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 text-amber-500" /> Content Management (CMS)
        </button>
      </div>

      {/* SUBTAB 1: Executive Analytics */}
      {activeSubTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Enrolled Students</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats?.studentsCount || 2}</div>
              <span className="text-[11px] text-emerald-600 font-semibold">Active Matriculated</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Admission Applicants</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats?.applicantsCount || 2}</div>
              <span className="text-[11px] text-amber-600 font-semibold">2025/2026 Session</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Academic Staff</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{stats?.staffCount || 5}</div>
              <span className="text-[11px] text-slate-600">Lecturers & HODs</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase">Total Revenue Settled</span>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                ₦{Number(stats?.totalRevenue || 100000).toLocaleString('en-NG')}
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">Verified via Remita</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">
                Student Enrolment by Academic Department
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={enrollmentData}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="students" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">
                Institutional Fee Collection Breakdown
              </h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={financialData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name }) => name}
                    >
                      {financialData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: Academic Settings */}
      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-slate-900">Institutional Governance Settings</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure current session, registration periods, and continuous assessment weighting.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6 mt-6 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Institution Full Name</label>
                <input
                  type="text"
                  value={settingsForm.institutionName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, institutionName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Acronym / Short Name</label>
                <input
                  type="text"
                  value={settingsForm.shortName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, shortName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Current Academic Session</label>
                <input
                  type="text"
                  value={settingsForm.currentSession}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currentSession: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Current Academic Period</label>
                <select
                  value={settingsForm.currentSemester}
                  onChange={(e) => setSettingsForm({ ...settingsForm, currentSemester: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="First Semester">First Semester</option>
                  <option value="Second Semester">Second Semester</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">CA Maximum Mark</label>
                <input
                  type="number"
                  value={settingsForm.caMaxMarks}
                  onChange={(e) => setSettingsForm({ ...settingsForm, caMaxMarks: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Exam Maximum Mark</label>
                <input
                  type="number"
                  value={settingsForm.examMaxMarks}
                  onChange={(e) => setSettingsForm({ ...settingsForm, examMaxMarks: Number(e.target.value) })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.admissionsOpen}
                  onChange={(e) => setSettingsForm({ ...settingsForm, admissionsOpen: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-semibold text-slate-800">
                  Allow Online Admission Applications (Admissions Open)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.courseRegistrationOpen}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, courseRegistrationOpen: e.target.checked })
                  }
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span className="font-semibold text-slate-800">
                  Allow Online Student Course Registration
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl cursor-pointer shadow-sm text-xs"
              >
                Save Institutional Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 3: Users & RBAC */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">User Account & Permission Management</h2>
              <p className="text-xs text-slate-500">
                Manage roles, active status, and account lockout for institutional officers and students.
              </p>
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Provision New Staff Account
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Lockout Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-slate-900">{u.fullName}</td>
                    <td className="p-3 font-mono text-slate-600">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-bold text-slate-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {u.isLocked ? (
                        <span className="text-red-700 font-bold flex items-center gap-1">
                          <Lock className="w-3.5 h-3.5" /> Locked
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Active
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserLock(u)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                      >
                        {u.isLocked ? 'Unlock' : 'Lock Account'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Provision Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">Provision New Institutional Account</h3>
                  <button onClick={() => setShowAddUserModal(false)} className="text-slate-400">✕</button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Full Name & Title</label>
                    <input
                      type="text"
                      required
                      value={newUser.fullName}
                      onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                      placeholder="e.g. Dr. Osamudiamen Egharevba"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Institutional Email</label>
                    <input
                      type="email"
                      required
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="e.g. staff.name@edocasti.edu.ng"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Initial Password</label>
                    <input
                      type="password"
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Role Assignment</label>
                    <select
                      value={newUser.role}
                      onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="LECTURER">Lecturer / Faculty</option>
                      <option value="HOD">Head of Department (HOD)</option>
                      <option value="DEAN">Faculty Dean</option>
                      <option value="ADMISSIONS_OFFICER">Admissions Officer</option>
                      <option value="BURSAR">Bursary Officer</option>
                      <option value="EXAM_OFFICER">Examination Officer</option>
                      <option value="REGISTRAR">Registrar</option>
                      <option value="INSTITUTION_ADMIN">Institution Administrator</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      className="px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Provision Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 4: Course Catalogue */}
      {activeSubTab === 'academics' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Academic Course Catalogue</h2>
              <p className="text-xs text-slate-500">
                Official approved courses across all departments and schools.
              </p>
            </div>

            <button
              onClick={() => setShowAddCourseModal(true)}
              className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" /> Add Course Offering
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3">Course Code</th>
                  <th className="p-3">Title</th>
                  <th className="p-3 text-center">Credit Units</th>
                  <th className="p-3">Level & Semester</th>
                  <th className="p-3">Lecturer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {courses.map((crs) => (
                  <tr key={crs.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold font-mono text-emerald-900">{crs.code}</td>
                    <td className="p-3 font-semibold text-slate-900">{crs.title}</td>
                    <td className="p-3 text-center font-bold">{crs.creditUnits}</td>
                    <td className="p-3 text-slate-600">
                      {crs.level} • {crs.semester}
                    </td>
                    <td className="p-3 text-slate-700">{crs.lecturerName || 'Departmental Staff'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Course Modal */}
          {showAddCourseModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">Create New Academic Course</h3>
                  <button onClick={() => setShowAddCourseModal(false)} className="text-slate-400">✕</button>
                </div>

                <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Course Code</label>
                    <input
                      type="text"
                      required
                      value={newCourse.code}
                      onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                      placeholder="e.g. AGT 114"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Course Title</label>
                    <input
                      type="text"
                      required
                      value={newCourse.title}
                      onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                      placeholder="e.g. Introduction to Crop Protection & Pest Management"
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Credit Units</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        required
                        value={newCourse.creditUnits}
                        onChange={(e) => setNewCourse({ ...newCourse, creditUnits: Number(e.target.value) })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Department</label>
                      <select
                        value={newCourse.departmentId}
                        onChange={(e) => setNewCourse({ ...newCourse, departmentId: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                      >
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowAddCourseModal(false)}
                      className="px-3 py-1.5 bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-1.5 bg-emerald-800 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Add to Catalogue
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 5: Senate Result Moderation */}
      {activeSubTab === 'results' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Academic Board / Senate Result Verification</h2>
            <p className="text-xs text-slate-500">
              Review grades entered by lecturers and publish officially to student transcripts and result slips.
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3">Course</th>
                  <th className="p-3">Matric No</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 text-center">CA / Exam</th>
                  <th className="p-3 text-center">Total</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3">Approval Status</th>
                  <th className="p-3 text-right">Senate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.map((r) => {
                  const crs = courses.find((c) => c.id === r.courseId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold font-mono text-emerald-900">{crs?.code || r.courseId}</td>
                      <td className="p-3 font-mono text-slate-600">{r.matricNumber}</td>
                      <td className="p-3 font-semibold uppercase">{r.studentName}</td>
                      <td className="p-3 text-center">{r.caScore} / {r.examScore}</td>
                      <td className="p-3 text-center font-bold">{r.totalScore}</td>
                      <td className="p-3 text-center font-black text-emerald-800">{r.grade}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {r.status !== 'PUBLISHED' ? (
                          <button
                            onClick={() => handlePublishResult(r.id)}
                            className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded text-xs cursor-pointer shadow-2xs"
                          >
                            Approve & Publish
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700 font-semibold">Published</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 6: Bursary Ledger */}
      {activeSubTab === 'finance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Bursary Reconciled Transactions Ledger</h2>
            <p className="text-xs text-slate-500">
              Verified collections from payment adapters (Remita / Interswitch / Bank Transits).
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3">Transaction Ref</th>
                  <th className="p-3">Student Ref</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Channel</th>
                  <th className="p-3">Provider Ref</th>
                  <th className="p-3">Settlement Date</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-emerald-900">{p.reference}</td>
                    <td className="p-3 font-mono text-slate-600">{p.studentId}</td>
                    <td className="p-3 font-black text-slate-900">₦{p.amount.toLocaleString('en-NG')}</td>
                    <td className="p-3 text-slate-700">{p.channel}</td>
                    <td className="p-3 font-mono text-slate-500">{p.providerReference}</td>
                    <td className="p-3 text-slate-600">{new Date(p.paidAt).toLocaleDateString('en-GB')}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onOpenPrintModal('PAYMENT_RECEIPT', p)}
                        className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold cursor-pointer"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUBTAB 7: Security Audit Trail */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Security & Operational Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Tamper-resistant audit log capturing all security events, grade submissions, fee receipts, and settings edits.
              </p>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-lg">
              {auditLogs.length} Events Captured
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Actor / Email</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Resource</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('en-GB')}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">{log.userEmail || 'SYSTEM'}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{log.resource}</td>
                    <td className="p-3 text-slate-500 max-w-xs truncate" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* SUBTAB 9: Super Admin Student and Applicant Management */}
      {activeSubTab === 'people' && user?.role === 'SUPER_ADMIN' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Student & Applicant Management</h2>
              <p className="text-xs text-slate-500 mt-1">
                Edit or delete individual records. Linked login accounts and related academic, financial and attendance history are retained.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => { setPeopleKind('students'); setPeopleEditing(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${peopleKind === 'students' ? 'bg-emerald-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
              >
                Students ({peopleStudents.length})
              </button>
              <button
                onClick={() => { setPeopleKind('applications'); setPeopleEditing(null); }}
                className={`px-4 py-2 rounded-lg text-xs font-bold ${peopleKind === 'applications' ? 'bg-emerald-800 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}`}
              >
                Applicants ({peopleApplications.filter((record: any) => !['OFFERED', 'ACCEPTED'].includes(String(record.status || '').toUpperCase()) && !peopleStudents.some((student: any) => String(student.userId || '') === String(record.userId || ''))).length})
              </button>
              <button onClick={loadPeopleRecords} disabled={peopleLoading} className="px-3 py-2 rounded-lg border text-xs font-bold">
                Refresh
              </button>
            </div>

            <input
              value={peopleSearch}
              onChange={(event) => setPeopleSearch(event.target.value)}
              placeholder={`Search ${peopleKind}...`}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />

            {peopleError && (
              <div className="rounded-lg bg-red-50 text-red-700 border border-red-200 p-3 text-sm">
                {peopleError}
              </div>
            )}

            {peopleLoading && <p className="text-sm text-slate-500">Loading student and applicant records...</p>}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-slate-500">
                    <th className="py-3 pr-3">Record</th>
                    <th className="py-3 pr-3">Reference</th>
                    <th className="py-3 pr-3">Status / Programme</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePeopleRecords.map((record: any) => (
                    <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 pr-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">
                          {getPeopleDisplayName(record)}
                        </div>
                        <div className="text-xs text-slate-500">{record.email || record.phone || record.id}</div>
                      </td>
                      <td className="py-3 pr-3 text-xs">{record.matricNumber || record.applicationNumber || record.id}</td>
                      <td className="py-3 pr-3 text-xs">{record.academicStatus || record.status || record.programmeId || '—'}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); openPeopleEditor(record); }} className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold">
                            Edit
                          </button>
                          <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setPeopleDeleteTarget(record); setPeopleError(null); }} disabled={peopleDeleting || peopleSaving} className="px-3 py-1.5 rounded-md bg-red-50 text-red-700 text-xs font-bold">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!peopleLoading && visiblePeopleRecords.length === 0 && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-500">No matching records found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {peopleEditing && (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4"
              role="presentation"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="people-editor-title"
                className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 p-5">
                  <div>
                    <h3 id="people-editor-title" className="font-bold text-slate-900 dark:text-white">
                      Edit {peopleKind === 'students' ? 'Student' : 'Applicant'} Record
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {getPeopleDisplayName(peopleEditing)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPeopleEditing(null);
                      setPeopleDraft('');
                      setPeopleError(null);
                    }}
                    className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto p-5">
                  {peopleError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {peopleError}
                    </div>
                  )}

                  <p className="text-xs text-slate-500">
                    Edit the record fields below. The server protects record ID and account ownership.
                  </p>

                  {peopleKind === 'students' ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {[
                        { key: 'fullName', label: 'Full Name', type: 'text', required: true },
                        { key: 'matricNumber', label: 'Matriculation Number', type: 'text', required: true },
                        { key: 'phone', label: 'Phone Number', type: 'tel' },
                        { key: 'profileImageUrl', label: 'Profile Image URL', type: 'url' },
                        { key: 'programmeId', label: 'Programme ID', type: 'text' },
                        { key: 'departmentId', label: 'Department ID', type: 'text' },
                        { key: 'schoolId', label: 'School ID', type: 'text' },
                        { key: 'level', label: 'Level', type: 'text' },
                        { key: 'sessionAdmitted', label: 'Session Admitted', type: 'text' },
                        { key: 'dob', label: 'Date of Birth', type: 'date' },
                        { key: 'emergencyContact', label: 'Emergency Contact', type: 'text' },
                        { key: 'nextOfKin', label: 'Next of Kin', type: 'text' },
                        { key: 'cgpa', label: 'CGPA (0–5)', type: 'number', min: '0', max: '5', step: '0.01' },
                        { key: 'totalCreditsEarned', label: 'Total Credits Earned', type: 'number', min: '0', step: '1' },
                      ].map((field: any) => (
                        <label key={field.key} className="block">
                          <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                            {field.label}
                            {field.required && <span className="ml-1 text-red-600">*</span>}
                          </span>
                          <input
                            type={field.type}
                            value={
                              field.type === 'date'
                                ? String(peopleEditing[field.key] || '').slice(0, 10)
                                : peopleEditing[field.key] ?? ''
                            }
                            required={field.required || false}
                            min={field.min}
                            max={field.max}
                            step={field.step}
                            onChange={(event) =>
                              updatePeopleEditingField(field.key, event.target.value)
                            }
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-800 dark:text-slate-100"
                          />
                        </label>
                      ))}

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                          Academic Status
                        </span>
                        <select
                          value={peopleEditing.academicStatus || 'Good Standing'}
                          onChange={(event) =>
                            updatePeopleEditingField('academicStatus', event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                        >
                          {['Good Standing', 'Probation', 'Suspended', 'Graduated'].map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="mb-1.5 block text-xs font-bold text-slate-600 dark:text-slate-300">
                          Gender
                        </span>
                        <select
                          value={peopleEditing.gender || ''}
                          onChange={(event) =>
                            updatePeopleEditingField('gender', event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>
                    </div>
                  ) : (
                    <textarea
                      value={peopleDraft}
                      onChange={(event) => setPeopleDraft(event.target.value)}
                      rows={18}
                      spellCheck={false}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 font-mono text-xs text-slate-800 dark:text-slate-100"
                    />
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 dark:border-slate-700 p-5">
                  <button
                    type="button"
                    onClick={() => {
                      setPeopleEditing(null);
                      setPeopleDraft('');
                      setPeopleError(null);
                    }}
                    disabled={peopleSaving}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-bold"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={savePeopleRecord}
                    disabled={peopleSaving}
                    className="rounded-lg bg-emerald-800 px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {peopleSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {peopleDeleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="people-delete-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-3 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 id="people-delete-title" className="font-bold text-slate-900 dark:text-white">
                  Confirm Record Deletion
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to delete this {peopleKind === 'students' ? 'student' : 'applicant'} record?
                </p>
                <p className="mt-2 break-words text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {peopleKind === 'students'
                    ? (peopleDeleteTarget.matricNumber || peopleDeleteTarget.fullName || peopleDeleteTarget.id)
                    : (peopleDeleteTarget.applicationNumber || peopleDeleteTarget.fullName || peopleDeleteTarget.id)}
                </p>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  The linked login account and related academic, financial, attendance and historical records will be retained.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPeopleDeleteTarget(null)}
                disabled={peopleDeleting}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const target = peopleDeleteTarget;
                  if (!target) return;
                  setPeopleDeleteTarget(null);
                  await deletePeopleRecord(target);
                }}
                disabled={peopleDeleting}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {peopleDeleting ? 'Deleting...' : 'Yes, Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* SUBTAB 8: Content Management System (CMS) */}
      {activeSubTab === 'cms' && <ContentManagementModule />}
    </div>
  );
};
