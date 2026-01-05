console.log('Bing Search Automator - Enhanced Content Script Loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'typeSearch') {
    performHumanLikeSearch(request.query, request.humanMode, request.clickResults);
    sendResponse({ success: true });
  }
  return true;
});

async function performHumanLikeSearch(query, humanMode = true, clickResults = true) {
  try {
    await simulateHumanDelay(500, 1000);

    await simulateMouseMovement();

    const searchBox = await findSearchBox();
    if (!searchBox) {
      console.error('Search box not found');
      return;
    }

    searchBox.value = '';

    await simulateHumanDelay(200, 500);

    searchBox.focus();

    await simulateHumanDelay(300, 700);

    await typeWithHumanBehavior(searchBox, query, humanMode);

    const waitBeforeSubmit = humanMode ? (3000 + Math.random() * 2000) : (1000 + Math.random() * 500);
    console.log(`Waiting ${Math.round(waitBeforeSubmit / 1000)} seconds before submitting...`);

    await simulateReadingBehavior(waitBeforeSubmit);

    await submitSearch(searchBox);

    await waitForSearchResults();

    if (humanMode) {
      await performNaturalScrolling();
    }

    if (clickResults && Math.random() > 0.3) {
      await clickRandomResult();
    }

    if (humanMode) {
      await performAdditionalInteractions();
    }

  } catch (error) {
    console.error('Error in performHumanLikeSearch:', error);
  }
}

async function findSearchBox() {
  const selectors = [
    '#sb_form_q',
    'input[name="q"]',
    'textarea[name="q"]',
    '.sb_form_q',
    '[aria-label="Enter your search term"]'
  ];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) return element;
  }

  return null;
}

