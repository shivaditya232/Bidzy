function Toast({ message, type }) {
    if (!message) return null;

    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-green-600';

    return (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50`}>
            {message}
        </div>
    );
}

export default Toast;
