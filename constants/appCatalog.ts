export interface PositiveAlternative {
  id: string;
  rank: number;
  category: string;
  name: string;
  description: string;
  packageName: string;
  iconName: string;
  accentColor: string;
  installed?: boolean;
  iconUri?: string;
}

/**
 * Hash map of well-known Android package IDs -> concise, human-friendly app names.
 * Ensures Hourglass never falls back to raw `com.xxx.yyy` strings for common apps.
 */
export const KNOWN_APP_NAMES: Record<string, string> = {
  // Common Distracting Apps
  'com.instagram.android': 'Instagram',
  'com.instagram.barcelona': 'Threads',
  'com.zhiliaoapp.musically': 'TikTok',
  'com.ss.android.ugc.trill': 'TikTok',
  'com.google.android.youtube': 'YouTube',
  'com.twitter.android': 'X',
  'com.reddit.frontpage': 'Reddit',
  'com.facebook.katana': 'Facebook',
  'com.facebook.orca': 'Messenger',
  'com.snapchat.android': 'Snapchat',
  'com.pinterest': 'Pinterest',
  'com.netflix.mediaclient': 'Netflix',
  'tv.twitch.android.app': 'Twitch',
  'com.discord': 'Discord',
  'com.whatsapp': 'WhatsApp',
  'org.telegram.messenger': 'Telegram',
  'com.tumblr': 'Tumblr',
  'com.linkedin.android': 'LinkedIn',
  'com.quora.android': 'Quora',

  // Ranked Productive Alternatives
  'com.duolingo': 'Duolingo',
  'com.substack.app': 'Substack',
  'com.blinkslabs.blinkist.android': 'Blinkist',
  'org.brilliant.android': 'Brilliant',
  'com.ichi2.anki': 'AnkiDroid',
  'com.flyersoft.moonreader': 'Moon+ Reader',
  'com.instapaper.android': 'Instapaper',
  'md.obsidian': 'Obsidian',
  'com.getsomeheadspace.android': 'Headspace',
  'com.elevateapp.elevate': 'Elevate',
  'com.getmimo': 'Mimo',
  'com.curiosity.curiositystream': 'CuriosityStream',
  'com.neverland.alreaderext': 'AlReader',
  'wp.wattpad': 'Wattpad',
  'com.spotify.music': 'Spotify',
  'com.medium.reader': 'Medium',
  'com.habitrpg.android.habitica': 'Habitica',
  'com.amazon.kindle': 'Kindle',
  'com.google.android.keep': 'Google Keep',
  'com.jowaljones.superadmin': 'Hourglass',
};

export const APP_BRAND_COLORS: Record<string, string> = {
  'com.instagram.android': '#E1306C',
  'com.zhiliaoapp.musically': '#EE1D52',
  'com.ss.android.ugc.trill': '#EE1D52',
  'com.google.android.youtube': '#FF0000',
  'com.twitter.android': '#1DA1F2',
  'com.reddit.frontpage': '#FF4500',
  'com.facebook.katana': '#1877F2',
  'com.snapchat.android': '#FFFC00',
  'com.duolingo': '#58CC02',
  'com.substack.app': '#FF6719',
  'com.blinkslabs.blinkist.android': '#2CE080',
  'org.brilliant.android': '#111827',
  'com.ichi2.anki': '#2B9CF2',
  'com.flyersoft.moonreader': '#6366F1',
  'com.instapaper.android': '#374151',
  'md.obsidian': '#7C3AED',
  'com.getsomeheadspace.android': '#F47D31',
  'com.elevateapp.elevate': '#0EA5E9',
  'com.getmimo': '#3B82F6',
  'com.curiosity.curiositystream': '#F59E0B',
  'com.neverland.alreaderext': '#14B8A6',
  'wp.wattpad': '#FF500A',
  'com.spotify.music': '#1DB954',
  'com.medium.reader': '#FFFFFF',
  'com.habitrpg.android.habitica': '#6133B4',
};

/**
 * Ranked Productive Alternatives Catalog.
 * Duolingo is #1 by default and Substack is #2.
 */
