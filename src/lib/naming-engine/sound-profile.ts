export const SOUND_PROFILES = ["spanish", "english", "combined"] as const;

export type SoundProfile = (typeof SOUND_PROFILES)[number];
