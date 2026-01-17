/**
 * Premium Voice Narrator using ElevenLabs TTS
 * High-quality AI voice for battle commentary
 */

// Audio cache to avoid regenerating common phrases
const audioCache = new Map<string, HTMLAudioElement>();
let currentAudio: HTMLAudioElement | null = null;
let isPlaying = false;
let audioQueue: string[] = [];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Fallback to browser speech synthesis when ElevenLabs is unavailable
 * Returns a promise that resolves when speech is complete
 */
function speakWithBrowserTTS(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

// Track if ElevenLabs API is available (disable after first failure)
let elevenLabsAvailable = true;

/**
 * Generate speech using ElevenLabs TTS via edge function
 */
async function generateSpeech(text: string): Promise<HTMLAudioElement | null> {
  // If ElevenLabs already failed, skip API call entirely
  if (!elevenLabsAvailable) {
    return null;
  }

  // Check cache first
  if (audioCache.has(text)) {
    const cached = audioCache.get(text)!;
    cached.currentTime = 0;
    return cached;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/elevenlabs-tts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!response.ok) {
      // Disable ElevenLabs for this session after failure
      console.warn("[Premium Narrator] TTS API unavailable, switching to browser TTS");
      elevenLabsAvailable = false;
      return null;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Cache for reuse
    audioCache.set(text, audio);
    
    return audio;
  } catch (error) {
    console.warn("[Premium Narrator] Error, switching to browser TTS");
    elevenLabsAvailable = false;
    return null;
  }
}

/**
 * Play audio with queue management
 */
async function playAudio(audio: HTMLAudioElement): Promise<void> {
  return new Promise((resolve) => {
    audio.onended = () => {
      isPlaying = false;
      resolve();
      processQueue();
    };
    audio.onerror = () => {
      isPlaying = false;
      resolve();
      processQueue();
    };
    
    isPlaying = true;
    currentAudio = audio;
    audio.volume = 0.9;
    audio.play().catch(() => {
      isPlaying = false;
      resolve();
    });
  });
}

/**
 * Process queued narrations
 */
async function processQueue(): Promise<void> {
  if (isPlaying || audioQueue.length === 0) return;
  
  isPlaying = true;
  const text = audioQueue.shift()!;
  const audio = await generateSpeech(text);
  
  if (audio) {
    await playAudio(audio);
  } else {
    // Use browser TTS fallback
    await speakWithBrowserTTS(text);
    isPlaying = false;
    processQueue();
  }
}

/**
 * Speak text with premium voice (queued)
 */
export async function speakPremium(text: string): Promise<void> {
  audioQueue.push(text);
  processQueue();
}

/**
 * Speak immediately, interrupting current audio
 */
export async function speakPremiumImmediate(text: string): Promise<void> {
  // Stop current audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  window.speechSynthesis?.cancel();
  isPlaying = false;
  audioQueue = [];
  
  const audio = await generateSpeech(text);
  if (audio) {
    await playAudio(audio);
  } else {
    await speakWithBrowserTTS(text);
  }
}

/**
 * Stop all narration
 */
export function stopPremiumNarration(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
  window.speechSynthesis?.cancel();
  isPlaying = false;
  audioQueue = [];
  currentAudio = null;
}

/**
 * Preload common phrases for faster playback
 */
export async function preloadPhrases(phrases: string[]): Promise<void> {
  console.log(`[Premium Narrator] Preloading ${phrases.length} phrases...`);
  
  // Preload in batches to avoid rate limiting
  for (const phrase of phrases) {
    if (!audioCache.has(phrase)) {
      await generateSpeech(phrase);
      // Small delay between requests
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  console.log("[Premium Narrator] Preload complete");
}

/**
 * Check if premium narrator is available
 */
export function isPremiumAvailable(): boolean {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

/**
 * Clear audio cache
 */
export function clearCache(): void {
  audioCache.forEach((audio) => {
    URL.revokeObjectURL(audio.src);
  });
  audioCache.clear();
}
