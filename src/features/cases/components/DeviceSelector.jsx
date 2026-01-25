import React, { useState, useEffect } from 'react';
import { Settings, Mic } from 'lucide-react';

const DeviceSelector = ({ onDeviceChange }) => {
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const getDevices = async () => {
            try {
                // Request permission first to ensure labels are active
                await navigator.mediaDevices.getUserMedia({ audio: true });

                const enumerate = await navigator.mediaDevices.enumerateDevices();
                const audioInputs = enumerate.filter(d => d.kind === 'audioinput');
                setDevices(audioInputs);

                // Select default if available
                if (audioInputs.length > 0 && !selectedDeviceId) {
                    setSelectedDeviceId(audioInputs[0].deviceId);
                    onDeviceChange(audioInputs[0].deviceId);
                }
            } catch (err) {
                console.error("Error fetching devices:", err);
            }
        };

        getDevices();

        // Listen for device changes
        navigator.mediaDevices.addEventListener('devicechange', getDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    }, []);

    const handleChange = (e) => {
        const deviceId = e.target.value;
        setSelectedDeviceId(deviceId);
        onDeviceChange(deviceId);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
                title="Configuración de Audio"
            >
                <Settings size={16} />
            </button>
        );
    }

    return (
        <div className="flex items-center space-x-2 bg-gray-900/80 p-2 rounded-lg border border-gray-700 animate-fadeIn">
            <Mic size={14} className="text-gray-400" />
            <select
                value={selectedDeviceId}
                onChange={handleChange}
                className="bg-transparent text-xs text-gray-300 border-none outline-none focus:ring-0 max-w-[200px]"
            >
                {devices.map(d => (
                    <option key={d.deviceId} value={d.deviceId} className="bg-gray-800 text-gray-300">
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}...`}
                    </option>
                ))}
            </select>
            <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-white ml-2"
            >
                &times;
            </button>
        </div>
    );
};

export default DeviceSelector;
