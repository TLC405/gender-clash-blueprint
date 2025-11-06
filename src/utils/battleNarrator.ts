// TLC Battle Narrator - Sassy AI voice system
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
    "MEN's bro-wall unbreakable! WOMEN, unleash the hugs!",
    "Team MEN dominating! Time for some feelings, ladies?",
    "Bros before... wait, this is getting competitive!",
    "MEN up by 3—but WOMEN's got that emotional overtime!"
  ],
  womenLead: [
    "WOMEN's phalanx of feels crushes! MEN, time for therapy?",
    "Girl power at maximum! MEN need a group hug stat!",
    "WOMEN showing how it's done! MEN looking lost!",
    "Squad goals achieved! MEN scrambling for answers!"
  ],
  tie: [
    "Deadlock at the Hot Gates—kiss and make up?",
    "Aww, stalemate smooches incoming!",
    "Perfectly balanced, as all relationships should be!",
    "Can't we all just get along? Apparently not!"
  ],
  clash: [
    "Chaos erupts! Shields up, hearts out!",
    "It's absolute mayhem! TLC turned to TKO!",
    "Drama cloud forming—everyone duck!",
    "Here comes the feelings tsunami!"
  ],
  phalanxForm: [
    "Spartans would be proud! Formation locked!",
    "This is Sparta... with feelings!",
    "Shield wall activated! Emotional armor engaged!",
    "Phalanx perfection! Now that's teamwork!"
  ],
  phalanxBreak: [
    "Formation shattered! It's every soldier for themselves!",
    "Chaos reigns! Organized chaos? Just chaos!",
    "Shield wall crumbling like a bad relationship!",
    "And the line breaks! Mayhem mode activated!"
  ],
  powerupSpawn: [
    "Oh snap! Cupid arrows on the field!",
    "Power-up detected! Someone's getting lucky!",
    "Special delivery from the love gods!",
    "Ooh, shiny! This could change everything!"
  ],
  victoryMen: [
    "TEAM MEN WINS! Bro hugs all around!",
    "Victory for the bros! Someone crack open the feels!",
    "MEN triumph! Time for the victory chest bumps!",
    "That's game! MEN showing that bro power!"
  ],
  victoryWomen: [
    "TEAM WOMEN WINS! Group selfie incoming!",
    "Ladies taking home the W! Squad goals forever!",
    "WOMEN victorious! Flower power prevails!",
    "Game over! WOMEN proving empathy conquers all!"
  ],
  standPhase: [
    "Stand Phase: Time to organize and strategize!",
    "Formation time! Let's see some Spartan discipline!",
    "Stand your ground! This is where tactics matter!"
  ],
  meleePhase: [
    "Melee Phase! All-out chaos incoming!",
    "Time to get chaotic! Flanks are open, power-ups dropping!",
    "Let the mayhem begin! No formation can save you now!"
  ],
  suddenDeath: [
    "SUDDEN DEATH! First blood wins it all!",
    "This is it! Everything on the line!",
    "Nail-biter time! One mistake and it's over!"
  ]
};

let isSpeaking = false;

export const speak = (context: NarratorContext, enabled: boolean = true) => {
  if (!enabled || isSpeaking) return;
  
  const contextQuips = quips[context];
  const quip = contextQuips[Math.floor(Math.random() * contextQuips.length)];
  
  console.log(`[Narrator] ${quip}`);
  
  if ('speechSynthesis' in window) {
    try {
      // Cancel any ongoing speech
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

export const stopSpeaking = () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isSpeaking = false;
};
