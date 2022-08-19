/* global browser */

let allTabs = [];
let tempListEmpty = false; // needs a checkbox menu entry

const queryBase = {
    currentWindow: true,
    hidden: false
}

function highlightTabsByWindowId(winId2tabIdxMap){
	winId2tabIdxMap.forEach( (value, key /*,map*/) => {
		browser.tabs.highlight({
			windowId: key,
			tabs: [...value], // convert from Set to array
			populate: false
		});
	});
}

function highlight(tabs){
	let winId2tabIdxMap = new Map();
	tabs.forEach( t => {
		if(!winId2tabIdxMap.has(t.windowId)){
			winId2tabIdxMap.set(t.windowId, []);
		}
		winId2tabIdxMap.get(t.windowId).push(t.index);
	});
	highlightTabsByWindowId(winId2tabIdxMap);
}

function getDecendentTabs(ancestorTabId, max_relation_depth = -1) {
	let out =  [];
	for (const t of allTabs) {
		// ref. openerTabId is only present if the opener tab
		// still exists and is in the same window.
		if(t.openerTabId === ancestorTabId) {
			out.push(t);
            if(max_relation_depth !== 1){
                const tmp = getDecendentTabs(t.id, (max_relation_depth-1));
                out = [ ...out, ...tmp];
            }
		}
	}
	return out;
}

async function getAncestorTabs(ancestorTabId, tabs, max_relation_depth = -1) {
    let out = [];
    const tabId2tabMap = new Map();
    tabs.forEach( t => { tabId2tabMap.set(t.id, t); });

    let ancestorTab = await browser.tabs.get(ancestorTabId);
    out.push(ancestorTab);

    let tmp;

    while(      typeof ancestorTab.openerTabId === 'number'
            &&  max_relation_depth !== 1
            && tabId2tabMap.has(ancestorTab.openerTabId)
    ){
        tmp = tabId2tabMap.get(ancestorTab.openerTabId)
        out.push(tmp);
        ancestorTab = tmp;
    }
    return out;

}

// -------------

browser.menus.create({
	title: "Invert Selection",
	contexts: ["tab"],
	onclick: async (/*info, tab*/) => {
        // Previously highlighted tabs not included in tabs will stop being highlighted. The first tab in tabs will become active.
        // ref. https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabs/highlight
        let query = queryBase;
            query['highlighted'] = false;
        const tabs = await browser.tabs.query(query);
		highlight(tabs);
	}
});

browser.menus.create({
	id: "Directional",
    title: "Directional",
    type: "separator",
	contexts: ["tab"]
});

browser.menus.create({
	id: "Relationship",
    title: "Relationship",
    type: "separator",
	contexts: ["tab"]
});

browser.menus.create({
	id: "URL Property",
    title: "URL Property",
    type: "separator",
	contexts: ["tab"]
});

browser.menus.create({
	id: "State",
    title: "State",
    type: "separator",
	contexts: ["tab"]
});
browser.menus.create({
	id: "Last Access Time",
    title: "Last Access Time",
    type: "separator",
	contexts: ["tab"]
});

browser.menus.create({
	title: "Same Container",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        if(tab.cookieStoreId){
            let query = queryBase;
                query['cookieStoreId'] = tab.cookieStoreId;
    		const tabs = (await browser.tabs.query(query))
                // order clicked tabs to the front
                .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
    		highlight(tabs);
        }
	}
});

// Relationship

browser.menus.create({
	title: "Decendents",
    parentId: "Relationship",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		allTabs  = await browser.tabs.query(query);
		highlight(getDecendentTabs(tab.id));
	}
});

browser.menus.create({
	title: "Siblings",
    parentId: "Relationship",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		allTabs  = await browser.tabs.query(query);
		highlight(getDecendentTabs(tab.openerTabId, 1));
	}
});

browser.menus.create({
	title: "Siblings + Descendants",
    parentId: "Relationship",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		allTabs  = await browser.tabs.query(query);
		highlight(getDecendentTabs(tab.openerTabId));
	}
});

browser.menus.create({
	title: "Children",
    parentId: "Relationship",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		allTabs  = await browser.tabs.query(query);
		highlight(getDecendentTabs(tab.id, 1));
	}
});

browser.menus.create({
	title: "Parent",
    parentId: "Relationship",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = (await browser.tabs.query(query))
            .filter( t => { t.id === tab.openerTabId });
        highlight(tabs);
	}
});


browser.menus.create({
	title: "Ancestors",
    parentId: "Relationship",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = await browser.tabs.query(query);
        highlight ( await getAncestorTabs(tab.id,tabs, -1) );
	}
});

// URL (can be done by Userscript too )

