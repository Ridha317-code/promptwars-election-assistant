/**
 * script.js — Smart Election Guide Assistant (v2 — AI-Enhanced)
 * ==============================================================
 * Combines:
 *  1. Rule-based guided flow (age → registration → location → result)
 *  2. AI-style natural language understanding + conversational responses
 *
 * Key upgrades over v1:
 *  - Intent detection engine with confidence scoring
 *  - Contextual awareness (remembers what was discussed)
 *  - Fuzzy input handling ("I'm not sure", "maybe", "idk")
 *  - Randomized response variants so replies never feel repetitive
 *  - Smarter free-form conversation with follow-up suggestions
 *  - Graceful handling of off-topic inputs
 */

/* ==============================
   STATE MANAGEMENT
   ============================== */
const state = {
  step: 'start',       // current conversation step
  age: null,           // user's age (number)
  registered: null,    // true | false | null
  location: null,      // string | null
  history: [],         // message log
  topicsDiscussed: [], // tracks what info screens the user has already seen
  lastBotTopic: null,  // last topic the bot talked about (for context)
  messageCount: 0,     // total messages exchanged
  mood: 'neutral',     // user mood: 'positive', 'negative', 'neutral', 'confused'
  userName: null,      // extracted user name if they introduce themselves
  lastUserInput: '',   // last raw user input for context
  conversationStartTime: null, // when the conversation started
  repeatCount: {},     // track how many times each topic was asked
  lang: 'en',          // 'en' | 'ta' (Multi-language support)
};

/* ==============================
   TRANSLATIONS (Basic Support)
   ============================== */
const TRANSLATIONS = {
  ta: {
    welcome: `வணக்கம் 👋 நான் உங்கள் தேர்தல் வழிகாட்டி உதவியாளர்.<br><br>நான் உங்களுக்கு உதவ முடியும்:<br>• உங்கள் வாக்களிக்கும் தகுதியைச் சரிபார்க்கவும்<br>• பதிவு செய்வதன் மூலம் உங்களுக்கு வழிகாட்டவும்<br>• உங்கள் வாக்குச்சாவடியைக் கண்டறியவும்<br><br>தொடங்குவோம் — <strong>உங்கள் வயது என்ன?</strong> 🎂`,
    age_label: "உங்கள் வயது என்ன?",
    eligibility_chip: "நான் தகுதியுடையவனா? ✅",
    register_chip: "பதிவு செய்வது எப்படி? 📋",
    booth_chip: "வாக்குச்சாவடி எங்கே? 📍",
    next_steps_chip: "அடுத்தது என்ன? ➡️",
    timeline_chip: "காலக்கெடு 📅",
    thanks_chip: "நன்றி! 🙏",
    bot_typing: "உதவியாளர் தட்டச்சு செய்கிறார்...",
    input_placeholder: "உங்கள் செய்தியைத் தட்டச்சு செய்க...",
    sidebar_timeline: "📅 தேர்தல் காலவரிசை",
    sidebar_language: "🌐 மொழி",
    start_over: "🔄 மீண்டும் தொடங்கவும்",
  }
};

/* ==============================
   PROGRESS STEPS
   ============================== */
const PROGRESS_STEPS = {
  start:              { pct: 0,   label: 'Getting started…' },
  ask_age:            { pct: 15,  label: 'Checking eligibility…' },
  ask_registered:     { pct: 40,  label: 'Checking registration…' },
  ask_location:       { pct: 60,  label: 'Almost there…' },
  result_underage:    { pct: 100, label: 'Done' },
  result_not_reg:     { pct: 100, label: 'Done' },
  result_registered:  { pct: 100, label: 'Done' },
  free:               { pct: 100, label: 'Chat active' },
};

/* ==============================
   QUICK REPLY CHIP SETS
   ============================== */
const CHIPS = {
  yesno:        ['Yes ✅', 'No ❌'],
  registered:   ['Yes, I\'m registered', 'No, not yet', 'I\'m not sure'],
  age_examples: ['18', '21', '25', '30', '17', '15'],
  skip_loc:     ['Skip for now', 'Enter my location'],
  done:         ['📋 Voting steps', '📅 Timeline', '🆔 What to carry', '❓ Help'],
  not_reg_more: ['📋 Registration steps', '📅 Deadlines', '🏫 Find my booth', '❓ Something else'],
  unsure_reg:   ['How do I check?', 'I think I am', 'I\'m definitely not'],
  next_steps:   ['What should I do next?', '📅 Show timeline', '🏫 Find my booth'],
  welcome:      ['Am I eligible? ✅', 'How to register? 📋', 'Find polling booth 📍'],
};

/* ==============================
   RESPONSE VARIANTS
   Randomized to make the bot feel alive
   ============================== */
const VARIANTS = {
  empty_input: [
    '😊 Looks like you sent an empty message! Go ahead and type your question — I\'m all ears.',
    '🤔 I didn\'t get anything there. What would you like to know?',
    'Hmm, that was blank! Feel free to ask me anything about voting or elections. 😊',
  ],
  invalid_age: [
    '🤔 Hmm, that doesn\'t look like an age to me. Could you type just a number? For example, <strong>25</strong>.',
    '😅 I need your age as a plain number — like <strong>18</strong> or <strong>30</strong>. Give it another try!',
    'Oops! I\'m looking for a number here. How old are you? Just the number is perfect. 🎂',
  ],
  unrealistic_age: [
    '😅 That doesn\'t seem quite right! Could you enter an age between <strong>1 and 120</strong>?',
    'Hmm, I don\'t think that\'s a real age! Try again with a number between <strong>1 and 120</strong>. 😊',
    '🤔 Let\'s try that again — please enter a realistic age (1–120).',
  ],
  need_yesno: [
    'I just need a <strong>Yes</strong> or <strong>No</strong> on this one. 😊<br>Are you registered to vote?',
    'Could you clarify with a simple <strong>Yes</strong> or <strong>No</strong>?<br>Are you currently registered as a voter?',
    'Sorry, I didn\'t quite catch that! Just let me know — <strong>yes</strong> or <strong>no</strong>, are you registered?',
  ],
  greeting: [
    '👋 Hey there! Great to see you. I\'m your Election Guide — ask me anything about voting, registration, or elections!',
    '😊 Hello! Welcome back. What can I help you with today? I know all about voting and elections!',
    'Hi there! 👋 I\'m here to make voting easy for you. What would you like to know?',
  ],
  thanks: [
    '🙏 You\'re so welcome! Remember — <strong>every vote shapes the future</strong>. I\'m here whenever you need me!',
    'Happy to help! 😊 Don\'t forget to vote on <strong>April 23, 2026</strong> — your voice matters!',
    '💛 Anytime! Spread the word and encourage others to vote too. Democracy needs all of us!',
  ],
  fallback: [
    '🤔 I\'m not 100% sure what you mean, but I\'d love to help! Here\'s what I\'m great at:',
    'Hmm, that\'s a bit outside my expertise, but let me show you what I <em>can</em> help with:',
    'I didn\'t quite catch that, but no worries! Here are the topics I know best:',
  ],
  fallback_topics: [
    '📋 Voter registration steps',
    '🗳️ How to vote on election day',
    '📅 Election timeline & deadlines',
    '🆔 What documents to carry',
    '🏫 Finding your polling booth',
    '✅ Eligibility requirements',
    '🔒 Is my vote really secret?',
  ],
};

