// agentmaster.js
document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = 'sk-ec141616c6ce4a0eb0699f89da6ad538';
    const API_URL = 'https://api.deepseek.com/chat/completions';

    const chatWindow = document.getElementById('agent-chat-window');
    const collapseBtn = document.getElementById('agent-collapse-btn');
    const history = document.getElementById('agent-chat-history');
    const suggestions = document.querySelector('.agent-suggestions');
    const textarea = document.getElementById('agent-textarea');
    const submitBtn = document.getElementById('agent-submit-btn');

    let isChatActive = false;
    let messages = [
        { role: 'system', content: 'You are an advanced PzM assistant globally integrated into the UI. You are not DeepSeek' }
    ];

    // ── MathJax ──
    if (!window.MathJax) {
        window.MathJax = {
            tex: { inlineMath: [['$', '$'], ['\\(', '\\)']], displayMath: [['$$', '$$'], ['\\[', '\\]']] },
            svg: { fontCache: 'global' }
        };
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
        s.async = true;
        s.onload = () => window.MathJax?.typesetPromise?.([history]).catch(() => { });
        document.head.appendChild(s);
    }

    let mjBusy = false, mjLast = 0;
    function renderMath(el) {
        if (window.MathJax?.typesetPromise && !mjBusy && Date.now() - mjLast > 250) {
            mjBusy = true; mjLast = Date.now();
            window.MathJax.typesetPromise([el]).finally(() => { mjBusy = false; });
        }
    }

    // ── Markdown parser ──
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const inline = s => esc(s).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');

    function fmt(text) {
        if (!text) return '';
        const lines = text.split('\n');
        let html = '', inCode = false, inMath = false, buf = [];

        for (const line of lines) {
            const t = line.trim();

            // Code blocks
            if (t.startsWith('```')) {
                if (inCode) { html += `<pre><code>${esc(buf.join('\n'))}</code></pre>`; buf = []; }
                inCode = !inCode;
                continue;
            }
            if (inCode) { buf.push(line); continue; }

            // Math blocks
            if (!inMath && (t.startsWith('\\[') || t.startsWith('$$'))) {
                inMath = true; buf.push(line);
                if ((t.endsWith('\\]') || t.endsWith('$$')) && t.length > 2) {
                    html += `<div class="math-block">${buf.join('\n')}</div>`; buf = []; inMath = false;
                }
                continue;
            }
            if (inMath) {
                buf.push(line);
                if (t.endsWith('\\]') || t.endsWith('$$')) {
                    html += `<div class="math-block">${buf.join('\n')}</div>`; buf = []; inMath = false;
                }
                continue;
            }

            if (!t) continue;

            // Headings, lists, paragraphs
            if (t.startsWith('### ')) html += `<h3>${inline(t.slice(4))}</h3>`;
            else if (t.startsWith('## ')) html += `<h2>${inline(t.slice(3))}</h2>`;
            else if (t.startsWith('# ')) html += `<h1>${inline(t.slice(2))}</h1>`;
            else if (/^[-*] /.test(t)) html += `<ul><li>${inline(t.slice(2))}</li></ul>`;
            else html += `<p>${inline(line)}</p>`;
        }

        if (inCode) html += `<pre><code>${esc(buf.join('\n'))}</code></pre>`;
        if (inMath) html += `<div class="math-block">${buf.join('\n')}</div>`;
        return html.replace(/<\/ul><ul>/g, '');
    }

    // ── UI Events ──
    textarea.addEventListener('input', function () {
        this.style.height = '24px';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    textarea.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    });
    submitBtn.addEventListener('click', send);

    collapseBtn.addEventListener('click', () => {
        chatWindow.classList.remove('active');
        isChatActive = false;
        if (messages.length <= 1) suggestions.classList.remove('hidden');
    });
    textarea.addEventListener('focus', () => {
        if (!isChatActive && messages.length > 1) {
            chatWindow.classList.add('active');
            isChatActive = true;
            suggestions.classList.add('hidden');
        }
    });
    document.querySelectorAll('.agent-suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => { textarea.value = btn.textContent; send(); });
    });

    // ── Helpers ──
    const scrollDown = () => setTimeout(() => history.scrollTo({ top: history.scrollHeight, behavior: 'smooth' }), 10);

    function addMsg(role, text) {
        const d = document.createElement('div');
        d.className = `agent-msg agent-msg-${role}`;
        role === 'user' ? (d.textContent = text) : (d.innerHTML = fmt(text));
        history.appendChild(d);
        scrollDown();
        return d;
    }

    function showLoading() {
        const d = document.createElement('div');
        d.className = 'agent-msg agent-msg-ai agent-loading';
        d.innerHTML = '<div class="agent-dot"></div><div class="agent-dot"></div><div class="agent-dot"></div>';
        history.appendChild(d);
        scrollDown();
        return d;
    }

    // ── Send ──
    async function send() {
        const text = textarea.value.trim();
        if (!text) return;
        textarea.value = '';
        textarea.style.height = '24px';
        suggestions.classList.add('hidden');

        if (!isChatActive) { chatWindow.classList.add('active'); isChatActive = true; }

        addMsg('user', text);
        messages.push({ role: 'user', content: text });
        const loader = showLoading();

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
                body: JSON.stringify({ model: 'deepseek-v4-flash', messages, stream: true })
            });

            loader.remove();

            if (!res.ok) {
                console.error('API error:', await res.text());
                addMsg('ai', `**[Error]** Failed to connect to DeepSeek: ${res.status}`);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let reply = '', buf = '';
            const msgDiv = addMsg('ai', '');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split('\n');
                buf = lines.pop();

                for (const line of lines) {
                    const t = line.trim();
                    if (t.startsWith('data: ') && t !== 'data: [DONE]') {
                        try {
                            reply += JSON.parse(t.slice(6)).choices[0].delta.content || '';
                            msgDiv.innerHTML = fmt(reply) + '<span style="display:inline-block;width:6px;height:1em;vertical-align:middle;background:#8bffb9;border-radius:2px;margin-left:2px;animation:agentBounce 1s infinite alternate"></span>';
                            renderMath(msgDiv);
                            history.scrollTop = history.scrollHeight;
                        } catch { }
                    }
                }
            }

            msgDiv.innerHTML = fmt(reply);
            window.MathJax?.typesetPromise?.([msgDiv]);
            messages.push({ role: 'assistant', content: reply });

        } catch (err) {
            loader.remove();
            addMsg('ai', `**[Network Error]** ${err.message}`);
        }
    }
});
