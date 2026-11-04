import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { NewsArticle } from '../types';
import { NewsSlideShow } from '../components/NewsSlideShow';
import { NewsArticleModal } from '../components/NewsArticleModal';
import { SchoolLogo } from '../components/SchoolLogo';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle,
  HelpCircle,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Search,
  Eye,
  Tag,
  Clock,
  Layers,
  Award,
  ChevronRight,
} from 'lucide-react';

interface Props {
  onGoToAdmissions: () => void;
  onGoToLogin: () => void;
  onNavigateSection?: (tab: string, subSection?: string) => void;
}

export const PublicPortal: React.FC<Props> = ({ onGoToAdmissions, onGoToLogin, onNavigateSection }) => {
  const { settings } = useAuth();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsCategory, setNewsCategory] = useState<string>('ALL');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  useEffect(() => {
    api
      .getNews({
        category: newsCategory !== 'ALL' ? newsCategory : undefined,
        status: 'PUBLISHED',
      })
      .then((res) => {
        if (res.success && res.articles) {
          setNewsArticles(res.articles);
        }
      })
      .catch((err) => console.error(err));
  }, [newsCategory]);

  const handleNavigate = (tab: string, subSection?: string) => {
    if (tab === 'admissions') {
      onGoToAdmissions();
    } else if (onNavigateSection) {
      onNavigateSection(tab, subSection);
    }
  };

  const schools = [
    {
      code: 'SAGR',
      name: 'School of Agricultural Technology',
      programmes: [
        'ND Agricultural Technology (2 Years)',
        'HND Agricultural Technology - Crop Production',
        'ND Animal Health and Production Technology',
        'ND Fisheries and Aquaculture Technology',
      ],
      desc: 'Hands-on practical training in mechanized crop farming, modern livestock breeding, and high-yield agro-systems.',
    },
    {
      code: 'SAPS',
      name: 'School of Applied Sciences & Technology, Iguoriakhi',
      programmes: [
        'ND Computer Science',
        'HND Computer Science & Software Engineering',
        'ND Science Laboratory Technology (SLT)',
        'ND Food Science and Technology',
      ],
      desc: 'State-of-the-art computer labs, analytical chemical testing suites, microbiological assays, and software innovation.',
    },
    {
      code: 'SENG',
      name: 'School of Engineering & Bio-Environmental Technology',
      programmes: [
        'ND Agricultural & Bio-Environmental Engineering',
        'ND Farm Mechanization & Irrigation Technology',
      ],
      desc: 'Irrigation architecture, tractor maintenance, bio-energy systems, and soil conservation infrastructure.',
    },
    {
      code: 'SBMS',
      name: 'School of Business & Management Studies',
      programmes: ['ND Cooperative Economics & Management', 'ND Agribusiness Management'],
      desc: 'Agricultural value chain finance, rural cooperatives, market linkage, and agribusiness entrepreneurship.',
    },
  ];

  const faqs = [
    {
      q: 'What are the basic admission requirements for National Diploma (ND) programmes?',
      a: 'Candidates must possess at least five (5) credit passes in SSCE/WAEC/NECO/NABTEB at not more than two sittings, including English Language, Mathematics, and three science subjects relevant to the chosen course (such as Agricultural Science/Biology, Chemistry, Physics).',
    },
    {
      q: 'Is the admission form screening done entirely online?',
      a: 'Yes. Eligible candidates complete the online biodata, enter their verified O-Level grades, upload documents, and track their screening status directly through this portal.',
    },
    {
      q: 'Where is the main campus of EDOCASTI located?',
      a: 'The college main campus is located along Benin-Lagos Expressway at Iguoriakhi, Ovia South-West LGA, Edo State, Nigeria, equipped with research farms and demonstration facilities.',
    },
    {
      q: 'How do admitted students receive their admission letters and matriculate?',
      a: 'Once an applicant receives a provisional offer on the portal, they accept the offer online, settle the institutional acceptance fee, receive their matriculation number, and print their official admission letter.',
    },
  ];

  return (
    <div className="space-y-14 sm:space-y-16 pb-16">
      {/* ================= HERO SLIDESHOW SECTION ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <NewsSlideShow onNavigate={handleNavigate} />
      </section>

      {/* ================= COLLEGE NEWS & PRESS BULLETINS ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
              Official Press Releases & College News
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
              Latest from the Campus & Research Stations
            </h2>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['ALL', 'Admissions', 'Academics', 'Research & Farm', 'Notice'].map((cat) => (
              <button
                key={cat}
                onClick={() => setNewsCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap cursor-pointer ${
                  newsCategory === cat
                    ? 'bg-emerald-900 dark:bg-emerald-800 text-amber-300 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' ? 'All Bulletins' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* News Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {newsArticles.map((article) => (
            <div
              key={article.id}
              onClick={() => setSelectedArticle(article)}
              className="group bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-emerald-600 dark:hover:border-amber-500/60 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {article.category}
                  </span>
                  <span>
                    {new Date(article.publishedAt).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 group-hover:text-emerald-800 dark:group-hover:text-amber-400 transition leading-snug line-clamp-2">
                  {article.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {article.summary}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[180px] font-medium">{article.author}</span>
                <span className="text-emerald-700 dark:text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition">
                  Read story <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= RECTOR'S MESSAGE ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-linear-to-br from-emerald-950 via-emerald-900 to-emerald-950 rounded-3xl p-8 sm:p-12 text-white border-2 border-amber-500/40 shadow-xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          <div className="lg:col-span-1 text-center space-y-3">
            <div className="relative inline-block">
              <div className="w-36 h-36 mx-auto rounded-full bg-emerald-900 text-white flex items-center justify-center font-bold text-4xl border-4 border-amber-400 shadow-xl">
                👨‍🏫
              </div>
              <div className="absolute -bottom-2 -right-2 bg-amber-500 p-2 rounded-full text-slate-950 shadow-md">
                <SchoolLogo size={28} />
              </div>
            </div>
            <div>
              <h3 className="font-black text-white text-lg">Prof. Patrick O. Aghimien</h3>
              <p className="text-xs text-amber-300 font-bold uppercase tracking-wider">Rector & Provost</p>
              <p className="text-[11px] text-emerald-200 mt-1">
                Edo State College of Agriculture, Science and Technology
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
              <Sparkles className="w-3 h-3 text-amber-400" /> Leadership & Institutional Mission
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              Fostering Practical Innovation in Agronomy, Food Security & Technology
            </h2>
            <p className="text-sm text-emerald-100 leading-relaxed">
              At EDOCASTI, we are committed to producing graduates equipped with real-world technical competence.
              Our curricula blend rigorous classroom theory with mandatory field operations on our modernized
              1,500-acre research farms, advanced science laboratories, and high-performance computing centers.
            </p>
            <p className="text-sm text-emerald-100 leading-relaxed">
              Through this portal, all institutional operations—from transparent online admissions, fee settlements,
              continuous assessment entries, and transcript issuance—are fully integrated, transparent, and auditable.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={onGoToAdmissions}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                Apply for 2025/2026 Session <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SCHOOLS & PROGRAMMES ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
            Academic Offerings
          </span>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            Schools, Faculties & Programmes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Explore our accredited National Diploma (ND) and Higher National Diploma (HND) programmes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {schools.map((sch) => (
            <div
              key={sch.code}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-lg">
                    {sch.code}
                  </span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-bold">NBTE Accredited</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{sch.name}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-4">{sch.desc}</p>

                <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                    Available Programmes:
                  </span>
                  {sch.programmes.map((prog, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{prog}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={onGoToAdmissions}
                  className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  View Admission Criteria <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= ACADEMIC CALENDAR ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-900 rounded-3xl p-8 sm:p-10 text-white border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Official Schedule
              </span>
              <h2 className="text-2xl font-bold mt-1">2025/2026 Academic Calendar Highlights</h2>
            </div>
            <span className="px-3 py-1 bg-emerald-800 text-emerald-200 text-xs font-semibold rounded-lg border border-emerald-600">
              Current Period: {settings?.currentSemester || 'First Semester'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Calendar className="w-4 h-4" /> Admission & Screening
              </div>
              <p className="text-xs text-slate-300">
                Online screening portal open for all UTME and direct ND/HND applicants across Edo State.
              </p>
              <div className="text-[11px] text-emerald-400 font-semibold pt-2">Ongoing</div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Calendar className="w-4 h-4" /> Course Registration & Lectures
              </div>
              <p className="text-xs text-slate-300">
                Course enrollment, timetable release, and mandatory farm workshop inductions for ND I and ND II.
              </p>
              <div className="text-[11px] text-emerald-400 font-semibold pt-2">Registration Open</div>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Calendar className="w-4 h-4" /> Continuous Assessment & Exams
              </div>
              <p className="text-xs text-slate-300">
                Continuous assessment tests (40%), followed by semester written and laboratory practical examinations (60%).
              </p>
              <div className="text-[11px] text-slate-400 font-semibold pt-2">Scheduled</div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FAQS ================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
            Help & Guidance
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-emerald-800 dark:hover:text-emerald-400 cursor-pointer"
              >
                <span>{faq.q}</span>
                <span className="text-slate-400 dark:text-slate-500 text-lg">{activeFaq === idx ? '−' : '+'}</span>
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ================= CAMPUS FOOTER ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-emerald-950 text-white rounded-3xl p-8 sm:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 border-t-4 border-amber-500">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <SchoolLogo size={44} />
              <div>
                <span className="font-black text-amber-400 text-lg">EDOCASTI PORTAL</span>
                <p className="text-[10px] text-emerald-300">Edo State College of Agriculture, Science & Technology</p>
              </div>
            </div>
            <p className="text-xs text-emerald-200 leading-relaxed">
              Official integrated educational management information system for Iguoriakhi Main Campus, Edo State, Nigeria.
              Accredited by NBTE.
            </p>
          </div>

          <div className="space-y-2 text-xs text-emerald-200">
            <h4 className="font-bold text-white text-sm uppercase">Main Campus Location</h4>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Iguoriakhi Main Campus, Benin-Lagos Expressway, Ovia South-West LGA, Edo State, Nigeria.</span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-emerald-200">
            <h4 className="font-bold text-white text-sm uppercase">Helpdesk & Admissions</h4>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings?.contactPhone || '+234 803 000 1234'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings?.contactEmail || 'admissions@edocasti.edu.ng'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Article Reader Modal */}
      <NewsArticleModal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        article={selectedArticle}
      />
    </div>
  );
};