async function typeWithHumanBehavior(element, text, humanMode) {
  const baseDelay = humanMode ? 80 : 50;
  const varianceDelay = humanMode ? 120 : 50;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    const typoChance = humanMode ? 0.03 : 0;
    if (Math.random() < typoChance && i < text.length - 1) {
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + (Math.random() > 0.5 ? 1 : -1));
      element.value += wrongChar;
      dispatchInputEvents(element);
      await simulateHumanDelay(100, 300);

      element.value = element.value.slice(0, -1);
      dispatchInputEvents(element);
      await simulateHumanDelay(50, 150);
    }

    element.value += char;
    dispatchInputEvents(element);

    let delay = baseDelay + Math.random() * varianceDelay;

    if (char === ' ') {
      delay *= 1.5;
    }

    if (i > 0 && text[i - 1] === ' ') {
      delay *= 0.7;
    }

    if (Math.random() < 0.1 && humanMode) {
      delay *= 2;
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

function dispatchInputEvents(element) {
  const events = ['input', 'keyup', 'change'];
  events.forEach(eventType => {
    const event = new Event(eventType, { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
  });
}

async function simulateReadingBehavior(duration) {
  const segments = Math.floor(duration / 1000);

  for (let i = 0; i < segments; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    if (Math.random() > 0.7) {
      const smallScroll = Math.random() * 50;
      window.scrollBy(0, smallScroll);
    }
  }

  const remainingTime = duration % 1000;
  if (remainingTime > 0) {
    await new Promise(resolve => setTimeout(resolve, remainingTime));
  }
}

async function submitSearch(searchBox) {
  const searchForm = document.querySelector('#sb_form') || searchBox.closest('form');

  if (searchForm) {
    searchForm.submit();
  } else {
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    searchBox.dispatchEvent(enterEvent);

    await simulateHumanDelay(100, 300);

    const keypressEvent = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    searchBox.dispatchEvent(keypressEvent);
  }
}

async function waitForSearchResults() {
  const maxWaitTime = 5000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const resultsContainer = document.querySelector('#b_results') ||
                            document.querySelector('.b_algo') ||
                            document.querySelector('[data-tag="SearchResults"]');

    if (resultsContainer) {
      await simulateHumanDelay(500, 1000);
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return false;
}

async function performNaturalScrolling() {
  const scrollCount = 2 + Math.floor(Math.random() * 3);

  for (let i = 0; i < scrollCount; i++) {
    const scrollAmount = 200 + Math.random() * 400;
    const scrollDuration = 300 + Math.random() * 500;

    await smoothScroll(scrollAmount, scrollDuration);

    await simulateHumanDelay(800, 2000);

    if (Math.random() > 0.7) {
      await smoothScroll(-scrollAmount * 0.3, 200);
      await simulateHumanDelay(300, 800);
    }
  }
}

async function smoothScroll(distance, duration) {
  const startPosition = window.pageYOffset;
  const startTime = Date.now();

  return new Promise(resolve => {
    function scroll() {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeProgress = easeInOutCubic(progress);
      const currentPosition = startPosition + (distance * easeProgress);

      window.scrollTo(0, currentPosition);

      if (progress < 1) {
        requestAnimationFrame(scroll);
      } else {
        resolve();
      }
    }

    scroll();
  });
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

async function clickRandomResult() {
  await simulateHumanDelay(1000, 2000);

  const resultSelectors = [
    '#b_results .b_algo h2 a',
    '.b_algo h2 a',
    '#b_results li a',
    '[data-tag="SearchResults"] a'
  ];

  let results = [];
  for (const selector of resultSelectors) {
    results = Array.from(document.querySelectorAll(selector));
    if (results.length > 0) break;
  }

  if (results.length === 0) {
    console.log('No search results found to click');
    return;
  }

  const topResults = results.slice(0, Math.min(5, results.length));

  if (topResults.length === 0) return;

  const resultToClick = topResults[Math.floor(Math.random() * topResults.length)];

  await simulateMouseMovementToElement(resultToClick);

  await simulateHumanDelay(300, 800);

  const rect = resultToClick.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;

  const clickEvent = new MouseEvent('click', {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y
  });

  resultToClick.dispatchEvent(clickEvent);

  console.log('Clicked on search result:', resultToClick.textContent.substring(0, 50));

  await simulateHumanDelay(3000, 6000);

  if (Math.random() > 0.3) {
    window.history.back();
    await simulateHumanDelay(1000, 2000);
  }
}

async function performAdditionalInteractions() {
  if (Math.random() > 0.5) {
    await simulateHumanDelay(500, 1500);

    const sidebar = document.querySelector('#b_context') || document.querySelector('.b_poleContent');
    if (sidebar) {
      const sidebarLinks = sidebar.querySelectorAll('a');
      if (sidebarLinks.length > 0 && Math.random() > 0.7) {
        const randomLink = sidebarLinks[Math.floor(Math.random() * sidebarLinks.length)];
        await simulateMouseMovementToElement(randomLink);
      }
    }
  }

  if (Math.random() > 0.6) {
    await simulateHumanDelay(1000, 2000);
    window.scrollTo(0, document.body.scrollHeight * 0.7);
    await simulateHumanDelay(800, 1500);
  }
}

async function simulateMouseMovement() {
  const event = new MouseEvent('mousemove', {
    view: window,
    bubbles: true,
    cancelable: true,
    clientX: Math.random() * window.innerWidth,
    clientY: Math.random() * window.innerHeight
  });
  document.dispatchEvent(event);
}

async function simulateMouseMovementToElement(element) {
  const rect = element.getBoundingClientRect();
  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height / 2;

  const steps = 5 + Math.floor(Math.random() * 10);
  const currentX = Math.random() * window.innerWidth;
  const currentY = Math.random() * window.innerHeight;

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const x = currentX + (targetX - currentX) * progress;
    const y = currentY + (targetY - currentY) * progress;

    const event = new MouseEvent('mousemove', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    });
    document.dispatchEvent(event);

    await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
  }
}

async function simulateHumanDelay(min, max) {
  const delay = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, delay));
}
