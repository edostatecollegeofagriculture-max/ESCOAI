import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Course, Student, AssessmentResult } from '../types';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle,
  Save,
  Send,
  Users,
  Award,
  AlertCircle,
  Check,
} from 'lucide-react';

export const LecturerPortal: React.FC = () => {
  const { user, settings } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Score input matrix
  const [scoreInputs, setScoreInputs] = useState<Record<string, { ca: number; exam: number }>>({});

  // Attendance sub-view
  const [activeTab, setActiveTab] = useState<'scores' | 'attendance'>('scores');
  const [attendanceTopic, setAttendanceTopic] = useState('');
  const [attendanceType, setAttendanceType] = useState<'Lecture' | 'Laboratory' | 'Field Practical'>('Field Practical');
  const [attendanceChecks, setAttendanceChecks] = useState<Record<string, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const crsRes = await api.getCourses();
      if (crsRes.success) {
        // Filter courses or show all for HOD / Super Admin
        let myCourses = crsRes.courses;
        if (user?.role === 'LECTURER') {
          myCourses = crsRes.courses.filter((c) => c.lecturerId === user.id || !c.lecturerId);
        }
        setCourses(myCourses);
        if (myCourses.length > 0 && !selectedCourse) {
          setSelectedCourse(myCourses[0]);
        }
      }

      const stdRes = await api.getStudents();
      if (stdRes.success) {
        setStudents(stdRes.students);
        // Initialize attendance checks
        const checks: Record<string, boolean> = {};
        stdRes.students.forEach((s) => (checks[s.id] = true));
        setAttendanceChecks(checks);
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

  // Load results for selected course
  useEffect(() => {
    if (selectedCourse) {
      api.getResults({ courseId: selectedCourse.id }).then((res) => {
        if (res.success) {
          setResults(res.results);
          const matrix: Record<string, { ca: number; exam: number }> = {};
          res.results.forEach((r) => {
            matrix[r.studentId] = { ca: r.caScore, exam: r.examScore };
          });
          setScoreInputs(matrix);
        }
      });
    }
  }, [selectedCourse]);

  const handleScoreChange = (studentId: string, field: 'ca' | 'exam', val: number) => {
    const current = scoreInputs[studentId] || { ca: 0, exam: 0 };
    const max = field === 'ca' ? settings?.caMaxMarks || 40 : settings?.examMaxMarks || 60;
    const clamped = Math.max(0, Math.min(val, max));

    setScoreInputs({
      ...scoreInputs,
      [studentId]: {
        ...current,
        [field]: clamped,
      },
    });
  };

  const handleSaveScore = async (student: Student) => {
    if (!selectedCourse) return;
    const scores = scoreInputs[student.id] || { ca: 0, exam: 0 };

    setLoading(true);
    try {
      const res = await api.submitScore({
        courseId: selectedCourse.id,
        studentId: student.id,
        matricNumber: student.matricNumber,
        studentName: student.fullName,
        session: settings?.currentSession,
        semester: settings?.currentSemester,
        caScore: scores.ca,
        examScore: scores.exam,
      });

      if (res.success) {
        setSaveSuccess(`Score recorded for ${student.fullName} (${student.matricNumber})`);
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAttendance = async () => {
    if (!selectedCourse || !attendanceTopic) return;
    setLoading(true);
    try {
      const records = students.map((s) => ({
        studentId: s.id,
        matricNumber: s.matricNumber,
        studentName: s.fullName || 'Student',
        isPresent: !!attendanceChecks[s.id],
      }));

      const res = await api.recordAttendance({
        courseId: selectedCourse.id,
        type: attendanceType,
        topic: attendanceTopic,
        records,
      });

      if (res.success) {
        setSaveSuccess(`Attendance for '${attendanceTopic}' registered successfully!`);
        setAttendanceTopic('');
        setTimeout(() => setSaveSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Academic Faculty Workspace
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            Course Assessments, Examination Marks & Attendance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Lecturer grade entry for Continuous Assessment (CA) and Semester Examinations.
          </p>
        </div>

        {/* Course Selector Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-700">Course:</label>
          <select
            value={selectedCourse?.id || ''}
            onChange={(e) => {
              const crs = courses.find((c) => c.id === e.target.value);
              setSelectedCourse(crs || null);
            }}
            className="text-xs p-2.5 font-bold border border-slate-300 rounded-xl bg-white shadow-xs"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.title} ({c.creditUnits} Units)
              </option>
            ))}
          </select>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Tabs: Score Entry vs Attendance */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('scores')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'scores'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          <Award className="w-4 h-4" /> Continuous Assessment & Exam Scores
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-emerald-800 text-white'
              : 'bg-white text-slate-700 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" /> Practical Farm & Lab Attendance
        </button>
      </div>

      {/* Tab 1: Scores Table */}
      {activeTab === 'scores' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Grade Roster: {selectedCourse?.code} ({selectedCourse?.title})
              </h2>
              <p className="text-xs text-slate-500">
                CA Max: {settings?.caMaxMarks || 40} marks | Exam Max: {settings?.examMaxMarks || 60} marks.
                Pass mark: 40% (Nigerian Polytechnic Standard).
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
              Enrolled: {students.length} Students
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3">Matric Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3 text-center">CA Marks ({settings?.caMaxMarks || 40})</th>
                  <th className="p-3 text-center">Exam Marks ({settings?.examMaxMarks || 60})</th>
                  <th className="p-3 text-center">Total (100)</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((std) => {
                  const entry = scoreInputs[std.id] || { ca: 0, exam: 0 };
                  const total = (entry.ca || 0) + (entry.exam || 0);
                  let grade = 'F';
                  if (total >= 70) grade = 'A';
                  else if (total >= 60) grade = 'B';
                  else if (total >= 50) grade = 'C';
                  else if (total >= 45) grade = 'D';
                  else if (total >= 40) grade = 'E';

                  return (
                    <tr key={std.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-emerald-900">{std.matricNumber}</td>
                      <td className="p-3 font-semibold text-slate-900 uppercase">{std.fullName}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={settings?.caMaxMarks || 40}
                          value={entry.ca}
                          onChange={(e) => handleScoreChange(std.id, 'ca', Number(e.target.value))}
                          className="w-16 p-1.5 border border-slate-300 rounded text-center font-bold text-xs"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={settings?.examMaxMarks || 60}
                          value={entry.exam}
                          onChange={(e) => handleScoreChange(std.id, 'exam', Number(e.target.value))}
                          className="w-16 p-1.5 border border-slate-300 rounded text-center font-bold text-xs"
                        />
                      </td>
                      <td className="p-3 text-center font-bold text-slate-900 text-sm">{total}</td>
                      <td className="p-3 text-center font-black text-emerald-800 text-sm">{grade}</td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleSaveScore(std)}
                          className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded text-xs cursor-pointer shadow-2xs"
                        >
                          Save Score
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Attendance Sub-View */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Record Attendance: {selectedCourse?.code}
            </h2>
            <p className="text-xs text-slate-500">
              Log student physical presence for college demonstration farms, workshops, or theoretical lectures.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Session Type</label>
              <select
                value={attendanceType}
                onChange={(e: any) => setAttendanceType(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="Field Practical">College Research Farm Field Practical</option>
                <option value="Laboratory">Science Laboratory Practical</option>
                <option value="Lecture">Lecture Hall Theoretical Session</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Session Topic / Practical Objective</label>
              <input
                type="text"
                value={attendanceTopic}
                onChange={(e) => setAttendanceTopic(e.target.value)}
                placeholder="e.g. Soil sampling, tractor maintenance, Python programming lab"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase font-bold text-[11px]">
                <tr>
                  <th className="p-3 w-12 text-center">Present</th>
                  <th className="p-3">Matric Number</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Programme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((std) => (
                  <tr key={std.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={!!attendanceChecks[std.id]}
                        onChange={(e) =>
                          setAttendanceChecks({ ...attendanceChecks, [std.id]: e.target.checked })
                        }
                        className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-3 font-mono font-bold text-emerald-900">{std.matricNumber}</td>
                    <td className="p-3 font-semibold text-slate-900 uppercase">{std.fullName}</td>
                    <td className="p-3 text-slate-600">{std.programmeName || 'Agricultural Technology'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleRecordAttendance}
              disabled={loading || !attendanceTopic}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Check className="w-4 h-4" /> Register & Archive Attendance Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
