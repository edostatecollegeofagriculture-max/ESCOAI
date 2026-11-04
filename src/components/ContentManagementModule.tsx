import React, { useState, useEffect } from 'react';
import { NewsArticle, HeroSlide } from '../types';
import { api } from '../services/api';
import {
  FileText,
  Sliders,
  Plus,
  Search,
  CheckCircle,
  Eye,
  Trash2,
  Edit,
  Star,
  StarOff,
  MoveUp,
  MoveDown,
  Sparkles,
  Tractor,
  GraduationCap,
  BookOpen,
  Award,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Layers,
  Check,
  X,
} from 'lucide-react';
import { NewsArticleModal } from './NewsArticleModal';

export const ContentManagementModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'articles' | 'slides'>('articles');

  // Articles state
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [articleCategory, setArticleCategory] = useState<string>('ALL');
  const [articleStatus, setArticleStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Article Modal Form
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [articleForm, setArticleForm] = useState({
    title: '',
    summary: '',
    content: '',
    category: 'Academics' as NewsArticle['category'],
    status: 'PUBLISHED' as NewsArticle['status'],
    author: 'Office of Information & Protocol',
    isFeaturedInSlider: false,
    imageUrl: '',
  });

  // Slides state
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideForm, setSlideForm] = useState({
    title: '',
    subtitle: '',
    badge: '2025/2026 Admissions Open',
    bgGradient: 'from-emerald-950 via-emerald-900 to-slate-950',
    accentColor: 'amber-400',
    ctaText: 'Apply for Admission Online',
    ctaTab: 'admissions',
    ctaSubSection: 'form',
    iconName: 'Sparkles',
    order: 1,
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [artRes, slideRes] = await Promise.all([
        api.getNews({
          category: articleCategory !== 'ALL' ? articleCategory : undefined,
          status: articleStatus !== 'ALL' ? articleStatus : undefined,
          search: searchQuery || undefined,
        }),
        api.getSlides(),
      ]);

      if (artRes.success && artRes.articles) {
        setArticles(artRes.articles);
      }
      if (slideRes.success && slideRes.slides) {
        setSlides(slideRes.slides);
      }
    } catch (err) {
      console.error('Failed to load CMS data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [articleCategory, articleStatus, searchQuery]);

  // Handle Article Create / Edit
  const openArticleModal = (article?: NewsArticle) => {
    if (article) {
      setEditingArticleId(article.id);
      setArticleForm({
        title: article.title,
        summary: article.summary,
        content: article.content,
        category: article.category,
        status: article.status,
        author: article.author,
        isFeaturedInSlider: article.isFeaturedInSlider,
        imageUrl: article.imageUrl || '',
      });
    } else {
      setEditingArticleId(null);
      setArticleForm({
        title: '',
        summary: '',
        content: '',
        category: 'Academics',
        status: 'PUBLISHED',
        author: 'Office of Information & Protocol',
        isFeaturedInSlider: false,
        imageUrl: '',
      });
    }
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.title || !articleForm.summary || !articleForm.content) {
      alert('Please fill out all mandatory article fields.');
      return;
    }

    try {
      if (editingArticleId) {
        await api.updateNewsArticle(editingArticleId, articleForm);
        showNotification('Article updated successfully.');
      } else {
        await api.createNewsArticle(articleForm);
        showNotification('New article published successfully.');
      }
      setIsArticleModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving article.');
    }
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await api.deleteNewsArticle(id);
      showNotification('Article removed from portal.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting article.');
    }
  };

  const handleToggleSliderFeatured = async (id: string) => {
    try {
      const res = await api.toggleNewsSlider(id);
      if (res.success) {
        showNotification(
          res.isFeaturedInSlider
            ? 'Article pinned to News Slide Show.'
            : 'Article unpinned from News Slide Show.'
        );
        loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Error toggling slider state.');
    }
  };

  // Handle Slide Create / Edit
  const openSlideModal = (slide?: HeroSlide) => {
    if (slide) {
      setEditingSlideId(slide.id);
      setSlideForm({
        title: slide.title,
        subtitle: slide.subtitle,
        badge: slide.badge,
        bgGradient: slide.bgGradient,
        accentColor: slide.accentColor,
        ctaText: slide.ctaText,
        ctaTab: slide.ctaTab,
        ctaSubSection: slide.ctaSubSection,
        iconName: slide.iconName,
        order: slide.order,
        isActive: slide.isActive,
      });
    } else {
      setEditingSlideId(null);
      setSlideForm({
        title: '',
        subtitle: '',
        badge: 'College Announcement',
        bgGradient: 'from-emerald-950 via-emerald-900 to-slate-950',
        accentColor: 'amber-400',
        ctaText: 'Learn More',
        ctaTab: 'public',
        ctaSubSection: 'overview',
        iconName: 'Sparkles',
        order: slides.length + 1,
        isActive: true,
      });
    }
    setIsSlideModalOpen(true);
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideForm.title || !slideForm.subtitle) {
      alert('Slide title and subtitle are required.');
      return;
    }

    try {
      if (editingSlideId) {
        await api.updateSlide(editingSlideId, slideForm);
        showNotification('Slide updated successfully.');
      } else {
        await api.createSlide(slideForm);
        showNotification('New slide added to slideshow.');
      }
      setIsSlideModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error saving slide.');
    }
  };

  const handleDeleteSlide = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete slide "${title}"?`)) return;
    try {
      await api.deleteSlide(id);
      showNotification('Slide deleted.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting slide.');
    }
  };

  const handleToggleSlideActive = async (slide: HeroSlide) => {
    try {
      await api.updateSlide(slide.id, { isActive: !slide.isActive });
      showNotification(`Slide is now ${!slide.isActive ? 'Active' : 'Inactive'}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating slide.');
    }
  };

  const handleMoveSlide = async (slide: HeroSlide, direction: 'up' | 'down') => {
    const currentIndex = slides.findIndex((s) => s.id === slide.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const otherSlide = slides[targetIndex];
    try {
      await Promise.all([
        api.updateSlide(slide.id, { order: otherSlide.order }),
        api.updateSlide(otherSlide.id, { order: slide.order }),
      ]);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error reordering slides.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="bg-linear-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white p-6 rounded-2xl border border-amber-500/30 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Layers className="w-4 h-4" /> Integrated Publishing & Portal Communications
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              Content Management System (CMS)
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-2xl">
              Publish news bulletins, manage hero slideshows, and broadcast announcements across the college web ecosystem in real time.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openArticleModal()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> New Article
            </button>
            <button
              onClick={() => openSlideModal()}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl border border-emerald-600 transition flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Slide
            </button>
          </div>
        </div>

        {/* CMS Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-emerald-800/60 text-xs">
          <div className="p-3 rounded-xl bg-emerald-900/60 border border-emerald-800">
            <div className="text-emerald-300">Total Published Articles</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {articles.filter((a) => a.status === 'PUBLISHED').length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-900/60 border border-emerald-800">
            <div className="text-emerald-300">Featured in Slide Show</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {articles.filter((a) => a.isFeaturedInSlider).length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-900/60 border border-emerald-800">
            <div className="text-emerald-300">Active Hero Slides</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {slides.filter((s) => s.isActive).length}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-900/60 border border-emerald-800">
            <div className="text-emerald-300">Total Bulletin Views</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {articles.reduce((acc, a) => acc + (a.views || 0), 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {statusMessage && (
        <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-semibold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Segmented Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('articles')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'articles'
              ? 'bg-emerald-900 text-amber-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" /> News & Press Articles ({articles.length})
        </button>

        <button
          onClick={() => setActiveTab('slides')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'slides'
              ? 'bg-emerald-900 text-amber-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" /> Hero Slide Show Manager ({slides.length})
        </button>
      </div>

      {/* ================= ARTICLES TAB ================= */}
      {activeTab === 'articles' && (
        <div className="space-y-4">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 w-48 sm:w-64"
                />
              </div>

              <select
                value={articleCategory}
                onChange={(e) => setArticleCategory(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
              >
                <option value="ALL">All Categories</option>
                <option value="Admissions">Admissions</option>
                <option value="Academics">Academics</option>
                <option value="Research & Farm">Research & Farm</option>
                <option value="Campus Life">Campus Life</option>
                <option value="Notice">Notice</option>
              </select>

              <select
                value={articleStatus}
                onChange={(e) => setArticleStatus(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <button
              onClick={() => openArticleModal()}
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" /> Create Article
            </button>
          </div>

          {/* Articles Table / Cards */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                  <tr>
                    <th className="p-3.5">Headline & Summary</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Slide Show Pin</th>
                    <th className="p-3.5">Author & Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {articles.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        No articles match the current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    articles.map((art) => (
                      <tr key={art.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                        <td className="p-3.5 max-w-sm">
                          <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                            {art.title}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400 line-clamp-2 text-[11px] mt-0.5">
                            {art.summary}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {art.category}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              art.status === 'PUBLISHED'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                : art.status === 'DRAFT'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {art.status}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <button
                            onClick={() => handleToggleSliderFeatured(art.id)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer border ${
                              art.isFeaturedInSlider
                                ? 'bg-amber-100 dark:bg-amber-950/80 border-amber-400 text-amber-900 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                            title="Toggle featured status in news slider"
                          >
                            {art.isFeaturedInSlider ? (
                              <>
                                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                <span>Pinned to Slider</span>
                              </>
                            ) : (
                              <>
                                <StarOff className="w-3.5 h-3.5 text-slate-400" />
                                <span>Not in Slider</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <div>{art.author}</div>
                          <div>{new Date(art.publishedAt).toLocaleDateString()}</div>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedArticle(art)}
                              className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition cursor-pointer"
                              title="Preview article"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openArticleModal(art)}
                              className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition cursor-pointer"
                              title="Edit article"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteArticle(art.id, art.title)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition cursor-pointer"
                              title="Delete article"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= HERO SLIDES TAB ================= */}
      {activeTab === 'slides' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                Active Hero Slideshow Sequence
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure the order, call-to-actions, and background themes of the college hero slider.
              </p>
            </div>
            <button
              onClick={() => openSlideModal()}
              className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" /> Add New Slide
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xs hover:border-emerald-600/50 transition"
              >
                {/* Reorder and Sequence Badge */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveSlide(slide, 'up')}
                      disabled={idx === 0}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 cursor-pointer"
                      title="Move slide up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveSlide(slide, 'down')}
                      disabled={idx === slides.length - 1}
                      className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 hover:bg-slate-200 cursor-pointer"
                      title="Move slide down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-400 font-black flex items-center justify-center text-sm border border-emerald-800">
                    {idx + 1}
                  </div>

                  {/* Slide Info Preview */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        {slide.badge}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          slide.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {slide.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                      {slide.title}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 max-w-xl">
                      {slide.subtitle}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                      CTA: <strong>{slide.ctaText}</strong> → /{slide.ctaTab} ({slide.ctaSubSection})
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleToggleSlideActive(slide)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      slide.isActive
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {slide.isActive ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => openSlideModal(slide)}
                    className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-lg transition cursor-pointer"
                    title="Edit slide"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteSlide(slide.id, slide.title)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-lg transition cursor-pointer"
                    title="Delete slide"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= ARTICLE CREATE / EDIT MODAL ================= */}
      {isArticleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-800/40 dark:border-emerald-600/30 overflow-hidden my-6">
            <div className="bg-linear-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white p-5 flex items-center justify-between border-b border-amber-500/30">
              <div className="font-black text-base sm:text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span>{editingArticleId ? 'Edit News Article' : 'Publish New College Bulletin'}</span>
              </div>
              <button
                onClick={() => setIsArticleModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Article Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={articleForm.title}
                  onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                  placeholder="e.g. Academic Board Releases 2025/2026 Admissions List"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={articleForm.category}
                    onChange={(e) => setArticleForm({ ...articleForm, category: e.target.value as any })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Admissions">Admissions</option>
                    <option value="Academics">Academics</option>
                    <option value="Research & Farm">Research & Farm</option>
                    <option value="Campus Life">Campus Life</option>
                    <option value="Notice">Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Publishing Status
                  </label>
                  <select
                    value={articleForm.status}
                    onChange={(e) => setArticleForm({ ...articleForm, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="PUBLISHED">Published (Visible Publicly)</option>
                    <option value="DRAFT">Draft (Internal Only)</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Author / Directorate
                </label>
                <input
                  type="text"
                  value={articleForm.author}
                  onChange={(e) => setArticleForm({ ...articleForm, author: e.target.value })}
                  placeholder="e.g. Office of the College Registrar"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Executive Summary / Excerpt *
                </label>
                <textarea
                  rows={2}
                  required
                  value={articleForm.summary}
                  onChange={(e) => setArticleForm({ ...articleForm, summary: e.target.value })}
                  placeholder="Brief 1-2 sentence lead overview for news feeds and previews..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Article Content *
                </label>
                <textarea
                  rows={6}
                  required
                  value={articleForm.content}
                  onChange={(e) => setArticleForm({ ...articleForm, content: e.target.value })}
                  placeholder="Comprehensive announcement, directives, and details..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featuredSliderCheck"
                  checked={articleForm.isFeaturedInSlider}
                  onChange={(e) => setArticleForm({ ...articleForm, isFeaturedInSlider: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="featuredSliderCheck" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Pin this article to the News Slide Show ticker on the homepage
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsArticleModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingArticleId ? 'Save Changes' : 'Publish Article'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= HERO SLIDE CREATE / EDIT MODAL ================= */}
      {isSlideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-emerald-800/40 dark:border-emerald-600/30 overflow-hidden my-6">
            <div className="bg-linear-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white p-5 flex items-center justify-between border-b border-amber-500/30">
              <div className="font-black text-base sm:text-lg flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <span>{editingSlideId ? 'Edit Hero Slide' : 'Add New Slide to Sequence'}</span>
              </div>
              <button
                onClick={() => setIsSlideModalOpen(false)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSlide} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Slide Headline Title *
                </label>
                <input
                  type="text"
                  required
                  value={slideForm.title}
                  onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                  placeholder="e.g. Modern Greenhouse Irrigation & Agro-Mechanization"
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Subtitle Narrative *
                </label>
                <textarea
                  rows={2}
                  required
                  value={slideForm.subtitle}
                  onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })}
                  placeholder="Compelling statement on the feature or announcement..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Badge Label
                  </label>
                  <input
                    type="text"
                    value={slideForm.badge}
                    onChange={(e) => setSlideForm({ ...slideForm, badge: e.target.value })}
                    placeholder="e.g. 2025/2026 Admissions Open"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Emblem Icon
                  </label>
                  <select
                    value={slideForm.iconName}
                    onChange={(e) => setSlideForm({ ...slideForm, iconName: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="Sparkles">Sparkles (General)</option>
                    <option value="Tractor">Tractor (Agriculture & Mechanization)</option>
                    <option value="GraduationCap">Graduation Cap (Admissions / Graduation)</option>
                    <option value="BookOpen">Book Open (Academics & Science)</option>
                    <option value="Award">Award (Accreditation & Quality)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    CTA Button Label
                  </label>
                  <input
                    type="text"
                    value={slideForm.ctaText}
                    onChange={(e) => setSlideForm({ ...slideForm, ctaText: e.target.value })}
                    placeholder="e.g. Apply Online"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Target Portal Tab
                  </label>
                  <select
                    value={slideForm.ctaTab}
                    onChange={(e) => setSlideForm({ ...slideForm, ctaTab: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="public">Public Info</option>
                    <option value="admissions">Admissions</option>
                    <option value="student">Student Portal</option>
                    <option value="lecturer">Lecturer Portal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sub-section
                  </label>
                  <input
                    type="text"
                    value={slideForm.ctaSubSection}
                    onChange={(e) => setSlideForm({ ...slideForm, ctaSubSection: e.target.value })}
                    placeholder="e.g. form, programmes"
                    className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="slideActiveCheck"
                  checked={slideForm.isActive}
                  onChange={(e) => setSlideForm({ ...slideForm, isActive: e.target.checked })}
                  className="rounded text-emerald-700 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="slideActiveCheck" className="text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                  Slide is Active and visible in homepage rotation
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSlideModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  {editingSlideId ? 'Save Slide' : 'Add Slide'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Article Reader Modal Preview */}
      <NewsArticleModal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        article={selectedArticle}
      />
    </div>
  );
};
