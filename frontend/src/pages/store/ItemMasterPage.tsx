import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
} from 'lucide-react';
import { ItemMaster, ItemCategory, ItemUnit, MEDICINE_CATEGORIES, OTHER_HOSPITAL_CATEGORIES } from '../../types/store';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const ItemMasterPage: React.FC = () => {
  const { addToast, storeItems, addStoreItem, updateStoreItem, deleteStoreItem } = useHMS();
  const items = storeItems;

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');

  // Sorting
  const [sortField, setSortField] = useState<keyof ItemMaster>('itemName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemMaster | null>(null);

  const getNextItemCode = (existingItems: ItemMaster[]) => {
    let maxNum = 100;
    (existingItems || []).forEach((item) => {
      const match = (item.itemCode || '').match(/ITM-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    return `ITM-${maxNum + 1}`;
  };

  // Form State
  const initialFormState: Omit<ItemMaster, 'id'> = {
    itemCode: getNextItemCode(items),
    itemName: '',
    category: 'Pharmaceuticals',
    subCategory: '',
    genericComposition: '',
    strength: '',
    dosageForm: 'Tablet',
    unit: 'Box',
    packQuantity: 20,
    issueUnit: 'Piece',
    openingStock: 0,
    brand: '',
    hsnCode: '',
    gstPercentage: 12,
    minStock: 10,
    maxStock: 500,
    reorderLevel: 20,
    storageLocation: 'Shelf A-1',
    description: '',
    status: 'Active',
    currentStock: 0,
    unitPrice: 100,
  };

  const [formData, setFormData] = useState<Omit<ItemMaster, 'id'>>(initialFormState);

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedItem(null);
    setFormData({
      ...initialFormState,
      itemCode: getNextItemCode(items),
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item: ItemMaster) => {
    setSelectedItem(item);
    setFormData({
      ...item,
      packQuantity: item.packQuantity ?? 1,
      issueUnit: item.issueUnit ?? 'Piece',
      openingStock: item.openingStock ?? item.currentStock ?? 0,
    });
    setIsModalOpen(true);
  };

  // Open View Modal
  const handleOpenView = (item: ItemMaster) => {
    setSelectedItem(item);
    setIsViewModalOpen(true);
  };

  // Open Delete Confirmation
  const handleOpenDelete = (item: ItemMaster) => {
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  // Save / Update Handler
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemName.trim()) {
      addToast('error', 'Validation Error', 'Item Name is required.');
      return;
    }

    const openingStock = Number(formData.openingStock) >= 0 ? Number(formData.openingStock) : 0;
    const currentStock = selectedItem ? (formData.currentStock ?? selectedItem.currentStock ?? openingStock) : openingStock;

    const sanitizedData: Omit<ItemMaster, 'id'> = {
      ...formData,
      openingStock,
      currentStock,
      packQuantity: Number(formData.packQuantity) > 0 ? Number(formData.packQuantity) : 1,
      unitPrice: Number(formData.unitPrice) >= 0 ? Number(formData.unitPrice) : 0,
      minStock: Number(formData.minStock) >= 0 ? Number(formData.minStock) : 0,
      reorderLevel: Number(formData.reorderLevel) >= 0 ? Number(formData.reorderLevel) : 0,
      maxStock: Number(formData.maxStock) >= 0 ? Number(formData.maxStock) : 0,
    };

    if (selectedItem) {
      await updateStoreItem(selectedItem.id, sanitizedData);
    } else {
      await addStoreItem(sanitizedData);
    }

    setIsModalOpen(false);
  };

  // Delete Handler
  const handleConfirmDelete = async () => {
    if (selectedItem) {
      await deleteStoreItem(selectedItem.id);
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
    }
  };

  // Reset Form
  const handleResetForm = () => {
    setFormData({
      ...initialFormState,
      itemCode: selectedItem ? selectedItem.itemCode : getNextItemCode(items),
    });
  };

  // Filtered & Sorted Items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSearch =
          item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.brand.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory =
          selectedCategory === 'All' || item.category === selectedCategory;

        const matchesStatus =
          selectedStatus === 'All' || item.status === selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [items, searchQuery, selectedCategory, selectedStatus, sortField, sortOrder]);

  // Pagination Math
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handleExportCSV = () => {
    addToast('success', 'Exporting Data', 'Downloading Item Master catalog as CSV...');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Item Master</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Item Master Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Maintain central inventory items, stock thresholds, GST, and storage locations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Catalog</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Name, Code, Brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Category & Status Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              <optgroup label="Medicines & Pharmaceuticals">
                {MEDICINE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </optgroup>
              <optgroup label="Other Hospital Items">
                {OTHER_HOSPITAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-bold text-blue-600 outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 cursor-pointer" onClick={() => setSortField('itemCode')}>
                  Code / Name
                </th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Unit & Brand</th>
                <th className="py-3.5 px-4">Stock Levels</th>
                <th className="py-3.5 px-4">HSN & GST</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.itemName}</p>
                          <p className="text-[10px] text-blue-600 font-mono font-semibold">{item.itemCode}</p>
                          {(item.genericComposition || item.strength) && (
                            <p className="text-[10px] text-slate-500 font-medium italic">
                              {item.genericComposition || ''} {item.strength ? `(${item.strength})` : ''} {item.dosageForm ? `• ${item.dosageForm}` : ''}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-700 block">{item.category}</span>
                      <span className="text-[10px] text-slate-400">{item.subCategory || 'N/A'}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-800">{item.unit}</span>
                      {item.packQuantity && item.packQuantity > 1 && (
                        <p className="text-[10px] font-medium text-blue-600">
                          ({item.packQuantity} {item.issueUnit || 'pcs'}/{item.unit})
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500">{item.brand}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-slate-900">
                          Current: <span className={item.currentStock <= item.reorderLevel ? 'text-rose-600' : 'text-emerald-600'}>{item.currentStock}</span>
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Min: {item.minStock} • Reorder: <span className="font-semibold text-amber-600">{item.reorderLevel}</span>
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <p className="font-bold text-slate-700">HSN: {item.hsnCode}</p>
                      <p className="text-blue-600 font-bold">{item.gstPercentage}% GST</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {item.storageLocation}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                          }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenView(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No items found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3 text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedItems.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredItems.length}</span> items
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* CRUD Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? `Edit Item (${selectedItem.itemCode})` : 'Create New Item Master'}
        subtitle="Fill out item catalog specifications, stock thresholds & tax rates"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Item Code</label>
              <input
                type="text"
                disabled
                value={formData.itemCode}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-blue-600"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                placeholder="e.g. Paracetamol 500mg Tablets"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <optgroup label="Medicines & Pharmaceuticals">
                  {MEDICINE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
                <optgroup label="Other Hospital Items">
                  {OTHER_HOSPITAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sub Category *</label>
              <select
                value={formData.subCategory || 'General Pharmaceuticals'}
                onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="General Pharmaceuticals">General Pharmaceuticals</option>
                <option value="Anti-diabetic & Metabolic">Anti-diabetic & Metabolic</option>
                <option value="Antibiotics & Anti-infectives">Antibiotics & Anti-infectives</option>
                <option value="Analgesics & Pain Management">Analgesics & Pain Management</option>
                <option value="Cardiovascular & Cardiac Care">Cardiovascular & Cardiac Care</option>
                <option value="Respiratory & Pulmonary">Respiratory & Pulmonary</option>
                <option value="Gastrointestinal">Gastrointestinal</option>
                <option value="Surgical Disposables & Kits">Surgical Disposables & Kits</option>
                <option value="ICU & Critical Care Supplies">ICU & Critical Care Supplies</option>
                <option value="Diagnostic & Lab Reagents">Diagnostic & Lab Reagents</option>
                <option value="General Store & Utility">General Store & Utility</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Generic / Composition</label>
              <input
                type="text"
                value={formData.genericComposition || ''}
                onChange={(e) => setFormData({ ...formData, genericComposition: e.target.value })}
                placeholder="e.g. Glimepiride + Metformin"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Strength</label>
              <input
                type="text"
                value={formData.strength || ''}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                placeholder="e.g. 2 mg + 500 mg"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Dosage Form</label>
              <select
                value={formData.dosageForm || 'Tablet'}
                onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="IV Fluid">IV Fluid</option>
                <option value="Ointment">Ointment / Gel</option>
                <option value="Drops">Drops</option>
                <option value="Inhaler">Inhaler</option>
                <option value="Suppository">Suppository</option>
                <option value="Medical Supply">Medical Supply</option>
                <option value="Equipment">Equipment</option>
                <option value="General Item">General Item</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Item Unit (UOM)</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value as ItemUnit })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="Box">Box</option>
                <option value="Strip">Strip</option>
                <option value="Bottle">Bottle</option>
                <option value="Vial">Vial</option>
                <option value="Piece">Piece</option>
                <option value="Pack">Pack</option>
                <option value="Roll">Roll</option>
                <option value="Set">Set</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Pack Size / Count per {formData.unit || 'Unit'}
              </label>
              <input
                type="number"
                min={1}
                value={formData.packQuantity ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    packQuantity: e.target.value === '' ? ('' as any) : Number(e.target.value),
                  })
                }
                placeholder="e.g. 20 (20 items inside 1 Box)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Base / Issue Unit</label>
              <input
                type="text"
                value={formData.issueUnit || 'Piece'}
                onChange={(e) => setFormData({ ...formData, issueUnit: e.target.value })}
                placeholder="e.g. Piece, Strip, Tablet, Pair, Vial"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Opening Stock ({formData.unit || 'Unit'}s)
              </label>
              <input
                type="number"
                min={0}
                value={formData.openingStock ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    openingStock: e.target.value === '' ? ('' as any) : Number(e.target.value),
                  })
                }
                placeholder="e.g. 10 (10 Boxes on hand)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
              <p className="text-[10px] text-slate-500 font-medium mt-1">
                Initial stock on hand
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Unit Price (₹ per {formData.unit || 'Unit'})</label>
              <input
                type="number"
                step="0.01"
                value={formData.unitPrice ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitPrice: e.target.value === '' ? ('' as any) : Number(e.target.value),
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Packaging Conversion Helper Banner */}
            <div className="md:col-span-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
              <Layers className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Packaging & Unit Conversion Summary:
                </p>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  1 <strong>{formData.unit || 'Unit'}</strong> contains <strong>{formData.packQuantity || 1} {formData.issueUnit || 'Piece'}(s)</strong> @ <strong>₹{formData.unitPrice || 0}</strong> per {formData.unit || 'Unit'}.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Brand / Manufacturer</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Cipla Health"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">HSN Code</label>
              <input
                type="text"
                value={formData.hsnCode}
                onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                placeholder="e.g. 30049099"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GST %</label>
              <select
                value={formData.gstPercentage}
                onChange={(e) => setFormData({ ...formData, gstPercentage: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>

            {/* Stock Threshold Definition Info Box */}
            <div className="md:col-span-3 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Stock Threshold Levels (Min, Reorder & Max):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-slate-600">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-bold text-rose-600 block mb-0.5">🔻 Minimum Stock:</span>
                  Safety baseline. Stock should <strong>never</strong> drop below this count.
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-bold text-amber-600 block mb-0.5">⚠️ Reorder Level:</span>
                  Trigger point to order new stock immediately.
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="font-bold text-emerald-600 block mb-0.5">🔺 Maximum Stock:</span>
                  Upper storage ceiling to avoid excess holding.
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Stock ({formData.unit})</label>
              <input
                type="number"
                value={formData.minStock ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minStock: e.target.value === '' ? ('' as any) : Number(e.target.value),
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reorder Level Stock ({formData.unit})</label>
              <input
                type="number"
                value={formData.reorderLevel ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reorderLevel: e.target.value === '' ? ('' as any) : Number(e.target.value),
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Maximum Stock ({formData.unit})</label>
              <input
                type="number"
                value={formData.maxStock ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxStock: e.target.value === '' ? ('' as any) : Number(e.target.value),
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Storage Location</label>
              <input
                type="text"
                value={formData.storageLocation}
                onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                placeholder="e.g. Main Store Rack A-3 Shelf 2"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Item notes, dosage form, packaging specs..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetForm}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
              >
                {selectedItem ? 'Update Item' : 'Save Item'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Item Details Modal */}
      {selectedItem && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`Item Specifications: ${selectedItem.itemName}`}
          subtitle={`Item Code: ${selectedItem.itemCode}`}
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500 font-medium">Category:</span>
                <p className="font-bold text-slate-900">{selectedItem.category}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Sub Category:</span>
                <p className="font-bold text-slate-900">{selectedItem.subCategory || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Brand:</span>
                <p className="font-bold text-slate-900">{selectedItem.brand}</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Purchase Unit & Pack Size:</span>
                <p className="font-bold text-slate-900">
                  {selectedItem.unit} {selectedItem.packQuantity ? `(1 ${selectedItem.unit} = ${selectedItem.packQuantity} ${selectedItem.issueUnit || 'Piece'})` : ''}
                </p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">HSN / GST:</span>
                <p className="font-bold text-blue-600">{selectedItem.hsnCode} ({selectedItem.gstPercentage}%)</p>
              </div>
              <div>
                <span className="text-slate-500 font-medium">Unit Price:</span>
                <p className="font-bold text-emerald-600">₹{(selectedItem.unitPrice || 0).toFixed(2)}</p>
              </div>
            </div>

            {selectedItem.packQuantity && selectedItem.packQuantity > 1 && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 font-medium">
                📦 <strong>Conversion Formula:</strong> 1 {selectedItem.unit} = {selectedItem.packQuantity} {selectedItem.issueUnit || 'Piece'}(s).
                If <strong>10 {selectedItem.unit}s</strong> are ordered, total base units = <strong>{10 * selectedItem.packQuantity} {selectedItem.issueUnit || 'Piece'}s</strong>.
              </div>
            )}

            <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-2">
              <h4 className="font-bold text-blue-900">Stock & Location Specs</h4>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-slate-500">Current Stock</span>
                  <p className="font-black text-slate-900 text-sm">{selectedItem.currentStock}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-slate-500">Reorder Level</span>
                  <p className="font-bold text-amber-600 text-sm">{selectedItem.reorderLevel}</p>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-100">
                  <span className="text-[10px] text-slate-500">Max Stock</span>
                  <p className="font-bold text-slate-700 text-sm">{selectedItem.maxStock}</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 font-medium pt-1">
                📍 Location: <span className="font-bold text-slate-900">{selectedItem.storageLocation}</span>
              </p>
            </div>

            <div>
              <span className="text-slate-500 font-medium">Description:</span>
              <p className="text-slate-700 font-medium mt-0.5">{selectedItem.description || 'No description provided.'}</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedItem && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Item"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete <span className="font-bold text-slate-900">{selectedItem.itemName}</span> ({selectedItem.itemCode})? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Yes, Delete Item
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};