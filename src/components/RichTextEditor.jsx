import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Image } from '@tiptap/extension-image';
import ImageResize from 'tiptap-extension-resize-image';
import { Link } from '@tiptap/extension-link';

import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    Image as ImageIcon,
    Heading1,
    Heading2,
    Undo,
    Redo,
    Maximize,
    Minimize
} from 'lucide-react';
import { storage } from '../config/firebase'; // Assuming centralized firebase export
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import ImageCropperModal from './ImageCropperModal';

const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace('px', ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}px`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});

const MenuBar = ({ editor, onImageSelect, allowImages = true }) => {
    if (!editor) {
        return null;
    }

    const addImage = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (event) => {
            const file = event.target.files[0];
            if (file) {
                onImageSelect(file);
            }
        };
        input.click();
    }, [onImageSelect]);

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-900/50 border-b border-gray-700 rounded-t-lg">
            {/* Font Size Selector */}
            <select
                onChange={(e) => {
                    if (e.target.value) {
                        editor.chain().focus().setFontSize(e.target.value).run();
                    } else {
                        editor.chain().focus().unsetFontSize().run();
                    }
                }}
                value={editor.getAttributes('textStyle').fontSize || ''} // Default to empty string for normal
                className="h-8 bg-gray-800 text-white rounded border border-gray-600 px-2 text-xs focus:ring-1 focus:ring-indigo-500 mr-1"
            >
                <option value="">Normal</option>
                <option value="12">Pequeño</option>
                <option value="14">Normal (14px)</option>
                <option value="16">Mediano</option>
                <option value="20">Grande</option>
                <option value="24">Extra Grande</option>
            </select>

            <div className="w-px h-5 bg-gray-700 mx-1" />

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run()}
                className={`p-1.5 rounded transition-colors ${editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title="Negrita"
            >
                <Bold className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded transition-colors ${editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title="Cursiva"
            >
                <Italic className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={!editor.can().chain().focus().toggleUnderline().run()}
                className={`p-1.5 rounded transition-colors ${editor.isActive('underline') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title="Subrayado"
            >
                <UnderlineIcon className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run()}
                className={`p-1.5 rounded transition-colors ${editor.isActive('strike') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title="Tachado"
            >
                <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-gray-700 mx-1" />

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title="Título Principal"
            >
                <Heading1 className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={`p-1.5 rounded transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title="Subtítulo"
            >
                <Heading2 className="w-4 h-4" />
            </button>

            <div className="w-px h-5 bg-gray-700 mx-1" />

            <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`p-1.5 rounded transition-colors ${editor.isActive('bulletList') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title="Lista con viñetas"
            >
                <List className="w-4 h-4" />
            </button>
            <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`p-1.5 rounded transition-colors ${editor.isActive('orderedList') ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                title="Lista numerada"
            >
                <ListOrdered className="w-4 h-4" />
            </button>

            {allowImages && (
                <>
                    <div className="w-px h-5 bg-gray-700 mx-1" />
                    <button
                        type="button"
                        onClick={addImage}
                        className="p-1.5 rounded transition-colors text-gray-400 hover:bg-gray-800 hover:text-white"
                        title="Insertar Imagen"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                </>
            )}

            <div className="ml-auto flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().chain().focus().undo().run()}
                    className="p-1.5 rounded transition-colors text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30"
                >
                    <Undo className="w-4 h-4" />
                </button>
                <button
                    type="button"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().chain().focus().redo().run()}
                    className="p-1.5 rounded transition-colors text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30"
                >
                    <Redo className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const RichTextEditor = ({ content, onChange, label, onImageUpload, editable = true, allowImages = true, hideToolbar = false, editorClassName = 'prose dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4 text-gray-300 text-sm' }) => {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [croppingImage, setCroppingImage] = useState(null); // { src: string, file: File }
    const [showCropper, setShowCropper] = useState(false);

    const handleImageToCrop = useCallback((file) => {
        if (file) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setCroppingImage({ src: reader.result, originalFile: file });
                setShowCropper(true);
            });
            reader.readAsDataURL(file);
        }
    }, []);

    const handleCropConfirm = async (croppedBlob) => {
        setShowCropper(false);
        setCroppingImage(null);

        // Upload the cropped blob
        try {
            if (onImageUpload) {
                // We assume onImageUpload returns the URL
                const url = await onImageUpload(croppedBlob);
                if (url) {
                    editor.chain().focus().setImage({ src: url }).run();
                }
            }
        } catch (error) {
            console.error("Error handling cropped image:", error);
            alert("Error uploading image");
        }
    };

    const isUpdatingRef = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Disable extensions that we are adding manually or that might conflict
                history: true,
            }),
            Underline,
            TextStyle,
            FontSize,
            ImageResize,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-indigo-400 underline hover:text-indigo-300',
                },
            }),
        ],
        content: content,
        editable: editable,
        onUpdate: ({ editor }) => {
            if (onChange) {
                isUpdatingRef.current = true;
                onChange(editor.getHTML());
                // Use a microtask/timeout to reset to allow React cycle to complete
                setTimeout(() => { isUpdatingRef.current = false; }, 0);
            }
        },
        editorProps: {
            attributes: {
                class: editorClassName,
            },
        }
    });

    // Derived prop for MenuBar to intercept
    const handleFileSelect = (blobOrFile) => {
        handleImageToCrop(blobOrFile);
    };

    // Update content if it changes externally (e.g., AI injection or manual reset)
    useEffect(() => {
        if (!editor) return;

        const currentHTML = editor.getHTML();
        const normalizedContent = content || '<p></p>'; // Tiptap default if empty
        const normalizedCurrent = currentHTML === '<p></p>' ? '<p></p>' : currentHTML;

        if (normalizedContent !== normalizedCurrent) {
            console.log(`[RichTextEditor] External sync attempt. Internal: "${normalizedCurrent}", External: "${normalizedContent}", isUpdating: ${isUpdatingRef.current}`);
            // Only update if the change didn't originate from the editor itself
            if (!isUpdatingRef.current) {
                console.log("[RichTextEditor] Applying external content.");
                editor.commands.setContent(content || '', false);
            }
        }
    }, [content, editor]);

    // Update editable state if prop changes
    useEffect(() => {
        if (editor) {
            editor.setEditable(editable);
        }
    }, [editable, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className={`border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden flex flex-col bg-white dark:bg-gray-800 transition-all font-sans h-full ${isFullScreen ? 'fixed inset-0 z-50 m-0 rounded-none' : ''}`}>
            {editable && !hideToolbar && (
                <MenuBar
                    editor={editor}
                    onImageSelect={handleFileSelect}
                    allowImages={allowImages}
                />
            )}
            <div className="flex-1 overflow-y-auto p-4 cursor-text bg-white dark:bg-gray-900" onClick={() => editor?.commands.focus()}>
                <EditorContent editor={editor} />
            </div>
            {/* Cropper Modal */}
            {showCropper && croppingImage && (
                <ImageCropperModal
                    imageSrc={croppingImage.src}
                    onCancel={() => {
                        setShowCropper(false);
                        setCroppingImage(null);
                    }}
                    onCropComplete={handleCropConfirm}
                />
            )}
        </div>
    );
};

export default RichTextEditor;
