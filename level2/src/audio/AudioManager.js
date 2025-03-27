export class AudioManager {
    constructor() {
        this.currentTrack = 0;
        this.tracks = [
            '/level2/cyberpunk-loop-1.wav',
            '/level2/cyberpunk-loop-2.wav',
            '/level2/cyberpunk-loop-3.wav'
        ];
        this.audioElements = this.tracks.map(track => {
            const audio = new Audio(track);
            audio.volume = 0.5; // Set initial volume to 50%
            return audio;
        });

        // Pre-load all tracks
        this.audioElements.forEach(audio => {
            audio.load();
        });

        // Handle seamless transitions
        this.audioElements.forEach((audio, index) => {
            audio.addEventListener('ended', () => {
                // Start next track
                const nextIndex = (index + 1) % this.tracks.length;
                this.audioElements[nextIndex].play();
                this.currentTrack = nextIndex;
            });
        });
    }

    start() {
        // Start with the first track
        this.audioElements[0].play().catch(error => {
            console.error('Error playing audio:', error);
        });
    }

    stop() {
        this.audioElements.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    setVolume(volume) {
        // Volume should be between 0 and 1
        this.audioElements.forEach(audio => {
            audio.volume = Math.max(0, Math.min(1, volume));
        });
    }
}
