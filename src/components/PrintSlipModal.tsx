import React from 'react';
import { Printer, Download, X, Award, CheckCircle, Shield } from 'lucide-react';
import { InstitutionSettings } from '../types';
import { SchoolLogo } from './SchoolLogo';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: 'ADMISSION_LETTER' | 'APPLICATION_FORM' | 'COURSE_REGISTRATION' | 'PAYMENT_RECEIPT' | 'RESULT_SLIP' | 'STUDENT_ID';
  data: any;
  settings: InstitutionSettings | null;
}

export const PrintSlipModal: React.FC<Props> = ({ isOpen, onClose, type, data, settings }) => {
  React.useEffect(() => {
    const styleId = 'edocasti-print-card-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media print {
        #printable-slip {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          background: white !important;
        }
        #flip-card-inner {
          transform: none !important;
          height: auto !important;
          perspective: none !important;
          position: static !important;
          display: block !important;
        }
        #flip-card-inner > div {
          position: relative !important;
          backface-visibility: visible !important;
          transform: none !important;
          width: 340px !important;
          height: 210px !important;
          margin: 0 auto 16px auto !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #printable-slip * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #printable-slip [title="Click to flip card"] span.font-mono,
        #printable-slip [title="Click to flip card"] span:last-child {
          display: none !important;
        }
      }
    `;
    document.head.appendChild(style);
  }, []);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    const slip = document.getElementById('printable-slip');
    if (!slip) {
      window.print();
      return;
    }
    const originalParent = slip.parentElement;
    const originalNextSibling = slip.nextSibling;

    const printRoot = document.createElement('div');
    printRoot.id = 'print-root';
    document.body.appendChild(printRoot);
    printRoot.appendChild(slip);

    const style = document.createElement('style');
    style.id = 'edocasti-detach-print-styles';
    style.textContent = `
      @media print {
        body > *:not(#print-root) { display: none !important; }
        #print-root { display: block !important; background: white !important; padding: 0 !important; margin: 0 !important; }
        #print-root #printable-slip { display: block !important; width: 100% !important; padding: 0 !important; margin: 0 !important; }
        #flip-card-inner {
          transform: none !important;
          height: auto !important;
          perspective: none !important;
          position: static !important;
          display: block !important;
        }
        #flip-card-inner > div {
          position: relative !important;
          backface-visibility: visible !important;
          transform: none !important;
          width: 340px !important;
          height: 210px !important;
          margin: 0 auto 16px auto !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #printable-slip * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);

    const restore = () => {
      if (originalParent) {
        if (originalNextSibling && originalNextSibling.parentElement === originalParent) {
          originalParent.insertBefore(slip, originalNextSibling);
        } else {
          originalParent.appendChild(slip);
        }
      }
      printRoot.remove();
      style.remove();
      window.removeEventListener('afterprint', restore);
    };

    window.addEventListener('afterprint', restore);
    window.print();
  };

  const docs: any = (settings && (settings as any).documents) || {};
  const idCardDocs: any = docs.idCard || {};
  const letterDocs: any = docs.admissionLetter || {};

  // Declare these FIRST — they're used by the letter defaults below
  const idCardInstName = idCardDocs.institutionName || '{idCardInstName}';
  const idCardShortName = idCardDocs.shortName || 'EDOCASTI';
  const institutionName = settings?.institutionName || 'Edo State College of Agriculture, Science and Technology';
  const currentSession = settings?.currentSession || '2025/2026';

  // Admission letter defaults — matches DOCUMENT_DEFAULTS in portal.py
  const letterGreeting = letterDocs.greeting || 'Dear';
  const letterIntro = (letterDocs.introParagraph || 'I am pleased to inform you that following your satisfactory performance in the admissions screening exercise, the Admissions Committee and the Academic Board have offered you provisional admission into the {institutionName} for the {currentSession} academic session.')
    .replace('{institutionName}', institutionName)
    .replace('{currentSession}', currentSession);
  const letterProgrammeDuration = letterDocs.programmeDuration || '2 Academic Years (4 Semesters)';
  const letterStudyLevel = letterDocs.studyLevel || 'ND I (Full-Time)';
  const letterSchoolFaculty = letterDocs.schoolFaculty || 'School of Agricultural Technology';
  const letterConditionsTitle = letterDocs.conditionsTitle || 'Conditions of Admission:';
  const letterConditionsList = Array.isArray(letterDocs.conditionsList) && letterDocs.conditionsList.length > 0
    ? letterDocs.conditionsList
    : [
        'This offer is strictly provisional and subject to physical verification of your original WAEC/NECO certificates.',
        'Payment of acceptance fee must be completed within 14 days of offer publication to retain your admission quota.',
        'Any false declaration or presentation of forged credentials automatically nullifies this admission offer.'
      ];
  const letterTitle = letterDocs.title || 'Provisional Offer of Admission';

  // Fallback gradient if CMS hasn't set anything
  const frontBg = idCardDocs.frontBg || 'linear-gradient(135deg, #064e3b, #065f46, #0f172a)';
  const backBg = idCardDocs.backBg || 'linear-gradient(135deg, #0f172a, #022c22, #0f172a)';
  const accentColor = idCardDocs.accentColor || '#f59e0b';
  const watermarkText = idCardDocs.watermarkText || 'EDOCASTI';
  const showWatermark = idCardDocs.showWatermark !== false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Modal Controls */}
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

        {/* Printable Area */}
        <div className="p-8 overflow-y-auto print:p-0 print:m-0 bg-white" id="printable-slip">
          {/* Letterhead */}
          <div className="border-b-2 border-emerald-800 pb-4 text-center relative">
            {docs.institutionLogoUrl || settings?.logoUrl ? (
              <img
                src={docs.institutionLogoUrl || settings?.logoUrl}
                alt="Institution Logo"
                className="mx-auto mb-2 h-16 w-16 rounded-full object-contain"
              />
            ) : (
              <SchoolLogo size={68} className="mx-auto mb-2 shadow-xs" />
            )}
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

          {type === 'ADMISSION_LETTER' && (
            <div className="mt-6 space-y-4 text-slate-800 text-sm">
              <div className="flex justify-end mb-2">
                {data.profileImageUrl ? (
                  <img src={data.profileImageUrl} alt="Passport" className="w-24 h-24 rounded-lg object-cover border-2 border-emerald-300 shadow-xs" />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase">
                    No Photo
                  </div>
                )}
              </div>

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
                  {letterTitle} ({currentSession})
                </h2>
              </div>

              <p>{letterGreeting} <strong className="uppercase">{data.firstName} {data.lastName}</strong>,</p>

              <p className="leading-relaxed">{letterIntro}</p>

              <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200">
                <div>
                  <div className="text-xs text-slate-500">Admitted Programme:</div>
                  <div className="font-bold text-slate-900">{data.programmeName || 'National Diploma in Agricultural Technology'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">School / Faculty:</div>
                  <div className="font-bold text-slate-900">{letterSchoolFaculty}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Programme Duration:</div>
                  <div className="font-bold text-slate-900">{letterProgrammeDuration}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Study Level:</div>
                  <div className="font-bold text-slate-900">{letterStudyLevel}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <div className="font-bold text-amber-900 uppercase">{letterConditionsTitle}</div>
                <ul className="list-disc list-inside space-y-1">
                  {letterConditionsList.map((condition: string, i: number) => (
                    <li key={i}>{condition}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-6 flex justify-between items-end border-t border-slate-200 mt-6">
                <div className="text-center">
                  {letterDocs.signatureImageUrl ? (
                    <img src={letterDocs.signatureImageUrl} alt="Signature" className="h-12 mx-auto object-contain mb-1" />
                  ) : (
                    <div className="font-signature text-xl text-slate-700 italic font-serif mb-1">{letterDocs.signatureName || 'Authorized Signatory'}</div>
                  )}
                  <div className="border-t border-slate-400 pt-1 font-bold text-xs uppercase">{letterDocs.signatureName || 'Authorized Signatory'}</div>
                  <div className="text-[11px] text-slate-500">{letterDocs.signatureTitle || ''}</div>
                </div>
                {letterDocs.showSeal !== false && (
                  letterDocs.sealImageUrl ? (
                    <img src={letterDocs.sealImageUrl} alt="Seal" className="h-20 w-20 object-contain" />
                  ) : (
                    <div className="text-center border-2 border-emerald-700 p-2 rounded text-[10px] text-emerald-800 font-bold uppercase">
                      <div>OFFICIAL VERIFIED</div>
                      <div>SECURITY SEAL</div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {type === 'APPLICATION_FORM' && (
            <div className="mt-6 space-y-4 text-slate-800 text-sm">
              <div className="text-center py-1">
                <h2 className="text-base font-bold text-slate-900 uppercase underline">
                  Admission Application Form
                </h2>
                <p className="text-xs text-slate-600">{currentSession} Session | Submitted Application</p>
              </div>
              <div className="flex justify-end mb-2">
                {data.profileImageUrl ? (
                  <img src={data.profileImageUrl} alt="Passport" className="w-24 h-24 rounded-lg object-cover border-2 border-emerald-300 shadow-xs" />
                ) : (
                  <div className="w-24 h-24 rounded-lg bg-slate-100 border-2 border-slate-300 flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase">
                    No Photo
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div><span className="text-slate-500 block">Application Ref:</span><span className="font-mono font-bold text-emerald-800">{data.applicationNumber}</span></div>
                <div><span className="text-slate-500 block">Applicant Name:</span><span className="font-bold text-slate-900 uppercase">{data.firstName} {data.lastName}</span></div>
                <div><span className="text-slate-500 block">Programme:</span><span className="font-bold text-slate-900">{data.programmeName || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Gender:</span><span className="font-bold text-slate-900">{data.gender || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Date of Birth:</span><span className="font-bold text-slate-900">{data.dob || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Phone:</span><span className="font-bold text-slate-900">{data.phone || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">State of Origin:</span><span className="font-bold text-slate-900">{data.stateOfOrigin || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">LGA:</span><span className="font-bold text-slate-900">{data.lga || 'N/A'}</span></div>
                <div><span className="text-slate-500 block">Status:</span><span className="font-bold text-emerald-700">{data.status || 'SUBMITTED'}</span></div>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-white uppercase text-[11px]">
                    <tr><th className="p-2.5">S/N</th><th className="p-2.5">Subject</th><th className="p-2.5 text-center">Grade</th><th className="p-2.5">Exam Type</th><th className="p-2.5">Exam Number</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.oLevelResults?.map((r: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-2.5 font-medium">{i + 1}</td>
                        <td className="p-2.5 font-semibold">{r.subject}</td>
                        <td className="p-2.5 text-center font-bold font-mono">{r.grade}</td>
                        <td className="p-2.5">{r.examType || 'WAEC'}</td>
                        <td className="p-2.5 font-mono">{r.examNumber || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
                <div>
                  <div className="font-serif italic text-slate-700">Applicant Signature</div>
                  <div className="border-t border-slate-400 pt-1 font-bold uppercase">Signature & Date</div>
                </div>
                <div className="text-center border border-slate-300 p-2 rounded text-[10px] text-slate-500">
                  Generated on {new Date().toLocaleDateString('en-GB')}
                </div>
              </div>
            </div>
          )}

          {type === 'COURSE_REGISTRATION' && (
            <div className="mt-6 space-y-4 text-slate-800 text-sm">
              <div className="text-center py-1">
                <h2 className="text-base font-bold text-slate-900 uppercase underline">Official Course Registration & Examination Clearance Slip</h2>
                <p className="text-xs text-slate-600">{currentSession} Session | First Semester</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div><span className="text-slate-500 block">Student Name:</span><span className="font-bold text-slate-900 uppercase">{data.student?.fullName || data.fullName}</span></div>
                <div><span className="text-slate-500 block">Matriculation No:</span><span className="font-mono font-bold text-emerald-800">{(data && data.student && data.student.matricNumber) || (data && data.matricNumber) || "N/A"}</span></div>
                <div><span className="text-slate-500 block">Programme:</span><span className="font-bold text-slate-900">{data.student?.programmeName || 'Agricultural Technology'}</span></div>
                <div><span className="text-slate-500 block">Study Level:</span><span className="font-bold text-slate-900">{data.student?.level || 'ND I'}</span></div>
                <div><span className="text-slate-500 block">Registration Status:</span><span className="font-bold text-emerald-700">APPROVED BY HOD</span></div>
                <div><span className="text-slate-500 block">Total Credit Units:</span><span className="font-bold text-slate-900">{data.totalCredits || 10} Units</span></div>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-emerald-900 text-white uppercase text-[11px]">
                    <tr><th className="p-2.5">S/N</th><th className="p-2.5">Course Code</th><th className="p-2.5">Course Title</th><th className="p-2.5 text-center">Units</th><th className="p-2.5">Status</th></tr>
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
                <h2 className="text-base font-bold text-emerald-900 uppercase underline">Official Bursary Electronic Payment Receipt</h2>
                <p className="text-xs text-slate-600 font-mono">Reference: {data.reference}</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs text-emerald-800 font-semibold uppercase">Amount Paid</div>
                  <div className="text-2xl font-black text-emerald-900">₦{Number(data.amount).toLocaleString('en-NG')}</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">Status: VERIFIED & CLEARED</div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-emerald-200 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                  <span className="text-[10px] font-bold text-slate-600 mt-1 block">ELECTRONIC CONFIRMATION</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div><span className="text-slate-500 block">Payment Channel:</span><span className="font-semibold text-slate-900">{data.channel || 'Remita'}</span></div>
                <div><span className="text-slate-500 block">Provider Ref:</span><span className="font-mono font-semibold text-slate-900">{data.providerReference || 'RRR-9201-9281'}</span></div>
                <div><span className="text-slate-500 block">Date of Payment:</span><span className="font-semibold text-slate-900">{new Date(data.paidAt || Date.now()).toLocaleString('en-GB')}</span></div>
                <div><span className="text-slate-500 block">Reconciled By:</span><span className="font-semibold text-slate-900">{data.verifiedBy || 'Bursary Revenue Reconciler'}</span></div>
              </div>
              <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs">
                <div>
                  <div className="font-serif italic text-slate-700">Festus Ojo (FCA)</div>
                  <div className="border-t border-slate-400 pt-1 font-bold uppercase">Bursar / Authorized Cashier</div>
                </div>
                <div className="text-right text-[10px] text-slate-400">Computer-generated receipt valid without physical seal under NDPA 2023 regulations.</div>
              </div>
            </div>
          )}

          {type === 'RESULT_SLIP' && (
            <div className="mt-6 space-y-4 text-slate-800 text-sm">
              <div className="text-center py-1">
                <h2 className="text-base font-bold text-slate-900 uppercase underline">Official Statement of Academic Results</h2>
                <p className="text-xs text-slate-600">{currentSession} Session | Approved by Senate</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div><span className="text-slate-500 block">Student Name:</span><span className="font-bold text-slate-900 uppercase">{data.student?.fullName || data.fullName}</span></div>
                <div><span className="text-slate-500 block">Matriculation No:</span><span className="font-mono font-bold text-emerald-800">{(data && data.student && data.student.matricNumber) || (data && data.matricNumber) || "N/A"}</span></div>
                <div><span className="text-slate-500 block">Current CGPA:</span><span className="font-black text-emerald-800 text-sm">{data.student?.cgpa || '3.75'} / 5.00</span></div>
                <div><span className="text-slate-500 block">Academic Standing:</span><span className="font-bold text-emerald-700">GOOD STANDING</span></div>
              </div>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-white uppercase text-[11px]">
                    <tr><th className="p-2.5">Course Code</th><th className="p-2.5">Course Title</th><th className="p-2.5 text-center">CA ({settings?.caMaxMarks || 40})</th><th className="p-2.5 text-center">Exam ({settings?.examMaxMarks || 60})</th><th className="p-2.5 text-center">Total (100)</th><th className="p-2.5 text-center">Grade</th><th className="p-2.5 text-center">Points</th></tr>
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

          {type === 'STUDENT_ID' && (() => {
            const s = (data && data.student) || {};
            const photo =
              s.profileImageUrl || s.photo || s.photoUrl || s.image || s.avatarUrl ||
              (data && data.profileImageUrl) || (data && data.photo) || (data && data.photoUrl) || (data && data.image) || (data && data.avatarUrl) ||
              '';
            const fullName = s.fullName || (data && data.fullName) || 'Student';
            const matricNumber = s.matricNumber || (data && data.matricNumber) || 'N/A';
            const programmeName = s.programmeName || 'ND Agricultural Technology';
            const level = s.level || 'ND I';

            const frontStyle: React.CSSProperties = {
              background: frontBg,
              border: `2px solid ${accentColor}`,
              backfaceVisibility: 'hidden',
            };
            const backStyle: React.CSSProperties = {
              background: backBg,
              border: `2px solid ${accentColor}`,
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            };

            return (
              <div className="mt-6 flex justify-center">
                <div
                  className="w-96 h-56 cursor-pointer"
                  onClick={() => {
                    const card = document.getElementById('flip-card-inner');
                    if (card) card.style.transform = card.style.transform === 'rotateY(180deg)' ? '' : 'rotateY(180deg)';
                  }}
                  style={{ perspective: '1200px' }}
                  title="Click to flip card"
                >
                  <div
                    id="flip-card-inner"
                    className="relative w-full h-full transition-transform duration-700"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* -------- FRONT -------- */}
                    <div
                      className="absolute inset-0 rounded-2xl text-white p-5 shadow-xl overflow-hidden"
                      style={frontStyle}
                    >
                      {showWatermark && (
                        <div
                          className="absolute inset-0 flex items-center justify-center text-6xl font-black uppercase pointer-events-none select-none"
                          style={{ opacity: 0.06 }}
                        >
                          {watermarkText}
                        </div>
                      )}
                      <div className="relative flex items-center justify-between border-b border-white/20 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🌾</span>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">EDOCASTI</div>
                            <div className="text-[9px] text-white/80">Edo State College of Agric, Sci &amp; Tech</div>
                          </div>
                        </div>
                        <span className="text-[9px] bg-amber-500 text-slate-900 font-bold px-1.5 py-0.5 rounded uppercase">
                          Student ID — Front
                        </span>
                      </div>

                      <div className="relative flex gap-4 items-center">
                        {photo ? (
                          <img
                            src={photo}
                            alt="Student"
                            className="w-20 h-24 rounded-lg object-cover border-2 border-white/40 shadow-xs"
                          />
                        ) : (
                          <div className="w-20 h-24 bg-slate-200 text-slate-500 rounded-lg flex flex-col items-center justify-center border-2 border-white/40">
                            <Award className="w-8 h-8 text-emerald-800" />
                            <span className="text-[8px] text-slate-600 mt-1 uppercase font-bold">PHOTO</span>
                          </div>
                        )}
                        <div className="space-y-1 text-xs">
                          <div className="text-sm font-bold text-amber-200 uppercase">{fullName}</div>
                          <div className="text-[11px] font-mono font-bold tracking-wide">{matricNumber}</div>
                          <div className="text-[10px] text-white/80">{programmeName}</div>
                          <div className="text-[10px] text-white/70">Level: {level}</div>
                        </div>
                      </div>

                      <div className="relative mt-4 pt-2 border-t border-white/20 flex justify-between items-center text-[9px] text-emerald-200">
                        <span>Valid: {currentSession}</span>
                        <span className="font-mono">Click to flip →</span>
                      </div>
                    </div>

                    {/* -------- BACK -------- */}
                    <div
                      className="absolute inset-0 rounded-2xl text-white p-5 shadow-xl overflow-hidden"
                      style={backStyle}
                    >
                      <div className="flex items-center justify-between border-b border-white/20 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">🌾</span>
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">EDOCASTI</div>
                            <div className="text-[9px] text-white/80">Student ID — Back</div>
                          </div>
                        </div>
                        <span className="text-[9px] bg-amber-500 text-slate-900 font-bold px-1.5 py-0.5 rounded uppercase">
                          Official
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-white/90">
                        <div>
                          <span className="block text-[8px] uppercase text-emerald-300">Matric No</span>
                          <span className="font-mono font-bold">{matricNumber}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-emerald-300">Blood Group</span>
                          <span className="font-bold">O+</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-emerald-300">Emergency Contact</span>
                          <span className="font-bold">{s.emergencyContact || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-emerald-300">Date of Birth</span>
                          <span className="font-bold">{s.dob || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-emerald-300">Gender</span>
                          <span className="font-bold">{s.gender || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="block text-[8px] uppercase text-emerald-300">Session Admitted</span>
                          <span className="font-bold">{s.sessionAdmitted || currentSession}</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/20">
                        <div className="text-[8px] uppercase text-emerald-300 mb-1">Address</div>
                        <div className="text-[10px] text-white/90 leading-tight">
                          Iguoriakhi Main Campus, Edo State, Nigeria. If found, please return to the Registry.
                        </div>
                      </div>

                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="font-serif italic text-[11px] text-amber-200">Registrar's Signature</div>
                          <div className="border-t border-white/30 mt-1 w-32 text-[8px] uppercase text-emerald-300 pt-0.5">
                            Authorized Signatory
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-mono text-white/80">BARCODE</div>
                          <div className="font-mono text-[10px] text-white/90">||| | |||| | ||| |</div>
                          <div className="text-[8px] mt-0.5 text-emerald-300">{currentSession}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            Official System Record generated from the EDOCASTI Integrated School Management Portal. Verify via portal.edocasti.edu.ng.
          </div>
        </div>
      </div>
    </div>
  );
};