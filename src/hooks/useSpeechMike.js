import { useState, useEffect, useRef, useCallback } from 'react';

// Common Philips Vendor ID
const PHILIPS_VID = 0x0911;

export const useSpeechMike = ({ onRecord, onStop, onPause }) => {
    const [device, setDevice] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const mountingRef = useRef(false);
    const deviceRef = useRef(null);
    const callbacksRef = useRef({ onRecord });
    const isSyncedRef = useRef(false);
    const lastRecordStateRef = useRef(false);

    useEffect(() => {
        callbacksRef.current = { onRecord, onStop, onPause };
    }, [onRecord, onStop, onPause]);

    const handleInputReport = useCallback((event) => {
        const { data, device: sourceDevice } = event;
        const array = new Uint8Array(data.buffer);

        let isRecordPressed = false;
        let isButtonReport = false;

        // --- HEURISTICS PER MODEL / REPORT ID ---

        // 1. Wireless Premium Air (LFH4000) - Report ID 128 (0x80)
        if (array[0] === 0x80 && array.length >= 9) {
            isButtonReport = true;
            isRecordPressed = (array[8] & 0x01) !== 0;
        }

        // 2. Wired SpeechMike (LFH3200/3500) - Report ID 1 (0x01)
        else if (array[0] === 0x01 && array.length >= 4) {
            isButtonReport = true;
            // Record is typically Byte 1 (offset 1), Bit 2 (0x04)
            isRecordPressed = (array[1] & 0x04) !== 0;
        }

        // Only process if it's a recognized button report
        if (isButtonReport) {
            const wasRecordPressed = lastRecordStateRef.current;

            // Sync logic: The first report we receive should just update the state 
            // without triggering an event, to avoid auto-starts if the button was already "on"
            if (!isSyncedRef.current) {
                console.log(`SpeechMike (${sourceDevice.productName}) Initial State Sync: Record=${isRecordPressed}`);
                lastRecordStateRef.current = isRecordPressed;
                isSyncedRef.current = true;
                return;
            }

            // Trigger on PRESS transition (0 -> 1)
            if (isRecordPressed && !wasRecordPressed) {
                console.log(`SpeechMike (${sourceDevice.productName}): Record Transition Detected`);
                if (callbacksRef.current.onRecord) {
                    callbacksRef.current.onRecord();
                }
            }

            lastRecordStateRef.current = isRecordPressed;
        }
    }, []);

    const openDevice = useCallback(async (selectedDevice) => {
        if (!selectedDevice) return;

        try {
            if (!selectedDevice.opened) {
                await selectedDevice.open();
            }

            selectedDevice.removeEventListener("inputreport", handleInputReport);
            selectedDevice.addEventListener("inputreport", handleInputReport);

            setDevice(selectedDevice);
            deviceRef.current = selectedDevice;
            setIsConnected(true);
            isSyncedRef.current = false; // Reset sync when a new device is opened

            // Init for Wired models (might need it)
            try {
                const reportId = 0x91;
                const data = new Uint8Array([0x00, 0x01]);
                await selectedDevice.sendReport(reportId, data);
            } catch (e) { /* ignore */ }

        } catch (err) {
            console.error(`Failed to handle ${selectedDevice.productName}:`, err);
        }
    }, [handleInputReport]);

    const connect = async () => {
        try {
            if (!navigator.hid) {
                alert("Navegador no soportado.");
                return;
            }

            const devices = await navigator.hid.requestDevice({
                filters: [{ vendorId: PHILIPS_VID }]
            });

            if (devices.length === 0) return;

            for (const d of devices) {
                await openDevice(d);
            }

        } catch (error) {
            console.error("Error connecting SpeechMike:", error);
        }
    };

    const disconnect = useCallback(async () => {
        const currentDevice = deviceRef.current;
        if (currentDevice) {
            currentDevice.removeEventListener("inputreport", handleInputReport);
            if (currentDevice.opened) {
                await currentDevice.close();
            }
            setDevice(null);
            deviceRef.current = null;
            setIsConnected(false);
        }
    }, [handleInputReport]);

    useEffect(() => {
        mountingRef.current = true;
        const init = async () => {
            if (!navigator.hid) return;
            try {
                const devices = await navigator.hid.getDevices();
                const philipsDevices = devices.filter(d => d.vendorId === PHILIPS_VID);
                if (philipsDevices.length > 0 && mountingRef.current) {
                    for (const d of philipsDevices) {
                        await openDevice(d);
                    }
                }
            } catch (err) {
                console.error("Auto-connect error:", err);
            }
        };
        const timeoutId = setTimeout(init, 500);
        return () => {
            mountingRef.current = false;
            clearTimeout(timeoutId);
        };
    }, [openDevice]);

    return {
        connect,
        disconnect,
        isConnected,
        deviceName: device?.productName
    };
};
