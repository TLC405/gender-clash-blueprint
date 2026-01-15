// TLC Battle Narrator - Premium AI voice system with fallback
import { speakPremium, speakPremiumImmediate, stopPremiumNarration, isPremiumAvailable } from './premiumNarrator';

export type NarratorContext = 
  | "menLead" 
  | "womenLead" 
  | "tie" 
  | "clash" 
  | "phalanxForm" 
  | "phalanxBreak"
  | "powerupSpawn" 
  | "victoryMen" 
  | "victoryWomen"
  | "standPhase"
  | "meleePhase"
  | "suddenDeath";

const quips: Record<NarratorContext, string[]> = {
  menLead: [
    "Team Men surging ahead! The bro-wall is holding strong!",
    "Men are dominating the field! Time for a tactical response, ladies!",
    "The boys are on fire! Women need to regroup fast!",
    "Men up by a significant margin! This is getting intense!"
  ],
  womenLead: [
    "Team Women taking control! Their coordination is unstoppable!",
    "Girl power at maximum! Men scrambling for answers!",
    "Women showing how it's done! Absolute dominance on the field!",
    "Squad goals achieved! The ladies are crushing it!"
  ],
  tie: [
    "We're all tied up at the Hot Gates! Deadlock!",
    "Stalemate in the arena! Neither side giving ground!",
    "Perfectly balanced, as all battles should be!",
    "Neck and neck! This could go either way!"
  ],
  clash: [
    "Chaos erupts in the center! It's absolute mayhem!",
    "Massive clash in the middle! Bodies flying everywhere!",
    "Drama cloud forming! Everyone brace for impact!",
    "Here comes the epic collision!"
  ],
  phalanxForm: [
    "Formation locked! Spartans would be proud!",
    "Shield wall activated! This is tactical genius!",
    "Phalanx perfection! Now that's teamwork!",
    "Formation complete! Impenetrable defense!"
  ],
  phalanxBreak: [
    "Formation shattered! Every soldier for themselves!",
    "Chaos reigns! The shield wall is crumbling!",
    "And the line breaks! Mayhem mode activated!",
    "Formation compromised! Total bedlam!"
  ],
  powerupSpawn: [
    "Power-up detected on the field!",
    "Special delivery incoming! Someone's getting lucky!",
    "Ooh, shiny! This could change everything!",
    "Game changer appearing on the flanks!"
  ],
  victoryMen: [
    "Team Men wins! Absolute domination!",
    "Victory for the boys! What a battle!",
    "Men triumph! Champions of the arena!",
    "That's game! Men showing their power!"
  ],
  victoryWomen: [
    "Team Women wins! Stunning victory!",
    "Ladies taking home the W! Incredible performance!",
    "Women victorious! Empathy conquers all!",
    "Game over! Women prove unstoppable!"
  ],
  standPhase: [
    "Stand Phase begins! Time to organize and strategize!",
    "Formation time! Show me some Spartan discipline!",
    "Stand your ground! This is where tactics matter!"
  ],
  meleePhase: [
    "Melee Phase! All out chaos incoming!",
    "Time to get wild! Flanks are open, power-ups dropping!",
    "Let the mayhem begin! No formation can save you now!"
  ],
  suddenDeath: [
    "Sudden Death! First blood wins it all!",
    "This is it! Everything on the line!",
    "Nail-biter time! One mistake and it's over!"
  ]
};

let isSpeaking = false;
let usePremium = true;

// Check for premium availability on load
if (typeof window !== 'undefined') {
  usePremium = isPremiumAvailable();
  console.log(`[Narrator] Premium voice ${usePremium ? 'available' : 'unavailable, using fallback'}`);
}

/**
 * Speak a narration quip with premium voice or fallback
 */
export const speak = (context: NarratorContext, enabled: boolean = true): string | undefined => {
  if (!enabled || isSpeaking) return;
  
  const contextQuips = quips[context];
  const quip = contextQuips[Math.floor(Math.random() * contextQuips.length)];
  
  console.log(`[Narrator] ${quip}`);
  
  if (usePremium) {
    // Use premium ElevenLabs voice
    isSpeaking = true;
    
    // Victory announcements get immediate priority
    const isVictory = context === 'victoryMen' || context === 'victoryWomen';
    const speakFn = isVictory ? speakPremiumImmediate : speakPremium;
    
    speakFn(quip).finally(() => {
      // Reset speaking flag after a delay to prevent spam
      setTimeout(() => {
        isSpeaking = false;
      }, 2000);
    });
  } else if ('speechSynthesis' in window) {
    // Fallback to browser TTS
    try {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(quip);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      utterance.onstart = () => {
        isSpeaking = true;
      };
      
      utterance.onend = () => {
        isSpeaking = false;
      };
      
      utterance.onerror = () => {
        isSpeaking = false;
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('[Narrator] Speech synthesis error:', error);
      isSpeaking = false;
    }
  }
  
  return quip;
};

/**
 * Stop all speaking
 */
export const stopSpeaking = () => {
  if (usePremium) {
    stopPremiumNarration();
  }
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
};

/**
 * Toggle premium voice on/off
 */
export const setPremiumVoice = (enabled: boolean) => {
  usePremium = enabled && isPremiumAvailable();
};
