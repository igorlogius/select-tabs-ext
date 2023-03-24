/* global browser */

async function onSubmitTime() {
  let queryBase = { currentWindow: true, hidden: false };
  let queryHL = queryBase;
  queryHL["highlighted"] = true;
  let tabs = await browser.tabs.query(queryHL);

  // work on all tabs if there are none selected
  if (tabs.length === 1) {
    tabs = await browser.tabs.query({ currentWindow: true, hidden: false });
  }
  const accessTimeMin =
    document.getElementById("accessTimeMin").value * 60 * 1000;
  const accessTimeMax =
    document.getElementById("accessTimeMax").value * 60 * 1000;

  const now = Date.now();
  const hltabIdxs = [];
  for (const t of tabs) {
    const lastAccessDiff = now - t.lastAccessed;
    console.log(lastAccessDiff, accessTimeMin, accessTimeMax, t.url);
    if (lastAccessDiff >= accessTimeMin && lastAccessDiff <= accessTimeMax) {
      hltabIdxs.push(t.index);
    }
  }

  if (hltabIdxs.length > 0) {
    document.getElementById("message").innerText = "selected matched tabs";
    browser.tabs.highlight({
      windowId: tabs[0].windowId,
      tabs: hltabIdxs,
      populate: false,
    });
  } else {
    //
    document.getElementById("message").innerText =
      "no match selection unchanged";
  }
}

document.getElementById("submitTime").addEventListener("click", onSubmitTime);
