import React, { useState } from 'react';
import {
  Pill,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Edit3,
  Trash2,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { usePharmacy } from '../../../context/PharmacyContext';
import { useHMS } from '../../../context/HMSContext';
import { Medicine } from '../../../types/hms';

export const MedicineListPage: React.FC = () => {
  const { medicines: contextMedicines, categories, addMedicine, updateMedicine, deleteMedicine } = usePharmacy();
  const { addToast } = useHMS();
  const [medicines, setMedicines] = useState<Medicine[]>(contextMedicines);

  React.useEffect(() => {
    setMedicines(contextMedicines);
  }, [contextMedicines]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [addEditModalOpen, setAddEditModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form State for Add / Edit
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formGeneric, setFormGeneric] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formCategory, setFormCategory] = useState('Tablets');
  const [formManufacturer, setFormManufacturer] = useState('');
  const [formDosageForm, setFormDosageForm] = useState('Tablet');
  const [formStrength, setFormStrength] = useState('');
  const [formUnit, setFormUnit] = useState('Strip of 10');
  const [formPurchasePrice, setFormPurchasePrice] = useState(0);
  const [formSellingPrice, setFormSellingPrice] = useState(0);
  const [formGst, setFormGst] = useState(12);
  const [formStorage, setFormStorage] = useState('Store below 25°C');
  const [formRack, setFormRack] = useState('Rack A-01');
  const [formCurrentStock, setFormCurrentStock] = useState(100);

  // Filtering
  const filteredMedicines = medicines.filter((m) => {
    const name = m?.name || '';
    const code = m?.code || '';
    const genericName = m?.genericName || '';
    const brand = m?.brand || '';
    const manufacturer = m?.manufacturer || '';
    const query = searchQuery.toLowerCase();

    const matchesQuery =
      name.toLowerCase().includes(query) ||
      code.toLowerCase().includes(query) ||
      genericName.toLowerCase().includes(query) ||
      brand.toLowerCase().includes(query) ||
      manufacturer.toLowerCase().includes(query);

    const matchesCategory = categoryFilter === 'All' || m?.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || m?.status === statusFilter;

    return matchesQuery && matchesCategory && matchesStatus;
  });

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedMedicine(null);
    setFormCode(`MED-${1000 + medicines.length + 1}`);
    setFormName('');
    setFormGeneric('');
    setFormBrand('');
    setFormCategory('Tablets');
    setFormManufacturer('');
    setFormDosageForm('Tablet');
    setFormStrength('500 mg');
    setFormUnit('Strip of 10');
    setFormPurchasePrice(50);
    setFormSellingPrice(80);
    setFormGst(12);
    setFormStorage('Store below 25°C');
    setFormRack('Rack A-01');
    setFormCurrentStock(100);
    setAddEditModalOpen(true);
  };

  const handleOpenEditModal = (m: Medicine) => {
    setIsEditMode(true);
    setSelectedMedicine(m);
    setFormCode(m.code);
    setFormName(m.name);
    setFormGeneric(m.genericName);
    setFormBrand(m.brand);
    setFormCategory(m.category);
    setFormManufacturer(m.manufacturer);
    setFormDosageForm(m.dosageForm);
    setFormStrength(m.strength);
    setFormUnit(m.unit);
    setFormPurchasePrice(m.purchasePrice);
    setFormSellingPrice(m.sellingPrice);
    setFormGst(m.gst);
    setFormStorage(m.storageCondition);
    setFormRack(m.rackLocation);
    setFormCurrentStock(m.currentStock);
    setAddEditModalOpen(true);
  };

  const handleOpenViewModal = (m: Medicine) => {
    setSelectedMedicine(m);
    setViewModalOpen(true);
  };

  const handleDeleteMedicine = async (id: string) => {
    if (confirm('Are you sure you want to delete this medicine from Master?')) {
      try {
        await deleteMedicine(id);
        addToast('success', 'Medicine Deleted', 'Medicine was removed successfully.');
      } catch (e) {
        console.error(e);
        addToast('error', 'Delete Failed', 'Failed to delete medicine from the server.');
      }
    }
  };

  const handleSaveMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (isEditMode && selectedMedicine) {
      const updatedItem = {
        code: formCode,
        name: formName,
        genericName: formGeneric,
        brand: formBrand,
        category: formCategory,
        manufacturer: formManufacturer,
        dosageForm: formDosageForm,
        strength: formStrength,
        unit: formUnit,
        purchasePrice: Number(formPurchasePrice),
        sellingPrice: Number(formSellingPrice),
        gst: Number(formGst),
        storageCondition: formStorage,
        rackLocation: formRack,
        currentStock: Number(formCurrentStock),
      };
      try {
        await updateMedicine(selectedMedicine.id, updatedItem);
        addToast('success', 'Medicine Updated', 'Changes saved successfully.');
      } catch (e) {
        console.error(e);
        addToast('error', 'Update Failed', 'Failed to update medicine on the server.');
      }
    } else {
      const newMed = {
        code: formCode,
        name: formName,
        genericName: formGeneric || formName,
        brand: formBrand || formName,
        category: formCategory,
        manufacturer: formManufacturer || 'Standard Pharma',
        dosageForm: formDosageForm,
        strength: formStrength,
        unit: formUnit,
        purchasePrice: Number(formPurchasePrice),
        sellingPrice: Number(formSellingPrice),
        gst: Number(formGst),
        storageCondition: formStorage,
        rackLocation: formRack,
        status: 'Active',
        currentStock: Number(formCurrentStock),
        minStock: 20,
        maxStock: 500,
        reorderLevel: 30,
      };
      try {
        await addMedicine(newMed);
        addToast('success', 'Medicine Added', 'New medicine saved to master list.');
      } catch (e) {
        console.error(e);
        addToast('error', 'Add Failed', 'Failed to save new medicine to the server.');
      }
    }

    setAddEditModalOpen(false);
  };

  const handleExportExcel = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Code,Name,Generic,Brand,Category,Selling Price,Stock'].join(',') +
      '\n' +
      medicines
        .map((m) => `${m.code},"${m.name}","${m.genericName}","${m.brand}",${m.category},${m.sellingPrice},${m.currentStock}`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Medicine_Master_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-600" /> Medicine Master Directory
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Comprehensive hospital medicine database with pricing, rack locations, GST and storage parameters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Print
            </button>
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Medicine
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Code, Medicine Name, Generic Name, Brand, Manufacturer..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Medicine List Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Medicine Name & Generic</th>
                <th className="p-3.5">Brand / Mfr</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Form / Strength</th>
                <th className="p-3.5">Unit</th>
                <th className="p-3.5">Purchase (₹)</th>
                <th className="p-3.5">Selling (₹)</th>
                <th className="p-3.5">GST</th>
                <th className="p-3.5">Rack Location</th>
                <th className="p-3.5">Stock</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMedicines.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-8 text-center text-slate-400">
                    No medicines found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredMedicines.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-emerald-700 text-xs">{m.code}</td>
                    <td className="p-3.5">
                      <p className="font-bold text-slate-900 text-xs">{m.name}</p>
                      <p className="text-[10px] text-slate-500">{m.genericName}</p>
                    </td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800">{m.brand}</p>
                      <p className="text-[10px] text-slate-400">{m.manufacturer}</p>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {m.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700">
                      {m.dosageForm} ({m.strength})
                    </td>
                    <td className="p-3.5 text-slate-600">{m.unit}</td>
                    <td className="p-3.5 font-semibold text-slate-700">₹{m.purchasePrice.toFixed(2)}</td>
                    <td className="p-3.5 font-bold text-emerald-700">₹{m.sellingPrice.toFixed(2)}</td>
                    <td className="p-3.5 text-slate-600">{m.gst}%</td>
                    <td className="p-3.5 font-bold text-indigo-600">{m.rackLocation}</td>
                    <td className="p-3.5">
                      <span
                        className={`font-black text-xs px-2 py-0.5 rounded-full ${
                          m.currentStock <= m.minStock
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {m.currentStock}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenViewModal(m)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          title="Edit Medicine"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(m.id)}
                          title="Delete Medicine"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Modal: View Details */}
      {viewModalOpen && selectedMedicine && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" /> Medicine Details — {selectedMedicine.code}
              </h3>
              <button
                onClick={() => setViewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Medicine Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{selectedMedicine.name}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Generic Name</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedMedicine.genericName}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Brand / Manufacturer</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedMedicine.brand} ({selectedMedicine.manufacturer})
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                <p className="font-bold text-emerald-700 mt-0.5">{selectedMedicine.category}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Dosage Form & Strength</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedMedicine.dosageForm} ({selectedMedicine.strength})
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Unit Packaging</span>
                <p className="font-semibold text-slate-800 mt-0.5">{selectedMedicine.unit}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Purchase / Selling Price</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  ₹{selectedMedicine.purchasePrice} / ₹{selectedMedicine.sellingPrice}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">GST % & Storage</span>
                <p className="font-semibold text-slate-800 mt-0.5">
                  {selectedMedicine.gst}% GST • {selectedMedicine.storageCondition}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Rack & Stock</span>
                <p className="font-bold text-indigo-700 mt-0.5">
                  {selectedMedicine.rackLocation} • {selectedMedicine.currentStock} Units
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add / Edit Medicine */}
      {addEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                {isEditMode ? 'Edit Medicine Master' : 'Add New Medicine to Master'}
              </h3>
              <button
                onClick={() => setAddEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medicine Code *</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g. Paracetamol 650mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={formGeneric}
                    onChange={(e) => setFormGeneric(e.target.value)}
                    placeholder="e.g. Acetaminophen"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Brand Name</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g. Dolo 650"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Manufacturer</label>
                  <input
                    type="text"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    placeholder="e.g. Micro Labs Ltd"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dosage Form</label>
                  <input
                    type="text"
                    value={formDosageForm}
                    onChange={(e) => setFormDosageForm(e.target.value)}
                    placeholder="e.g. Tablet, Syrup"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Strength</label>
                  <input
                    type="text"
                    value={formStrength}
                    onChange={(e) => setFormStrength(e.target.value)}
                    placeholder="e.g. 650 mg"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Packaging</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="e.g. Strip of 15"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">GST (%)</label>
                  <input
                    type="number"
                    value={formGst}
                    onChange={(e) => setFormGst(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formCurrentStock}
                    onChange={(e) => setFormCurrentStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Storage Condition</label>
                  <input
                    type="text"
                    value={formStorage}
                    onChange={(e) => setFormStorage(e.target.value)}
                    placeholder="e.g. Store below 25°C"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rack Location</label>
                  <input
                    type="text"
                    value={formRack}
                    onChange={(e) => setFormRack(e.target.value)}
                    placeholder="e.g. Rack A-04"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  {isEditMode ? 'Update Medicine' : 'Save New Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
