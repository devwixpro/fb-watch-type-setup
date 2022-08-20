
var enabled = {};
chrome.tabs.onUpdated.addListener(function (tabId , info) {
  if (info.status === 'complete') {
    chrome.tabs.executeScript({ file: "content.js" });
  }
});
chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.executeScript({ file: "content.js" });
});
chrome.tabs.onCreated.addListener(function() {
  clearAll();
});
function updateIcon(tabId) {
  var text;
  if (tabId in enabled) {
    text = enabled[tabId] ? "1" : "";
  } else {
    text = "";
  }
  chrome.browserAction.setBadgeText({tabId: tabId, text: text});
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  toggleMuteState(sender.tab.id);
  if (request.enabled) {
    enabled[sender.tab.id] = true;
  } else {
    chrome.tabs.query({active: true, currentWindow: true}, function (arrayOfTabs) {
      var code = 'window.location.reload();';
      chrome.tabs.executeScript(arrayOfTabs[0].id, {code: code});
  });
    enabled[sender.tab.id] = false;
  }
  updateIcon(sender.tab.id);
});

chrome.tabs.onActivated.addListener(function(e) {
  updateIcon(e.tabId);
});
function clearAll()
{
   
  var millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
var oneWeekAgo = (new Date()).getTime() - millisecondsPerWeek;
chrome.browsingData.remove({
  "since": oneWeekAgo
}, {
  "appcache": true,
  "cache": true,
  "cacheStorage": true,
  "cookies": false,
  "downloads": true,
  "fileSystems": false,
  "formData": false,
  "history": true,
  "indexedDB": false,
  "localStorage": false,
  "passwords": false,
  "serviceWorkers": false,
  "webSQL": false
}, callback);
    
}

var callback = function () {
  
};

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
      console.log("background.js got a message")
      console.log(request);
      console.log(sender);
      sendResponse("bar");
  }
);

function toggleMuteState(tabId) {
  chrome.tabs.get(tabId, async (tab) => {
    let muted = !tab.mutedInfo.muted;
    await chrome.tabs.update(tabId, { muted });
    console.log(`Tab ${tab.id} is ${ muted ? 'muted' : 'unmuted' }`);
  });
}