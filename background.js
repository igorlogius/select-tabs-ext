/* global browser */

let allTabs = [];
let consideredTabsIds = new Set();
let multipleHighlighted = false;

const manifest = browser.runtime.getManifest();
const extname = manifest.name;

function notify(title, message = "", iconUrl = "icon.png") {
  return browser.notifications.create("" + Date.now(), {
    type: "basic",
    iconUrl,
    title,
    message,
  });
}

function highlightTabsByWindowId(winId2tabIdxMap) {
  winId2tabIdxMap.forEach((value, key /*,map*/) => {
    browser.tabs.highlight({
      windowId: key,
      tabs: [...value], // convert from Set to array
      populate: false,
    });
  });
}

function highlight(tabs) {
  if (tabs.length < 1) {
    notify(extname, "no tabs matched, selection was not changed");
    return;
  }
  let winId2tabIdxMap = new Map();
  tabs.forEach((t) => {
    if (!winId2tabIdxMap.has(t.windowId)) {
      winId2tabIdxMap.set(t.windowId, []);
    }
    winId2tabIdxMap.get(t.windowId).push(t.index);
  });
  highlightTabsByWindowId(winId2tabIdxMap);
}

function getDescendentTabs(ancestorTabId, max_relation_depth = -1) {
  let out = [];
  for (const t of allTabs) {
    // ref. openerTabId is only present if the opener tab
    // still exists and is in the same window.
    if (t.openerTabId === ancestorTabId) {
      if (consideredTabsIds.has(t.id)) {
        out.push(t);
      }
      if (max_relation_depth !== 1) {
        const tmp = getDescendentTabs(t.id, max_relation_depth - 1);
        out = [...out, ...tmp];
      }
    }
  }
  return out;
}

async function getAncestorTabs(ancestorTabId, max_relation_depth = -1) {
  let out = [];
  const tabId2tabMap = new Map();
  allTabs.forEach((t) => {
    tabId2tabMap.set(t.id, t);
  });

  let ancestorTab = await browser.tabs.get(ancestorTabId);
  if (consideredTabsIds.has(ancestorTab.id)) {
    out.push(ancestorTab);
  }

  let tmp;
  while (
    typeof ancestorTab.openerTabId === "number" &&
    max_relation_depth !== 1 &&
    tabId2tabMap.has(ancestorTab.openerTabId)
  ) {
    tmp = tabId2tabMap.get(ancestorTab.openerTabId);
    if (consideredTabsIds.has(tmp.id)) {
      out.push(tmp);
    }
    ancestorTab = tmp;
  }
  return out;
}

// -------------

browser.menus.create({
  id: "Invert Selection",
  title: "Invert Selection",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Directional",
  title: "Directional",
  type: "separator",
  contexts: ["tab"],
});
browser.menus.create({
  id: "Relationship",
  title: "Relationship",
  type: "separator",
  contexts: ["tab"],
});
browser.menus.create({
  id: "URL Property",
  title: "URL Property",
  type: "separator",
  contexts: ["tab"],
});
browser.menus.create({
  id: "State",
  title: "State",
  type: "separator",
  contexts: ["tab"],
});
browser.menus.create({
  id: "Last Access Time",
  title: "Last Access Time",
  type: "separator",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Same Container",
  title: "Same Container",
  contexts: ["tab"],
});

// Relationship

browser.menus.create({
  title: "Descendents",
  parentId: "Relationship",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Siblings",
  title: "Siblings",
  parentId: "Relationship",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Children",
  title: "Children",
  parentId: "Relationship",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Parent",
  title: "Parent",
  parentId: "Relationship",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Ancestors",
  title: "Ancestors",
  parentId: "Relationship",
  contexts: ["tab"],
});

// URL (can be done by Userscript too )

browser.menus.create({
  id: "Same URL",
  title: "Same URL",
  parentId: "URL Property",
  contexts: ["tab"],
});

// URL (can be done by Userscript too )

browser.menus.create({
  id: "Same Origin",
  title: "Same Origin",
  parentId: "URL Property",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Same Domain",
  title: "Same Domain",
  parentId: "URL Property",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Same Port",
  title: "Same Port",
  parentId: "URL Property",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Same Protocol",
  title: "Same Protocol",
  parentId: "URL Property",
  contexts: ["tab"],
});