/** Pick a random variant from an array */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ==============================
   MOOD / SENTIMENT DETECTION
   ============================== */

/**
 * Detect user mood from text to tailor tone.
 * Returns 'positive', 'negative', 'confused', or 'neutral'.
 */
function detectMood(text) {
  const lower = text.toLowerCase();
  const positiveWords = ['great', 'thanks', 'awesome', 'cool', 'nice', 'love', 'perfect', 'amazing', 'wonderful', 'excited', 'happy', 'yay', 'yes'];
  const negativeWords = ['hate', 'bad', 'worst', 'angry', 'frustrated', 'annoyed', 'useless', 'stupid', 'waste', 'ugh', 'sucks', 'terrible'];
  const confusedWords = ['confused', 'don\'t understand', 'what', 'huh', 'idk', 'not sure', 'no idea', 'lost', 'unclear', 'how', 'explain'];

  let posScore = 0, negScore = 0, confScore = 0;
  positiveWords.forEach(w => { if (lower.includes(w)) posScore++; });
  negativeWords.forEach(w => { if (lower.includes(w)) negScore++; });
  confusedWords.forEach(w => { if (lower.includes(w)) confScore++; });

  if (confScore > posScore && confScore > negScore) return 'confused';
  if (negScore > posScore) return 'negative';
  if (posScore > 0) return 'positive';
  return 'neutral';
}

/**
 * Get a mood-aware prefix to make responses feel empathetic.
 */
function moodPrefix() {
  switch (state.mood) {
    case 'positive': return pickRandom(['Glad you\'re in good spirits! 😊 ', 'Love the enthusiasm! ', 'That\'s the spirit! 🎉 ', '']);
    case 'negative': return pickRandom(['I understand your frustration — let me help. ', 'I hear you — let\'s sort this out together. ', 'No worries, I\'m here to make this easy. 💪 ']);
    case 'confused': return pickRandom(['Totally understandable — let me break it down. ', 'No problem, I\'ll keep it simple! ', 'Let me clarify that for you. 😊 ']);
    default: return '';
  }
}

/* ==============================
   NAME EXTRACTION
   ============================== */

/**
 * Try to extract the user's name from input.
 * Handles patterns like "I'm John", "my name is Sarah", "call me Alex"
 */
