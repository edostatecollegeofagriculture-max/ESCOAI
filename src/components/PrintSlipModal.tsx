import React from 'react';
import { Printer, Download, X, Award, CheckCircle, Shield } from 'lucide-react';
import { InstitutionSettings } from '../types';
import { SchoolLogo } from './SchoolLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'ADMISSION_LETTER' | 'COURSE_REGISTRATION' | 'PAYMENT_RECEIPT' | 'RESULT_SLIP' | 'STUDENT_ID';
  data: any;
  settings: InstitutionSettings | null;
}

export const PrintSlipModal: React.FC<Props> = ({ isOpen, onClose, type, data, settings }) => {
  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const institutionName = settings?.institutionName || 'Edo State College of Agriculture, Science and Technology';
  const currentSession = settings?.currentSession || '2025/2026';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Modal Controls (Not printed) */}
        <div className="no-print p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
              Official Institutional Document Viewer
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" /> Print Document / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Area */}
        <div className="p-8 overflow-y-auto print:p-0 print:m-0 bg-white" id="printable-slip">
          {/* Institution Official Letterhead */}
          <div className="border-b-2 border-emerald-800 pb-4 text-center relative">
            <SchoolLogo size={68} className="mx-auto mb-2 shadow-xs" />
            <h1 className="text-xl font-black uppercase text-emerald-900 tracking-wide">
              {institutionName}
            </h1>
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mt-0.5">
              Iguoriakhi Main Campus, Edo State, Nigeria
            </p>
            <p className="text-[11px] text-slate-600 italic mt-0.5">
              "{settings?.motto || 'Excellence in Agriculture, Science & Technology'}"
            </p>
            <div className="text-[10px] text-slate-500 mt-1 flex justify-center gap-4">
              <span>Email: {settings?.contactEmail || 'info@edocasti.edu.ng'}</span>
              <span>•</span>
              <span>Web: www.edocasti.edu.ng</span>
              <span>•</span>
              <span>Phone: {settings?.contactPhone || '+234 803 000 1234'}</span>
            </div>
          </div>

          {/* Document Content Based on Type */}

          {type === 'ADMISSION_LETTER' && (
            <div className="mt-6 space-y-4 text-slate-800 text-sm">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 uppercase block font-semibold">Application Ref:</span>
                  <span className="font-mono font-bold text-emerald-800">{data.applicationNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 uppercase block font-semibold">Date of Offer:</span>
                  <span className="font-semibold">{new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-lg font-bold text-slate-900 uppercase underline tracking-wide">
                  Provisional Offer of Admission ({currentSession})
                </h2>
              </div>

              <p>Dear <strong className="uppercase">{data.firstName} {data.lastName}</strong>,</p>

              <p className="leading-relaxed">
                I am pleased to inform you that following your satisfactory performance in the admissions screening exercise,
                the Admissions Committee and the Academic Board have offered you provisional admission into the
                <strong> Edo State College of Agriculture, Science and Technology</strong> for the <strong>{currentSession}</strong> academic session.
              </p>

              <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <div>
                  <div className="text-xs text-slate-500">Admitted Programme:</div>
                  <div className="font-bold text-slate-900">{data.programmeName || 'National Diploma in Agricultural Technology'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">School / Faculty:</div>
                  <div className="font-bold text-slate-900">School of Agricultural Technology</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Programme Duration:</div>
                  <div className="font-bold text-slate-900">2 Academic Years (4 Semesters)</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Study Level:</div>
                  <div className="font-bold text-slate-900">ND I (Full-Time)</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <div className="font-bold text-amber-900 uppercase">Conditions of Admission:</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>This offer is strictly provisional and subject to physical verification of your original WAEC/NECO certificates.</li>
                  <li>Payment of acceptance fee must be completed within 14 days of offer publication to retain your admission quota.</li>
                  <li>Any false declaration or presentation of forged credentials automatically nullifies this admission offer.</li>
                </ul>
              </div>

              <div className="pt-6 flex justify-between items-end border-t border-slate-200 mt-6">
                <div className="text-center">
                  <div className="font-signature text-xl text-slate-700 italic font-serif">Itohan Edokpayi</div>
                  <div className="border-t border-slate-400 pt-1 font-bold text-xs uppercase">Barr. Itohan Edokpayi</div>
                  <div className="text-[11px] text-slate-500">Registrar, EDOCASTI</div>
                </div>
                <div className="text-center border-2 border-emerald-700 p-2 rounded text-[10px] text-emerald-800 font-bold uppercase">
                  <div>OFFICIAL VERIFIED</div>
                  <div>SECURITY SEAL</div>
                </div>
              </div>
            </div>
          )}

          {type === 'COURSE_REGISTRATION' && (
            <div className="mt-6 space-y-4 text-slate-800 text-sm">
              <div className="text-center py-1">
                <h2 className="text-base font-bold text-slate-900 uppercase underline">
                  Official Course Registration & Examination Clearance Slip
                </h2>
                <p className="text-xs text-slate-600">{currentSession} Session | First Semester</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Student Name:</span>
                  <span className="font-bold text-slate-900 uppercase">{data.student?.fullName || data.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Matriculation No:</span>
                  <span className="font-mono font-bold text-emerald-800">{data.student?.matricNumber || data.matricNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Programme:</span>
                  <span className="font-bold text-slate-900">{data.student?.programmeName || 'Agricultural Technology'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Study Level:</span>
                  <span className="font-bold text-slate-900">{data.student?.level || 'ND I'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Registration Status:</span>
                  <span className="font-bold text-emerald-700">APPROVED BY HOD</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Total Credit Units:</span>
                  <span className="font-bold text-slate-900">{data.totalCredits || 10} Units</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-emerald-900 text-white uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">S/N</th>
                      <th className="p-2.5">Course Code</th>
                      <th className="p-2.5">Course Title</th>
                      <th className="p-2.5 text-center">Units</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.coursesList?.map((crs: any, i: number) => (
                      <tr key={crs.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2.5 font-medium">{i + 1}</td>
                        <td className="p-2.5 font-bold font-mono text-emerald-800">{crs.code}</td>
                        <td className="p-2.5">{crs.title}</td>
                        <td className="p-2.5 text-center font-bold">{crs.creditUnits}</td>
                        <td className="p-2.5 text-emerald-700 font-semibold">Compulsory</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-slate-200 text-center text-xs">
                <div>
                  <div className="h-10"></div>
                  <div className="border-t border-slate-400 pt-1 font-semibold uppercase">Student Signature & Date</div>
                </div>
                <div>
                  <div className="h-10 flex items-center justify-center font-serif text-slate-600 italic">Dr. Monday Osa-Egharevba</div>
                  <div className="border-t border-slate-400 pt-1 font-semibold uppercase">HOD Signature / Stamp</div>
                </div>
              </div>
            </div>
          )}

          {type === 'PAYMENT_RECEIPT' && (
            <div className="mt-6 space-y-4 text-slate-800 text-sm">
              <div className="text-center py-1">
                <h2 className="text-base font-bold text-emerald-900 uppercase underline">
                  Official Bursary Electronic Payment Receipt
                </h2>
                <p className="text-xs text-slate-600 font-mono">Reference: {data.reference}</p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-semibold uppercase">Amount Paid</div>
                  <div className="text-2xl font-black text-emerald-900">
                    ₦{Number(data.amount).toLocaleString('en-NG')}
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">Status: VERIFIED & CLEARED</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <span className="text-[10px] font-bold text-slate-600 mt-1 block">ELECTRONIC CONFIRMATION</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 block">Payment Channel:</span>
                  <span className="font-semibold text-slate-900">{data.channel || 'Remita'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Provider Ref:</span>
                  <span className="font-mono font-semibold text-slate-900">{data.providerReference || 'RRR-9201-9281'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date of Payment:</span>
                  <span className="font-semibold text-slate-900">{new Date(data.paidAt || Date.now()).toLocaleString('en-GB')}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reconciled By:</span>
                  <span className="font-semibold text-slate-900">{data.verifiedBy || 'Bursary Revenue Reconciler'}</span>
                </div>
              </div>

              <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
                <div>
                  <div className="font-serif italic text-slate-700">Festus Ojo (FCA)</div>
                  <div className="border-t border-slate-400 pt-1 font-bold uppercase">Bursar / Authorized Cashier</div>
                </div>
                <div className="text-right text-[10px] text-slate-400">
                  Computer-generated receipt valid without physical seal under NDPA 2023 regulations.
                </div>
              </div>
            </div>
          )}

          {type === 'RESULT_SLIP' && (
            <div className="mt-6 space-y-4 text-slate-800 text-sm">
              <div className="text-center py-1">
                <h2 className="text-base font-bold text-slate-900 uppercase underline">
                  Official Statement of Academic Results
                </h2>
                <p className="text-xs text-slate-600">{currentSession} Session | Approved by Senate</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Student Name:</span>
                  <span className="font-bold text-slate-900 uppercase">{data.student?.fullName || data.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Matriculation No:</span>
                  <span className="font-mono font-bold text-emerald-800">{data.student?.matricNumber || data.matricNumber}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Current CGPA:</span>
                  <span className="font-black text-emerald-800 text-sm">{data.student?.cgpa || '3.75'} / 5.00</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Academic Standing:</span>
                  <span className="font-bold text-emerald-700">GOOD STANDING</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-white uppercase text-[11px]">
                    <tr>
                      <th className="p-2.5">Course Code</th>
                      <th className="p-2.5">Course Title</th>
                      <th className="p-2.5 text-center">CA ({settings?.caMaxMarks || 40})</th>
                      <th className="p-2.5 text-center">Exam ({settings?.examMaxMarks || 60})</th>
                      <th className="p-2.5 text-center">Total (100)</th>
                      <th className="p-2.5 text-center">Grade</th>
                      <th className="p-2.5 text-center">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.resultsList?.map((r: any, i: number) => (
                      <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2.5 font-bold font-mono text-emerald-800">{r.courseCode || r.courseId}</td>
                        <td className="p-2.5">{r.courseTitle || 'Agricultural Course'}</td>
                        <td className="p-2.5 text-center">{r.caScore}</td>
                        <td className="p-2.5 text-center">{r.examScore}</td>
                        <td className="p-2.5 text-center font-bold">{r.totalScore}</td>
                        <td className="p-2.5 text-center font-black text-emerald-800">{r.grade}</td>
                        <td className="p-2.5 text-center font-bold">{r.gradePoint?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
                <div>
                  <div className="font-serif italic text-slate-700">Exam Office Controller</div>
                  <div className="border-t border-slate-400 pt-1 font-bold uppercase">Dean of Academic Affairs</div>
                </div>
                <div className="text-center border border-slate-300 p-2 rounded text-[10px] text-slate-500">
                  Grading Scale: A: 70-100 (5.0) | B: 60-69 (4.0) | C: 50-59 (3.0) | D: 45-49 (2.0) | E: 40-44 (1.0) | F: 0-39 (0.0)
                </div>
              </div>
            </div>
          )}

          {type === 'STUDENT_ID' && (
            <div className="mt-6 flex justify-center">
              <div className="w-96 rounded-2xl bg-linear-to-br from-emerald-900 via-emerald-800 to-slate-900 text-white p-5 shadow-xl border-2 border-amber-400 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/20 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌾</span>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">EDOCASTI</div>
                      <div className="text-[9px] text-white/80">Edo State College of Agric, Sci & Tech</div>
                    </div>
                  </div>
                  <span className="text-[9px] bg-amber-500 text-slate-900 font-bold px-1.5 py-0.5 rounded uppercase">
                    STUDENT IDENTITY CARD
                  </span>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="w-20 h-24 bg-slate-200 text-slate-500 rounded-lg flex flex-col items-center justify-center border-2 border-white/40 shadow-xs">
                    <Award className="w-8 h-8 text-emerald-800" />
                    <span className="text-[8px] text-slate-600 mt-1 uppercase font-bold">PHOTO</span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-sm font-bold text-amber-200 uppercase">{data.student?.fullName || data.fullName}</div>
                    <div className="text-[11px] font-mono font-bold text-white tracking-wide">
                      {data.student?.matricNumber || data.matricNumber}
                    </div>
                    <div className="text-[10px] text-white/80">{data.student?.programmeName || 'ND Agricultural Technology'}</div>
                    <div className="text-[10px] text-white/70">Level: {data.student?.level || 'ND I'} | Blood Group: O+</div>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-white/20 flex justify-between items-center text-[9px] text-emerald-200">
                  <span>Valid: {currentSession}</span>
                  <span className="font-mono">BARCODE: ||| | |||| | |||</span>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            Official System Record generated from the EDOCASTI Integrated School Management Portal. Verify via portal.edocasti.edu.ng.
          </div>
        </div>
      </div>
    </div>
  );
};
