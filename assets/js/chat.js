// chat.js — the floating "RehabVerve Care" chat: an AI assistant that knows the app, with a
// one-tap hand-over to customer care on WhatsApp. Replies come from the careChat Cloud Function.
(function () {
    'use strict';
    const RV = window.RV;
    const esc = RV.esc;
    const WA_NUMBER = '2348132912880';
    const WA = `https://wa.me/${WA_NUMBER}`;
    const STORE = 'rv-chat';
    const QUICK = [
        ['bx-search', 'Find a therapist near me'],
        ['bx-video', 'How does teletherapy work?'],
        ['bx-book-open', 'Classes for my child'],
        ['bx-user-plus', 'List my practice']
    ];

    let messages = [];
    try { messages = JSON.parse(sessionStorage.getItem(STORE) || '[]').slice(-30); } catch (e) { messages = []; }
    const save = () => { try { sessionStorage.setItem(STORE, JSON.stringify(messages.slice(-30))); } catch (e) { /* storage blocked */ } };
    let busy = false;

    /* ---------- markup ---------- */
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'chat-fab';
    fab.setAttribute('aria-label', 'Chat with RehabVerve Care');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = `<i class='bx bx-message-rounded-dots'></i>`;

    const panel = document.createElement('section');
    panel.className = 'chat-panel';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'RehabVerve Care chat');
    panel.innerHTML = `
        <header class="chat-head">
            <img src="assets/img/logo-96.png" width="38" height="38" alt="">
            <div class="chat-who"><strong>RehabVerve Care</strong><small><i></i>AI assistant · online</small></div>
            <a class="chat-icon wa" href="${WA}?text=${encodeURIComponent('Hello RehabVerve, I need help.')}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" title="WhatsApp customer care"><i class='bx bxl-whatsapp'></i></a>
            <button type="button" class="chat-icon" data-reset aria-label="New chat" title="New chat"><i class='bx bx-refresh'></i></button>
            <button type="button" class="chat-icon" data-close aria-label="Close chat"><i class='bx bx-x'></i></button>
        </header>
        <div class="chat-log" aria-live="polite"></div>
        <form class="chat-form" autocomplete="off">
            <textarea name="q" rows="1" maxlength="1000" placeholder="Ask anything about RehabVerve…" aria-label="Your message"></textarea>
            <button type="submit" class="chat-send" aria-label="Send"><i class='bx bxs-send'></i></button>
        </form>
        <p class="chat-note">AI can make mistakes. Emergency? Call <a href="tel:112">112</a>.</p>`;
    document.body.append(fab, panel);

    const log = panel.querySelector('.chat-log');
    const form = panel.querySelector('.chat-form');
    const input = form.q;

    /* ---------- rendering ---------- */
    // The assistant writes plain text with **bold**, "- " bullets and [label](link) links.
    // Only app screens (#/…) and our WhatsApp link become links; everything else stays text.
    const ROUTE = /^#\/[\w\-/]*(\?[^\s()<>"']*)?$/;
    const WA_LINK = new RegExp(`^https://wa\\.me/${WA_NUMBER}(\\?text=[^\\s()<>"']*)?$`);
    function linkHTML(label, url) {
        if (ROUTE.test(url)) return `<a class="chat-link" href="${esc(url)}"><i class='bx bx-right-arrow-circle'></i>${label}</a>`;
        if (WA_LINK.test(url)) return `<a class="chat-link wa" href="${esc(url)}" target="_blank" rel="noopener"><i class='bx bxl-whatsapp'></i>${label}</a>`;
        return label;
    }
    function format(text) {
        const lines = esc(String(text || '').trim()).split('\n');
        let html = '', list = false;
        lines.forEach(line => {
            let l = line
                .replace(/\[([^\]]{1,80})\]\(([^)\s]{1,400})\)/g, (m, label, url) => linkHTML(label, url.replace(/&amp;/g, '&')))
                .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
            const bullet = /^\s*(?:[-*•]|\d+[.)])\s+/.test(l);
            if (bullet) {
                if (!list) { html += '<ul>'; list = true; }
                html += `<li>${l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')}</li>`;
            } else {
                if (list) { html += '</ul>'; list = false; }
                if (l.trim()) html += `<p>${l}</p>`;
            }
        });
        if (list) html += '</ul>';
        return html;
    }

    function welcome() {
        return `<div class="chat-msg bot"><div class="bubble"><p><strong>Hi! 👋 I’m RehabVerve Care.</strong></p><p>I can help you find a therapist or center, book a session, enrol a child in a class or use any part of the app.</p></div></div>
            <div class="chat-quick">${QUICK.map(([icon, q]) => `<button type="button" data-q="${esc(q)}"><i class='bx ${icon}'></i>${esc(q)}</button>`).join('')}
            <a href="${WA}?text=${encodeURIComponent('Hello RehabVerve, I would like to speak to someone.')}" target="_blank" rel="noopener"><i class='bx bxl-whatsapp'></i>Talk to a person</a></div>`;
    }
    function draw() {
        log.innerHTML = welcome() + messages.map(m => `<div class="chat-msg ${m.role === 'user' ? 'me' : 'bot'}${m.error ? ' error' : ''}"><div class="bubble">${m.role === 'user' ? `<p>${esc(m.content)}</p>` : format(m.content)}</div></div>`).join('')
            + (busy ? `<div class="chat-msg bot"><div class="bubble typing"><span></span><span></span><span></span></div></div>` : '');
        log.scrollTop = log.scrollHeight;
    }

    /* ---------- talking to the assistant ---------- */
    async function ask(text) {
        const q = String(text || '').trim().slice(0, 1000);
        if (!q || busy) return;
        messages.push({ role: 'user', content: q });
        busy = true;
        draw();
        save();
        try {
            const fb = await RV.ready;
            if (!fb || !RV.loadSdk) throw new Error('offline');
            await RV.loadSdk(['functions']);
            if (!fb.functions) throw new Error('offline');
            const history = messages.filter(m => !m.error).slice(-12).map(m => ({ role: m.role, content: m.content }));
            const res = await fb.functions.httpsCallable('careChat', { timeout: 95000 })({ messages: history, page: (RV.route && RV.route.name) || 'home' });
            messages.push({ role: 'assistant', content: String((res.data && res.data.reply) || '').slice(0, 4000) || 'Sorry, I did not catch that. Could you rephrase?' });
        } catch (err) {
            // Show the server's own message when it sent one; "internal [0]" means it could not be reached
            const raw = String((err && err.message) || '');
            const msg = raw.replace(/ \[\d+\]$/, ''); // Firebase adds the HTTP status, e.g. " [429]"
            const own = msg && !/^(internal|INTERNAL|offline|not[ -]found)( \[\d+\])?$/.test(raw) && !/^(functions\/)?(unavailable|deadline-exceeded)$/.test(msg);
            messages.push({
                role: 'assistant', error: true,
                content: own ? `${msg}\n[Chat on WhatsApp](${WA})`
                    : `I can’t reply right now. Please try again, or [chat with our team on WhatsApp](${WA}).`
            });
        } finally {
            busy = false;
            save();
            draw();
        }
    }

    /* ---------- opening, closing and events ---------- */
    function open(on) {
        panel.hidden = !on;
        fab.setAttribute('aria-expanded', String(on));
        document.body.classList.toggle('chat-open', on);
        if (on) { draw(); setTimeout(() => input.focus(), 50); } else fab.focus({ preventScroll: true });
    }
    fab.addEventListener('click', () => open(panel.hidden));
    panel.querySelector('[data-close]').addEventListener('click', () => open(false));
    panel.querySelector('[data-reset]').addEventListener('click', () => { messages = []; save(); draw(); input.focus(); });
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') open(false); });
    panel.addEventListener('click', e => {
        const quick = e.target.closest('[data-q]');
        if (quick) { ask(quick.dataset.q); return; }
        // Opening a screen from the chat: on phones, step aside so the screen is visible
        const link = e.target.closest('a.chat-link:not(.wa)');
        if (link && window.innerWidth < 761) setTimeout(() => open(false), 0);
    });
    form.addEventListener('submit', e => {
        e.preventDefault();
        const q = input.value;
        input.value = '';
        input.style.height = '';
        ask(q);
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
    });
    input.addEventListener('input', () => { input.style.height = ''; input.style.height = Math.min(input.scrollHeight, 120) + 'px'; });

    // The admin console has its own AI tools, so the chat button stays out of its way
    document.addEventListener('rv:route', e => {
        const admin = e.detail && e.detail.name === 'admin';
        fab.hidden = admin;
        if (admin) open(false);
    });
    RV.openChat = (text) => { open(true); if (text) ask(text); };
})();