function extractName(text) {
  const patterns = [
    /(?:i'?m|i am|my name is|call me|this is)\s+([A-Z][a-z]{1,15})/i,
    /^([A-Z][a-z]{1,15})(?:\s+here)?$/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
  }
  return null;
}

/* ==============================
   CONTEXTUAL CONNECTORS
   ============================== */

/**
 * Generate a natural transition sentence based on what was just discussed.
 * Makes topic switches feel conversational, not abrupt.
 */
function contextConnector(newTopic) {
  if (!state.lastBotTopic) return '';

  const connectors = {
    'registration_to_voting': 'Now that you know how to register, here\'s what happens on the big day! 🗳️<br><br>',
    'voting_to_documents': 'And here\'s something important to remember before you head out… 🆔<br><br>',
    'documents_to_booth': 'Got your ID ready? Great — let\'s find where you need to go! 📍<br><br>',
    'eligibility_to_registration': 'Since you\'re eligible, the next step is getting registered! 📋<br><br>',
    'timeline_to_registration': 'There\'s still time to register — here\'s how! 📋<br><br>',
  };

  const key = `${state.lastBotTopic}_to_${newTopic}`;
  return connectors[key] || '';
}

/**
 * Track topic repeat count and vary response if user asks same thing again.
 */
function trackTopicRepeat(topic) {
  state.repeatCount[topic] = (state.repeatCount[topic] || 0) + 1;
  return state.repeatCount[topic];
}

/**
 * Get a "you asked this before" prefix if the topic was already covered.
 */
function repeatAwarePrefix(topic) {
  const count = trackTopicRepeat(topic);
  if (count <= 1) return '';
  if (count === 2) return pickRandom([
    'Sure, let me show you this again — it\'s good to review! 📖<br><br>',
    'No worries — here\'s a refresher! 🔄<br><br>',
    'Happy to go over this again! 😊<br><br>',
  ]);
  return 'Here it is again — feel free to bookmark this info! 📌<br><br>';
}

/**
 * Build a personalized greeting using the user's name if known.
 */
function personalGreet() {
  return state.userName ? `, ${state.userName}` : '';
}

/**
 * Get conversational time context (e.g., "this late evening").
 */
function timeContext() {
  const hour = new Date().getHours();
  if (hour < 6) return 'this late night';
  if (hour < 12) return 'this morning';
  if (hour < 17) return 'this afternoon';
  if (hour < 21) return 'this evening';
  return 'tonight';
}


/* ==============================
   INTENT DETECTION ENGINE
   ============================== */

/**
 * Detect the user's intent from free-form text.
 * Returns { intent: string, confidence: number, entities: object }
 */
function detectIntent(text) {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);

  const intents = [
    {
      name: 'voting_steps',
      patterns: [
        /how\s+(to|do\s+i)\s+vote/i, /voting\s+step/i, /cast\s+(my\s+)?vote/i,
        /vote\s+process/i, /election\s+day\s+guide/i, /what\s+happens\s+at\s+booth/i,
        /process\s+of\s+voting/i, /explain\s+voting/i, /voting\s+simply/i,
      ],
      keywords: ['vote', 'voting', 'cast', 'ballot', 'evm'],
      weight: 0.7,
    },
    {
      name: 'registration',
      patterns: [
        /how\s+(to|do\s+i)\s+register/i, /registration\s+step/i, /sign\s+up/i,
        /register\s+(as|to)/i, /enroll/i, /become\s+a\s+voter/i,
        /new\s+voter/i, /first\s+time\s+voter/i,
      ],
      keywords: ['register', 'registration', 'enroll', 'signup', 'form 6'],
      weight: 0.7,
    },
    {
      name: 'timeline',
      patterns: [
        /election\s+date/i, /when\s+is\s+(the\s+)?election/i, /timeline/i,
        /deadline/i, /important\s+date/i, /schedule/i,
      ],
      keywords: ['timeline', 'date', 'deadline', 'schedule', 'when', 'calendar'],
      weight: 0.6,
    },
    {
      name: 'documents',
      patterns: [
        /what\s+(to|should\s+i)\s+(carry|bring)/i, /documents?\s+(needed|required)/i,
        /which\s+id/i, /photo\s+id/i, /voter\s+id/i,
      ],
      keywords: ['carry', 'bring', 'document', 'id', 'aadhaar', 'passport', 'epic'],
      weight: 0.6,
    },
    {
      name: 'booth',
      patterns: [
        /polling\s+(booth|station)/i, /where\s+(do\s+i|to)\s+vote/i,
        /find\s+(my\s+)?booth/i, /booth\s+location/i, /which\s+booth/i,
      ],
      keywords: ['booth', 'polling', 'station', 'where'],
      weight: 0.6,
    },
    {
      name: 'eligibility',
      patterns: [
        /am\s+i\s+eligible/i, /eligib/i, /can\s+i\s+vote/i,
        /qualify/i, /voting\s+age/i, /minimum\s+age/i, /who\s+can\s+vote/i,
      ],
      keywords: ['eligible', 'eligibility', 'qualify', 'age', 'requirement'],
      weight: 0.6,
    },
    {
      name: 'secret_ballot',
      patterns: [
        /is\s+(my\s+)?vote\s+secret/i, /vote\s+privacy/i, /anonymous/i,
        /can\s+anyone\s+(see|know)/i, /secret\s+ballot/i,
      ],
      keywords: ['secret', 'anonymous', 'private', 'privacy', 'confidential'],
      weight: 0.7,
    },
    {
      name: 'greeting',
      patterns: [
        /^(hi|hello|hey|howdy|good\s+(morning|afternoon|evening))$/i,
        /^(hi|hello|hey)\s+there/i, /^what'?s?\s+up/i, /^yo\b/i,
      ],
      keywords: [],
      weight: 0.9,
    },
    {
      name: 'thanks',
      patterns: [
        /thank/i, /^(bye|goodbye|see\s+you)/i, /^done$/i,
        /appreciate/i, /that'?s?\s+(all|enough|it)/i,
      ],
      keywords: ['thank', 'thanks', 'bye', 'goodbye', 'done'],
      weight: 0.6,
    },
    {
      name: 'help',
      patterns: [
        /what\s+can\s+you\s+(do|help)/i, /help\s+me/i, /show\s+menu/i,
        /^help$/i, /options/i, /^menu$/i, /what\s+do\s+you\s+know/i,
      ],
      keywords: ['help', 'menu', 'options', 'guide'],
      weight: 0.6,
    },
    {
      name: 'restart',
      patterns: [
        /start\s+over/i, /restart/i, /reset/i, /begin\s+again/i, /from\s+scratch/i,
      ],
      keywords: ['restart', 'reset', 'again', 'over'],
      weight: 0.7,
    },
    {
      name: 'next_steps',
      patterns: [
        /what\s+(should|do)\s+i\s+do\s+(next|now)/i, /what'?s?\s+next/i,
        /now\s+what/i, /next\s+step/i, /guide\s+me/i,
      ],
      keywords: [],
      weight: 0.8,
    },
    {
      name: 'unsure',
      patterns: [
        /i\s+don'?t\s+know/i, /not\s+sure/i, /i'?m\s+confused/i,
        /maybe/i, /idk/i, /no\s+idea/i, /uncertain/i, /i\s+think\s+so/i,
      ],
      keywords: ['unsure', 'confused', 'idk', 'maybe', 'perhaps'],
      weight: 0.5,
    },
    {
      name: 'why_vote',
      patterns: [
        /why\s+(should\s+i|do\s+we|must\s+i)\s+vote/i, /importance\s+of\s+vot/i,
        /does\s+(my\s+)?vote\s+matter/i, /voting\s+important/i, /point\s+of\s+voting/i,
      ],
      keywords: [],
      weight: 0.8,
    },
  ];

  let bestIntent = { name: 'unknown', confidence: 0, entities: {} };

  for (const intent of intents) {
    let score = 0;

    // Check regex patterns (high confidence)
    for (const pattern of intent.patterns) {
      if (pattern.test(lower)) {
        score = Math.max(score, intent.weight);
        break;
      }
    }

    // Check keyword matches (additive)
    let keywordHits = 0;
    for (const kw of intent.keywords) {
      if (lower.includes(kw)) keywordHits++;
    }
    if (intent.keywords.length > 0) {
      score = Math.max(score, (keywordHits / intent.keywords.length) * intent.weight);
    }

    if (score > bestIntent.confidence) {
      bestIntent = { name: intent.name, confidence: score, entities: {} };
    }
  }

  // Entity extraction: try to pull an age number
  const ageMatch = lower.match(/\b(\d{1,3})\s*(years?\s*old|yrs?)?\b/);
  if (ageMatch) {
    bestIntent.entities.age = parseInt(ageMatch[1], 10);
  }

  return bestIntent;
}

/* ==============================
   DOM REFERENCES
   ============================== */
const messagesArea    = document.getElementById('messagesArea');
const userInput       = document.getElementById('userInput');
const sendBtn         = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');
const progressBar     = document.getElementById('progressBar');
const progressLabel   = document.getElementById('progressLabel');
const quickChips      = document.getElementById('quickChips');
const resetBtn        = document.getElementById('resetBtn');
const sidebar         = document.getElementById('sidebar');
const sidebarToggle   = document.getElementById('sidebarToggle');
const headerSubtitle  = document.getElementById('headerSubtitle');
const langSelect      = document.getElementById('langSelect');

/* ==============================
   UTILITIES
   ============================== */

/** Format time as HH:MM */
function timeNow() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Scroll chat to the bottom */
function scrollToBottom() {
  messagesArea.scrollTo({ top: messagesArea.scrollHeight, behavior: 'smooth' });
}

/** Build an HTML unordered list from array */
function buildList(items) {
  return '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>';
}

/** Build an info-box div */
function infoBox(html, type = '') {
  return `<div class="info-box ${type}">${html}</div>`;
}

/** Build a step badge */
function stepBadge(label) {
  return `<div class="step-badge">⚡ ${label}</div>`;
}

/** Update progress bar */
function setProgress(stepKey) {
  const p = PROGRESS_STEPS[stepKey] || PROGRESS_STEPS['free'];
  progressBar.style.width = p.pct + '%';
  progressLabel.textContent = p.label;
}

/** Update header subtitle context dynamically */
function updateHeaderContext() {
  let context = 'Online • Ready to help';
  if (state.mood === 'positive') context = 'Online • Happy to help! 😊';
  else if (state.mood === 'negative') context = 'Online • Here to assist you 💪';
  else if (state.mood === 'confused') context = 'Online • Let\'s figure this out 🧠';
  
  if (state.userName) {
    context = `Chatting with ${state.userName} • ${context}`;
  }
  
  headerSubtitle.textContent = context;
}

