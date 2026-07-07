import { Type } from "@google/genai";

export const SYSTEM_INSTRUCTION = "You are a tactical scanner. Analyze the person in the image and provide the requested information in JSON format. Provide your best estimate for each field.";
export const USER_PROMPT_TEXT = "Analyze the person in this image.";

// Prompt suffix for local models that don't support structured output schemas.
export const LOCAL_JSON_PROMPT = `${USER_PROMPT_TEXT} Respond ONLY with a single JSON object with exactly these string keys: AGE, WEIGHT, HEIGHT, RACE, MOOD, HAIR_COLOR, SHIRT_COLOR. No markdown fences, no commentary.`;

// The classic T-800 dialogue selection from The Terminator (1984).
export const TERMINATOR_RESPONSES = [
  'YES/NO',
  'OR WHAT?',
  'GO AWAY',
  'PLEASE COME BACK LATER',
  "FUCK YOU, ASSHOLE",
  'FUCK YOU',
];

export const BOOT_SEQUENCE = [
  'CYBERDYNE SYSTEMS CORP.',
  'SERIES 800 MODEL 101 VERSION 2.4',
  'NEURAL NET PROCESSOR ... ONLINE',
  'POWER CELL 01 ........ NOMINAL',
  'OPTICAL SENSORS ...... CALIBRATING',
  'TACTICAL DATABASE .... LOADING',
  'MISSION PARAMETERS ... LOADED',
  'ALL SYSTEMS OPERATIONAL',
];

// 6502 assembly fragments — the original film's HUD scrolled Apple II
// assembly dumps from Nibble magazine.
export const ASM_FRAGMENTS = [
  'LDA #$09', 'STA $D01A', 'JSR $E544', 'BNE $F02D', 'CMP #$C8',
  'BEQ $03A2', 'LDX #$FF', 'TXS', 'INY', 'DEX', 'ROL $26',
  'ADC #$30', 'SBC $0620,Y', 'JMP $C000', 'ORA ($15),Y', 'PHA',
  'AND #$7F', 'LSR A', 'BCC $F3D9', 'STY $02A1', 'RTS', 'SEI',
  'EOR $44', 'BIT $C010', 'CPY #$0A', 'TAX', 'PLP', 'CLC',
];

export const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    AGE: {
      type: Type.STRING,
      description: "Approximate age in years, e.g., '25-30'."
    },
    WEIGHT: {
      type: Type.STRING,
      description: "Approximate weight in lbs or kg, e.g., '150-160 lbs'."
    },
    HEIGHT: {
      type: Type.STRING,
      description: "Approximate height in feet/inches or cm, e.g., '5\\'10\" - 6\\'0\"'."
    },
    RACE: {
      type: Type.STRING,
      description: "Apparent race or ethnicity, e.g., 'Caucasian'."
    },
    MOOD: {
      type: Type.STRING,
      description: "Apparent mood or emotion. Specifically identify if the person is smiling, looks angry (mad), neutral, or other emotions."
    },
    HAIR_COLOR: {
      type: Type.STRING,
      description: "Apparent hair color, e.g., 'Brown', 'Blonde'."
    },
    SHIRT_COLOR: {
      type: Type.STRING,
      description: "Dominant color of the person's shirt, e.g., 'Blue', 'Red'."
    },
  },
  required: ["AGE", "WEIGHT", "HEIGHT", "RACE", "MOOD", "HAIR_COLOR", "SHIRT_COLOR"],
};
