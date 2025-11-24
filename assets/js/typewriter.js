function typewriter(el, text, options = {}) {
    const delay = options.delay ?? 60; // 每字符 60ms
    const loop = options.loop ?? false;
    const pauseAfter = options.pauseAfter ?? 1200; // 全文显示后停留时间
    let i = 0;
    el.textContent = "";
    function step() {
        if (i < text.length) {
            el.textContent += text[i++];
            setTimeout(step, delay);
        } else {
            el.classList.remove("caret-visible");

            if (loop) {
                setTimeout(() => {
                    el.textContent = "";
                    i = 0;
                    setTimeout(step, 300);
                }, pauseAfter);
            }
        }
    }
    step();
}

document.addEventListener("DOMContentLoaded", function () {
    const parent = document.querySelector(".home__image.animate-reveal");
    const el = document.querySelector(".typing-js");
    const text = "Welcome to the Code Island\nBeyond lines of code lies a journey :)";

    if (!el) return; 
    function showCaretAndStartTyping() {
        el.classList.add("caret-visible");
        const delayBeforeTyping = 120; 
        setTimeout(() => typewriter(el, text, { delay: 50 }), delayBeforeTyping);
    }

    if (!parent) {
        showCaretAndStartTyping();
        return;
    }

    const handler = (e) => {
         //if (e.animationName !== 'reveal-horizontal') return;
        showCaretAndStartTyping();
        parent.removeEventListener("animationend", handler);
    };
    parent.addEventListener("animationend", handler, { once: true });

    const maxWait = 3000; 
    setTimeout(() => {
        if (!el.classList.contains("caret-visible")) {
            showCaretAndStartTyping();
            parent.removeEventListener("animationend", handler);
        }
    }, maxWait);
});