/** Show quick-reply chips — now language aware */
function showChips(keys) {
  quickChips.innerHTML = '';
  if (!keys || !CHIPS[keys]) return;
  
  CHIPS[keys].forEach(text => {
    let displayText = text;
    
    // Simple translation mapping for chip labels
    if (state.lang === 'ta') {
      if (text.includes('Am I eligible')) displayText = TRANSLATIONS.ta.eligibility_chip;
      else if (text.includes('How to register')) displayText = TRANSLATIONS.ta.register_chip;
      else if (text.includes('Find polling booth')) displayText = TRANSLATIONS.ta.booth_chip;
      else if (text.includes('What should I do next')) displayText = TRANSLATIONS.ta.next_steps_chip;
      else if (text.includes('Show timeline')) displayText = TRANSLATIONS.ta.timeline_chip;
      else if (text.includes('Thanks')) displayText = TRANSLATIONS.ta.thanks_chip;
    }

    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.textContent = displayText;
    btn.addEventListener('click', () => handleChipClick(displayText));
    quickChips.appendChild(btn);
  });
}

/** Chip click handler — auto-fill and send */
function handleChipClick(text) {
  clearChips();
  userInput.value = text;
  autoResizeTextarea();
  sendMessage();
}

/** Clear chips */
function clearChips() { quickChips.innerHTML = ''; }

/** Track a discussed topic */
function markDiscussed(topic) {
  if (!state.topicsDiscussed.includes(topic)) {
    state.topicsDiscussed.push(topic);
  }
  state.lastBotTopic = topic;
}

/* ==============================
   MESSAGE RENDERING
   ============================== */

/**
 * Append a message bubble to the chat.
 * @param {'bot'|'user'} role
 * @param {string} htmlContent  - raw HTML
 * @param {boolean} animate     - slide-in animation
 */
function appendMessage(role, htmlContent, animate = true) {
  const row = document.createElement('div');
  row.className = `msg-row ${role}`;
  if (!animate) row.style.animation = 'none';

  const avatarEmoji = role === 'bot' ? '🤖' : '👤';
  const timeStr = timeNow();

  row.innerHTML = `
    <div class="msg-avatar">${avatarEmoji}</div>
    <div>
      <div class="msg-bubble">${htmlContent}</div>
      <span class="msg-time">${timeStr}</span>
    </div>
  `;

  messagesArea.appendChild(row);
  scrollToBottom();

  // Save to history
  state.history.push({ role, html: htmlContent, time: timeStr });
  state.messageCount++;
}

/**
 * Show typing indicator, pause, then append bot message.
 * @param {string} htmlContent
 * @param {number} delay  - in ms
 * @param {string|null} chipsKey
 */
function botReply(htmlContent, delay = 1100, chipsKey = null) {
  typingIndicator.style.display = 'flex';
  scrollToBottom();
  userInput.disabled = true;
  sendBtn.disabled = true;

  setTimeout(() => {
    typingIndicator.style.display = 'none';
    appendMessage('bot', htmlContent);
    if (chipsKey) showChips(chipsKey);
    else clearChips();
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }, delay);
}

/* ==============================
   CONVERSATION FLOW ENGINE
   ============================== */

/**
 * Process the user's input text and decide the next step.
 * Central state machine enhanced with intent detection + mood awareness.
 */
function processInput(raw) {
  const input = raw.trim();

  // --- Empty input ---
  if (!input) {
    botReply(pickRandom(VARIANTS.empty_input), 600);
    return;
  }

  // Always show user's message
  appendMessage('user', escapeHtml(input));

  // Track mood & context
  state.mood = detectMood(input);
  state.lastUserInput = input;

  // Try to extract name if we don't have one yet
  if (!state.userName) {
    const name = extractName(input);
    if (name && name.length > 1) {
      state.userName = name;
    }
  }

  // Update header subtitle dynamically based on state
  updateHeaderContext();

  const lower = input.toLowerCase();
  const intent = detectIntent(input);

  // --- Handle name introduction specially in free chat ---
  if (state.userName && (lower.startsWith('i\'m ') || lower.startsWith('my name') || lower.startsWith('call me')) && state.step !== 'ask_age') {
    botReply(
      `Nice to meet you, <strong>${state.userName}</strong>! 😊 I love putting a name to the conversation.<br><br>` +
      `What can I help you with ${timeContext()}?`,
      700, 'done'
    );
    return;
  }

  // ---- FSM Switch (guided steps take priority) ----
  switch (state.step) {

    case 'ask_age':
      handleAgeInput(input, intent);
      break;

    case 'ask_registered':
      handleRegistrationInput(lower, intent);
      break;

    case 'ask_location':
      handleLocationInput(input, lower);
      break;

    case 'ask_booth_location':
      handleBoothLocationInput(input);
      break;

    case 'free':
    case 'result_underage':
    case 'result_not_reg':
    case 'result_registered':
      handleFreeInput(lower, input, intent);
      break;

    default:
      startFlow();
  }
}

/* ==============================
   STEP HANDLERS (Enhanced)
   ============================== */

/** Handle age input — smarter validation with intent awareness */
function handleAgeInput(input, intent) {
  // If the user typed something like "I'm 25 years old" — extract the age
  if (intent.entities.age) {
    input = String(intent.entities.age);
  }

  const num = parseInt(input, 10);

  // Invalid: not a number
  if (isNaN(num) || input.replace(/\d/g, '').trim().length > 0) {
    // Maybe they asked a question instead of giving age
    if (intent.confidence > 0.5 && intent.name !== 'unknown') {
      botReply(
        `Good question! But first, let me check if you're eligible. 😊<br><br>
         <strong>How old are you?</strong> Just type your age as a number.`,
        800,
        'age_examples'
      );
    } else {
      botReply(pickRandom(VARIANTS.invalid_age), 800, 'age_examples');
    }
    return;
  }

  // Unrealistic values
  if (num <= 0 || num > 120) {
    botReply(pickRandom(VARIANTS.unrealistic_age), 800);
    return;
  }

  state.age = num;
  setProgress('ask_registered');

  // Branch: underage
  if (num < 18) {
    state.step = 'result_underage';
    setProgress('result_underage');
    showUnderageResult(num);
    return;
  }

  // Age ≥ 18 → conversational transition to registration question
  state.step = 'ask_registered';

  // Personalize based on age bracket
  let ageComment = '';
  if (num === 18) {
    ageComment = 'This is your <strong>first election</strong> — how exciting! 🎉';
  } else if (num <= 25) {
    ageComment = 'Young voters like you make a <strong>huge difference</strong>! 💪';
  } else if (num <= 40) {
    ageComment = 'You\'re right in the heart of the electorate — your voice matters! 🗳️';
  } else {
    ageComment = 'Your experience and perspective are <strong>invaluable</strong> to democracy! 🌟';
  }

  botReply(
    `Awesome — you're <strong>${num} years old</strong>, so you definitely meet the minimum age of 18. ✅<br><br>
     ${ageComment}<br><br>
     Quick question — <strong>are you currently registered to vote?</strong><br>
     <em>(It's totally fine if you're not sure!)</em>`,
    900,
    'registered'
  );
}

