import React, { useRef, useState } from 'react';
import { Paperclip, X, Download, FileText, File as FileIcon } from 'lucide-react';

const FileAttachment = ({ attachments = [], onAdd, onDelete, readOnly = false }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (onAdd) {
            setUploading(true);
            try {
                await onAdd(file);
            } catch (error) {
                console.error("Attachment upload error:", error);
                alert("Error al subir archivo.");
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    const getFileIcon = (fileName) => {
        if (fileName.endsWith('.pdf')) return <FileText className="w-4 h-4 text-red-400" />;
        if (fileName.match(/\.(ppt|pptx|doc|docx)$/)) return <FileText className="w-4 h-4 text-blue-400" />;
        return <FileIcon className="w-4 h-4 text-gray-400" />;
    };

    return (
        <div className="space-y-3">
            {/* Read-Only List */}
            {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors group">
                            <div className="flex items-center space-x-3 overflow-hidden">
                                <div className="p-2 bg-gray-900 rounded flex-shrink-0">
                                    {getFileIcon(file.name)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm text-gray-200 font-medium truncate" title={file.name}>{file.name}</p>
                                    <p className="text-xs text-gray-500">{file.size ? (file.size / 1024 / 1024).toFixed(2) + ' MB' : 'Archivo adjunto'}</p>
                                </div>
                            </div>

                            <div className="flex items-center ml-2 space-x-1">
                                <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded transition-colors"
                                    title="Descargar"
                                >
                                    <Download className="w-4 h-4" />
                                </a>
                                {!readOnly && onDelete && (
                                    <button
                                        onClick={() => onDelete(index)}
                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                        title="Eliminar"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Button */}
            {!readOnly && (
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    // Add constraints if needed, e.g., accept=".pdf,.docx,.pptx"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center px-4 py-2 border border-gray-600 border-dashed rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all w-full justify-center"
                    >
                        {uploading ? (
                            <span className="animate-pulse">Subiendo...</span>
                        ) : (
                            <>
                                <Paperclip className="w-4 h-4 mr-2" />
                                Adjuntar archivo complementario (PDF, PPT, etc.)
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileAttachment;