export const POSITIVE_ALTERNATIVES: PositiveAlternative[] = [
  {
    id: 'alt-duolingo',
    rank: 1,
    category: 'Language Learning',
    name: 'Duolingo',
    description: 'Bite-sized language, math, and music lessons',
    packageName: 'com.duolingo',
    iconName: 'school',
    accentColor: '#58CC02',
  },
  {
    id: 'alt-substack',
    rank: 2,
    category: 'Blogs & Newsletters',
    name: 'Substack',
    description: 'Independent essays, blogs, and deep-dive newsletters',
    packageName: 'com.substack.app',
    iconName: 'article',
    accentColor: '#FF6719',
  },
  {
    id: 'alt-blinkist',
    rank: 3,
    category: 'Book Summaries',
    name: 'Blinkist',
    description: '15-minute key takeaways from non-fiction books and podcasts',
    packageName: 'com.blinkslabs.blinkist.android',
    iconName: 'menu-book',
    accentColor: '#2CE080',
  },
  {
    id: 'alt-brilliant',
    rank: 4,
    category: 'Micro-Learning',
    name: 'Brilliant',
    description: 'Interactive visual lessons in math, logic, and computer science',
    packageName: 'org.brilliant.android',
    iconName: 'lightbulb',
    accentColor: '#84E150',
  },
  {
    id: 'alt-ankidroid',
    rank: 5,
    category: 'Spaced Repetition',
    name: 'AnkiDroid',
    description: 'Flashcards for active recall and long-term memorization',
    packageName: 'com.ichi2.anki',
    iconName: 'style',
    accentColor: '#38BDF8',
  },
  {
    id: 'alt-moonreader',
    rank: 6,
    category: 'E-Book Reader',
    name: 'Moon+ Reader',
    description: 'Customizable e-book reader supporting EPUB, PDF, and MOBI',
    packageName: 'com.flyersoft.moonreader',
    iconName: 'chrome-reader-mode',
    accentColor: '#818CF8',
  },
  {
    id: 'alt-instapaper',
    rank: 7,
    category: 'Read-It-Later',
    name: 'Instapaper',
    description: 'Save long-form web articles to read offline without distractions',
    packageName: 'com.instapaper.android',
    iconName: 'bookmark',
    accentColor: '#A8B5B0',
  },
  {
    id: 'alt-obsidian',
    rank: 8,
    category: 'Journaling & Notes',
    name: 'Obsidian',
    description: 'Local-first markdown note-taking and personal knowledge base',
    packageName: 'md.obsidian',
    iconName: 'edit-note',
    accentColor: '#A78BFA',
  },
  {
    id: 'alt-headspace',
    rank: 9,
    category: 'Mindfulness',
    name: 'Headspace',
    description: 'Guided meditations, breathing exercises, and sleep sounds',
    packageName: 'com.getsomeheadspace.android',
    iconName: 'self-improvement',
    accentColor: '#FB923C',
  },
  {
    id: 'alt-elevate',
    rank: 10,
    category: 'Brain Training',
    name: 'Elevate',
    description: 'Daily mini-games focused on writing, speaking, and mental math',
    packageName: 'com.elevateapp.elevate',
    iconName: 'psychology',
    accentColor: '#0EA5E9',
  },
  {
    id: 'alt-mimo',
    rank: 11,
    category: 'Programming',
    name: 'Mimo',
    description: 'Bite-sized interactive coding exercises in Python, JS, and HTML',
    packageName: 'com.getmimo',
    iconName: 'code',
    accentColor: '#60A5FA',
  },
  {
    id: 'alt-curiositystream',
    rank: 12,
    category: 'Documentaries',
    name: 'CuriosityStream',
    description: 'Ad-free science, history, and technology documentaries',
    packageName: 'com.curiosity.curiositystream',
    iconName: 'theaters',
    accentColor: '#F59E0B',
  },
  {
    id: 'alt-alreader',
    rank: 13,
    category: 'E-Book Reader',
    name: 'AlReader',
    description: 'Feature-rich offline reader for EPUB, FB2, and MOBI',
    packageName: 'com.neverland.alreaderext',
    iconName: 'auto-stories',
    accentColor: '#2DD4BF',
  },
  {
    id: 'alt-wattpad',
    rank: 14,
    category: 'Social Storytelling',
    name: 'Wattpad',
    description: 'Millions of user-generated stories and novels',
    packageName: 'wp.wattpad',
    iconName: 'library-books',
    accentColor: '#FB7185',
  },
  {
    id: 'alt-spotify',
    rank: 15,
    category: 'Focus & Audio',
    name: 'Spotify (Podcasts/Focus)',
    description: 'Audiobooks, white noise, and focus playlists',
    packageName: 'com.spotify.music',
    iconName: 'headphones',
    accentColor: '#1DB954',
  },
  {
    id: 'alt-medium',
    rank: 16,
    category: 'Knowledge',
    name: 'Medium',
    description: 'Articles, essays, and deep-dive reading',
    packageName: 'com.medium.reader',
    iconName: 'newspaper',
    accentColor: '#E5E7EB',
  },
  {
    id: 'alt-habitica',
    rank: 17,
    category: 'Habit Tracking',
    name: 'Habitica',
    description: 'Gamified habit building and task management',
    packageName: 'com.habitrpg.android.habitica',
    iconName: 'task-alt',
    accentColor: '#8B5CF6',
  },
];

/**
 * Resolves any Android package ID to a human-readable app name using:
 * 1) KNOWN_APP_NAMES hash
 * 2) Provided explicit name (if it isn't itself a raw package ID)
 * 3) Capitalized trailing package segment fallback (never displays `com.xx.yy`)
 */
export function resolveAppName(packageName?: string | null, explicitName?: string): string {
  if (packageName && KNOWN_APP_NAMES[packageName]) {
    return KNOWN_APP_NAMES[packageName];
  }
  if (explicitName && !explicitName.includes('.')) {
    return explicitName;
  }
  if (!packageName) return 'App';

  const parts = packageName.split('.').filter(Boolean);
  const ignored = new Set(['com', 'org', 'net', 'io', 'app', 'android', 'mobile', 'client']);
  const meaningful = parts.filter((p) => !ignored.has(p.toLowerCase()));
  const raw = meaningful[meaningful.length - 1] || parts[parts.length - 1] || packageName;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Selects the best positive alternative using the priority rule:
 * 1) Duolingo if installed on the device (Rank #1)
 * 2) Highest-ranked alternative already installed on the device (e.g. Substack #2, etc.)
 * 3) Duolingo (marked installed: false -> Play Store prompt) if none are installed
 */
export function pickBestPositiveAlternative(
  installedPackages: Set<string>,
  iconLookup?: Map<string, string>
): PositiveAlternative {
  const sorted = [...POSITIVE_ALTERNATIVES].sort((a, b) => a.rank - b.rank);

  for (const alt of sorted) {
    if (installedPackages.has(alt.packageName)) {
      return {
        ...alt,
        installed: true,
        iconUri: iconLookup?.get(alt.packageName),
      };
    }
  }

  // Fallback to Rank #1 (Duolingo) with Play Store prompt
  const duolingo = sorted[0];
  return {
    ...duolingo,
    installed: false,
  };
}
