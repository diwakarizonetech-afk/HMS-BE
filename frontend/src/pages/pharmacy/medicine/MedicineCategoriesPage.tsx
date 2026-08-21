import React, { useState } from 'react';
import { Tags, Plus, Search, Edit3, Trash2, X, Package, ShieldCheck } from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { MedicineCategory } from '../../../types/hms';

export const MedicineCategoriesPage: React.FC = () => {
  const { categories: contextCategories, addCategory, setCategories: setContextCategories } = usePharmacy();
  const [categories, setCategories] = useState<MedicineCategory[]>(contextCategories);

  React.useEffect(() => {
    setCategories(contextCategories);
  }, [contextCategories]);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MedicineCategory | null>(null);

  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const filteredCategories = categories.filter((c) => {
    const name = c?.name || '';
    const code = c?.code || '';
    const desc = c?.description || '';
    const query = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      code.toLowerCase().includes(query) ||
      desc.toLowerCase().includes(query)
    );
  });

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormCode('');
    setFormDescription('');
    setModalOpen(true);
  };

  const handleOpenEdit = (c: MedicineCategory) => {
    setEditingCategory(c);
    setFormName(c.name);
    setFormCode(c.code);
    setFormDescription(c.description);
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this medicine category?')) {
      setCategories((prev) => prev.filter((item) => item.id !== id));
      setContextCategories((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingCategory) {
      setCategories((prev) =>
        prev.map((item) =>
          item.id === editingCategory.id
            ? { ...item, name: formName, code: formCode || formName.substring(0, 3).toUpperCase(), description: formDescription }
            : item
        )
      );
    } else {
      const catPayload = {
        name: formName,
        code: formCode || formName.substring(0, 3).toUpperCase(),
        description: formDescription || 'Hospital pharmacy category classification',
        medicineCount: 0,
      };
      try {
        await addCategory(catPayload);
      } catch (err) {
        console.error('Failed to create category:', err);
        const fallbackCat: MedicineCategory = {
          id: `cat-${Date.now()}`,
          ...catPayload,
        };
        setCategories((prev) => [fallbackCat, ...prev]);
      }
    }
    setModalOpen(false);
  };


  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Tags className="w-6 h-6 text-emerald-600" /> Medicine Category Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Classify pharmaceutical formulations into tablets, capsules, cold-chain biologics, injections & surgical items.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer w-fit"
          >
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative pt-2 border-t border-slate-100 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, code or description..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.map((c) => (
          <div
            key={c.id}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  CODE: {c.code}
                </span>
                <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-emerald-600" /> {c.medicineCount} Items
                </span>
              </div>
              <h3 className="text-base font-black text-slate-900">{c.name}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{c.description}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 text-xs">
              <button
                onClick={() => handleOpenEdit(c)}
                className="px-3 py-1.5 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="px-3 py-1.5 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Add / Edit Category */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tags className="w-5 h-5 text-emerald-600" />
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="e.g. Tablets, Injections, Surgical Items"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category Code</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TAB, INJ, SUR"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of formulations included..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-900 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {editingCategory ? 'Update Category' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
