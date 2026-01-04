console.log('Bing Search Automator - Content Script Loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'typeSearch') {
    typeSearchQuery(request.query);
    sendResponse({ success: true });
  }
  return true;
});

async function typeSearchQuery(query) {
  // Wait for page to be fully loaded
  await new Promise(resolve => setTimeout(resolve, 500));

  // Find the search input box
  const searchBox = document.querySelector('#sb_form_q') || 
                    document.querySelector('input[name="q"]') || 
                    document.querySelector('textarea[name="q"]');

  if (!searchBox) {
    console.error('Search box not found');
    return;
  }

  // Clear existing text
  searchBox.value = '';
  searchBox.focus();

  // Type each character with a random delay (50-150ms) between them
  for (let i = 0; i < query.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    searchBox.value += query[i];
    
    // Dispatch input event to make Bing recognize the typing
    const inputEvent = new Event('input', { bubbles: true });
    searchBox.dispatchEvent(inputEvent);
  }

  // Wait a bit after typing completes (like a human would)
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));

  // Submit the search form
  const searchForm = document.querySelector('#sb_form') || searchBox.closest('form');
  if (searchForm) {
    searchForm.submit();
  } else {
    // Fallback: press Enter
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      bubbles: true
    });
    searchBox.dispatchEvent(enterEvent);
  }

  // Scroll a bit like a human would
  setTimeout(() => {
    window.scrollTo(0, document.body.scrollHeight / 3);
  }, 1000);
}
