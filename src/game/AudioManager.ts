export class AudioManager {
  private backgroundMusic: HTMLAudioElement | null = null;
  private hitSound: HTMLAudioElement | null = null;
  private throwSound: HTMLAudioElement | null = null;
  private weaponSound: HTMLAudioElement | null = null;
  private reloadSound: HTMLAudioElement | null = null;
  private jumpSound: HTMLAudioElement | null = null;
  private landingSound: HTMLAudioElement | null = null;
  private masterVolume = 0.7;
  private musicVolume = 0.3;
  private sfxVolume = 0.6;
  private isInitialized = false;

  constructor() {
    // Don't initialize audio in constructor - wait for async init()
  }

  public async init() {
    try {
      await this.initializeAudio();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  private async initializeAudio() {
    try {
      // Create background music
      this.backgroundMusic = new Audio();
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = this.musicVolume * this.masterVolume;
      
      // Create single sound instances
      this.hitSound = new Audio();
      this.hitSound.volume = this.sfxVolume * this.masterVolume;
      
      this.throwSound = new Audio();
      this.throwSound.volume = this.sfxVolume * this.masterVolume;
      
      this.weaponSound = new Audio();
      this.weaponSound.volume = this.sfxVolume * this.masterVolume;
      
      this.reloadSound = new Audio();
      this.reloadSound.volume = this.sfxVolume * this.masterVolume;
      
      this.jumpSound = new Audio();
      this.jumpSound.volume = this.sfxVolume * this.masterVolume;
      
      this.landingSound = new Audio();
      this.landingSound.volume = this.sfxVolume * this.masterVolume;

      // Generate synthetic sounds
      await this.generateSyntheticSounds();
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  private async generateSyntheticSounds() {
    // Generate background music - ambient sci-fi drone
    await this.generateBackgroundMusic();
    
    // Generate all other sounds in parallel
    await Promise.all([
      this.generateHitSound(this.hitSound!),
      this.generateThrowSound(this.throwSound!),
      this.generateWeaponSound(this.weaponSound!),
      this.generateReloadSound(this.reloadSound!),
      this.generateJumpSound(this.jumpSound!),
      this.generateLandingSound(this.landingSound!)
    ]);
  }

  private async generateBackgroundMusic() {
    if (!this.backgroundMusic) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 8; // 8 seconds loop to reduce initialization time
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, duration * sampleRate, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);
      
      for (let i = 0; i < channelData.length; i++) {
        const time = i / sampleRate;
        
        // Create ambient drone with multiple oscillators
        const bass = Math.sin(2 * Math.PI * 55 * time) * 0.1; // Deep bass
        const mid = Math.sin(2 * Math.PI * 110 * time + Math.sin(time * 0.5)) * 0.05; // Modulated mid
        const high = Math.sin(2 * Math.PI * 220 * time + Math.sin(time * 0.3)) * 0.02; // Subtle high
        
        // Add some random noise for texture
        const noise = (Math.random() - 0.5) * 0.01;
        
        // Combine and apply fade in/out
        const fadeIn = Math.min(1, time * 2);
        const fadeOut = Math.min(1, (duration - time) * 2);
        const fade = Math.min(fadeIn, fadeOut);
        
        channelData[i] = (bass + mid + high + noise) * fade;
      }
    }

    // Convert buffer to blob URL and wait for it to load
    await this.bufferToAudioElement(buffer, this.backgroundMusic, audioContext);
  }

  private async generateHitSound(audioElement: HTMLAudioElement) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.3;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      const time = i / sampleRate;
      const decay = Math.exp(-time * 8); // Quick decay
      
      // Metallic hit sound
      const frequency = 800 + Math.sin(time * 100) * 200;
      const sound = Math.sin(2 * Math.PI * frequency * time) * decay;
      
      // Add some noise for impact texture
      const noise = (Math.random() - 0.5) * 0.3 * decay;
      
      channelData[i] = (sound + noise) * 0.5;
    }

    await this.bufferToAudioElement(buffer, audioElement, audioContext);
  }

  private async generateThrowSound(audioElement: HTMLAudioElement) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.8;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      const time = i / sampleRate;
      const progress = time / duration;
      
      // Whoosh sound - frequency sweep
      const startFreq = 200;
      const endFreq = 50;
      const frequency = startFreq + (endFreq - startFreq) * progress;
      
      const envelope = Math.sin(Math.PI * progress); // Bell curve
      const sound = Math.sin(2 * Math.PI * frequency * time) * envelope;
      
      // Add wind noise
      const noise = (Math.random() - 0.5) * 0.2 * envelope;
      
      channelData[i] = (sound + noise) * 0.4;
    }

    await this.bufferToAudioElement(buffer, audioElement, audioContext);
  }

  private async generateReloadSound(audioElement: HTMLAudioElement) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.6;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      const time = i / sampleRate;
      const progress = time / duration;
      
      // Create mechanical reload sound - multiple clicks and mechanical noises
      let sound = 0;
      
      // Click sounds at specific intervals
      if (progress < 0.2) {
        // Initial click
        const clickFreq = 800 + Math.sin(time * 200) * 100;
        sound = Math.sin(2 * Math.PI * clickFreq * time) * Math.exp(-time * 20);
      } else if (progress > 0.4 && progress < 0.6) {
        // Mechanical whir
        const whirFreq = 300 + Math.sin(time * 50) * 50;
        sound = Math.sin(2 * Math.PI * whirFreq * time) * 0.3;
      } else if (progress > 0.8) {
        // Final click
        const finalClickFreq = 600 + Math.sin((time - 0.8 * duration) * 300) * 200;
        const finalTime = time - 0.8 * duration;
        sound = Math.sin(2 * Math.PI * finalClickFreq * finalTime) * Math.exp(-finalTime * 25);
      }
      
      // Add some digital noise for sci-fi effect
      const noise = (Math.random() - 0.5) * 0.1 * Math.exp(-time * 2);
      
      channelData[i] = (sound + noise) * 0.4;
    }

    await this.bufferToAudioElement(buffer, audioElement, audioContext);
  }

  private async generateJumpSound(audioElement: HTMLAudioElement) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.3;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      const time = i / sampleRate;
      const decay = Math.exp(-time * 5);
      
      // Whoosh sound with upward pitch sweep
      const startFreq = 100;
      const endFreq = 300;
      const progress = time / duration;
      const frequency = startFreq + (endFreq - startFreq) * progress;
      
      const sound = Math.sin(2 * Math.PI * frequency * time) * decay;
      
      // Add wind noise
      const noise = (Math.random() - 0.5) * 0.3 * decay;
      
      channelData[i] = (sound + noise) * 0.3;
    }

    await this.bufferToAudioElement(buffer, audioElement, audioContext);
  }

  private async generateLandingSound(audioElement: HTMLAudioElement) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.4;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      const time = i / sampleRate;
      const decay = Math.exp(-time * 8);
      
      // Thud sound with low frequency impact
      const impactFreq = 80 + Math.sin(time * 30) * 20;
      const sound = Math.sin(2 * Math.PI * impactFreq * time) * decay;
      
      // Add impact noise
      const noise = (Math.random() - 0.5) * 0.4 * decay;
      
      // Add brief high-frequency component for realism
      const scrape = Math.sin(2 * Math.PI * 1000 * time) * 0.1 * Math.exp(-time * 15);
      
      channelData[i] = (sound + noise + scrape) * 0.5;
    }

    await this.bufferToAudioElement(buffer, audioElement, audioContext);
  }

  private async generateWeaponSound(audioElement: HTMLAudioElement) {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 0.15; // Shorter for rapid fire
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const channelData = buffer.getChannelData(0);

    for (let i = 0; i < channelData.length; i++) {
      const time = i / sampleRate;
      const decay = Math.exp(-time * 20); // Even quicker decay for rapid fire
      
      // Enhanced laser/blaster sound for automatic fire
      const frequency = 800 + Math.sin(time * 80) * 200;
      const sound = Math.sin(2 * Math.PI * frequency * time) * decay;
      
      // Add some digital noise
      const digitalNoise = Math.sin(2 * Math.PI * 1500 * time) * 0.3 * decay;
      
      // Add punch for more impact
      const punch = Math.sin(2 * Math.PI * 200 * time) * 0.2 * decay;
      
      channelData[i] = (sound + digitalNoise + punch) * 0.4;
    }

    await this.bufferToAudioElement(buffer, audioElement, audioContext);
  }

  private async bufferToAudioElement(buffer: AudioBuffer, audioElement: HTMLAudioElement, audioContext: AudioContext): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        // Create offline context to render the buffer
        const offlineContext = new OfflineAudioContext(
          buffer.numberOfChannels,
          buffer.length,
          buffer.sampleRate
        );
        
        const source = offlineContext.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineContext.destination);
        source.start();
        
        const renderedBuffer = await offlineContext.startRendering();
        
        // Convert to wav blob
        const wavBlob = this.bufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        
        // Set up event listeners to know when audio is ready
        const onCanPlay = () => {
          audioElement.removeEventListener('canplaythrough', onCanPlay);
          audioElement.removeEventListener('error', onError);
          resolve();
        };
        
        const onError = (error: Event) => {
          audioElement.removeEventListener('canplaythrough', onCanPlay);
          audioElement.removeEventListener('error', onError);
          reject(error);
        };
        
        audioElement.addEventListener('canplaythrough', onCanPlay);
        audioElement.addEventListener('error', onError);
        
        audioElement.src = url;
        audioElement.load();
      } catch (error) {
        console.warn('Error converting buffer to audio:', error);
        reject(error);
      }
    });
  }

  private bufferToWav(buffer: AudioBuffer): Blob {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  public startBackgroundMusic() {
    if (this.backgroundMusic && this.isInitialized) {
      try {
        console.log('Starting background music...', this.backgroundMusic.readyState);
        
        // Handle autoplay restrictions
        const playPromise = this.backgroundMusic.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Background music started successfully');
            })
            .catch(error => {
              console.warn('Background music autoplay prevented:', error);
              // Try to play on first user interaction
              const playOnInteraction = () => {
                this.backgroundMusic?.play()
                  .then(() => {
                    console.log('Background music started after user interaction');
                  })
                  .catch(() => {});
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
              };
              document.addEventListener('click', playOnInteraction, { once: true });
              document.addEventListener('keydown', playOnInteraction, { once: true });
            });
        }
      } catch (error) {
        console.warn('Failed to start background music:', error);
      }
    } else {
      console.warn('Background music not ready or not initialized');
    }
  }

  public stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    }
  }

  public playHitSound() {
    if (!this.isInitialized || !this.hitSound) return;
    
    try {
      const clonedSound = this.hitSound.cloneNode() as HTMLAudioElement;
      clonedSound.volume = this.sfxVolume * this.masterVolume;
      clonedSound.currentTime = 0;
      clonedSound.play().catch(() => {});
    } catch (error) {
      console.warn('Failed to play hit sound:', error);
    }
  }

  public playThrowSound() {
    if (!this.isInitialized || !this.throwSound) return;
    
    try {
      const clonedSound = this.throwSound.cloneNode() as HTMLAudioElement;
      clonedSound.volume = this.sfxVolume * this.masterVolume;
      clonedSound.currentTime = 0;
      clonedSound.play().catch(() => {});
    } catch (error) {
      console.warn('Failed to play throw sound:', error);
    }
  }

  public playWeaponSound() {
    if (!this.isInitialized || !this.weaponSound) return;
    
    try {
      const clonedSound = this.weaponSound.cloneNode() as HTMLAudioElement;
      clonedSound.volume = this.sfxVolume * this.masterVolume;
      clonedSound.currentTime = 0;
      clonedSound.play().catch(() => {});
    } catch (error) {
      console.warn('Failed to play weapon sound:', error);
    }
  }

  public playReloadSound() {
    if (!this.isInitialized || !this.reloadSound) return;
    
    try {
      const clonedSound = this.reloadSound.cloneNode() as HTMLAudioElement;
      clonedSound.volume = this.sfxVolume * this.masterVolume;
      clonedSound.currentTime = 0;
      clonedSound.play().catch(() => {});
    } catch (error) {
      console.warn('Failed to play reload sound:', error);
    }
  }

  public playJumpSound() {
    if (!this.isInitialized || !this.jumpSound) return;
    
    try {
      const clonedSound = this.jumpSound.cloneNode() as HTMLAudioElement;
      clonedSound.volume = this.sfxVolume * this.masterVolume;
      clonedSound.currentTime = 0;
      clonedSound.play().catch(() => {});
    } catch (error) {
      console.warn('Failed to play jump sound:', error);
    }
  }

  public playLandingSound() {
    if (!this.isInitialized || !this.landingSound) return;
    
    try {
      const clonedSound = this.landingSound.cloneNode() as HTMLAudioElement;
      clonedSound.volume = this.sfxVolume * this.masterVolume;
      clonedSound.currentTime = 0;
      clonedSound.play().catch(() => {});
    } catch (error) {
      console.warn('Failed to play landing sound:', error);
    }
  }

  public setMasterVolume(volume: number) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
  }

  private updateVolumes() {
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.musicVolume * this.masterVolume;
    }
    
    // Update base volumes for future clones
    if (this.hitSound) this.hitSound.volume = this.sfxVolume * this.masterVolume;
    if (this.throwSound) this.throwSound.volume = this.sfxVolume * this.masterVolume;
    if (this.weaponSound) this.weaponSound.volume = this.sfxVolume * this.masterVolume;
    if (this.reloadSound) this.reloadSound.volume = this.sfxVolume * this.masterVolume;
    if (this.jumpSound) this.jumpSound.volume = this.sfxVolume * this.masterVolume;
    if (this.landingSound) this.landingSound.volume = this.sfxVolume * this.masterVolume;
  }

  public cleanup() {
    this.stopBackgroundMusic();
    
    // Clean up all audio elements and revoke URLs
    const allSounds = [
      this.backgroundMusic,
      this.hitSound,
      this.throwSound,
      this.weaponSound,
      this.reloadSound,
      this.jumpSound,
      this.landingSound
    ].filter(Boolean) as HTMLAudioElement[];
    
    allSounds.forEach(sound => {
      sound.pause();
      if (sound.src && sound.src.startsWith('blob:')) {
        URL.revokeObjectURL(sound.src);
      }
    });
  }
}