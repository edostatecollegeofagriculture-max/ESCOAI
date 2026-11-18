import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

export const PublicPortal: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [slides, setSlides] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [leadership, setLeadership] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const [slidesRes, newsRes, leadershipRes, faqsRes, schoolsRes, settingsRes] = await Promise.all([
          api.getSlides({ activeOnly: true }),
          api.getNews({ status: 'PUBLISHED' }),
          api.getLeadership({ status: 'PUBLISHED' }),
          api.getFaqs({ status: 'PUBLISHED' }),
          api.getSchools(),
          api.getSettings()
        ]);
        if (slidesRes.success) setSlides(slidesRes.slides);
        if (newsRes.success) setNews(newsRes.articles);
        if (leadershipRes.success) setLeadership(leadershipRes.leadership);
        if (faqsRes.success) setFaqs(faqsRes.faqs);
        if (schoolsRes.success) setSchools(schoolsRes.schools);
        if (settingsRes.success) setSettings(settingsRes.settings);
      } catch (error) {
        console.error('Failed to load public data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, []);

  // Auto-rotate slides every 5 seconds
  useEffect(() => {
    if (slides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><span className="text-xl">Loading EDOCASTI Portal...</span></div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* HERO SLIDER WITH AUTO-ROTATE */}
      {slides.length > 0 && (
        <section className="relative h-[600px] overflow-hidden">
          {slides.map((slide, index) => (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide.imageUrl || 'https://via.placeholder.com/1920x600'})` }} />
              <div className="absolute inset-0 bg-gradient-to-r from-green-900/90 to-transparent" />
              <div className="relative z-10 max-w-7xl mx-auto h-full flex items-center px-6">
                <div className="max-w-2xl text-white">
                  <h1 className="text-5xl font-bold mb-6">{slide.title}</h1>
                  <p className="text-xl mb-8 opacity-90">{slide.subtitle}</p>
                  {slide.buttonText && (
                    <a href={slide.buttonLink} className="inline-block bg-yellow-500 text-green-900 font-bold px-8 py-4 rounded-lg hover:bg-yellow-400 transition">
                      {slide.buttonText}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* LEFT ARROW */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white w-12 h-12 rounded-full flex items-center justify-center transition"
            aria-label="Previous slide"
          >
            ‹
          </button>

          {/* RIGHT ARROW */}
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-black/30 hover:bg-black/60 text-white w-12 h-12 rounded-full flex items-center justify-center transition"
            aria-label="Next slide"
          >
            ›
          </button>

          {/* DOTS INDICATOR */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition ${index === currentSlide ? 'bg-yellow-500 w-8' : 'bg-white/50'}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* LATEST NEWS */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <h2 className="text-4xl font-bold text-gray-900 mb-12">Latest News Bulletin</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {news.slice(0, 6).map(article => (
            <div key={article.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition">
              <div className="h-48 bg-green-100 flex items-center justify-center text-green-700 font-bold">
                {article.category || 'NEWS'}
              </div>
              <div className="p-6">
                <span className="text-sm text-gray-500">{new Date(article.publishedAt).toLocaleDateString()}</span>
                <h3 className="text-xl font-bold text-gray-900 mt-2 mb-2">{article.title}</h3>
                <p className="text-gray-600 line-clamp-3">{article.excerpt || article.content?.substring(0, 150)}</p>
                <a href={`/news/${article.slug}`} className="text-green-700 font-semibold mt-4 inline-block">Read story →</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LEADERSHIP */}
      {leadership.length > 0 && (
        <section className="py-20 bg-green-900 text-white">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-4xl font-bold mb-12">Leadership & Institutional Mission</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {leadership.map(profile => (
                <div key={profile.id} className="flex items-center gap-8">
                  <div className="w-32 h-32 rounded-full bg-yellow-500 flex items-center justify-center text-3xl font-bold text-green-900">
                    {profile.fullName?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{profile.fullName}</h3>
                    <p className="text-yellow-400 font-semibold">{profile.title}</p>
                    <p className="text-sm opacity-80 mt-2">{profile.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ACADEMIC OFFERINGS */}
      <section className="py-20 px-6 max-w-7xl mx-auto w-full">
        <h2 className="text-4xl font-bold text-gray-900 mb-12">Academic Offerings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {schools.map(school => (
            <div key={school.id} className="bg-white p-8 rounded-xl shadow-md">
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">{school.code || 'SCHOOL'}</span>
              <h3 className="text-2xl font-bold text-gray-900 mt-4 mb-4">{school.name}</h3>
              <p className="text-gray-600 mb-4">{school.description}</p>
              <a href={`/admissions?school=${school.id}`} className="text-green-700 font-semibold">View Admission Criteria →</a>
            </div>
          ))}
        </div>
      </section>

      {/* FAQS */}
      {faqs.length > 0 && (
        <section className="py-20 bg-white">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map(faq => (
                <details key={faq.id} className="bg-gray-50 p-6 rounded-lg cursor-pointer">
                  <summary className="font-bold text-lg">{faq.question}</summary>
                  <p className="mt-4 text-gray-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="bg-green-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-2xl font-bold text-yellow-500 mb-4">{settings.institutionName || 'EDOCASTI PORTAL'}</h3>
            <p className="text-sm opacity-80">{settings.address || 'Iguoriakhi Main Campus, Benin-Lagos Expressway, Edo State, Nigeria.'}</p>
          </div>
          <div>
            <h4 className="font-bold mb-2">Helpdesk & Admissions</h4>
            <p className="text-sm opacity-80">{settings.contactPhone || '+234 803 000 1234'}</p>
            <p className="text-sm opacity-80">{settings.contactEmail || 'admissions@edocasti.edu.ng'}</p>
          </div>
          <div>
            <h4 className="font-bold mb-2">Quick Links</h4>
            <ul className="text-sm opacity-80 space-y-1">
              <li>Apply for Admission</li>
              <li>Check Results</li>
              <li>Student Portal</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};