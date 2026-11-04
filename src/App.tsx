import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { Breadcrumbs } from './components/Breadcrumbs';
import { LoginModal } from './components/LoginModal';
import { PrintSlipModal } from './components/PrintSlipModal';
import { PublicPortal } from './views/PublicPortal';
import { AdmissionsPortal } from './views/AdmissionsPortal';
import { StudentPortal } from './views/StudentPortal';
import { LecturerPortal } from './views/LecturerPortal';
import { AdminPortal } from './views/AdminPortal';
import { SchoolLogo } from './components/SchoolLogo';

const MainApp: React.FC = () => {
  const { user, settings } = useAuth();
  const [activeTab, setActiveTab] = useState('public');
  const [activeSubSection, setActiveSubSection] = useState<string | undefined>('overview');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Print Modal State
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    type: any;
    data: any;
  }>({
    isOpen: false,
    type: 'ADMISSION_LETTER',
    data: null,
  });

  const openPrintModal = (type: any, data: any) => {
    setPrintModalState({ isOpen: true, type, data });
  };

  const closePrintModal = () => {
    setPrintModalState({ ...printModalState, isOpen: false });
  };

  const handleNavigate = (tab: string, subSection?: string) => {
    setActiveTab(tab);
    setActiveSubSection(subSection || 'overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans text-slate-900 dark:text-slate-100 selection:bg-emerald-200 dark:selection:bg-emerald-900 selection:text-emerald-950 dark:selection:text-emerald-100 transition-colors duration-200 overflow-x-hidden">
      {/* School Logo App Background Watermark */}
      <div
        className="fixed inset-0 pointer-events-none select-none z-0 flex items-center justify-center overflow-hidden"
        aria-hidden="true"
      >
        <SchoolLogo
          variant="watermark"
          size="min(75vw, 700px)"
          watermarkOpacity={0.04}
          className="transition-opacity duration-300"
        />
      </div>

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onOpenPrintModal={openPrintModal}
      />

      {/* Breadcrumbs for Spatial Orientation */}
      <Breadcrumbs
        tab={activeTab}
        subSection={activeSubSection}
        onNavigate={handleNavigate}
      />

      {/* Main View Container */}
      <main className="relative z-10 flex-1">
        {activeTab === 'public' && (
          <PublicPortal
            onGoToAdmissions={() => handleNavigate('admissions', 'form')}
            onGoToLogin={() => setIsLoginModalOpen(true)}
            onNavigateSection={handleNavigate}
          />
        )}

        {activeTab === 'admissions' && (
          <AdmissionsPortal
            onOpenPrintModal={openPrintModal}
            onGoToStudentWorkspace={() => handleNavigate('student', 'courses')}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'student' && (
          <StudentPortal onOpenPrintModal={openPrintModal} />
        )}

        {activeTab === 'lecturer' && <LecturerPortal />}

        {activeTab === 'admin' && (
          <AdminPortal onOpenPrintModal={openPrintModal} />
        )}
      </main>

      {/* Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      <PrintSlipModal
        isOpen={printModalState.isOpen}
        onClose={closePrintModal}
        type={printModalState.type}
        data={printModalState.data}
        settings={settings}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
