let searchState = {
  isRunning: false,
  currentIndex: 0,
  totalSearches: 0,
  timerStartTime: 0,
  timerEndTime: 0,
  remainingTime: 0
};

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults().then(() => {
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    checkAndStartSearches();
  });
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults().then(async () => {
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

    const result = await chrome.storage.local.get(['isRunning']);
    if (result.isRunning) {
      await chrome.storage.local.set({
        completedToday: 0,
        isRunning: false
      });
    }

    setTimeout(() => {
      checkAndStartSearches();
    }, 5000);
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'nextSearch') {
    performNextSearch();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startSearches') {
    startSearches();
    sendResponse({ success: true });
  } else if (request.action === 'stopSearches') {
    stopSearches();
    sendResponse({ success: true });
  } else if (request.action === 'getStatus') {
    sendResponse(searchState);
  }
  return true;
});

setInterval(() => {
  if (searchState.isRunning && searchState.timerEndTime > 0) {
    const now = Date.now();
    searchState.remainingTime = Math.max(0, Math.ceil((searchState.timerEndTime - now) / 1000));
  }
}, 100);

async function checkAndStartSearches() {
  const result = await chrome.storage.local.get(['autoStart', 'searchCount', 'completedToday', 'lastSearchDate']);

  const autoStart = result.autoStart !== undefined ? result.autoStart : true;

  if (!autoStart) return;

  const today = new Date().toDateString();
  const lastSearchDate = result.lastSearchDate || '';

  if (lastSearchDate !== today) {
    await chrome.storage.local.set({ completedToday: 0, lastSearchDate: today, isEnabled: true });
    startSearches();
  } else if ((result.completedToday || 0) < (result.searchCount || 30)) {
    await chrome.storage.local.set({ isEnabled: true });
    startSearches();
  }
}

async function startSearches() {
  const result = await chrome.storage.local.get(['searchCount', 'waitTime', 'completedToday', 'isEnabled']);

  const isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;

  if (!isEnabled) return;

  searchState.totalSearches = result.searchCount || 30;
  searchState.currentIndex = result.completedToday || 0;
  searchState.isRunning = true;

  await chrome.storage.local.set({ isRunning: true });

  updateBadge(searchState.currentIndex);

  if (searchState.currentIndex < searchState.totalSearches) {
    performNextSearch();
  } else {
    stopSearches();
  }
}

async function performNextSearch() {
  if (!searchState.isRunning || searchState.currentIndex >= searchState.totalSearches) {
    stopSearches();
    return;
  }

  const result = await chrome.storage.local.get(['searchCategory', 'humanMode', 'clickResults']);
  const query = generateCategoryQuery(result.searchCategory || 'random');
  const humanMode = result.humanMode !== undefined ? result.humanMode : true;
  const clickResults = result.clickResults !== undefined ? result.clickResults : true;

  try {
    const tabs = await chrome.tabs.query({ url: 'https://www.bing.com/*' });
    let tab;

    if (tabs.length > 0) {
      tab = tabs[0];
      await chrome.tabs.update(tab.id, { active: false });

      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'typeSearch',
          query: query,
          humanMode: humanMode,
          clickResults: clickResults
        });
      } catch (error) {
        console.error('Failed to send message to content script:', error);
      }
    } else {
      tab = await chrome.tabs.create({ url: 'https://www.bing.com/', active: false });

      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'typeSearch',
            query: query,
            humanMode: humanMode,
            clickResults: clickResults
          });
        } catch (error) {
          console.error('Failed to send message to content script:', error);
        }
      }, 2000);
    }

    const waitTimeResult = await chrome.storage.local.get(['waitTime']);
    const baseWaitTime = waitTimeResult.waitTime || 10;
    const randomWaitTime = (baseWaitTime + Math.random() * 10) * 1000;

    searchState.timerStartTime = Date.now();
    searchState.timerEndTime = Date.now() + randomWaitTime;
    searchState.remainingTime = Math.ceil(randomWaitTime / 1000);

    await new Promise(resolve => setTimeout(resolve, randomWaitTime));

    searchState.currentIndex++;
    searchState.timerStartTime = 0;
    searchState.timerEndTime = 0;
    searchState.remainingTime = 0;

    const today = new Date().toDateString();
    await chrome.storage.local.set({
      completedToday: searchState.currentIndex,
      lastSearchDate: today
    });

    updateBadge(searchState.currentIndex);

    if (searchState.currentIndex < searchState.totalSearches) {
      performNextSearch();
    } else {
      await closeAllTabsAndOpenRewards();
      stopSearches();
    }

  } catch (error) {
    console.error('Search error:', error);
    stopSearches();
  }
}

