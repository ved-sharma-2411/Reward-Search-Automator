import { useState, useEffect } from 'react';
import { Play, Square, Settings, Check, Timer, Github } from 'lucide-react';

interface ExtensionSettings {
  searchCount: number;
  waitTime: number;
  isEnabled: boolean;
  autoStart: boolean;
  completedToday: number;
  isRunning: boolean;
}

interface SearchStatus {
  isRunning: boolean;
  currentIndex: number;
  totalSearches: number;
  timerStartTime: number;
  timerEndTime: number;
  remainingTime: number;
}

function App() {
  const [settings, setSettings] = useState<ExtensionSettings>({
    searchCount: 30,
    waitTime: 10,
    isEnabled: false,
    autoStart: true,
    completedToday: 0,
    isRunning: false
  });

  const [searchStatus, setSearchStatus] = useState<SearchStatus>({
    isRunning: false,
    currentIndex: 0,
    totalSearches: 0,
    timerStartTime: 0,
    timerEndTime: 0,
    remainingTime: 0
  });

  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState({ searchCount: 30, waitTime: 10 });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();

    const interval = setInterval(() => {
      loadSettings();
      loadSearchStatus();
    }, 500); // Update more frequently for smooth timer

    return () => clearInterval(interval);
  }, [showSettings]);

  const loadSearchStatus = () => {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response) {
        setSearchStatus(response);
      }
    });
  };

  const loadSettings = () => {
    chrome.storage.local.get(
      ['searchCount', 'waitTime', 'isEnabled', 'autoStart', 'completedToday', 'isRunning'],
      (result) => {
        const newSettings = {
          searchCount: result.searchCount || 30,
          waitTime: result.waitTime || 10,
          isEnabled: result.isEnabled || false,
          autoStart: result.autoStart !== undefined ? result.autoStart : true,
          completedToday: result.completedToday || 0,
          isRunning: result.isRunning || false
        };
        setSettings(newSettings);
        
        // Only update tempSettings if settings view is not open (to avoid overwriting user input)
        if (!showSettings) {
          setTempSettings({
            searchCount: newSettings.searchCount,
            waitTime: newSettings.waitTime
          });
        }
      }
    );
  };

  const handleToggle = async () => {
    const newEnabled = !settings.isEnabled;
    await chrome.storage.local.set({ isEnabled: newEnabled });

    if (newEnabled) {
      chrome.runtime.sendMessage({ action: 'startSearches' });
    } else {
      chrome.runtime.sendMessage({ action: 'stopSearches' });
    }

    loadSettings();
  };

  const handleAutoStartToggle = async () => {
    const newAutoStart = !settings.autoStart;
    await chrome.storage.local.set({ autoStart: newAutoStart });
    loadSettings();
  };

  const handleSaveSettings = async () => {
    await chrome.storage.local.set({
      searchCount: tempSettings.searchCount,
      waitTime: tempSettings.waitTime
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadSettings();
  };

  const handleReset = async () => {
    await chrome.storage.local.set({ completedToday: 0 });
    loadSettings();
  };

  const progress = (settings.completedToday / settings.searchCount) * 100;

  return (
    <div className="w-96 bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Bing Search Automator</h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Settings className={`w-5 h-5 text-slate-600 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {showSettings ? (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Number of Searches
              </label>
              <input
                type="number"
                min="1"
                max="200"
                value={tempSettings.searchCount}
                onChange={(e) => setTempSettings({ ...tempSettings, searchCount: parseInt(e.target.value) || 30 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Wait Time Between Searches (seconds)
                <span className="block text-xs text-slate-500 font-normal mt-1">
                  Random delay: {tempSettings.waitTime} to {tempSettings.waitTime + 10} seconds
                </span>
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={tempSettings.waitTime}
                onChange={(e) => setTempSettings({ ...tempSettings, waitTime: parseInt(e.target.value) || 5 })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <button
              onClick={handleSaveSettings}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <Check className="w-5 h-5" />
                  Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>

            <button
              onClick={() => setShowSettings(false)}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Progress Today</span>
                <span className="text-sm font-bold text-blue-600">
                  {settings.completedToday} / {settings.searchCount}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            {searchStatus.isRunning && searchStatus.remainingTime > 0 && (
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-5 h-5 text-blue-600 animate-pulse" />
                    <span className="text-sm font-medium text-slate-700">Timer Running</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 tabular-nums">
                    {searchStatus.remainingTime}s
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  Waiting before search #{settings.completedToday + 1}
                </div>
              </div>
            )}

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Status</span>
                <span className={`text-sm font-bold ${settings.isRunning ? 'text-green-600' : 'text-slate-500'}`}>
                  {settings.isRunning ? 'Running' : 'Stopped'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">Auto-Start on Browser Open</span>
                <button
                  onClick={handleAutoStartToggle}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.autoStart ? 'bg-green-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.autoStart ? 'translate-x-6' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleToggle}
                disabled={settings.completedToday >= settings.searchCount}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                  settings.isEnabled
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : settings.completedToday >= settings.searchCount
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {settings.isEnabled ? (
                  <>
                    <Square className="w-5 h-5" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start
                  </>
                )}
              </button>

              <button
                onClick={handleReset}
                className="py-3 px-4 rounded-lg font-medium bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors"
              >
                Reset Count
              </button>
            </div>

            {settings.completedToday >= settings.searchCount && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 text-center font-medium">
                  All searches completed for today!
                </p>
              </div>
            )}

            {/* Made by Ved Sharma */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <a
                href="https://github.com/ved-sharma-2411"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors group"
              >
                <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Made by <span className="font-semibold">Ved Sharma</span></span>
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
