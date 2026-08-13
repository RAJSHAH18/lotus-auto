// injected.js – Direct API bets for lotusbook.cc (Fancy & Normal, betDelay=0)
(function() {
    'use strict';

    // --- Toggle flag (set by content.js) ---
    if (window.__betEngineActive === false) {
        console.log('[BetEngine] Disabled – refresh to fully reset.');
        return;
    }

    let STAKE = parseInt(localStorage.getItem('mangoStake'), 10) || 100;

    // --- Toast function (sends message to content.js) ---
    function showToast(msg, success = true) {
        window.postMessage({ type: 'MANGO_TOAST', message: msg, success }, '*');
    }

    // --- Get memberCode ---
    function getMemberCode() {
        const profileRaw = localStorage.getItem("userProfileDetails");
        if (profileRaw) {
            try {
                const profile = JSON.parse(profileRaw);
                if (profile.MEMBER_CODE) return profile.MEMBER_CODE;
            } catch(e) {}
        }
        const tokenRaw = localStorage.getItem("ROYAL_TOKEN");
        if (tokenRaw) {
            try {
                const token = tokenRaw.replace(/^"|"$/g, '');
                const parts = token.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(atob(parts[1]));
                    return payload.memberCode || payload.member_code || payload.sub || null;
                }
            } catch(e) {}
        }
        return null;
    }

    document.addEventListener('click', async function(e) {
        if (window.__betEngineActive === false) return;

        const oddButton = e.target.closest('button[data-odd-type]');
        if (!oddButton) return;

        e.stopImmediatePropagation();
        e.stopPropagation();
        e.preventDefault();

        // --- Extract marketData and runnerData from React fiber ---
        let marketData = null, runnerData = null;
        let target = oddButton;
        while (target && target !== document.body) {
            const key = Object.keys(target).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$'));
            if (key && target[key]) {
                let fiber = target[key];
                let depth = 0;
                while (fiber && depth < 30) {
                    const props = fiber.memoizedProps || fiber.pendingProps;
                    if (props) {
                        if (props.market || props.marketData) marketData = props.market || props.marketData;
                        if (props.runner) runnerData = props.runner;
                    }
                    fiber = fiber.return;
                    depth++;
                }
            }
            if (marketData && runnerData) break;
            target = target.parentElement;
        }

        if (!marketData || !runnerData) {
            showToast('Failed to extract market data.', false);
            console.error("❌ Market or Runner data not found.");
            return;
        }

        // --- Detect FANCY market ---
        const isFancy = 
            marketData.isFancy === true ||
            marketData.btype === "LINE" ||
            marketData.oddsType === "HAAR_JEET" ||
            (marketData.mtype && marketData.mtype.toUpperCase().includes("SESSION")) ||
            (runnerData.line !== null && runnerData.line !== undefined);

        console.log("✅ Market Data:", marketData);
        console.log("✅ Runner Data:", runnerData);
        console.log("✅ isFancy (detected):", isFancy);

        const oddType = oddButton.getAttribute('data-odd-type')?.toUpperCase();
        const sideVal = (oddType === "BACK") ? 0 : 1;
        const priceVal = Number(oddButton.getAttribute('data-price') || 0);
        const fixedStake = STAKE;

        // --- Build payload (Fancy vs Normal, betDelay = 0) ---
        let price, line;
        if (isFancy) {
            price = 100;               // fancy market price is always 100
            line = priceVal;           // the run value
        } else {
            price = priceVal;          // normal odds
            line = null;
        }

        const orderItem = {
            side: sideVal,
            price: price,
            selectionId: Number(runnerData.id),
            btype: marketData.btype || "ODDS",
            oddsType: marketData.oddsType !== undefined ? marketData.oddsType : null,
            eventTypeId: String(marketData.eventTypeId || "4"),
            marketId: String(marketData.id),
            totalSize: fixedStake,
            betSlipRef: 0,
            fromOneClick: 0,
            betDelay: 0,
            line: line,
            runner: runnerData.name
        };

        console.log("📦 [Payload]:", JSON.stringify([orderItem], null, 2));

        const memberCode = getMemberCode();
        if (!memberCode) {
            showToast('Member code not found. Please re-login.', false);
            return;
        }

        const authToken = localStorage.getItem("ROYAL_TOKEN")?.replace(/^"|"$/g, '') || "";
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json, text/plain, */*',
            'x-app-version': '4.0.19.2',
            'x-client': 'mobile',
            'x-client-id': '451012928.1605029998',
            'x-client-info': 'e883e9a15db99de2fdd0579c576a0693',
            'x-log-timing': 'true',
            'x-xid': '6b76ff17-70d2-b5fe-2373-08f62ee312af',
            'x-user-id': memberCode,
            'Authorization': authToken
        };

        try {
            const res = await fetch('https://b2b.max247.co/api/exchange/order', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify([orderItem])
            });

            const text = await res.text();
            try {
                const json = JSON.parse(text);
                console.log("✅ [Order Response]:", json);

                if (json.success) {
                    showToast('Bet placed successfully', true);
                } else {
                    // --- EXACT ERROR PARSING FROM THE SITE'S SOURCE (57019) ---
                    let errorMsg = 'Something went wrong';
                    try {
                        const nested = json.error?.details?.error?.[0]?.[0]?.description;
                        if (nested) {
                            errorMsg = nested;
                        } else if (json.error?.message && typeof json.error.message === 'string') {
                            errorMsg = json.error.message;
                        } else if (json.error?.details?.message) {
                            errorMsg = json.error.details.message;
                        } else if (json.error?.code) {
                            errorMsg = `Error: ${json.error.code}`;
                        }
                    } catch (e) {}
                    showToast(errorMsg, false);
                }
            } catch (parseErr) {
                console.error("❌ Invalid JSON:", text);
                showToast('Server returned invalid response.', false);
            }
        } catch (err) {
            console.error("❌ Network error:", err);
            showToast('Network error – bet not placed.', false);
        }
    }, true);

    // --- Stake update from widget ---
    document.addEventListener('updateStake', (e) => {
        STAKE = parseInt(e.detail.stake, 10) || 100;
        console.log('[BetEngine] Stake updated to', STAKE);
    });

    console.log("⚡ Engine active (betDelay: 0, exact error toast).");
})();