browser.menus.create({
	title: "Same Origin",
    parentId: "URL Property",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
            query['url'] = (new URL(tab.url)).origin + "/*";
		const tabs = await browser.tabs.query(query);
		highlight(tabs);
	}
});

browser.menus.create({
	title: "Same Domain",
    parentId: "URL Property",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
            query['url'] = "*://" + (new URL(tab.url)).hostname + "/*";
		const tabs = (await browser.tabs.query(query))
            .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
		highlight(tabs);
	}
});

browser.menus.create({
	title: "Same Port",
    parentId: "URL Property",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
            query['url'] =  "*://*:" + (new URL(tab.url)).port+ "/*";
		const tabs = (await browser.tabs.query(query))
            .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
		highlight(tabs);
	}
});

browser.menus.create({
	title: "Same Protocol",
    parentId: "URL Property",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
            query['url'] = (new URL(tab.url)).protocol + "//*/*";
		const tabs = (await browser.tabs.query(query))
            .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
		highlight(tabs);
	}
});

// Positional

browser.menus.create({
	title: "To the Left",
    parentId: "Directional",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = (await browser.tabs.query(query))
            .filter( t => { return (t.index < tab.index); })
            .sort((a,b) => b.index - a.index );
		highlight(tabs);
	}
});

browser.menus.create({
	title: "To the Right",
    parentId: "Directional",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = (await browser.tabs.query(query))
            .filter( t => { return (t.index > tab.index); })
            .sort((a,b) => a.index - b.index );
		highlight(tabs);
	}
});

//

browser.menus.create({
	title: "Muted",
    parentId: "State",
	contexts: ["tab"],
	onclick: async (/*info, tab*/) => {
        let query = queryBase;
            query['muted'] = true;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = await browser.tabs.query(query);
		highlight(tabs);
	}
});


browser.menus.create({
	title: "Loading",
    parentId: "State",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = (await browser.tabs.query(query))
            .filter( t => t.status === "loading" )
            .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
		highlight(tabs);
	}
});

browser.menus.create({
	title: "Complete",
    parentId: "State",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = (await browser.tabs.query(query))
            .filter( t => t.status === "complete" )
            .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
		highlight(tabs);
	}
});

browser.menus.create({
	title: "Undefined",
    parentId: "State",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = (await browser.tabs.query(query))
            .filter( t => (t.status !== "loading" && t.status !== 'complete') )
            .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
		highlight(tabs);
	}
});

browser.menus.create({
	title: "Audible",
    parentId: "State",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
            query['audible'] = true;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = (await browser.tabs.query(query))
            .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
		highlight(tabs);
	}
});

browser.menus.create({
	title: "Auto Discardable",
    parentId: "State",
	contexts: ["tab"],
	onclick: async (info, tab) => {
        let query = queryBase;
            query['autodiscardable'] = true;
        if(tempListEmpty){
            query['highlighted'] = true;
        }
		const tabs = (await browser.tabs.query(query))
            .sort((a,b) => ((a.id === tab.id) ? -1 : ((b.id === tab.id) ? 1 : 0) ) );
		highlight(tabs);
	}
});

browser.menus.create({
	title: "UserScripts",
	contexts: ["tab"],
	onclick: async (info, tab) => {

        let store;
        try {
            store = await browser.storage.local.get('selectors');
        }catch(e){
            console.error('access to script storage failed');
            return;
        }

        if(typeof store === 'undefined') {
            console.error('script store is undefined');
        }

        if(typeof store.selectors === 'undefined') {
             console.error('selectors are undefined');
        }

        if ( typeof store.selectors.forEach !== 'function' ) {
            console.error('selectors not iterable');
            return;
        }

        const query = queryBase;
              query['url'] = '<all_urls>';
		const tabs = (await browser.tabs.query(query))
        const tabsToHL = [];
        let hltab  = false;
        for(const t of tabs) {
            hltab = false;

            for (const selector of store.selectors) {

                // check if enabled
                if(typeof selector.enabled === 'boolean') {
                if(selector.enabled === true) {

                // check code
                if ( typeof selector.code === 'string' ) {
                if ( selector.code !== '' ) {

                try {
                    //new Function(selector.code);
                    let res = await browser.tabs.executeScript(t.id, {
                        code: selector.code
                    });
                    //console.log(tab.title, res[0]);
                    if(res.length > 0){
                        res = res[0];
                    }
                    if(typeof res === 'boolean' && res === true){
                        hltab = true;
                    }else{
                        hltab = false;
                        break;
                    }

                }catch(e){
                    console.error(e);
                }
                }
                }
                }
                }

            } // for selector
            if(hltab){
                tabsToHL.push(t);
            }

        } // for tab

		highlight(tabsToHL);

	} // onclick
});

// EOF
