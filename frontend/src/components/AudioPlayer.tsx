import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';

interface AudioPlayerProps {
    audioSrc: string; // Base64 or URL
    onEnded?: () => void;
    autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioSrc, onEnded, autoPlay = false }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);

    useEffect(() => {
        if (autoPlay && audioRef.current) {
            audioRef.current.play().catch(e => console.error("Autoplay failed", e));
            setIsPlaying(true);
        }
    }, [audioSrc, autoPlay]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
            setCurrentTime(time);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const vol = parseFloat(e.target.value);
        if (audioRef.current) {
            audioRef.current.volume = vol;
            setVolume(vol);
            setIsMuted(vol === 0);
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            const newMuted = !isMuted;
            audioRef.current.muted = newMuted;
            setIsMuted(newMuted);
            if (newMuted) {
                setVolume(0);
            } else {
                setVolume(1);
                audioRef.current.volume = 1;
            }
        }
    };

    const changeSpeed = () => {
        const newRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
        if (audioRef.current) {
            audioRef.current.playbackRate = newRate;
            setPlaybackRate(newRate);
        }
    };

    const skip = (seconds: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    };

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 w-full max-w-md">
            <audio
                ref={audioRef}
                src={audioSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => {
                    setIsPlaying(false);
                    if (onEnded) onEnded();
                }}
            />

            {/* Progress Bar */}
            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <span>{formatTime(currentTime)}</span>
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span>{formatTime(duration)}</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={toggleMute} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 hidden sm:block"
                    />
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={() => skip(-10)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600" title="-10s">
                        <SkipBack className="w-5 h-5" />
                    </button>
                    <button
                        onClick={togglePlay}
                        className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-md transition-transform hover:scale-105"
                    >
                        {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                    </button>
                    <button onClick={() => skip(10)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600" title="+10s">
                        <SkipForward className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={changeSpeed}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-600 font-bold text-xs w-10"
                    title="Playback Speed"
                >
                    {playbackRate}x
                </button>
            </div>
        </div>
    );
};

export default AudioPlayer;
