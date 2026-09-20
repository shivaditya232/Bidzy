function ConfirmModal({ message, onConfirm, onCancel }) {
    if (!message) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-6 max-w-sm w-full text-center">
                <p className="text-slate-800 mb-6">{message}</p>
                <div className="flex justify-center gap-3">
                    <button onClick={onCancel} className="bg-slate-100 text-slate-700 px-5 py-2 rounded-lg font-medium hover:bg-slate-200">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="bg-red-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-red-700">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;