// Positional

browser.menus.create({
  title: "To the Left",
  parentId: "Directional",
  contexts: ["tab"],
});

browser.menus.create({
  id: "To the Right",
  title: "To the Right",
  parentId: "Directional",
  contexts: ["tab"],
});

//
browser.menus.create({
  id: "Pinned",
  title: "Pinned",
  parentId: "State",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Muted",
  title: "Muted",
  parentId: "State",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Loading",
  title: "Loading",
  parentId: "State",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Complete",
  title: "Complete",
  parentId: "State",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Undefined",
  title: "Undefined",
  parentId: "State",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Audible",
  title: "Audible",
  parentId: "State",
  contexts: ["tab"],
});

browser.menus.create({
  id: "Auto Discardable",
  title: "Auto Discardable",
  parentId: "State",
  contexts: ["tab"],
});

browser.menus.create({
  id: "UserScripts",
  title: "UserScripts",
  contexts: ["tab"],
});

function handleHighlighted(highlightInfo) {
  multipleHighlighted = highlightInfo.tabIds.length > 1;
}

const run = {
  "Invert Selection": async (/*info, tab*/) => {
    // Previously highlighted tabs not included in tabs will stop being highlighted.
    // The first tab in tabs will become active.
    // ref. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/highlight
    const tabs = await browser.tabs.query({
      highlighted: false,
      currentWindow: true,
      hidden: false,
    });
    highlight(tabs);
  },

  "Same Container": async (info, tab) => {
    if (tab.cookieStoreId) {
      let query = {
        currentWindow: true,
        hidden: false,
        cookieStoreId: tab.cookieStoreId,
      };
      if (multipleHighlighted) {
        // more than one TabIsHighlighted
        // only run the scripts on the highlighted tabs
        // and the ones still highlighted match the script
        query["highlighted"] = true;
      }
      const tabs = (await browser.tabs.query(query))
        // order clicked tabs to the front
        .sort((a, b) => (a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0));
      highlight(tabs);
    }
  },
  Descendents: async (info, tab) => {
    allTabs = await browser.tabs.query({
      currentWindow: true,
      hidden: false,
    });

    if (multipleHighlighted) {
      consideredTabsIds = new Set(
        (
          await browser.tabs.query({
            hidden: false,
            currentWindow: true,
            highlighted: true,
          })
        ).map((t) => t.id)
      );
    } else {
      consideredTabsIds = new Set(allTabs.map((t) => t.id));
    }
    highlight(getDescendentTabs(tab.id).filter((t) => t.id !== tab.id));
  },
  Siblings: async (info, tab) => {
    allTabs = await browser.tabs.query({
      hidden: false,
      currentWindow: true,
    });
    if (multipleHighlighted) {
      consideredTabsIds = new Set(
        (
          await browser.tabs.query({
            hidden: false,
            currentWindow: true,
            highlighted: true,
          })
        ).map((t) => t.id)
      );
    } else {
      consideredTabsIds = new Set(allTabs.map((t) => t.id));
    }
    highlight(
      getDescendentTabs(tab.openerTabId, 1).filter((t) => t.id !== tab.id)
    );
  },
  Children: async (info, tab) => {
    allTabs = await browser.tabs.query({
      hidden: false,
      currentWindow: true,
    });
    if (multipleHighlighted) {
      consideredTabsIds = new Set(
        (
          await browser.tabs.query({
            hidden: false,
            currentWindow: true,
            highlighted: true,
          })
        ).map((t) => t.id)
      );
    } else {
      consideredTabsIds = new Set(allTabs.map((t) => t.id));
    }
    highlight(getDescendentTabs(tab.id, 1));
  },
  Parent: async (info, tab) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
      };
    }
    const tabs = (await browser.tabs.query(query)).filter(
      (t) => t.id === tab.openerTabId
    );

    highlight(tabs);
  },
  Ancestors: async (info, tab) => {
    allTabs = await browser.tabs.query({
      hidden: false,
      currentWindow: true,
    });
    if (multipleHighlighted) {
      let query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
      };
      consideredTabsIds = new Set(
        (await browser.tabs.query(query)).map((t) => t.id)
      );
    } else {
      consideredTabsIds = new Set(allTabs.map((t) => t.id));
    }
    highlight(await getAncestorTabs(tab.id, -1));
  },
  "Same URL": async (info, tab) => {
    let query;

    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        url: tab.url,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        url: tab.url,
      };
    }
    const tabs = await browser.tabs.query(query);
    highlight(tabs);
  },
  "Same Origin": async (info, tab) => {
    let query;

    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        url: new URL(tab.url).origin + "/*",
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        url: new URL(tab.url).origin + "/*",
      };
    }
    const tabs = await browser.tabs.query(query);
    highlight(tabs);
  },
  "Same Domain": async (info, tab) => {
    let query;
    const hostname = new URL(tab.url).hostname;

    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        url: "*://" + hostname + "/*",
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        url: "*://" + hostname + "/*",
      };
    }
    const tabs = (await browser.tabs.query(query)).sort((a, b) =>
      a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0
    );
    highlight(tabs);
  },
  "Same Port": async (info, tab) => {
    let query;
    const port = new URL(tab.url).port;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        url: "*://*:" + port + "/*",
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        url: "*://*:" + port + "/*",
      };
    }
    const tabs = (await browser.tabs.query(query)).sort((a, b) =>
      a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0
    );
    highlight(tabs);
  },
  "Same Protocol": async (info, tab) => {
    let query;
    const protocol = new URL(tab.url).hostname;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        url: protocol + "//*/*",
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        url: protocol + "//*/*",
      };
    }
    const tabs = (await browser.tabs.query(query)).sort((a, b) =>
      a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0
    );
    highlight(tabs);
  },
  "To the Left": async (info, tab) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
      };
    }
    const tabs = (await browser.tabs.query(query))
      .filter((t) => {
        return t.index < tab.index;
      })
      .sort((a, b) => b.index - a.index);
    highlight(tabs);
  },
  "To the Right": async (info, tab) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
      };
    }
    const tabs = (await browser.tabs.query(query))
      .filter((t) => {
        return t.index > tab.index;
      })
      .sort((a, b) => a.index - b.index);
    highlight(tabs);
  },
  Pinned: async (/*info, tab*/) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        pinned: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        pinned: true,
      };
    }
    const tabs = await browser.tabs.query(query);
    highlight(tabs);
  },
  Muted: async (/*info, tab*/) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        muted: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        muted: true,
      };
    }
    const tabs = await browser.tabs.query(query);
    highlight(tabs);
  },
  Loading: async (info, tab) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
      };
    }
    const tabs = (await browser.tabs.query(query))
      .filter((t) => t.status === "loading")
      .sort((a, b) => (a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0));
    highlight(tabs);
  },
  Complete: async (info, tab) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
      };
    }
    const tabs = (await browser.tabs.query(query))
      .filter((t) => t.status === "complete")
      .sort((a, b) => (a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0));
    highlight(tabs);
  },
  Undefined: async (info, tab) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
      };
    }
    const tabs = (await browser.tabs.query(query))
      .filter((t) => t.status !== "loading" && t.status !== "complete")
      .sort((a, b) => (a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0));
    highlight(tabs);
  },
  Audible: async (info, tab) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        audible: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        audible: true,
      };
    }
    const tabs = (await browser.tabs.query(query)).sort((a, b) =>
      a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0
    );
    highlight(tabs);
  },
  "Auto Discardable": async (info, tab) => {
    let query;
    if (multipleHighlighted) {
      query = {
        hidden: false,
        currentWindow: true,
        highlighted: true,
        autodiscardable: true,
      };
    } else {
      query = {
        hidden: false,
        currentWindow: true,
        autodiscardable: true,
      };
    }
    const tabs = (await browser.tabs.query(query)).sort((a, b) =>
      a.id === tab.id ? -1 : b.id === tab.id ? 1 : 0
    );
    highlight(tabs);
  },
  UserScripts: async (info, tab) => {
    let store;
    try {
      store = await browser.storage.local.get("selectors");
    } catch (e) {
      console.error("access to script storage failed");
      return;
    }

    if (typeof store === "undefined") {
      console.error("script store is undefined");
    }

    if (typeof store.selectors === "undefined") {
      console.error("selectors are undefined");
    }

    if (typeof store.selectors.forEach !== "function") {
      console.error("selectors not iterable");
      return;
    }

    let query = {
      hidden: false,
      currentWindow: true,
      url: "<all_urls>",
    };
    if (multipleHighlighted) {
      query["highlighted"] = true;
    }

    const tabs = await browser.tabs.query(query);

    const tabsToHL = [];
    let hltab = false;
    for (const t of tabs) {
      hltab = false;

      for (const selector of store.selectors) {
        // check if enabled
        if (typeof selector.enabled === "boolean") {
          if (selector.enabled === true) {
            // check code
            if (typeof selector.code === "string") {
              if (selector.code !== "") {
                try {
                  //new Function(selector.code);
                  let res = await browser.tabs.executeScript(t.id, {
                    code:
                      `(function() {
                                const clkTab = {
                                    "id": ${tab.id},
                                    "url": "${tab.url}",
                                    "active": ${tab.active},
                                    "attention": ${tab.attention},
                                    "audible": ${tab.audible},
                                    "autoDiscardable": ${tab.autoDiscardable},
                                    "cookieStoreId": "${tab.cookieStoreId}",
                                    "discarded": ${tab.discarded},
                                    "favIconUrl": "${tab.favIconUrl}",
                                    "height": ${tab.height},
                                    "hidden": ${tab.hidden},
                                    "highlighted": ${tab.highlight},
                                    "incognito": ${tab.incognito},
                                    "index": ${tab.index},
                                    "isArticle": ${tab.isArticle},
                                    "isInReaderMode": ${tab.isInReaderMode},
                                    "lastAccessed": ${tab.lastAccessed},
                                    "openerTabId": ${tab.openerTabId},
                                    "pinned": ${tab.pinned},
                                    "sessionId": "${tab.sessionId}",
                                    "status": "${tab.status}",
                                    "successorTabId": ${tab.successorTabId},
                                    "title": "${tab.title}",
                                    "width": ${tab.width},
                                    "windowId": ${tab.windowId}
                                };
                                const cmpTab= {
                                    "id": ${t.id},
                                    "url": "${t.url}",
                                    "active": ${t.active},
                                    "attention": ${t.attention},
                                    "audible": ${t.audible},
                                    "autoDiscardable": ${t.autoDiscardable},
                                    "cookieStoreId": "${t.cookieStoreId}",
                                    "discarded": ${t.discarded},
                                    "favIconUrl": "${t.favIconUrl}",
                                    "height": ${t.height},
                                    "hidden": ${t.hidden},
                                    "highlighted": ${t.highlight},
                                    "incognito": ${t.incognito},
                                    "index": ${t.index},
                                    "isArticle": ${t.isArticle},
                                    "isInReaderMode": ${t.isInReaderMode},
                                    "lastAccessed": ${t.lastAccessed},
                                    "openerTabId": ${t.openerTabId},
                                    "pinned": ${t.pinned},
                                    "sessionId": "${t.sessionId}",
                                    "status": "${t.status}",
                                    "successorTabId": ${t.successorTabId},
                                    "title": "${t.title}",
                                    "width": ${t.width},
                                    "windowId": ${t.windowId}
                                };
                                ` +
                      selector.code +
                      "}());",
                  });
                  if (res.length > 0) {
                    res = res[0];
                  }
                  if (typeof res === "boolean" && res === true) {
                    hltab = true;
                  } else {
                    hltab = false;
                    break;
                  }
                } catch (e) {
                  console.error(e);
                }
              }
            }
          }
        }
      } // for selector
      if (hltab) {
        tabsToHL.push(t);
      }
    } // for tab

    highlight(tabsToHL);
  }, // onclick
};

browser.tabs.onHighlighted.addListener(handleHighlighted);

browser.menus.onClicked.addListener((info, tab) => {
  console.log(`onClicked ${info.menuItemId} clicked in tab ${tab.id}`);
  run[info.menuItemId](info, tab);
});

browser.commands.onCommand.addListener( async (command) => {
  const tab = await browser.tabs.query({currentWindow:true, active: true})[0];
  console.log(`onCommand ${command} clicked in tab ${tab.id}`);
  run[command](null, tab);
});

// EOF
