/* global browser */

/*
function onChange(evt) {

	let id = evt.target.id;
	let el = document.getElementById(id);

	let value = ( (el.type === 'checkbox') ? el.checked : el.value)
	let obj = {}

	//console.log(id,value, el.type,el.min);
	if(value === ""){
		return;
	}
	if(el.type === 'number'){
		try {
			value = parseInt(value);
			if(isNaN(value)){
				value = el.min;
			}
			if(value < el.min) {
				value = el.min;
			}
		}catch(e){
			value = el.min
		}
	}

	obj[id] = value;

	console.log(id,value);
	browser.storage.local.set(obj).catch(console.error);

}
*/

/*
[ "accessTimeMax", "accessTimeMin" ].map( (id) => {

	browser.storage.local.get(id).then( (obj) => {

		let el = document.getElementById(id);
		let val = obj[id];

        //console.log(id, val);

		if(typeof val !== 'undefined') {
			if(el.type === 'checkbox') {
				el.checked = val;
			}
			else{
				el.value = val;
			}
		}

	}).catch(console.error);

	let el = document.getElementById(id);
	el.addEventListener('input', onChange);
});
*/

async function onSubmitTime(){

    let queryBase = {currentWindow:true, hidden:false};
    let queryHL = queryBase;
    queryHL['highlighted'] = true;
    let tabs = await browser.tabs.query(queryHL);

    //console.log(tabs.length);
    // work on all tabs if there are none selected
    if(tabs.length === 1){
        tabs = await browser.tabs.query({currentWindow:true, hidden:false});
    }
    //console.log(tabs.length);


	const accessTimeMin = document.getElementById('accessTimeMin').value * 60 * 1000;
	const accessTimeMax = document.getElementById('accessTimeMax').value * 60 * 1000;

    //console.log(accessTimeMin, accessTimeMax);
    const now = Date.now();
    const hltabIdxs = [];
    for(const t of tabs){
        const lastAccessDiff = (now - t.lastAccessed);
            console.log(lastAccessDiff, accessTimeMin, accessTimeMax, t.url);
        if(
            lastAccessDiff >= accessTimeMin &&  lastAccessDiff <= accessTimeMax
        ){
            //console.log(t.url, " last accessed ", lastAccessDiff/1000/60, " minutes ago");
            hltabIdxs.push(t.index);
            //console.log(t.index);
        }
    }

    if(hltabIdxs.length > 0){
        document.getElementById('message').innerText =  "selected matched tabs";
    browser.tabs.highlight({
			windowId: tabs[0].windowId,
			tabs: hltabIdxs,
			populate: false
    });
    }else{
    //
        document.getElementById('message').innerText = "no match selection unchanged";
    }

}

document.getElementById("submitTime").addEventListener('click', onSubmitTime);