function stopSearches() {
  searchState.isRunning = false;
  searchState.timerStartTime = 0;
  searchState.timerEndTime = 0;
  searchState.remainingTime = 0;
  chrome.storage.local.set({ isRunning: false });
  chrome.alarms.clear('nextSearch');

  chrome.action.setBadgeText({ text: '' });
}

async function closeAllTabsAndOpenRewards() {
  try {
    const allTabs = await chrome.tabs.query({});

    const rewardsTab = await chrome.tabs.create({
      url: 'https://rewards.bing.com/?ref=rewardspanel',
      active: true
    });

    const tabsToClose = allTabs.map(tab => tab.id).filter(id => id !== rewardsTab.id);
    if (tabsToClose.length > 0) {
      await chrome.tabs.remove(tabsToClose);
    }
  } catch (error) {
    console.error('Error closing tabs:', error);
  }
}

function updateBadge(count) {
  const badgeText = count.toString().padStart(2, '0');
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}

async function ensureDefaults() {
  const defaults = {
    searchCount: 30,
    waitTime: 10,
    autoStart: true,
    completedToday: 0,
    lastSearchDate: '',
    searchCategory: 'random',
    humanMode: true,
    clickResults: true
  };

  const current = await chrome.storage.local.get(Object.keys(defaults));
  const updates = {};

  for (const key of Object.keys(defaults)) {
    if (current[key] === undefined) {
      updates[key] = defaults[key];
    }
  }

  if (Object.keys(updates).length) {
    await chrome.storage.local.set(updates);
  }
}

