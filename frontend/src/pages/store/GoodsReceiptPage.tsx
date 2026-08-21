import React, { useState, useMemo, useEffect } from 'react';
import {
  FileCheck2,
  Plus,
  Search,
  Filter,
  Printer,
  Eye,
  CheckCircle2,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Package,
  Edit,
  Trash2,
} from 'lucide-react';
import { GoodsReceipt, GRNItem } from '../../types/store';
import { fetchGoodsReceiptsApi, createGoodsReceiptApi, createStockInwardApi } from '../../services/api';
import { useHMS } from '../../context/HMSContext';
import { Modal } from '../../components/common/Modal';

export const GoodsReceiptPage: React.FC = () => {
  const { addToast, purchaseOrders, storeItems, updatePurchaseOrder } = useHMS();
  const [grnList, setGrnList] = useState<GoodsReceipt[]>([]);

  const loadGrnList = async () => {
    try {
      const data = await fetchGoodsReceiptsApi();
      if (Array.isArray(data)) {
        setGrnList(data.map((g: any): GoodsReceipt => ({
          id: g.id,
          grnNumber: g.grn_number || g.grnNumber,
          poNumber: g.po_number || g.poNumber || '',
          vendorName: g.vendor_name || g.vendorName || '',
          receivedDate: g.received_date || g.receivedDate || new Date().toISOString().split('T')[0],
          items: g.items || [],
          remarks: g.remarks || '',
          status: g.status || 'Completed',
        })));
      }
    } catch (err) {
      console.warn('Error fetching goods receipts from API:', err);
    }
  };

  useEffect(() => {
    loadGrnList();
  }, []);

  // Search & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState<GoodsReceipt | null>(null);

  // Filter Purchase Orders to show ONLY unfulfilled / not-yet-updated POs in GRN creation
  const unfulfilledPurchaseOrders = useMemo(() => {
    const fulfilledPoNumbers = new Set(grnList.map((g) => g.poNumber).filter(Boolean));
    return (purchaseOrders || []).filter((p) => {
      if (!p) return false;
      // If editing an existing GRN, allow its currently assigned PO
      if (selectedGRN && (selectedGRN.poNumber === p.poNumber || selectedGRN.id === (selectedGRN as any).purchase_order_id || selectedGRN.id === p.id)) {
        return true;
      }
      const isStatusFulfilled = p.status === 'Fulfilled' || (p.status as string) === 'Completed' || (p.status as string) === 'Received';
      const isGrnExisting = fulfilledPoNumbers.has(p.poNumber);
      return !isStatusFulfilled && !isGrnExisting;
    });
  }, [purchaseOrders, grnList, selectedGRN]);

  // Form State
  const [selectedPoId, setSelectedPoId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  // Item Verification Lines
  const [grnItems, setGrnItems] = useState<GRNItem[]>([]);

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId);
    const po = (purchaseOrders || []).find((p) => p.id === poId);
    if (po && po.items && po.items.length > 0) {
      setGrnItems(
        po.items.map((i: any) => ({
          id: `grni-${Date.now()}-${Math.random()}`,
          itemId: i.itemId || i.item_id,
          itemCode: i.itemCode || i.item_code,
          itemName: i.itemName || i.item_name,
          receivedQuantity: i.quantity,
          acceptedQuantity: i.quantity,
          rejectedQuantity: 0,
        }))
      );
    } else {
      setGrnItems([]);
    }
  };

  const handleUpdateItemQty = (id: string, field: 'receivedQuantity' | 'acceptedQuantity' | 'rejectedQuantity', val: number) => {
    setGrnItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        let updated = { ...item, [field]: val };
        if (field === 'receivedQuantity') {
          updated.acceptedQuantity = val - updated.rejectedQuantity;
        } else if (field === 'acceptedQuantity') {
          updated.rejectedQuantity = updated.receivedQuantity - val;
        } else if (field === 'rejectedQuantity') {
          updated.acceptedQuantity = updated.receivedQuantity - val;
        }
        return updated;
      })
    );
  };

  const handleOpenCreate = () => {
    setSelectedGRN(null);
    const firstUnfulfilled = unfulfilledPurchaseOrders[0];
    const initialPoId = firstUnfulfilled?.id || '';
    setSelectedPoId(initialPoId);
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setRemarks('');

    if (firstUnfulfilled && firstUnfulfilled.items && firstUnfulfilled.items.length > 0) {
      setGrnItems(
        firstUnfulfilled.items.map((i: any) => ({
          id: `grni-${Date.now()}-${Math.random()}`,
          itemId: i.itemId || i.item_id,
          itemCode: i.itemCode || i.item_code,
          itemName: i.itemName || i.item_name,
          receivedQuantity: i.quantity,
          acceptedQuantity: i.quantity,
          rejectedQuantity: 0,
        }))
      );
    } else {
      setGrnItems([]);
    }
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (grn: GoodsReceipt) => {
    setSelectedGRN(grn);
    const po = purchaseOrders.find((p) => p.poNumber === grn.poNumber);
    if (po) setSelectedPoId(po.id);
    setReceivedDate(grn.receivedDate);
    setRemarks(grn.remarks || '');
    setGrnItems(grn.items);
    setIsCreateModalOpen(true);
  };

  const handleOpenDelete = (grn: GoodsReceipt) => {
    setSelectedGRN(grn);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedGRN) {
      setGrnList((prev) => prev.filter((g) => g.id !== selectedGRN.id));
      addToast('info', 'GRN Deleted', `Goods receipt ${selectedGRN.grnNumber} deleted.`);
      setIsDeleteModalOpen(false);
      setSelectedGRN(null);
    }
  };

  const handleSaveGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    const po = purchaseOrders.find((p) => p.id === selectedPoId);

    const isPoUuid = po?.id && po.id.length > 20 && !po.id.startsWith('po-');
    const grnNum = `GRN-2026-${String(grnList.length + 1).padStart(3, '0')}`;
    const payload = {
      grn_number: grnNum,
      purchase_order_id: isPoUuid ? po.id : null,
      po_id: isPoUuid ? po.id : null,
      po_number: po?.poNumber || 'PO-2026-001',
      vendor_name: po?.vendorName || 'General Supplier',
      received_date: receivedDate,
      remarks,
      status: 'Completed',
      items: grnItems.map((i) => {
        const isValidUuid = i.itemId && i.itemId.length > 20 && !i.itemId.startsWith('poi-') && !i.itemId.startsWith('grni-');
        return {
          item_id: isValidUuid ? i.itemId : null,
          item_code: i.itemCode || 'MED-001',
          item_name: i.itemName || 'Item',
          received_quantity: Number(i.receivedQuantity || 0),
          accepted_quantity: Number(i.acceptedQuantity || 0),
          rejected_quantity: Number(i.rejectedQuantity || 0),
        };
      }),
    };

    try {
      const created = await createGoodsReceiptApi(payload);
      const mapped: GoodsReceipt = {
        id: created.id,
        grnNumber: created.grn_number || created.grnNumber || grnNum,
        poNumber: created.po_number || created.poNumber || po?.poNumber || '',
        vendorName: created.vendor_name || created.vendorName || po?.vendorName || '',
        receivedDate: created.received_date || created.receivedDate || receivedDate,
        items: grnItems,
        remarks: created.remarks || remarks,
        status: created.status || 'Completed',
      };
      setGrnList((prev) => [mapped, ...prev]);

      if (po) {
        await updatePurchaseOrder(po.id, { status: 'Fulfilled' });
      }

      addToast('success', 'GRN Verified & Stock Inward Logged', `Saved Goods Receipt ${grnNum} and updated inventory inward stock.`);
    } catch (err: any) {
      console.warn('API error saving GRN:', err);
      const detailMsg = err?.message || 'Could not save Goods Receipt to database.';
      addToast('error', 'Save Failed', detailMsg);
    }
    setIsCreateModalOpen(false);
  };

  const filteredGRNs = useMemo(() => {
    return grnList.filter(
      (g) =>
        g.grnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.vendorName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [grnList, searchQuery]);

  const totalPages = Math.ceil(filteredGRNs.length / itemsPerPage) || 1;
  const paginatedGRNs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredGRNs.slice(start, start + itemsPerPage);
  }, [filteredGRNs, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <nav className="flex text-xs font-semibold text-slate-500 gap-2 mb-1">
            <span>Store / Purchase Portal</span>
            <span>/</span>
            <span className="text-blue-600">Goods Receipt (GRN)</span>
          </nav>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Goods Receipt Note (GRN) Verification
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Log inward consignment inspection, accepted vs rejected stock quantities & quality remarks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenCreate}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New GRN</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search GRN Number, PO Number, Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">GRN Number</th>
                <th className="py-3.5 px-4">PO Reference</th>
                <th className="py-3.5 px-4">Vendor</th>
                <th className="py-3.5 px-4">Received Date</th>
                <th className="py-3.5 px-4">Accepted vs Rejected</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedGRNs.length > 0 ? (
                paginatedGRNs.map((grn) => (
                  <tr key={grn.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-blue-600">{grn.grnNumber}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 font-semibold">
                      {grn.poNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {grn.vendorName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700">
                      {grn.receivedDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 text-[11px]">
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                          ✓ {grn.items.reduce((s, i) => s + i.acceptedQuantity, 0)} Accepted
                        </span>
                        {grn.items.some((i) => i.rejectedQuantity > 0) && (
                          <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-bold">
                            ✕ {grn.items.reduce((s, i) => s + i.rejectedQuantity, 0)} Rejected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                        {grn.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedGRN(grn);
                            setIsViewModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="View GRN"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(grn)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                          title="Edit GRN"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(grn)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete GRN"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedGRN(grn);
                            setIsPrintModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                          title="Print GRN Slip"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No Goods Receipt Notes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{paginatedGRNs.length}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredGRNs.length}</span> records
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

      {/* Create GRN Form Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Receive Consignment (Generate GRN)"
        subtitle="Match received shipment against Purchase Order & log quality inspection"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveGRN} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Purchase Order *</label>
              <select
                value={selectedPoId}
                onChange={(e) => handlePoChange(e.target.value)}
                disabled={unfulfilledPurchaseOrders.length === 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none disabled:opacity-60"
              >
                {unfulfilledPurchaseOrders.length > 0 ? (
                  unfulfilledPurchaseOrders.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.poNumber} - {p.vendorName} ({p.status || 'Pending Receipt'})
                    </option>
                  ))
                ) : (
                  <option value="">No Pending / Unfulfilled Purchase Orders</option>
                )}
              </select>
              {unfulfilledPurchaseOrders.length === 0 && (
                <p className="text-[10px] text-amber-600 font-semibold mt-1">
                  All purchase orders have already been fulfilled & updated.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Received Date</label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GRN Status</label>
              <input
                type="text"
                disabled
                value="Completed Inspection"
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700"
              />
            </div>
          </div>

          {/* Items Inspection Breakdown */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-900">Quantities Verification</h4>
            <div className="space-y-2">
              {grnItems.map((item) => (
                <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 text-xs items-center">
                  <div className="md:col-span-1">
                    <p className="font-bold text-slate-900">{item.itemName}</p>
                    <span className="text-[10px] text-blue-600 font-mono">{item.itemCode}</span>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Received Qty</label>
                    <input
                      type="number"
                      value={item.receivedQuantity}
                      onChange={(e) => handleUpdateItemQty(item.id, 'receivedQuantity', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 font-semibold text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Accepted Qty</label>
                    <input
                      type="number"
                      value={item.acceptedQuantity}
                      onChange={(e) => handleUpdateItemQty(item.id, 'acceptedQuantity', Number(e.target.value))}
                      className="w-full bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1.5 font-bold text-emerald-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block">Rejected Qty</label>
                    <input
                      type="number"
                      value={item.rejectedQuantity}
                      onChange={(e) => handleUpdateItemQty(item.id, 'rejectedQuantity', Number(e.target.value))}
                      className="w-full bg-rose-50 border border-rose-300 rounded-lg px-2 py-1.5 font-bold text-rose-800 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Inspection Remarks</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Damage reports, seal verification, temperature logs..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 cursor-pointer"
            >
              Save GRN Entry
            </button>
          </div>
        </form>
      </Modal>

      {/* Print GRN Modal */}
      {selectedGRN && (
        <Modal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          title={`Print Goods Receipt Note (${selectedGRN.grnNumber})`}
          maxWidth="2xl"
        >
          <div className="p-6 bg-white border border-slate-200 rounded-2xl space-y-4 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="font-bold text-blue-900 text-base">AEGISCARE GOODS RECEIPT NOTE</h3>
                <p className="text-slate-500">PO Ref: {selectedGRN.poNumber} • Date: {selectedGRN.receivedDate}</p>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-slate-900 text-sm">{selectedGRN.grnNumber}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <p className="font-bold text-slate-900">Vendor: {selectedGRN.vendorName}</p>
              <p className="text-slate-600 mt-1">Remarks: {selectedGRN.remarks || 'Clean inspection. Verified.'}</p>
            </div>

            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-[10px] uppercase font-bold">
                  <th className="p-2 border">Item</th>
                  <th className="p-2 border text-center">Recv</th>
                  <th className="p-2 border text-center">Accepted</th>
                  <th className="p-2 border text-center">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {selectedGRN.items.map((i) => (
                  <tr key={i.id} className="border">
                    <td className="p-2 border font-semibold">{i.itemName} ({i.itemCode})</td>
                    <td className="p-2 border text-center font-bold">{i.receivedQuantity}</td>
                    <td className="p-2 border text-center font-bold text-emerald-700">{i.acceptedQuantity}</td>
                    <td className="p-2 border text-center font-bold text-rose-700">{i.rejectedQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => {
                  window.print();
                  addToast('success', 'Printing', 'Sending GRN to printer...');
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 cursor-pointer flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print GRN</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {selectedGRN && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete GRN"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 font-medium">
              Are you sure you want to delete Goods Receipt Note <span className="font-bold text-slate-900">{selectedGRN.grnNumber}</span> for <span className="font-bold text-slate-900">{selectedGRN.vendorName}</span>?
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
                Yes, Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
