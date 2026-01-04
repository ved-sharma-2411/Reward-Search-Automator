let searchState = {
  isRunning: false,
  currentIndex: 0,
  totalSearches: 0,
  timerStartTime: 0,
  timerEndTime: 0,
  remainingTime: 0
};

chrome.runtime.onInstalled.addListener(() => {
  // Initialize defaults once and auto-start if enabled
  ensureDefaults().then(() => {
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    checkAndStartSearches();
  });
});

chrome.runtime.onStartup.addListener(() => {
  // Initialize defaults once and auto-start if enabled
  ensureDefaults().then(async () => {
    chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });

    // Check if searches were running when browser was closed
    const result = await chrome.storage.local.get(['isRunning']);
    if (result.isRunning) {
      // Reset progress if browser was closed while running
      await chrome.storage.local.set({ 
        completedToday: 0,
        isRunning: false 
      });
    }

    // Wait 5 seconds before auto-starting
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

// Update timer state every second
setInterval(() => {
  if (searchState.isRunning && searchState.timerEndTime > 0) {
    const now = Date.now();
    searchState.remainingTime = Math.max(0, Math.ceil((searchState.timerEndTime - now) / 1000));
  }
}, 100);

async function checkAndStartSearches() {
  const result = await chrome.storage.local.get(['autoStart', 'searchCount', 'completedToday', 'lastSearchDate']);

  // Default to auto-start on if the user has never configured it
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

  // Default to enabled when auto-start is on and user hasn't toggled it off
  const isEnabled = result.isEnabled !== undefined ? result.isEnabled : true;

  if (!isEnabled) return;

  searchState.totalSearches = result.searchCount || 30;
  searchState.currentIndex = result.completedToday || 0;
  searchState.isRunning = true;

  await chrome.storage.local.set({ isRunning: true });
  
  // Update badge when starting
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

  const query = generateRandomQuery();

  try {
    // Get or create a Bing tab
    const tabs = await chrome.tabs.query({ url: 'https://www.bing.com/*' });
    let tab;

    if (tabs.length > 0) {
      // Use existing Bing tab - don't reload, just send message to type
      tab = tabs[0];
      await chrome.tabs.update(tab.id, { active: false });
      
      // Send message immediately to type the query
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'typeSearch', query: query });
      } catch (error) {
        console.error('Failed to send message to content script:', error);
      }
    } else {
      // Create new tab if no Bing tab exists
      tab = await chrome.tabs.create({ url: 'https://www.bing.com/', active: false });
      
      // Wait for the page to load, then send message to type the query
      setTimeout(async () => {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'typeSearch', query: query });
        } catch (error) {
          console.error('Failed to send message to content script:', error);
        }
      }, 2000);
    }

    // Start timer after search begins
    const result = await chrome.storage.local.get(['waitTime']);
    const baseWaitTime = result.waitTime || 10;
    const randomWaitTime = (baseWaitTime + Math.random() * 10) * 1000;
    
    searchState.timerStartTime = Date.now();
    searchState.timerEndTime = Date.now() + randomWaitTime;
    searchState.remainingTime = Math.ceil(randomWaitTime / 1000);

    // Wait for timer to complete before incrementing count
    await new Promise(resolve => setTimeout(resolve, randomWaitTime));

    // Timer ended - now increment the count
    searchState.currentIndex++;
    searchState.timerStartTime = 0;
    searchState.timerEndTime = 0;
    searchState.remainingTime = 0;

    const today = new Date().toDateString();
    await chrome.storage.local.set({
      completedToday: searchState.currentIndex,
      lastSearchDate: today
    });

    // Update badge with current count
    updateBadge(searchState.currentIndex);

    // Check if all searches are completed
    if (searchState.currentIndex < searchState.totalSearches) {
      // Continue to next search
      performNextSearch();
    } else {
      // All searches completed - close all tabs except rewards page
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
  
  // Clear badge when stopped
  chrome.action.setBadgeText({ text: '' });
}

async function closeAllTabsAndOpenRewards() {
  try {
    // Get all tabs
    const allTabs = await chrome.tabs.query({});
    
    // Create the rewards page first
    const rewardsTab = await chrome.tabs.create({ 
      url: 'https://rewards.bing.com/?ref=rewardspanel', 
      active: true 
    });
    
    // Close all other tabs
    const tabsToClose = allTabs.map(tab => tab.id).filter(id => id !== rewardsTab.id);
    if (tabsToClose.length > 0) {
      await chrome.tabs.remove(tabsToClose);
    }
  } catch (error) {
    console.error('Error closing tabs:', error);
  }
}