/** Handle registration input — now handles uncertainty */
function handleRegistrationInput(lower, intent) {
  const yes = lower.includes('yes') || lower === 'y' || lower === '1' ||
              lower.includes('i am') || lower.includes('already') ||
              lower.includes('i\'m registered') || lower.includes('i think i am');
  const no  = lower.includes('no')  || lower === 'n' || lower === '0' ||
              lower.includes('not yet') || lower.includes('haven\'t') ||
              lower.includes('not registered') || lower.includes('definitely not');
  const unsure = lower.includes('not sure') || lower.includes('don\'t know') ||
                 lower.includes('idk') || lower.includes('maybe') ||
                 lower.includes('how do i check') || lower.includes('unsure') ||
                 lower.includes('no idea');

  // Handle uncertainty — this is new!
  if (unsure) {
    botReply(
      `No worries at all — a lot of people aren't sure! 😊<br><br>
       Here's how you can <strong>quickly check</strong>:<br><br>
       ${buildList([
         '🌐 Visit <strong>electoralsearch.eci.gov.in</strong>',
         '🔍 Search by your name, father\'s name, and area',
         '📱 Or SMS <strong>EPIC &lt;your ID number&gt;</strong> to 1950',
         '📞 Call the helpline: <strong>1950</strong>',
       ])}
       ${infoBox('💡 <strong>Tip:</strong> If you\'ve ever received a Voter ID card (EPIC), you\'re most likely registered!', 'success')}
       <br>Once you've checked, let me know — <strong>are you registered?</strong>`,
      1000,
      'unsure_reg'
    );
    return;
  }

  if (!yes && !no) {
    botReply(pickRandom(VARIANTS.need_yesno), 700, 'registered');
    return;
  }

  state.registered = yes;
  state.step = 'ask_location';
  setProgress('ask_location');

  const confirmation = yes
    ? '✅ Awesome — you\'re a registered voter! That\'s one less thing to worry about.'
    : '📋 No problem at all! I\'ll walk you through the registration process step by step.';

  botReply(
    `${confirmation}<br><br>
     One last thing (totally optional):<br>
     <strong>What city or area are you from?</strong><br>
     <em>This helps me give you more relevant info — but you can skip it if you prefer.</em>`,
    950,
    'skip_loc'
  );
}

/** Handle optional location, then show result */
function handleLocationInput(input, lower) {
  const skip = lower.includes('skip') || lower.includes('not required') ||
               lower.includes("don't") || lower === 'n/a' || lower === '-' ||
               lower.includes('no thanks') || lower.includes('rather not') ||
               lower.includes('for now');

  if (!skip) {
    state.location = input;
  }

  // Branch to final result
  if (state.registered) {
    showRegisteredResult();
  } else {
    showNotRegisteredResult();
  }
}

/** Handle free-form chat — enhanced with intent detection */
function handleFreeInput(lower, raw, intent) {
  // Use intent detection for smarter routing
  switch (intent.name) {

    case 'voting_steps':
      showVotingSteps();
      break;

    case 'registration':
      showRegistrationSteps();
      break;

    case 'timeline':
      showTimeline();
      break;

    case 'documents':
      showWhatToCarry();
      break;

    case 'booth':
      showPollingBoothInfo();
      break;

    case 'eligibility':
      showEligibility();
      break;

    case 'secret_ballot':
      showSecretBallot();
      break;

    case 'greeting':
      botReply(pickRandom(VARIANTS.greeting), 700, 'done');
      break;

    case 'thanks':
      showGoodbye();
      break;

    case 'help':
      showHelp();
      break;

    case 'restart':
      resetConversation();
      break;

    case 'next_steps':
      showNextSteps();
      break;

    case 'unsure':
      handleUnsureInFreeChat();
      break;

    case 'why_vote':
      showWhyVote();
      break;

    default:
      // Check if the input contains an age number (someone might be re-entering)
      if (intent.entities.age && !state.age) {
        state.step = 'ask_age';
        handleAgeInput(raw, intent);
        return;
      }
      showSmartFallback(raw);
  }
}

/* ==============================
   RESULT SCREENS (Enhanced)
   ============================== */

/** Case 1: Underage — warmer, more encouraging */
function showUnderageResult(age) {
  const yearsLeft = 18 - age;
  const turnsIn = new Date().getFullYear() + yearsLeft;

  botReply(
    `${stepBadge('Eligibility Result')}<br>` +
    `${moodPrefix()}I appreciate you checking${personalGreet()}! At <strong>${age} years old</strong>, you're not quite old enough to vote yet — but you will be soon! 🌱
     ${infoBox(`
       🎂 <strong>You'll be eligible around ${turnsIn}</strong> (in about ${yearsLeft} year${yearsLeft > 1 ? 's' : ''})<br><br>
       The minimum voting age is <strong>18 years</strong>.
     `, 'warning')}`,
    1000
  );

  setTimeout(() => {
    botReply(
      `But here's the thing — <strong>you can already make a difference</strong>! 💪<br><br>
       ${buildList([
         '📣 <strong>Talk to family</strong> — encourage eligible members to vote',
         '📚 <strong>Stay informed</strong> — learn about candidates and issues',
         '🏫 <strong>Participate</strong> in school/college mock elections',
         '🤝 <strong>Volunteer</strong> for voter registration drives',
         `📝 <strong>Pre-register</strong> so you're ready the moment you turn 18`,
       ])}
       <br>Your generation's voice matters — even before you can officially vote! 🌟<br><br>
       Anything else you'd like to know?`,
      1200,
      'done'
    );
    markDiscussed('underage');
    state.step = 'free';
  }, 2200);
}

/** Case 2: Already registered — personalized guide */
function showRegisteredResult() {
  state.step = 'result_registered';
  setProgress('result_registered');
  const loc = state.location ? ` in <strong>${escapeHtml(state.location)}</strong>` : '';

  botReply(
    `${stepBadge('You\'re All Set!')}
     🎉 Fantastic news! You're registered${loc} and ready to vote!<br><br>
     Let me give you everything you need for a <strong>smooth Election Day experience</strong>. 👇`,
    900
  );

  setTimeout(() => {
    showVotingSteps();
    state.step = 'free';
  }, 2100);
}

/** Case 3: Not registered — encouraging, helpful */
function showNotRegisteredResult() {
  state.step = 'result_not_reg';
  setProgress('result_not_reg');

  botReply(
    `${stepBadge('Let\'s Get You Registered!')}
     Don't worry — registering to vote is <strong>easier than you think</strong>, and I'll walk you through every step! 🚀`,
    900
  );

  setTimeout(() => {
    showRegistrationSteps();
    state.step = 'free';
  }, 2100);
}

