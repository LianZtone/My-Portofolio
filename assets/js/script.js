
(function () {
    'use strict';

    // Simple util
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // Canvas setup and resize handling with DPR scaling
    const canvas = document.getElementById('dc-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let DPR = Math.max(1, window.devicePixelRatio || 1);
    let width = 0, height = 0, area = 0;

    function resizeCanvas() {
        DPR = Math.max(1, window.devicePixelRatio || 1);
        width = Math.max(300, window.innerWidth);
        height = Math.max(300, window.innerHeight);
        area = width * height;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.width = Math.floor(width * DPR);
        canvas.height = Math.floor(height * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    // Particle system params — adaptive
    function computeCount() {
        // ~1 particle per 15k px area, clamped
        return clamp(Math.floor(area / 15000), 80, 1000);
    }

    // Star dot class (kept small and cheap)
    class StarDot {
        constructor() {
            this.reset(true);
        }
        reset(initial = false) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            // depth: 0 (near) .. 1 (far) - near are larger/brighter
            this.depth = Math.random();
            this.size = (0.8 + Math.random() * 1.8) * (1 - this.depth) * 1.6;
            this.speed = 6 + Math.random() * 18; // raw speed scalar
            // occasional gold sparkle
            this.isGold = Math.random() < 0.055; // ~5.5% chance
            if (initial) {
                // randomize z-position via y so spread feels natural
                this.y = Math.random() * height;
            }
            // small drift direction
            this.vx = (Math.random() - 0.5) * (0.2 + (1 - this.depth) * 0.6);
            this.vy = (Math.random() - 0.5) * 0.2;
            // life offset for twinkle
            this.phase = Math.random() * Math.PI * 2;
        }
        // update with dt (seconds) and a gentle forward motion
        update(dt, speedFactor, mouseInfluence) {
            // move slightly toward center (creating mild parallax illusion)
            const centerX = width * 0.5;
            const centerY = height * 0.5;
            const dx = (this.x - centerX) * 0.00005 * (1 - this.depth);
            const dy = (this.y - centerY) * 0.00005 * (1 - this.depth);

            // forward motion towards viewer simulated by scaling positions
            const forward = (speedFactor * (1.0 + (1 - this.depth) * 1.5)) * dt;
            // Move outward from center for mild swirling
            this.x += this.vx + dx + (mouseInfluence?.ax || 0) * (1 - this.depth) * 30 * dt;
            this.y += this.vy + dy + (mouseInfluence?.ay || 0) * (1 - this.depth) * 30 * dt;

            // subtle 'zoom' effect: shift towards center to simulate depth motion
            this.x += (centerX - this.x) * 0.0004 * forward;
            this.y += (centerY - this.y) * 0.0004 * forward;

            // twinkle phase advance
            this.phase += dt * 2.0;

            // wrap around edges (cheap)
            if (this.x < -30) this.x = width + 30;
            if (this.x > width + 30) this.x = -30;
            if (this.y < -30) this.y = height + 30;
            if (this.y > height + 30) this.y = -30;
        }
        draw(ctx, t) {
            // brightness oscillates for twinkle
            const tw = 0.6 + 0.4 * Math.sin(this.phase);
            const baseAlpha = clamp(0.2 + (1 - this.depth) * 0.75, 0.12, 1.0) * tw;
            const r = this.size;

            if (this.isGold && Math.random() < 0.04) {
                // occasional tiny golden flare
                ctx.beginPath();
                ctx.fillStyle = `rgba(227,179,65,${baseAlpha})`;
                ctx.arc(this.x, this.y, r * 1.6, 0, Math.PI * 2);
                ctx.fill();
            }

            // main star (soft)
            ctx.beginPath();
            // bluish–white center
            ctx.fillStyle = `rgba(234,242,255, ${baseAlpha})`;
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.fill();

            // slight outer glow (cheap)
            if (r > 1.1) {
                ctx.beginPath();
                ctx.fillStyle = `rgba(37,117,252, ${baseAlpha * 0.08})`;
                ctx.arc(this.x, this.y, r * 3.0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // system container
    let stars = [];
    let particleCount = 0;

    function rebuildParticles() {
        particleCount = computeCount();
        // If count grows, push new ones; if shrinks, slice
        if (stars.length < particleCount) {
            const add = particleCount - stars.length;
            for (let i = 0; i < add; i++) stars.push(new StarDot());
        } else if (stars.length > particleCount) {
            stars.length = particleCount;
        }
    }

    // Interactivity: track pointer for slight attraction
    const pointer = { x: null, y: null, ax: 0, ay: 0 };
    function onPointerMove(e) {
        const p = (e.touches ? e.touches[0] : e);
        pointer.x = p.clientX;
        pointer.y = p.clientY;
    }
    function onPointerLeave() {
        pointer.x = null; pointer.y = null;
    }

    // animation loop
    let last = performance.now();
    let running = true;
    function loop(now) {
        if (!running) {
            last = now;
            requestAnimationFrame(loop);
            return;
        }
        const dt = Math.min(0.05, (now - last) / 1000); // clamp large dt
        last = now;

        // clear with subtle fade for trailing effect
        ctx.clearRect(0, 0, width, height);
        // overlay slight vignette using a semi-transparent rectangle (cheap)
        ctx.fillStyle = 'rgba(4,6,12,0.12)';
        ctx.fillRect(0, 0, width, height);

        // speed slider based on area and a gentle base
        const baseSpeed = 0.6 + (area / (1400 * 1400)); // small increase on big screens
        const speedFactor = baseSpeed * 0.65;

        // compute mouse influence vector normalized
        const mouseInfluence = { ax: 0, ay: 0 };
        if (pointer.x !== null && pointer.y !== null) {
            const nx = (pointer.x / width - 0.5) * 2;
            const ny = (pointer.y / height - 0.5) * 2;
            // gentle influence; reduce on mobile
            mouseInfluence.ax = clamp(nx, -1, 1) * 0.5;
            mouseInfluence.ay = clamp(ny, -1, 1) * 0.5;
        }

        // draw stars
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            s.update(dt, speedFactor, mouseInfluence);
            s.draw(ctx, now);
        }

        requestAnimationFrame(loop);
    }

    // pause when tab hidden to save CPU
    document.addEventListener('visibilitychange', () => {
        running = document.visibilityState === 'visible';
    });

    // event listeners
    window.addEventListener('resize', () => {
        resizeCanvas();
        rebuildParticles();
    }, { passive: true });
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('mouseout', onPointerLeave, { passive: true });
    window.addEventListener('touchend', onPointerLeave, { passive: true });

    // initialize
    function init() {
        resizeCanvas();
        rebuildParticles();
        // pre-seed some randomness
        for (let i = 0; i < stars.length; i++) {
            // small jitter in reset to distribute nicely
            stars[i].x = Math.random() * width;
            stars[i].y = Math.random() * height;
        }
        last = performance.now();
        requestAnimationFrame(loop);
    }

    // set footer year if present
    try {
        const yearEl = document.getElementById('year');
        if (yearEl) yearEl.textContent = new Date().getFullYear();
    } catch (e) { /* silent */ }

    // start once DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

const textArray = ["Lian", "Seorang Pengembang", "Design Web", "Pembuat Ide"];
const typingElement = document.getElementById("typing");

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;

// efect typing
function typeEffect() {
    const currentText = textArray[textIndex];
    const speed = isDeleting ? 80 : 150;

    typingElement.textContent = currentText.substring(0, charIndex);

    if (!isDeleting && charIndex < currentText.length) {
        charIndex++;
    } else if (isDeleting && charIndex > 0) {
        charIndex--;
    } else if (!isDeleting && charIndex === currentText.length) {
        isDeleting = true;
        setTimeout(typeEffect, 1000);
        return;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % textArray.length;
    }

    setTimeout(typeEffect, speed);
}

typeEffect();

const title = document.getElementById('heroTitle');


title.addEventListener('mouseenter', () => {
    title.classList.add('shimmer');
});


title.addEventListener('animationend', () => {
    title.classList.remove('shimmer');
});

setInterval(() => {
    title.classList.toggle('shimmer');
}, 3000);

const cards = document.querySelectorAll('.motion');

const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            } else {
                entry.target.classList.remove('show');
            }
        });
    },
    {
        threshold: 0.3 
    }
);

cards.forEach(card => observer.observe(card));
