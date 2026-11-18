import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Save, Plus, Trash2, RefreshCw, FileText, CreditCard } from 'lucide-react';

export const DocumentTemplatesTab: React.FC = () => {
  const { settings, refreshUserData } = useAuth();
  const [activeDoc, setActiveDoc] = useState<'admissionLetter' | 'idCard'>('admissionLetter');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState<any>({
    admissionLetter: {
      title: 'Provisional Offer of Admission',
      greeting: 'Dear',
      introParagraph: 'I am pleased to inform you that...',
      programmeDuration: '2 Academic Years',
      studyLevel: 'ND I (Full-Time)',
      schoolFaculty: 'School of Agricultural Technology',
      conditionsTitle: 'Conditions of Admission:',
      conditionsList: ['Rule 1', 'Rule 2'],
      signatureName: 'Barr. Itohan Edokpayi',
      signatureTitle: 'Registrar, EDOCASTI',
      letterheadSubtext: 'IGUORIAKHI MAIN CAMPUS, EDO STATE, NIGERIA',
      letterheadMotto: '"Excellence in Agriculture, Science & Technology"'
    },
    idCard: {
      frontBg: 'linear-gradient(135deg, #064e3b, #065f46, #0f172a)',
      backBg: 'linear-gradient(135deg, #0f172a, #022c22, #0f172a)',
      accentColor: '#f59e0b',
      watermarkText: 'EDOCASTI',
      showWatermark: true,
      shortName: 'EDOCASTI',
      institutionName: 'Edo State College of Agric, Sci & Tech',
    }
  });

  useEffect(() => {
    if (settings?.documents) {
      setFormData({
        admissionLetter: { ...formData.admissionLetter, ...settings.documents.admissionLetter },
        idCard: { ...formData.idCard, ...settings.documents.idCard }
      });
    }
  }, [settings]);

  const handleChange = (doc: 'admissionLetter' | 'idCard', field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [doc]: { ...prev[doc], [field]: value }
    }));
  };

  const handleConditionChange = (index: number, value: string) => {
    const newList = [...(formData.admissionLetter.conditionsList || [])];
    newList[index] = value;
    handleChange('admissionLetter', 'conditionsList', newList);
  };

  const addCondition = () => {
    handleChange('admissionLetter', 'conditionsList', [...(formData.admissionLetter.conditionsList || []), 'New condition']);
  };

  const removeCondition = (index: number) => {
    const newList = (formData.admissionLetter.conditionsList || []).filter((_: any, i: number) => i !== index);
    handleChange('admissionLetter', 'conditionsList', newList);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      handleChange('admissionLetter', field, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await api.updateSettings({ documents: formData });
      if (res.success) {
        setMsg({ type: 'success', text: 'Document templates updated successfully!' });
        if (refreshUserData) await refreshUserData();
      } else {
        throw new Error(res.message || 'Update failed');
      }
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Document Templates</h2>
          <p className="text-sm text-slate-500">Customize the text, branding, and layout of generated documents.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {msg.text && (
        <div className={`p-3 rounded-lg text-sm font-medium ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveDoc('admissionLetter')}
          className={`pb-2 px-4 font-semibold text-sm flex items-center gap-2 ${activeDoc === 'admissionLetter' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <FileText className="w-4 h-4" /> Admission Letter
        </button>
        <button
          onClick={() => setActiveDoc('idCard')}
          className={`pb-2 px-4 font-semibold text-sm flex items-center gap-2 ${activeDoc === 'idCard' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <CreditCard className="w-4 h-4" /> Student ID Card
        </button>
      </div>

      <div className="space-y-4 text-sm">
        {activeDoc === 'admissionLetter' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">Document Title</label>
                <input value={formData.admissionLetter.title || ''} onChange={(e) => handleChange('admissionLetter', 'title', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Greeting</label>
                <input value={formData.admissionLetter.greeting || ''} onChange={(e) => handleChange('admissionLetter', 'greeting', e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
              <div>
                <label className="block font-medium mb-1">Letterhead Subtext (Under Logo)</label>
                <input value={formData.admissionLetter.letterheadSubtext || ''} onChange={(e) => handleChange('admissionLetter', 'letterheadSubtext', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Letterhead Motto</label>
                <input value={formData.admissionLetter.letterheadMotto || ''} onChange={(e) => handleChange('admissionLetter', 'letterheadMotto', e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Intro Paragraph (Use {'{institutionName}'} and {'{currentSession}'} as placeholders)</label>
              <textarea rows={4} value={formData.admissionLetter.introParagraph || ''} onChange={(e) => handleChange('admissionLetter', 'introParagraph', e.target.value)} className="w-full p-2 border rounded" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block font-medium mb-1">Programme Duration</label>
                <input value={formData.admissionLetter.programmeDuration || ''} onChange={(e) => handleChange('admissionLetter', 'programmeDuration', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">Study Level</label>
                <input value={formData.admissionLetter.studyLevel || ''} onChange={(e) => handleChange('admissionLetter', 'studyLevel', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">School / Faculty</label>
                <input value={formData.admissionLetter.schoolFaculty || ''} onChange={(e) => handleChange('admissionLetter', 'schoolFaculty', e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="font-bold text-slate-800 mb-2">Conditions of Admission</h3>
              <label className="block font-medium mb-1">Conditions Title</label>
              <input value={formData.admissionLetter.conditionsTitle || ''} onChange={(e) => handleChange('admissionLetter', 'conditionsTitle', e.target.value)} className="w-full p-2 border rounded mb-3 font-semibold" />
              
              {(formData.admissionLetter.conditionsList || []).map((cond: string, i: number) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input value={cond} onChange={(e) => handleConditionChange(i, e.target.value)} className="flex-1 p-2 border rounded" />
                  <button type="button" onClick={() => removeCondition(i)} className="p-2 text-red-600 hover:bg-red-50 rounded border border-transparent hover:border-red-200">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button type="button" onClick={addCondition} className="text-emerald-600 text-xs font-bold flex items-center gap-1 mt-2 hover:underline">
                <Plus className="w-3 h-3" /> Add Condition
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4 mt-4">
              <h3 className="font-bold text-slate-800 mb-2">Signature & Seal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium mb-1">Signatory Name</label>
                  <input value={formData.admissionLetter.signatureName || ''} onChange={(e) => handleChange('admissionLetter', 'signatureName', e.target.value)} className="w-full p-2 border rounded" />
                </div>
                <div>
                  <label className="block font-medium mb-1">Signatory Title</label>
                  <input value={formData.admissionLetter.signatureTitle || ''} onChange={(e) => handleChange('admissionLetter', 'signatureTitle', e.target.value)} className="w-full p-2 border rounded" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block font-medium mb-1">Upload Signature Image</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'signatureImageUrl')} 
                    className="w-full p-2 border rounded text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
                  />
                  {formData.admissionLetter.signatureImageUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={formData.admissionLetter.signatureImageUrl} alt="Signature Preview" className="h-10 object-contain border rounded p-1 bg-slate-50" />
                      <button type="button" onClick={() => handleChange('admissionLetter', 'signatureImageUrl', '')} className="text-xs text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block font-medium mb-1">Upload Official Seal Image</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'sealImageUrl')} 
                    className="w-full p-2 border rounded text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" 
                  />
                  {formData.admissionLetter.sealImageUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <img src={formData.admissionLetter.sealImageUrl} alt="Seal Preview" className="h-10 object-contain border rounded p-1 bg-slate-50" />
                      <button type="button" onClick={() => handleChange('admissionLetter', 'sealImageUrl', '')} className="text-xs text-red-500 hover:underline">Remove</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeDoc === 'idCard' && (
          <>
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-4">
              <div>
                <label className="block font-medium mb-1">ID Card Short Name (Top Left)</label>
                <input value={formData.idCard.shortName || ''} onChange={(e) => handleChange('idCard', 'shortName', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div>
                <label className="block font-medium mb-1">ID Card Institution Subtext</label>
                <input value={formData.idCard.institutionName || ''} onChange={(e) => handleChange('idCard', 'institutionName', e.target.value)} className="w-full p-2 border rounded" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block font-medium mb-1">Card Base Color (Gradient)</label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={formData.idCard.frontBg?.startsWith('#') ? formData.idCard.frontBg : '#064e3b'} 
                    onChange={(e) => handleChange('idCard', 'frontBg', e.target.value)} 
                    className="w-full p-1 h-10 border rounded cursor-pointer" 
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">Pick a base color; we'll automatically blend it into a beautiful gradient.</p>
              </div>
              <div>
                <label className="block font-medium mb-1">Accent Color (Border/Badge)</label>
                <input type="color" value={formData.idCard.accentColor || '#f59e0b'} onChange={(e) => handleChange('idCard', 'accentColor', e.target.value)} className="w-full p-1 h-10 border rounded cursor-pointer" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-4">
              <div>
                <label className="block font-medium mb-1">Watermark Text</label>
                <input value={formData.idCard.watermarkText || ''} onChange={(e) => handleChange('idCard', 'watermarkText', e.target.value)} className="w-full p-2 border rounded" />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" checked={formData.idCard.showWatermark} onChange={(e) => handleChange('idCard', 'showWatermark', e.target.checked)} className="w-4 h-4 text-emerald-600 rounded" />
                <label className="font-medium">Show Watermark</label>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
