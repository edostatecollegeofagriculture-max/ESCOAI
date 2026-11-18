import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

type ContentKind = 'leadership' | 'faqs' | 'calendar';

type ContentRecord = {
  id: string;
  status?: string;
  [key: string]: any;
};

const emptyForm = {
  fullName: '',
  title: '',
  bio: '',
  imageUrl: '',
  question: '',
  answer: '',
  date: '',
  description: '',
  statusLabel: '',
  order: 0,
  status: 'DRAFT',
};

const labels: Record<ContentKind, string> = {
  leadership: 'Leadership Profiles',
  faqs: 'Frequently Asked Questions',
  calendar: 'Academic Calendar',
};

export const PortalContentManager: React.FC = () => {
  const [kind, setKind] = useState<ContentKind>('faqs');
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [form, setForm] = useState<any>({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const loadRecords = async (preserveMessage = false) => {
    setLoading(true);
    if (!preserveMessage) setMessage('');

    try {
      const params = filter === 'ALL' ? {} : { status: filter };

      let response: any;

      if (kind === 'leadership') {
        response = await api.getLeadership(params);
        setRecords(response.leadership || []);
      } else if (kind === 'faqs') {
        response = await api.getFaqs(params);
        setRecords(response.faqs || []);
      } else {
        response = await api.getAcademicCalendar(params);
        setRecords(response.calendar || []);
      }
    } catch (error: any) {
      setMessage(error?.message || 'Unable to load portal content.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [kind, filter]);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const editRecord = (record: ContentRecord) => {
    setEditingId(record.id);
    setForm({ ...emptyForm, ...record });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = { ...form };

      if (kind === 'leadership') {
        if (!payload.fullName.trim() || !payload.title.trim()) {
          throw new Error('Leadership name and title are required.');
        }
      } else if (kind === 'faqs') {
        if (!payload.question.trim() || !payload.answer.trim()) {
          throw new Error('FAQ question and answer are required.');
        }
      } else if (!payload.title.trim()) {
        throw new Error('Calendar event title is required.');
      }

      if (editingId) {
        if (kind === 'leadership') {
          await api.updateLeadership(editingId, payload);
        } else if (kind === 'faqs') {
          await api.updateFaq(editingId, payload);
        } else {
          await api.updateCalendarEvent(editingId, payload);
        }
        setMessage('Portal content updated successfully.');
      } else {
        if (kind === 'leadership') {
          await api.createLeadership(payload);
        } else if (kind === 'faqs') {
          await api.createFaq(payload);
        } else {
          await api.createCalendarEvent(payload);
        }
        setMessage('Portal content created successfully.');
      }

      resetForm();
      await loadRecords(true);
    } catch (error: any) {
      setMessage(error?.message || 'Unable to save portal content.');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (record: ContentRecord) => {
    if (!window.confirm('Delete this portal content permanently?')) return;

    try {
      if (kind === 'leadership') {
        await api.deleteLeadership(record.id);
      } else if (kind === 'faqs') {
        await api.deleteFaq(record.id);
      } else {
        await api.deleteCalendarEvent(record.id);
      }

      setMessage('Portal content deleted.');
      await loadRecords();
    } catch (error: any) {
      setMessage(error?.message || 'Unable to delete portal content.');
    }
  };

  const changeStatus = async (record: ContentRecord, status: string) => {
    try {
      const payload = { ...record, status };

      if (kind === 'leadership') {
        await api.updateLeadership(record.id, payload);
      } else if (kind === 'faqs') {
        await api.updateFaq(record.id, payload);
      } else {
        await api.updateCalendarEvent(record.id, payload);
      }

      setMessage(`Content status changed to ${status}.`);
      await loadRecords();
    } catch (error: any) {
      setMessage(error?.message || 'Unable to update content status.');
    }
  };

  const inputClass =
    'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm';

  const field = (name: string, label: string, required = false) => (
    <label className="block space-y-1" key={name}>
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}{required ? ' *' : ''}
      </span>
      <input
        className={inputClass}
        value={form[name] ?? ''}
        required={required}
        onChange={(event) => setForm({ ...form, [name]: event.target.value })}
      />
    </label>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Public Portal Content
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage institutional leadership, frequently asked questions and academic calendar entries.
          New records are saved as drafts until published.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['leadership', 'faqs', 'calendar'] as ContentKind[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => { resetForm(); setKind(item); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold ${
              kind === item
                ? 'bg-emerald-900 text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            {labels[item]}
          </button>
        ))}
      </div>

      {message && (
        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3 text-sm">
          {message}
        </div>
      )}

      <form onSubmit={saveRecord} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          {editingId ? 'Edit' : 'Add'} {kind === 'faqs' ? 'FAQ' : kind === 'calendar' ? 'Calendar Event' : 'Leadership Profile'}
        </h3>

        {kind === 'leadership' && (
          <div className="grid md:grid-cols-2 gap-3">
            {field('fullName', 'Full name', true)}
            {field('title', 'Official title', true)}
            {field('imageUrl', 'Photograph URL')}
            {field('order', 'Display order')}
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-semibold">Biography / Profile</span>
              <textarea
                className={inputClass}
                rows={4}
                value={form.bio}
                onChange={(event) => setForm({ ...form, bio: event.target.value })}
              />
            </label>
          </div>
        )}

        {kind === 'faqs' && (
          <div className="space-y-3">
            {field('question', 'Question', true)}
            <label className="block space-y-1">
              <span className="text-xs font-semibold">Answer *</span>
              <textarea
                required
                rows={4}
                className={inputClass}
                value={form.answer}
                onChange={(event) => setForm({ ...form, answer: event.target.value })}
              />
            </label>
            {field('order', 'Display order')}
          </div>
        )}

        {kind === 'calendar' && (
          <div className="grid md:grid-cols-2 gap-3">
            {field('title', 'Event title', true)}
            {field('date', 'Event date')}
            {field('statusLabel', 'Display label (e.g. Ongoing, Scheduled)')}
            {field('order', 'Display order')}
            <label className="block space-y-1 md:col-span-2">
              <span className="text-xs font-semibold">Description</span>
              <textarea
                rows={4}
                className={inputClass}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </label>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold">
            Publication status
            <select
              className={inputClass + ' w-auto'}
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>

          <div className="flex gap-2">
            {editingId && (
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border text-xs">
                Cancel edit
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-emerald-800 text-white text-xs font-bold disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Content'}
            </button>
          </div>
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
          {labels[kind]} ({records.length})
        </h3>
        <div className="flex items-center gap-2">
          <select
            className={inputClass + ' w-auto'}
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button type="button" onClick={loadRecords} className="px-3 py-2 rounded-lg border text-xs">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading portal content...</p>
      ) : records.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">
          No records found in this section.
        </p>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const heading =
              kind === 'leadership'
                ? record.fullName
                : kind === 'faqs'
                  ? record.question
                  : record.title;

            const detail =
              kind === 'leadership'
                ? record.title
                : kind === 'faqs'
                  ? record.answer
                  : record.description;

            return (
              <div key={record.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">{heading}</div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{detail}</p>
                  <span className="inline-block mt-2 text-[10px] font-bold rounded px-2 py-1 bg-slate-100 dark:bg-slate-800">
                    {record.status || 'DRAFT'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                  {record.status !== 'PUBLISHED' && (
                    <button type="button" onClick={() => changeStatus(record, 'PUBLISHED')} className="px-3 py-2 rounded-lg bg-emerald-800 text-white text-xs">
                      Publish
                    </button>
                  )}
                  {record.status === 'PUBLISHED' && (
                    <button type="button" onClick={() => changeStatus(record, 'DRAFT')} className="px-3 py-2 rounded-lg border text-xs">
                      Unpublish
                    </button>
                  )}
                  <button type="button" onClick={() => editRecord(record)} className="px-3 py-2 rounded-lg border text-xs">
                    Edit
                  </button>
                  <button type="button" onClick={() => deleteRecord(record)} className="px-3 py-2 rounded-lg border border-red-300 text-red-700 text-xs">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
