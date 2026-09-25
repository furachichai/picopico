/**
 * Shared singleton AudioContext to prevent exceeding browser AudioContext limits
 * and eliminate native audio buffer leaks from repeated AudioContext creation.
 */

let sharedAudioCtx = null;

export function getSharedAudioContext() {
    if (typeof window === 'undefined') return null;

    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            sharedAudioCtx = new AudioCtx();
        }
    }

    if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
    }

    return sharedAudioCtx;
}

export function unlockSharedAudio() {
    const ctx = getSharedAudioContext();
    if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }
    return ctx;
}
