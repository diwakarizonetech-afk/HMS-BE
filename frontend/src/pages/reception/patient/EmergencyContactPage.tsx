import React, { useState } from 'react';
import { useHMS } from '../../../context/HMSContext';
import { EmergencyContactItem } from '../../../types/hms';
import { Modal } from '../../../components/common/Modal';
import { PhoneCall, Plus, Edit, Trash2, ShieldAlert } from 'lucide-react';

export const EmergencyContactPage: React.FC = () => {
  const { emergencyContacts, patients, addEmergencyContact, updateEmergencyContact, deleteEmergencyContact } = useHMS();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContactItem | null>(null);

  const [formData, setFormData] = useState({
    patientUhid: patients[0]?.uhid || '',
    patientName: `${patients[0]?.firstName || ''} ${patients[0]?.lastName || ''}`,
    contactName: '',
    relationship: 'Spouse',
    phone: '',
    priority: 'Primary' as 'Primary' | 'Secondary',
  });

  const handleOpenAdd = () => {
    setEditingContact(null);
    setFormData({
      patientUhid: patients[0]?.uhid || '',
      patientName: `${patients[0]?.firstName || ''} ${patients[0]?.lastName || ''}`,
      contactName: '',
      relationship: 'Spouse',
      phone: '',
      priority: 'Primary',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (contact: EmergencyContactItem) => {
    setEditingContact(contact);
    setFormData({
      patientUhid: contact.patientUhid,
      patientName: contact.patientName,
      contactName: contact.contactName,
      relationship: contact.relationship,
      phone: contact.phone,
      priority: contact.priority,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone && formData.phone.replace(/\D/g, '').length !== 10) {
      alert('Phone number must be exactly 10 digits.');
      return;
    }
    if (editingContact) {
      updateEmergencyContact(editingContact.id, formData);
    } else {
      const p = patients.find((pat) => pat.uhid === formData.patientUhid);
      const fullName = p ? `${p.firstName} ${p.lastName}` : formData.patientName;
      addEmergencyContact({
        ...formData,
        patientName: fullName,
      });
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Emergency Contact Directory</h1>
          <p className="text-xs text-slate-500">
            Primary and secondary next-of-kin contacts for admitted and OPD patients.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Emergency Contact</span>
        </button>
      </div>

      {/* Emergency Contacts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
              <tr>
                <th className="p-4">Patient UHID & Name</th>
                <th className="p-4">Contact Name</th>
                <th className="p-4">Relationship</th>
                <th className="p-4">Phone Number</th>
                <th className="p-4">Priority</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {emergencyContacts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-900">{c.patientName}</p>
                    <p className="text-[10px] font-semibold text-blue-600">{c.patientUhid}</p>
                  </td>
                  <td className="p-4 font-bold text-slate-900">{c.contactName}</td>
                  <td className="p-4 text-slate-600">{c.relationship}</td>
                  <td className="p-4 font-bold text-slate-900">{c.phone}</td>
                  <td className="p-4">
                    <span
                      className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        c.priority === 'Primary'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        title="Edit Contact"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteEmergencyContact(c.id)}
                        title="Delete Contact"
                        className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
          subtitle="Assign next-of-kin for emergency medical notifications"
          maxWidth="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Patient *</label>
              <select
                value={formData.patientUhid}
                onChange={(e) => {
                  const p = patients.find((pat) => pat.uhid === e.target.value);
                  setFormData({
                    ...formData,
                    patientUhid: e.target.value,
                    patientName: p ? `${p.firstName} ${p.lastName}` : '',
                  });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.uhid}>
                    {p.uhid} - {p.firstName} {p.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Contact Name *</label>
              <input
                type="text"
                required
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                placeholder="e.g. Sunita Sharma"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Relationship *</label>
                <input
                  type="text"
                  required
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  placeholder="e.g. Spouse / Son"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number (10 digits) *</label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit phone number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority Level</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:bg-white"
              >
                <option value="Primary">Primary (First Call)</option>
                <option value="Secondary">Secondary (Fallback)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
              >
                Save Contact
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