function generateCategoryQuery(category) {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const hourOfDay = now.getHours();
  const searchIndex = searchState.currentIndex;

  const categoryTopics = {
    anime: [
      'best anime series', 'anime recommendations', 'popular anime', 'anime characters', 'anime movies',
      'latest anime episodes', 'manga series', 'anime streaming', 'anime reviews', 'seasonal anime',
      'shounen anime', 'seinen anime', 'isekai anime', 'romance anime', 'action anime',
      'anime soundtracks', 'anime openings', 'manga volumes', 'anime merchandise', 'cosplay ideas'
    ],
    sports: [
      'sports news', 'football highlights', 'basketball scores', 'soccer matches', 'tennis tournaments',
      'baseball games', 'sports statistics', 'athletic training', 'fitness tips', 'sports equipment',
      'NFL updates', 'NBA scores', 'Premier League', 'Champions League', 'Olympics news',
      'sports injuries', 'workout routines', 'sports betting', 'team rankings', 'player stats'
    ],
    news: [
      'breaking news', 'world news', 'local news', 'political updates', 'economic news',
      'technology news', 'science news', 'health news', 'environmental news', 'business news',
      'current events', 'news headlines', 'international news', 'national news', 'financial news',
      'weather updates', 'latest developments', 'news analysis', 'investigative reports', 'press releases'
    ],
    trending: [
      'trending topics', 'viral videos', 'popular searches', 'social media trends', 'memes',
      'celebrity news', 'trending hashtags', 'viral content', 'internet trends', 'trending now',
      'popular culture', 'trending music', 'viral challenges', 'trending fashion', 'hot topics',
      'trending stories', 'social trends', 'cultural phenomena', 'trending products', 'buzz worthy'
    ],
    food: [
      'recipes', 'cooking tips', 'restaurant reviews', 'food delivery', 'healthy meals',
      'dessert recipes', 'quick meals', 'meal prep', 'vegan recipes', 'vegetarian dishes',
      'baking ideas', 'food blogs', 'chef recommendations', 'cuisine types', 'food photography',
      'cooking techniques', 'kitchen gadgets', 'meal planning', 'food trends', 'nutrition facts'
    ],
    technology: [
      'latest tech', 'smartphones', 'laptops', 'gadgets', 'tech reviews',
      'software updates', 'apps', 'AI technology', 'cloud computing', 'tech news',
      'programming languages', 'tech tutorials', 'device comparisons', 'tech startups', 'innovations',
      'smart devices', 'wearable tech', 'tech conferences', 'cybersecurity', 'tech deals'
    ],
    gaming: [
      'video games', 'gaming news', 'game reviews', 'esports', 'gaming setup',
      'new game releases', 'gaming consoles', 'PC gaming', 'mobile games', 'game strategies',
      'gaming tournaments', 'game walkthrough', 'gaming peripherals', 'game trailers', 'indie games',
      'multiplayer games', 'game updates', 'gaming community', 'game streaming', 'gaming tips'
    ],
    movies: [
      'new movies', 'movie reviews', 'film trailers', 'cinema releases', 'streaming movies',
      'movie recommendations', 'box office', 'film festivals', 'movie ratings', 'classic films',
      'TV shows', 'series recommendations', 'Netflix originals', 'HBO series', 'movie actors',
      'film directors', 'movie genres', 'award shows', 'movie soundtracks', 'behind the scenes'
    ],
    music: [
      'new music', 'music videos', 'concert tours', 'music festivals', 'album releases',
      'music streaming', 'song lyrics', 'music charts', 'artist news', 'music genres',
      'music production', 'music reviews', 'live performances', 'music awards', 'playlists',
      'music instruments', 'music lessons', 'music theory', 'band news', 'music events'
    ],
    travel: [
      'travel destinations', 'vacation ideas', 'travel tips', 'hotel reviews', 'flight deals',
      'tourist attractions', 'travel guides', 'backpacking', 'luxury travel', 'budget travel',
      'travel photography', 'travel insurance', 'travel packages', 'road trips', 'beach destinations',
      'mountain resorts', 'city tours', 'travel blogs', 'adventure travel', 'travel planning'
    ],
    science: [
      'scientific discoveries', 'research papers', 'space exploration', 'physics news', 'biology studies',
      'chemistry research', 'astronomy updates', 'scientific journals', 'lab experiments', 'science news',
      'technology innovations', 'medical research', 'environmental science', 'quantum physics', 'genetics',
      'paleontology', 'neuroscience', 'climate research', 'scientific theories', 'research funding'
    ],
    health: [
      'health tips', 'fitness routines', 'workout plans', 'nutrition advice', 'mental health',
      'medical news', 'diet plans', 'wellness tips', 'healthy lifestyle', 'exercise routines',
      'yoga practices', 'meditation techniques', 'health research', 'disease prevention', 'supplements',
      'fitness equipment', 'health insurance', 'medical treatments', 'health monitoring', 'wellness programs'
    ],
    fashion: [
      'fashion trends', 'style tips', 'clothing brands', 'fashion shows', 'outfit ideas',
      'designer collections', 'fashion accessories', 'seasonal fashion', 'fashion blogs', 'streetwear',
      'luxury fashion', 'sustainable fashion', 'fashion photography', 'makeup trends', 'beauty tips',
      'fashion industry', 'fashion week', 'styling advice', 'wardrobe essentials', 'fashion influencers'
    ],
    business: [
      'business news', 'stock market', 'startup ideas', 'entrepreneurship', 'business strategies',
      'investment tips', 'financial planning', 'business management', 'marketing strategies', 'sales techniques',
      'business growth', 'industry trends', 'corporate news', 'business analytics', 'leadership skills',
      'business development', 'real estate', 'economic outlook', 'business opportunities', 'financial markets'
    ]
  };

  const modifiers = [
    'best', 'top', 'latest', 'new', 'trending', 'popular', 'recommended', 'ultimate',
    'complete guide to', 'how to', 'what is', 'why', 'when', 'where to find',
    'reviews on', 'comparison of', 'tips for', 'tricks for', 'advanced',
    'beginner', 'professional', '2026', 'recent', 'updated', 'comprehensive'
  ];

  const locations = [
    'worldwide', 'USA', 'global', 'local', 'near me', 'online',
    'in America', 'in Europe', 'in Asia', 'internationally'
  ];

  let topics;
  if (category === 'random') {
    const allCategories = Object.keys(categoryTopics);
    const randomCategory = allCategories[(dayOfYear + searchIndex) % allCategories.length];
    topics = categoryTopics[randomCategory];
  } else {
    topics = categoryTopics[category] || categoryTopics['random'];
  }

  const topicIndex = (dayOfYear + searchIndex + hourOfDay) % topics.length;
  const modifierIndex = (searchIndex + dayOfYear) % modifiers.length;
  const locationIndex = (searchIndex * 2 + dayOfYear) % locations.length;

  const topic = topics[topicIndex];
  const modifier = modifiers[modifierIndex];
  const location = locations[locationIndex];

  const patterns = [
    `${modifier} ${topic}`,
    `${topic} ${location}`,
    `${modifier} ${topic} 2026`,
    `${topic}`,
    `${modifier} ${topic} ${location}`,
    `${topic} reviews`,
    `${topic} tips`,
    `best ${topic}`
  ];

  const patternIndex = (searchIndex + hourOfDay) % patterns.length;
  return patterns[patternIndex];
}
