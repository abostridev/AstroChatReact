import React, { useState, useRef, useEffect } from 'react'
import { uploadFile, uploadAudio } from '../../api/upload'
import { Smile, Paperclip, Camera, Mic, Send, Square } from 'lucide-react'


const MessageInput = ({ onSend, disabled, onTyping }) => {
    const [text, setText] = useState('')
    const [recording, setRecording] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)
    const cameraInputRef = useRef(null)
    const mediaRecorderRef = useRef(null)
    const audioChunksRef = useRef([])

    const isTyping = text.trim().length > 0

    const handleSend = () => {
        if (!text.trim()) return
        onSend({ content: text.trim(), type: 'TEXT' })
        setText('')
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // Upload fichier
    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        try {
            const data = await uploadFile(file)
            onSend({
                content: null,
                type: data.type,
                fileUrl: data.fileUrl,
                fileName: data.fileName
            })
        } catch (error) {
            console.error('Erreur upload:', error)
        } finally {
            setUploading(false)
            e.target.value = ''
        }
    }

    // Note vocale
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (e) => {
                audioChunksRef.current.push(e.data)
            }

            mediaRecorder.onstop = async () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
                stream.getTracks().forEach(t => t.stop())
                setUploading(true)
                try {
                    const data = await uploadAudio(blob)
                    onSend({
                        content: null,
                        type: 'AUDIO',
                        fileUrl: data.fileUrl,
                        fileName: 'Note vocale'
                    })
                } catch (error) {
                    console.error('Erreur upload audio:', error)
                } finally {
                    setUploading(false)
                }
            }

            mediaRecorder.start()
            setRecording(true)
        } catch (error) {
            console.error('Microphone non accessible:', error)
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && recording) {
            mediaRecorderRef.current.stop()
            setRecording(false)
        }
    }

    return (
        <div style={{
            padding: '8px 12px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '8px',
            background: 'var(--bg1)'
        }}>
            {/* Input principal */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                borderRadius: '22px',
                padding: '0 8px',
                gap: '4px',
                minHeight: '40px'
            }}>
                {/* Emoji */}
                <button
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        color: 'var(--text3)',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Emoji"
                >
                    <Smile size={20} />
                </button>

                {/* Champ texte */}
                <textarea
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value)
                        onTyping?.()
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={recording ? 'Enregistrement...' : 'Message...'}
                    disabled={disabled || uploading || recording}
                    rows={1}
                    style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        fontSize: '13px',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        resize: 'none',
                        padding: '8px 0',
                        maxHeight: '100px',
                        overflowY: 'auto',
                        lineHeight: 1.4
                    }}
                />

                {/* Document */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text3)',
                        flexShrink: 0,
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Fichier"
                >
                    <Paperclip size={18} />
                </button>

                {/* Camera */}
                <button
                    onClick={() => cameraInputRef.current?.click()}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text3)',
                        flexShrink: 0,
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                    title="Photo"
                >
                    <Camera size={18} />
                </button>

                <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFile}
                    accept="*/*"
                />
                <input
                    ref={cameraInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    onChange={handleFile}
                    accept="image/*"
                    capture="environment"
                />
            </div>

            {/* Bouton Mic / Send */}
            <button
                onMouseDown={!isTyping ? startRecording : undefined}
                onMouseUp={!isTyping ? stopRecording : undefined}
                onTouchStart={!isTyping ? startRecording : undefined}
                onTouchEnd={!isTyping ? stopRecording : undefined}
                onClick={isTyping ? handleSend : undefined}
                disabled={disabled || uploading}
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: isTyping || recording ? 'var(--accent)' : 'var(--bg2)',
                    border: isTyping || recording ? 'none' : '1px solid var(--border)',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                    color: isTyping || recording ? 'var(--bg0)' : 'var(--text2)'
                }}
            >
                {uploading
                    ? <Mic size={18} style={{ opacity: 0.4 }} />
                    : isTyping
                        ? <Send size={18} />
                        : recording
                            ? <Square size={16} />
                            : <Mic size={18} />
                }
            </button>
        </div>
    )
}

export default MessageInput