/* ==============================
   INFORMATION SCREENS (Enhanced)
   ============================== */

/** Step-by-step registration — more conversational */
function showRegistrationSteps() {
  const repeat = repeatAwarePrefix('registration');
  const mood = repeat ? '' : moodPrefix();
  const context = repeat ? '' : contextConnector('registration');
  markDiscussed('registration');
  botReply(
    `${stepBadge('Registration Guide')}<br>` +
    `${repeat}${mood}${context}` +
    `Here's your simple <strong>4-step path</strong> to becoming a registered voter:<br><br>

     <strong>Step 1 — Apply Online or Offline</strong><br>
     ${buildList([
       '🌐 Visit your Election Commission website (or <strong>voters.eci.gov.in</strong>)',
       '📝 Fill out <strong>Form 6</strong> — it\'s straightforward',
       '🏛️ Or visit your nearest Electoral Registration Office in person',
     ])}
     <br>
     <strong>Step 2 — Gather Your Documents</strong><br>
     ${buildList([
       '🪪 <strong>Age proof</strong> — Birth certificate, school leaving cert, or passport',
       '🏠 <strong>Address proof</strong> — Aadhaar, utility bill, or rent agreement',
       '🖼️ <strong>Passport-size photo</strong> — recent and clear',
     ])}
     <br>
     <strong>Step 3 — Wait for Verification</strong><br>
     ${buildList([
       '⏳ Processing takes about <strong>7–21 days</strong>',
       '👤 A verification officer may visit your address',
       '📱 You\'ll get an SMS or email when it\'s done',
     ])}
     <br>
     <strong>Step 4 — Confirm You\'re on the List</strong><br>
     ${buildList([
       '🔍 Search your name at <strong>electoralsearch.eci.gov.in</strong>',
       '✅ If your name appears — you\'re good to go!',
       '❌ If not — file a correction before the deadline',
     ])}
     ${infoBox('⏰ <strong>Registration deadline:</strong> April 18, 2026 — don\'t wait until the last minute!', 'warning')}`,
    1200
  );
  setTimeout(() => showChips('not_reg_more'), 2300);
}

/** Voting steps — more human, with context */
function showVotingSteps() {
  markDiscussed('voting');
  const isFirstTimer = state.age && state.age <= 20;

  botReply(
    `${stepBadge('Election Day Guide')}
     ${isFirstTimer ? 'Since this might be your first time voting, here\'s a complete walkthrough! 🎓<br><br>' : 'Here\'s your complete Election Day guide — save this for reference! 📌<br><br>'}

     <strong>🏠 Before You Leave Home</strong><br>
     ${buildList([
       'Verify your name on the <strong>voter list</strong> online',
       'Find your <strong>polling booth</strong> in advance (I can help with this!)',
       'Keep your <strong>Voter ID</strong> or other valid photo ID ready',
       'Have a light meal — queues can be long during peak hours',
     ])}
     <br>
     <strong>🏫 At the Polling Booth</strong><br>
     ${buildList([
       'Arrive during polling hours: <strong>7 AM – 6 PM</strong>',
       'Join the queue — it\'s usually organized by gender',
       'Show your <strong>photo ID</strong> to the presiding officer',
       'Your name will be checked in the electoral roll',
       'You\'ll be directed to the <strong>EVM (Electronic Voting Machine)</strong>',
     ])}
     <br>
     <strong>🗳️ Casting Your Vote</strong><br>
     ${buildList([
       'Step into the <strong>private voting booth</strong>',
       'Press the button next to your <strong>chosen candidate</strong> on the EVM',
       'You\'ll hear a <strong>beep</strong> confirming your vote was recorded',
       'A <strong>VVPAT slip</strong> will display briefly for verification',
     ])}
     <br>
     <strong>✅ After Voting</strong><br>
     ${buildList([
       'Indelible ink will be applied to your <strong>left index finger</strong>',
       'This prevents double-voting and lasts about 2 weeks',
       'Collect any voter receipt or acknowledgment slip',
       '🎉 <strong>Congratulations — you\'ve exercised your democratic right!</strong>',
     ])}
     ${infoBox('🗳️ <strong>Election Day:</strong> April 23, 2026 &nbsp;|&nbsp; Polling: 7 AM – 6 PM', 'success')}`,
    1200
  );
  setTimeout(() => showWhatToCarry(), 2500);
}

/** What to carry — friendlier framing */
function showWhatToCarry() {
  markDiscussed('documents');
  botReply(
    `🆔 <strong>Documents You'll Need</strong><br><br>
     You just need <strong>one</strong> valid photo ID from this list:<br><br>
     ${buildList([
       '🪪 <strong>EPIC (Voter ID Card)</strong> — best choice, accepted everywhere',
       '🛂 Passport',
       '🚗 Driving Licence',
       '🆔 Aadhaar Card',
       '🏦 Bank/Post Office Passbook with photo',
       '🎓 Student Photo ID (issued by school/university)',
       '🏛️ MNREGA Job Card',
       '📱 Smart Card issued by RGI',
     ])}
     ${infoBox('💡 <strong>Pro tip:</strong> Take your Voter ID card — it\'s specifically designed for elections and is the fastest to verify at the booth.', 'success')}
     <br>Don't have any of these? Ask me about <strong>registration</strong> and I'll guide you! 😊`,
    900
  );
  setTimeout(() => showChips('done'), 2100);
}

/** Polling booth info — upgraded with Google Maps */
function showPollingBoothInfo() {
  const repeat = repeatAwarePrefix('booth');
  const context = repeat ? '' : contextConnector('booth');
  markDiscussed('booth');
  
  if (!state.location) {
    state.step = 'ask_booth_location';
    botReply(
      `${stepBadge('Polling Booth')}<br>` +
      `${moodPrefix()}I'd be happy to help you find your nearest voting center! 😊<br><br>` +
      `<strong>Please enter your city or area name:</strong>`,
      800
    );
    return;
  }

  const query = encodeURIComponent("polling booth near " + state.location);
  const mapLink = `https://www.google.com/maps/search/?api=1&query=${query}`;

  botReply(
    `🏫 <strong>Finding Your Polling Booth</strong> in <strong>${escapeHtml(state.location)}</strong><br><br>` +
    `${repeat}${context}` +
    `I've found the best way for you to locate your booth! 🗺️<br><br>` +
    `${infoBox(`
      📍 <strong>Search Near You:</strong><br><br>
      <a href="${mapLink}" target="_blank" class="map-link">🔗 Open in Google Maps</a>
    `, 'success')}<br>` +
    `<strong>Other official ways to check:</strong><br>` +
    `${buildList([
      '🌐 Visit <strong>electoralsearch.eci.gov.in</strong>',
      '🔍 Search using your <strong>EPIC number</strong>',
      '📞 Call <strong>1950</strong> for official assistance'
    ])}`,
    950,
    'done'
  );
}

