import React, { useEffect, useRef, useState } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from 'lucide-react'
import Avatar from '../ui/Avatar'
import {
    createRingtone,
    createRingbackTone,
    playConnectedSound,
    playEndCallSound
} from '../../utils/sounds'

const CallScreen = ({
    socket,
    currentUser,
    targetUser,
    isGroup,
    groupName,
    callType,
    isIncoming,
    onEnd
}) => {
    const [callState, setCallState] = useState(isIncoming ? 'incoming' : 'calling')
    // calling = en train d'appeler
    // incoming = appel entrant
    // active = appel en cours
    // ended = appel termine

    const [micOn, setMicOn] = useState(true)
    const [cameraOn, setCameraOn] = useState(callType === 'video')
    const [duration, setDuration] = useState(0)

    const localVideoRef = useRef(null)
    const remoteVideoRef = useRef(null)
    const peerRef = useRef(null)
    const localStreamRef = useRef(null)
    const durationTimerRef = useRef(null)

    // Demarre le timer de duree quand l'appel est actif
    useEffect(() => {
        if (callState === 'active') {
            durationTimerRef.current = setInterval(() => {
                setDuration(d => d + 1)
            }, 1000)
        }
        return () => clearInterval(durationTimerRef.current)
    }, [callState])

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0')
        const s = (seconds % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    // Demarre le stream local (camera + micro)
    const startLocalStream = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: callType === 'video',
                audio: true
            })
            localStreamRef.current = stream
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream
            }
            return stream
        } catch (error) {
            console.error('Erreur acces camera/micro:', error)
            return null
        }
    }

    // Arrete le stream local
    const stopLocalStream = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop())
            localStreamRef.current = null
        }
    }

    // Initialise WebRTC avec simple-peer
    const initPeer = async (initiator, stream) => {
        const SimplePeer = (await import('simple-peer')).default

        const peer = new SimplePeer({
            initiator,
            trickle: true,
            stream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        })

        // Quand WebRTC genere une offre ou reponse — on l'envoie via Socket.io
        peer.on('signal', (data) => {
            if (data.type === 'offer') {
                socket.emit('webrtc:offer', {
                    targetUserId: targetUser?.id,
                    offer: data,
                    conversationId: null
                })
            } else if (data.type === 'answer') {
                socket.emit('webrtc:answer', {
                    targetUserId: targetUser?.id,
                    answer: data,
                    conversationId: null
                })
            } else {
                // ICE candidate
                socket.emit('webrtc:ice-candidate', {
                    targetUserId: targetUser?.id,
                    candidate: data,
                    conversationId: null
                })
            }
        })

        // Quand on recoit le stream de l'autre
        peer.on('stream', (remoteStream) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = remoteStream
            }
            setCallState('active')
        })

        peer.on('error', (err) => {
            console.error('Erreur WebRTC:', err)
            handleEnd()
        })

        peer.on('close', () => {
            handleEnd()
        })

        peerRef.current = peer
        return peer
    }

    // Initie un appel sortant
    useEffect(() => {
        if (!isIncoming && socket) {
            const start = async () => {
                const stream = await startLocalStream()
                if (!stream) return

                // Notifie l'autre user
                socket.emit('call:initiate', {
                    targetUserId: targetUser?.id,
                    callType
                })

                // On attend que l'autre accepte avant d'initier WebRTC
            }
            start()
        }
    }, [])

    // Ecoute les evenements Socket.io pour l'appel
    useEffect(() => {
        if (!socket) return

        // L'autre a accepte — on initie WebRTC
        const handleAccepted = async () => {
            setCallState('active')
            const stream = localStreamRef.current || await startLocalStream()
            await initPeer(true, stream)
        }

        // L'autre a refuse
        const handleRejected = () => {
            setCallState('ended')
            setTimeout(onEnd, 1500)
        }

        // L'autre a raccroche
        const handleEnded = () => {
            setCallState('ended')
            stopLocalStream()
            setTimeout(onEnd, 1500)
        }

        // Recu une offre WebRTC
        const handleOffer = async ({ offer }) => {
            const stream = localStreamRef.current
            const peer = await initPeer(false, stream)
            peer.signal(offer)
        }

        // Recu une reponse WebRTC
        const handleAnswer = ({ answer }) => {
            peerRef.current?.signal(answer)
        }

        // Recu un ICE candidate
        const handleIceCandidate = ({ candidate }) => {
            peerRef.current?.signal(candidate)
        }

        socket.on('call:accepted', handleAccepted)
        socket.on('call:rejected', handleRejected)
        socket.on('call:ended', handleEnded)
        socket.on('webrtc:offer', handleOffer)
        socket.on('webrtc:answer', handleAnswer)
        socket.on('webrtc:ice-candidate', handleIceCandidate)

        return () => {
            socket.off('call:accepted', handleAccepted)
            socket.off('call:rejected', handleRejected)
            socket.off('call:ended', handleEnded)
            socket.off('webrtc:offer', handleOffer)
            socket.off('webrtc:answer', handleAnswer)
            socket.off('webrtc:ice-candidate', handleIceCandidate)
        }
    }, [socket])

    // Gere les sons selon l'etat de l'appel
    useEffect(() => {
        let sound = null

        if (callState === 'incoming') {
            // Sonnerie chez l'appele
            sound = createRingtone()
            sound.start()
        } else if (callState === 'calling') {
            // Tonalite chez l'appelant
            sound = createRingbackTone()
            sound.start()
        } else if (callState === 'active') {
            // Son de connexion etablie
            playConnectedSound()
        } else if (callState === 'ended') {
            // Son de fin d'appel
            playEndCallSound()
        }

        return () => {
            sound?.stop()
        }
    }, [callState])

    // Accepte l'appel entrant
    const handleAccept = async () => {
        const stream = await startLocalStream()
        if (!stream) return

        socket.emit('call:accept', {
            callerId: targetUser?.id
        })

        setCallState('active')
    }

    // Refuse l'appel entrant
    const handleReject = () => {
        socket.emit('call:reject', {
            callerId: targetUser?.id
        })
        setCallState('ended')
        setTimeout(onEnd, 1000)
    }

    // Raccroche
    const handleEnd = () => {
        socket.emit('call:end', {
            targetUserId: targetUser?.id
        })
        stopLocalStream()
        peerRef.current?.destroy()
        setCallState('ended')
        setTimeout(onEnd, 1000)
    }

    // Toggle micro
    const toggleMic = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(t => {
                t.enabled = !micOn
            })
            setMicOn(!micOn)
        }
    }

    // Toggle camera
    const toggleCamera = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => {
                t.enabled = !cameraOn
            })
            setCameraOn(!cameraOn)
        }
    }

    const displayName = isGroup ? groupName : targetUser?.pseudo

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: callType === 'video' && callState === 'active'
                ? '#000'
                : 'var(--bg0)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 2000,
            padding: '40px 20px'
        }}>

            {/* Video remote — plein ecran si appel video actif */}
            {callType === 'video' && callState === 'active' && (
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                />
            )}

            {/* Video locale — petit coin en bas a droite */}
            {callType === 'video' && (
                <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                        position: 'absolute',
                        bottom: '120px',
                        right: '20px',
                        width: '100px',
                        height: '140px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        border: '2px solid var(--border)',
                        zIndex: 10,
                        display: cameraOn ? 'block' : 'none'
                    }}
                />
            )}

            {/* Infos en haut */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                zIndex: 10
            }}>
                <Avatar
                    user={isGroup ? { name: groupName } : targetUser}
                    size={80}
                    isGroup={isGroup}
                />
                <span translate="no" style={{
                    fontSize: '22px',
                    fontWeight: 500,
                    color: '#fff'
                }}>
                    {displayName}
                </span>
                <span style={{
                    fontSize: '14px',
                    color: 'rgba(255,255,255,0.6)'
                }}>
                    {callState === 'calling' && 'Appel en cours...'}
                    {callState === 'incoming' && (callType === 'video' ? 'Appel video entrant' : 'Appel audio entrant')}
                    {callState === 'active' && formatDuration(duration)}
                    {callState === 'ended' && 'Appel termine'}
                </span>
            </div>

            {/* Boutons */}
            <div style={{
                display: 'flex',
                gap: '20px',
                alignItems: 'center',
                zIndex: 10
            }}>

                {/* Appel entrant — Refuser + Accepter */}
                {callState === 'incoming' && (
                    <>
                        <button
                            onClick={handleReject}
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: '#ff3c3c',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <PhoneOff size={28} color="#fff" />
                        </button>
                        <button
                            onClick={handleAccept}
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: 'var(--accent3)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Phone size={28} color="#000" />
                        </button>
                    </>
                )}

                {/* Appel actif ou sortant — controles */}
                {(callState === 'active' || callState === 'calling') && (
                    <>
                        {/* Micro */}
                        <button
                            onClick={toggleMic}
                            style={{
                                width: '52px',
                                height: '52px',
                                borderRadius: '50%',
                                background: micOn ? 'rgba(255,255,255,0.15)' : '#ff3c3c',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            {micOn
                                ? <Mic size={22} color="#fff" />
                                : <MicOff size={22} color="#fff" />
                            }
                        </button>

                        {/* Raccrocher */}
                        <button
                            onClick={handleEnd}
                            style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: '#ff3c3c',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <PhoneOff size={28} color="#fff" />
                        </button>

                        {/* Camera — seulement pour appel video */}
                        {callType === 'video' && (
                            <button
                                onClick={toggleCamera}
                                style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '50%',
                                    background: cameraOn ? 'rgba(255,255,255,0.15)' : '#ff3c3c',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {cameraOn
                                    ? <Video size={22} color="#fff" />
                                    : <VideoOff size={22} color="#fff" />
                                }
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default CallScreen