function updateBadge(count) {
  // Format count with leading zero for single digits (01, 02, etc.)
  const badgeText = count.toString().padStart(2, '0');
  chrome.action.setBadgeText({ text: badgeText });
  chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
}

// Ensure baseline settings exist so auto-start can run on first install/startup
async function ensureDefaults() {
  const defaults = {
    searchCount: 30,
    waitTime: 10,
    autoStart: true,
    completedToday: 0,
    lastSearchDate: ''
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

function generateRandomQuery() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  const hourOfDay = now.getHours();
  
  const topics = [
    'weather forecast', 'breaking news', 'sports highlights', 'technology trends', 'scientific discoveries', 
    'health tips', 'entertainment news', 'travel destinations', 'food recipes', 'fashion trends',
    'music releases', 'movie reviews', 'book recommendations', 'gaming news', 'art exhibitions',
    'historical events', 'nature documentaries', 'space exploration', 'wildlife conservation', 'electric cars',
    'photography tips', 'fitness routines', 'cryptocurrency', 'artificial intelligence', 'climate change',
    'renewable energy', 'virtual reality', 'quantum computing', 'gene therapy', 'robotics',
    'cybersecurity', 'blockchain technology', 'machine learning', 'data science', 'cloud computing',
    'mobile apps', 'web development', 'social media trends', 'digital marketing', 'e-commerce',
    'sustainable living', 'meditation techniques', 'yoga practices', 'mental health awareness', 'nutrition facts',
    'stock market', 'real estate', 'entrepreneurship', 'startup ideas', 'business strategies'
  ];

  const modifiers = [
    'latest', 'best', 'top', 'new', 'trending', 'popular', 'today', 'updates', 'recent',
    'breaking', 'exclusive', 'comprehensive', 'ultimate', 'complete', 'advanced', 'beginner',
    'professional', 'expert', 'innovative', 'revolutionary', 'cutting-edge', 'emerging',
    'future of', 'impact of', 'benefits of', 'challenges in', 'opportunities in', 'developments in'
  ];

  const locations = [
    'worldwide', 'USA', 'Europe', 'Asia', 'global', 'local', 'international', 'national',
    'regional', 'North America', 'South America', 'Africa', 'Australia', 'Middle East'
  ];

  const timeReferences = [
    '2026', 'this year', 'this month', 'this week', 'today', 'January 2026',
    'recent', 'current', 'upcoming', 'future', 'modern', 'contemporary'
  ];

  const questionWords = [
    'how to', 'what is', 'why is', 'when will', 'where to find', 'who is',
    'which are the best', 'can you', 'should I', 'will there be'
  ];

  // Use day of year and hour to create consistent but varied queries throughout the day
  const topicIndex = (dayOfYear + searchState.currentIndex) % topics.length;
  const modifierIndex = (dayOfYear * 2 + searchState.currentIndex + hourOfDay) % modifiers.length;
  const locationIndex = (dayOfYear + searchState.currentIndex * 3) % locations.length;
  const timeIndex = (dayOfYear + hourOfDay) % timeReferences.length;
  const questionIndex = (searchState.currentIndex + dayOfYear) % questionWords.length;

  const topic = topics[topicIndex];
  const modifier = modifiers[modifierIndex];
  const location = locations[locationIndex];
  const timeRef = timeReferences[timeIndex];
  const question = questionWords[questionIndex];

  const patterns = [
    `${modifier} ${topic}`,
    `${topic} ${timeRef}`,
    `${location} ${topic}`,
    `${modifier} ${topic} ${location}`,
    `${topic} ${modifier} ${timeRef}`,
    `${question} ${topic}`,
    `${topic} in ${location}`,
    `${timeRef} ${topic} ${modifier}`,
    `${modifier} ${topic} updates`,
    `${question} ${topic} in ${timeRef}`
  ];

  const patternIndex = (searchState.currentIndex + dayOfYear) % patterns.length;
  const pattern = patterns[patternIndex];

  return pattern;
}