/** Handle location input specifically for booth finding */
function handleBoothLocationInput(input) {
  state.location = input;
  state.step = 'free'; // Return to free chat
  showPollingBoothInfo();
}

/** Eligibility — clear and concise */
function showEligibility() {
  markDiscussed('eligibility');
  const ageNote = state.age
    ? `<br><br>Since you're <strong>${state.age}</strong>, ${state.age >= 18 ? 'you meet the age requirement ✅' : 'you\'ll need to wait a bit ⏳'}`
    : '';

  botReply(
    `✅ <strong>Who Can Vote?</strong><br><br>
     You're eligible if you meet <strong>all</strong> of these:<br><br>
     ${buildList([
       '🎂 <strong>Age:</strong> At least 18 years old on the qualifying date',
       '🏳️ <strong>Citizenship:</strong> Indian citizen',
       '🏠 <strong>Residency:</strong> Resident of the constituency you\'re registering in',
       '⚖️ <strong>Not disqualified</strong> under any law',
     ])}
     ${ageNote}
     ${infoBox('📌 <strong>Note:</strong> The qualifying date for age is usually <strong>January 1st</strong> of the election year.', '')}`,
    950,
    'done'
  );
}

/** Election timeline */
function showTimeline() {
  markDiscussed('timeline');
  botReply(
    `📅 <strong>Election 2026 — Key Dates</strong><br><br>
     Here's your calendar at a glance:<br><br>
     ${buildList([
       '✅ <strong>Jan 20, 2026</strong> — Registration Opens',
       '⏳ <strong>Apr 18, 2026</strong> — Registration Deadline <em>(last chance!)</em>',
       '📋 <strong>Apr 20, 2026</strong> — Final Voter List Published',
       '🗳️ <strong>Apr 23, 2026</strong> — <strong>Election Day!</strong>',
       '📢 <strong>Apr 26, 2026</strong> — Results Declared',
     ])}
     ${state.registered === false
       ? infoBox('🚨 <strong>Action needed:</strong> You\'re not registered yet! Make sure to register by <strong>April 18, 2026</strong>.', 'danger')
       : infoBox('📝 <strong>Mark your calendar:</strong> April 23, 2026 is the big day!', 'success')
     }`,
    900,
    'done'
  );
}

/** Secret ballot — reassuring tone */
function showSecretBallot() {
  markDiscussed('secret');
  botReply(
    `🔒 <strong>Yes — your vote is 100% secret!</strong><br><br>
     I get why people worry about this, but here's the truth:<br><br>
     ${buildList([
       '🛡️ <strong>No one</strong> — not even election officials — can see who you voted for',
       '📋 Your ballot is <strong>completely anonymous</strong>',
       '⚖️ Election secrecy is <strong>protected by law</strong>',
       '👨‍👩‍👧‍👦 Family, friends, employers — <strong>nobody</strong> can demand to know your choice',
       '🖥️ EVMs don\'t store any link between your identity and your vote',
     ])}
     ${infoBox('🏛️ Secret balloting is a <strong>constitutional right</strong>. Anyone who tries to pressure you is breaking the law.', 'success')}
     <br>Vote with complete confidence — your choice is yours alone. 🗳️`,
    900,
    'done'
  );
}

/** Why should I vote? — NEW topic */
function showWhyVote() {
  markDiscussed('why_vote');
  botReply(
    `🗳️ <strong>Why Your Vote Matters</strong><br><br>
     It's a fair question — and the answer is powerful:<br><br>
     ${buildList([
       '📊 Elections have been decided by <strong>just a handful of votes</strong>',
       '🏛️ Elected leaders make decisions that affect <strong>your daily life</strong> — roads, schools, healthcare',
       '📢 Voting is the most direct way to <strong>hold leaders accountable</strong>',
       '💪 When more people vote, governments become <strong>more representative</strong>',
       '🌍 Millions of people around the world <strong>fight for the right to vote</strong> — don\'t take yours for granted',
     ])}
     ${infoBox('💡 <strong>Think of it this way:</strong> Not voting is still a choice — but it\'s a choice to let others decide your future.', '')}
     <br>Your one vote is your one superpower in a democracy. Use it! 🦸`,
    1000,
    'done'
  );
}

/** Help menu — conversational */
function showHelp() {
  markDiscussed('help');
  botReply(
    `🆘 <strong>Here's everything I can help with!</strong><br><br>
     Just ask me about any of these — or click a button below:<br><br>
     ${buildList([
       '📋 <em>"How do I register?"</em> — Step-by-step voter registration',
       '🗳️ <em>"How do I vote?"</em> — Complete Election Day walkthrough',
       '📅 <em>"When is the election?"</em> — Timeline and deadlines',
       '🆔 <em>"What should I carry?"</em> — Required documents',
       '🏫 <em>"Where do I vote?"</em> — Find your polling booth',
       '✅ <em>"Am I eligible?"</em> — Check eligibility requirements',
       '🔒 <em>"Is my vote secret?"</em> — Voting privacy explained',
       '🗳️ <em>"Why should I vote?"</em> — Importance of voting',
     ])}
     <br>You can also type naturally — I'll understand! 🧠`,
    800,
    'done'
  );
}

/** Contextual "what next" based on state */
function showNextSteps() {
  let suggestions = [];
  let intro = '';

  if (!state.age) {
    intro = 'Let\'s start from the beginning!';
    suggestions.push('Tell me your <strong>age</strong> so I can check your eligibility');
  } else if (state.age < 18) {
    intro = `Since you're ${state.age}, you can't vote yet — but here's what you can do:`;
    suggestions.push('Learn about the <strong>election process</strong>');
    suggestions.push('Understand <strong>eligibility requirements</strong>');
    suggestions.push('Encourage eligible family members to <strong>register</strong>');
  } else if (state.registered === null) {
    intro = 'We haven\'t checked your registration yet!';
    suggestions.push('Let me know if you\'re <strong>registered to vote</strong>');
  } else if (state.registered === false) {
    intro = 'Since you\'re not yet registered, here\'s your priority list:';
    if (!state.topicsDiscussed.includes('registration')) suggestions.push('📋 View <strong>registration steps</strong>');
    suggestions.push('📅 Check the <strong>registration deadline</strong>');
    suggestions.push('🆔 See what <strong>documents you\'ll need</strong>');
    suggestions.push('🏫 Find your <strong>nearest registration office</strong>');
  } else {
    intro = 'You\'re registered and ready! Here\'s what might help:';
    if (!state.topicsDiscussed.includes('voting')) suggestions.push('🗳️ Review the <strong>voting process</strong>');
    if (!state.topicsDiscussed.includes('documents')) suggestions.push('🆔 Check what to <strong>carry on Election Day</strong>');
    if (!state.topicsDiscussed.includes('booth')) suggestions.push('🏫 Find your <strong>polling booth</strong>');
    if (!state.topicsDiscussed.includes('timeline')) suggestions.push('📅 See the <strong>election timeline</strong>');
  }

  if (suggestions.length === 0) {
    suggestions.push('Ask me anything — I\'m here to help!');
    suggestions.push('Type <strong>"help"</strong> to see all available topics');
  }

  botReply(
    `🧭 <strong>What's Next For You</strong><br><br>
     ${intro}<br><br>
     ${buildList(suggestions)}`,
    800,
    'next_steps'
  );
}

/** Handle "I'm not sure / confused" in free chat */
function handleUnsureInFreeChat() {
  botReply(
    `That's completely okay! 😊 Let me help you figure things out.<br><br>
     Can you tell me what you're unsure about?<br><br>
     ${buildList([
       '🤔 <strong>"Am I eligible to vote?"</strong> — I\'ll check for you',
       '📋 <strong>"Am I registered?"</strong> — I\'ll show you how to check',
       '🗳️ <strong>"How does voting work?"</strong> — I\'ll walk you through it',
       '📅 <strong>"When is the election?"</strong> — I\'ll show you key dates',
     ])}
     <br>Or just describe your situation in your own words — I'll understand! 🧠`,
    800,
    'done'
  );
}

/** Friendly goodbye */
function showGoodbye() {
  const personalNote = state.age
    ? (state.age >= 18
      ? `<br>🗳️ Don't forget — <strong>April 23, 2026</strong> is Election Day!`
      : `<br>📚 Keep learning about elections — your time to vote will come soon!`)
    : '';

  botReply(
    `🙏 It was wonderful chatting with you!<br><br>
     <strong>A few parting reminders:</strong><br>
     ${buildList([
       '🗳️ Every single vote shapes the future',
       '📢 Share this guide with friends and family',
       '💛 Democracy is strongest when <em>everyone</em> participates',
     ])}
     ${personalNote}
     <br>Come back anytime you have questions — I'm always here! 👋😊`,
    800
  );
  clearChips();
}

/* ==============================
   GEMINI AI INTEGRATION
   ============================== */

const GEMINI_API_KEY = "YOUR_API_KEY";

/**
 * Call Google Gemini 1.5 Flash API
 */
async function getGeminiResponse(userMessage) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: userMessage }]
        }]
      })
    });

    if (!response.ok) throw new Error('API request failed');

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      return data.candidates[0].content.parts[0].text;
    }
    return null;
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}

/** Smart fallback — helpful, not frustrating (AI Enhanced) */
async function showSmartFallback(raw) {
  // Show typing indicator
  typingIndicator.style.display = 'flex';
  scrollToBottom();
  userInput.disabled = true;
  sendBtn.disabled = true;

  const aiResponse = await getGeminiResponse(raw);

  typingIndicator.style.display = 'none';
  userInput.disabled = false;
  sendBtn.disabled = false;

  if (aiResponse) {
    // Format response (bullet points, clear paragraphs)
    const formatted = aiResponse
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/\* (.*?)/g, '• $1');
      
    appendMessage('bot', formatted);
    showChips('done');
    userInput.focus();
  } else {
    // Original fallback logic if Gemini fails
    const prefix = state.messageCount > 5 ? 'I appreciate your curiosity! ' : '';
    appendMessage('bot', `${prefix}${pickRandom(VARIANTS.fallback)}<br><br>
      ${buildList(VARIANTS.fallback_topics)}
      <br>Just ask naturally — for example, <em>"How do I register?"</em> or <em>"When is the election?"</em> 😊`);
    showChips('done');
    userInput.focus();
  }
}

/* ==============================
   CHIP CLICK HANDLER
   ============================== */
function handleChipClick(text) {
  clearChips();
  processInput(text);
}

/* ==============================
   CONVERSATION START (Enhanced)
   ============================== */
function startFlow() {
  state.step = 'ask_age';
  setProgress('ask_age');

  // Time-based greeting
  const hour = new Date().getHours();
  let greeting = 'Hello';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  else greeting = 'Good evening';

  const welcomeMsg = state.lang === 'ta'
    ? TRANSLATIONS.ta.welcome
    : `Hi 👋 I'm your <strong>Election Guide Assistant</strong>.<br><br>` +
      `I can help you:<br>` +
      `• Check your voting eligibility<br>` +
      `• Guide you through registration<br>` +
      `• Find your polling booth<br><br>` +
      `Let's start — <strong>what is your age?</strong> 🎂`;

  botReply(welcomeMsg, 1200, 'welcome');
}

/* ==============================
   RESET / RESTART
   ============================== */
function resetConversation() {
  // Clear state
  state.step = 'start';
  state.age = null;
  state.registered = null;
  state.location = null;
  state.history = [];
  state.topicsDiscussed = [];
  state.lastBotTopic = null;
  state.messageCount = 0;

  // Clear UI
  messagesArea.innerHTML = '';
  clearChips();
  userInput.value = '';
  autoResizeTextarea();
  progressBar.style.width = '0%';
  progressLabel.textContent = 'Getting started…';
  headerSubtitle.textContent = 'Online • Here to help you vote!';

  // Start fresh
  setTimeout(startFlow, 300);
}

/* ==============================
   HTML ESCAPE
   ============================== */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==============================
   TEXTAREA AUTO-RESIZE
   ============================== */
function autoResizeTextarea() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
}

/* ==============================
   EVENT LISTENERS
   ============================== */

/** Send on button click */
function sendMessage() {
  const val = userInput.value;
  userInput.value = '';
  autoResizeTextarea();
  processInput(val);
}

sendBtn.addEventListener('click', sendMessage);

/** Textarea keydown — Enter sends, Shift+Enter adds newline */
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

/** Auto-resize on input */
userInput.addEventListener('input', autoResizeTextarea);

/** Reset button */
resetBtn.addEventListener('click', resetConversation);

/** Sidebar toggle (mobile) */
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  let overlay = document.querySelector('.overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
  overlay.classList.toggle('active');
});

/** Handle language change */
langSelect.addEventListener('change', (e) => {
  state.lang = e.target.value;
  
  // Update static UI texts immediately
  if (state.lang === 'ta') {
    typingIndicator.querySelector('p').textContent = TRANSLATIONS.ta.bot_typing;
    userInput.placeholder = TRANSLATIONS.ta.input_placeholder;
    resetBtn.innerHTML = TRANSLATIONS.ta.start_over;
  } else {
    typingIndicator.querySelector('p').textContent = 'Assistant is typing…';
    userInput.placeholder = 'Type your message… (Shift+Enter for new line)';
    resetBtn.innerHTML = '🔄 Start Over';
  }
  
  resetConversation();
});

/* ==============================
   INIT — Start the conversation
   ============================== */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(startFlow, 600);
});

