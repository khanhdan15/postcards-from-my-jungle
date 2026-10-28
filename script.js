// Postcards from my jungle
// 16 creatures (name, phrase, translation, sound) from creatures.json, and 50 images (images/beast_01.png ... beast_50.png).
// Image i belongs to creature i % 16, so every creature has 3 or 4 sightings and all 50 images are used.

const IMAGE_COUNT = 50;
const imagePath = (i) => `images/beast_${String(i + 1).padStart(2, "0")}.png`;

const $ = (id) => document.getElementById(id);
let creatures = [];
let current = 0;          // which creature is shown
let currentImage = 0;     // which image of that creature
let audio = null;

function imagesOf(k) {
    const list = [];
    for (let i = k; i < IMAGE_COUNT; i += creatures.length) list.push(i);
    return list;
}

function el(tag, attrs = {}, text) {
    const node = document.createElement(tag);
    Object.assign(node, attrs);
    if (text !== undefined) node.textContent = text;
    return node;
}

// ---------- sound: the record player ----------
// start-stop spins the record, the tonearm swings onto it, then the creature's sound plays.
function stopSound() {
    if (audio) { audio.pause(); audio.currentTime = 0; }
    $("deck").classList.remove("playing");
}

function playSound() {
    const c = creatures[current];
    if (!c) return;
    if (audio && !audio.paused) { stopSound(); return; }
    $("deck").classList.add("playing");
    audio = new Audio(c.sound);
    audio.volume = Number($("volume").value);
    audio.addEventListener("ended", () => setTimeout(stopSound, 600));   // let the record spin a moment after
    // wait for the arm to land on the record before the sound starts
    setTimeout(() => {
        if (!$("deck").classList.contains("playing")) return;
        audio.play().catch(() => stopSound());
    }, 900);
}
$("volume").addEventListener("input", () => { if (audio) audio.volume = Number($("volume").value); });

// collage positions: [left %, top %, width %, rotation]
const SPOTS = [[2, 2, 62, -6], [34, 10, 58, 5], [6, 44, 56, 3], [38, 50, 54, -4]];

// ---------- one creature = one record ----------
function show(k, imageIndex) {
    stopSound();
    current = (k + creatures.length) % creatures.length;
    const c = creatures[current];
    const images = imagesOf(current);
    currentImage = imageIndex ?? images[0];

    $("main-image").src = imagePath(currentImage);
    $("main-image").alt = `${c.name}, an imagined creature, on the record label`;
    $("postmark").textContent = `spotted near the ${["lily pond", "willow", "lotus bed", "mossy hill", "old pine"][currentImage % 5]}, #${currentImage + 1}`;
    $("number").textContent = `record ${current + 1} of ${creatures.length}`;
    $("name").textContent = c.name;
    $("phrase").textContent = `“${c.phrase}”`;
    $("translation").textContent = c.translation;
    $("duration").textContent = `${Number(c.duration_s).toFixed(1)} s song`;

    $("sightings").replaceChildren(...images.map((i, n) => {
        const [x, y, w, r] = SPOTS[n % SPOTS.length];
        const b = el("button", { type: "button", className: i === currentImage ? "current" : "", ariaLabel: `Put sighting ${i + 1} on the record` });
        b.style.cssText = `left:${x}%; top:${y}%; width:${w}%; aspect-ratio:1; --rest: rotate(${r}deg); transform: rotate(${r}deg); z-index:${i === currentImage ? 10 : n + 1}`;
        b.appendChild(el("img", { src: imagePath(i), alt: "", loading: "lazy" }));
        b.addEventListener("click", () => show(current, i));
        return b;
    }));

    document.querySelectorAll("#dots button").forEach((d, i) => d.classList.toggle("current", i === current));
    const pill = document.querySelectorAll("#dots button")[current];
    if (pill) pill.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    document.querySelectorAll("#album button").forEach((b, i) => b.classList.toggle("current", i === currentImage));
}

function ordinal(n) {
    const words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
        "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth"];
    return words[n - 1] || `${n}th`;
}

function build(data) {
    creatures = data.creatures;
    document.querySelectorAll(".lang-name").forEach((n) => { n.textContent = data.language; });

    $("dots").replaceChildren(...creatures.map((c, k) => {
        const d = el("button", { type: "button", ariaLabel: `Play the record of ${c.name}`, title: c.name });
        d.style.backgroundImage = `url(${imagePath(k)})`;
        d.appendChild(el("span", {}, c.name));
        d.addEventListener("click", () => show(k));
        return d;
    }));

    $("album").replaceChildren(...Array.from({ length: IMAGE_COUNT }, (_, i) => {
        const k = i % creatures.length;
        const b = el("button", { type: "button", title: creatures[k].name, ariaLabel: `${creatures[k].name}, sighting ${i + 1}` });
        b.appendChild(el("img", { src: imagePath(i), alt: "", loading: "lazy" }));
        b.addEventListener("click", () => { show(k, i); window.scrollTo({ top: 0, behavior: "smooth" }); });
        return b;
    }));

    $("dictionary").replaceChildren(...data.core_words.map((w) => {
        const div = el("div");
        div.append(el("dt", {}, w.word), el("dd", {}, w.meaning));
        return div;
    }));

    show(0);
}

// ---------- controls: arrows, keyboard, swipe ----------
$("prev").addEventListener("click", () => show(current - 1));
$("next").addEventListener("click", () => show(current + 1));
$("listen").addEventListener("click", playSound);
document.addEventListener("keydown", (e) => {
    if (!$("welcome").classList.contains("gone")) return;
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
    if (e.key === " " && e.target === document.body) { e.preventDefault(); playSound(); }
});
let touchX = null;
$("deck").addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
$("deck").addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));   // swipe the record player
    touchX = null;
});

$("enter").addEventListener("click", () => {
    $("welcome").classList.add("gone");
    playSound();            // the first creature sings right away, as a hello
});

// ---------- painting the landscape ----------
// Four SVG layers, each painted through the "paint" filter (wobbly edges + pigment grain, like watercolor):
// 4 = misty mountains with pink tips, 3 = far hill of small bushy trees, 2 = near hill of big bushy trees,
// 1 = the lily pond in front, with pads and pink lotus.
function random(seed) {             // small seeded random, so the landscape looks the same every visit
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}
const W = 1600;
const HEIGHTS = { 4: 500, 3: 500, 2: 500, 1: 320 };    // the pond strip is lower than the hills
let H = 500;

function hillPath(rand, top, bumps, height) {
    let d = `M0 ${H} L0 ${top} `;
    const step = W / bumps;
    for (let x = 0; x < W; x += step) d += `Q${x + step / 2} ${top - height * (0.4 + rand())} ${x + step} ${top + rand() * 20} `;
    return d + `L${W} ${H} Z`;
}

// a bushy storybook tree: a cluster of soft blobs, a lighter highlight, a thin hand-drawn outline
function bush(rand, x, base, r, colours, outline) {
    const c = colours[Math.floor(rand() * colours.length)];
    let blobs = "";
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        blobs += `<circle cx="${x + Math.cos(a) * r * 0.45}" cy="${base - r * 1.5 + Math.sin(a) * r * 0.4}" r="${r * (0.5 + rand() * 0.2)}"/>`;
    }
    blobs += `<circle cx="${x}" cy="${base - r * 1.6}" r="${r * 0.65}"/>`;
    let g = `<rect x="${x - r * 0.07}" y="${base - r * 1.1}" width="${r * 0.14}" height="${r * 1.2}" fill="#8a6a55"/>`;
    g += `<g fill="${c}" stroke="${outline}" stroke-width="2.2">${blobs}</g>`;
    g += `<g fill="#fff" opacity="0.28"><circle cx="${x - r * 0.3}" cy="${base - r * 1.95}" r="${r * 0.32}"/></g>`;
    if (rand() < 0.35) {             // some trees have flowers or fruit dots
        const dot = rand() < 0.5 ? "#f7b6cf" : "#fff6d8";
        for (let i = 0; i < 6; i++) g += `<circle cx="${x + (rand() - 0.5) * r * 1.4}" cy="${base - r * (1.2 + rand() * 0.8)}" r="${r * 0.07}" fill="${dot}"/>`;
    }
    return g;
}

const PAINTERS = {
    4(rand) {           // mountains
        let d = `M0 ${H} L0 ${H * 0.55} `, snow = "";
        const peaks = [[220, 0.22], [560, 0.34], [900, 0.16], [1250, 0.3], [1520, 0.24]];
        peaks.forEach(([px, py], i) => {
            const y = H * py, prev = i === 0 ? 0 : peaks[i - 1][0];
            d += `Q${(prev + px) / 2} ${H * 0.5} ${px} ${y} `;
            snow += `<path d="M${px - 60} ${y + 42} Q${px - 25} ${y + 18} ${px} ${y} Q${px + 30} ${y + 22} ${px + 70} ${y + 48} Q${px} ${y + 34} ${px - 60} ${y + 42}Z" fill="#f4c7d8" opacity="0.9"/>`;
        });
        d += `Q1580 ${H * 0.45} ${W} ${H * 0.5} L${W} ${H} Z`;
        return `<path d="${d}" fill="#8fb9b8"/>${snow}<path d="${hillPath(rand, H * 0.72, 5, 30)}" fill="#a9cfb7" opacity="0.8"/>`;
    },
    3(rand) {           // far hill with many small trees
        let g = "";
        for (let i = 0; i < 22; i++) g += bush(rand, (i + rand()) * (W / 22), H * 0.5 + rand() * 30, 26 + rand() * 14, ["#9cc98a", "#86bd84", "#b3d68e", "#7fb59a"], "#5e9670");
        return `${g}<path d="${hillPath(rand, H * 0.52, 4, 40)}" fill="#b8da8f"/>`;
    },
    2(rand) {           // near hill with big trees
        let g = "";
        for (let i = 0; i < 9; i++) g += bush(rand, (i + 0.1 + rand() * 0.8) * (W / 9), H * 0.48 + rand() * 40, 60 + rand() * 30, ["#5f9e62", "#4f9a7a", "#78b35c", "#3f8a64"], "#2f6b4e");
        return `${g}<path d="${hillPath(rand, H * 0.5, 3, 30)}" fill="#8cc276"/>`;
    },
    1(rand) {           // lily pond
        let g = `<path d="M0 ${H * 0.22} Q400 ${H * 0.14} 800 ${H * 0.2} T${W} ${H * 0.18} L${W} ${H} L0 ${H} Z" fill="#4e9a95"/>`;
        g += `<path d="M0 ${H * 0.22} Q400 ${H * 0.14} 800 ${H * 0.2} T${W} ${H * 0.18} L${W} ${H * 0.32} Q800 ${H * 0.36} 0 ${H * 0.3} Z" fill="#7dbcb0" opacity="0.8"/>`;
        for (let i = 0; i < 14; i++) {      // light ripples
            const x = rand() * W, y = H * (0.35 + rand() * 0.6);
            g += `<path d="M${x} ${y} q40 -6 80 0" stroke="#cfe9e1" stroke-width="3" fill="none" opacity="0.7"/>`;
        }
        for (let i = 0; i < 46; i++) {      // lily pads
            const x = rand() * W, y = H * (0.3 + rand() * 0.68), rx = 22 + rand() * 30 + (y / H) * 30, ry = rx * 0.38;
            const fill = ["#6fae68", "#5c9f62", "#86bf72", "#4f9160"][Math.floor(rand() * 4)];
            g += `<path d="M${x - rx} ${y} a${rx} ${ry} 0 1 0 ${rx * 2} 0 a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z M${x} ${y} L${x + rx} ${y - ry * 0.4} L${x + rx} ${y + ry * 0.3}Z" fill="${fill}" fill-rule="evenodd" stroke="#3d7a52" stroke-width="1.5"/>`;
        }
        for (let i = 0; i < 16; i++) {      // lotus flowers
            const x = rand() * W, y = H * (0.32 + rand() * 0.62), s = 0.7 + rand() * 0.9;
            g += `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 C-14 -8 -18 -16 -16 -22 C-8 -18 -2 -10 0 0Z" fill="#ef8fb5"/>` +
                `<path d="M0 0 C14 -8 18 -16 16 -22 C8 -18 2 -10 0 0Z" fill="#ef8fb5"/>` +
                `<path d="M0 0 C-6 -12 -4 -22 0 -28 C4 -22 6 -12 0 0Z" fill="#f7b6cf"/></g>`;
        }
        return g;
    },
};

function drawLayer(div) {
    const depth = Number(div.dataset.depth);
    const rand = random(depth * 777 + 5);
    H = HEIGHTS[depth];
    div.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice"><g filter="url(#paint)">${PAINTERS[depth](rand)}</g></svg>`;
}
document.querySelectorAll(".trees").forEach(drawLayer);

// gentle parallax: near hills move more than far ones
window.addEventListener("pointermove", (e) => {
    const dx = e.clientX / window.innerWidth - 0.5;
    const dy = e.clientY / window.innerHeight - 0.5;
    document.querySelectorAll(".trees").forEach((t) => {
        const s = (5 - Number(t.dataset.depth)) * 6;
        t.style.transform = `translate(${-dx * s}px, ${-dy * s * 0.3}px)`;
    });
});

// falling petals
const air = document.querySelector(".petals");
for (let i = 0; i < 18; i++) {
    const p = el("span", { className: ["", "", "", "white"][i % 4] });
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDuration = `${12 + Math.random() * 14}s`;
    p.style.animationDelay = `${-Math.random() * 26}s`;
    p.style.transform = `scale(${0.7 + Math.random() * 0.8})`;
    air.appendChild(p);
}

fetch("creatures.json")
    .then((r) => r.json())
    .then(build)
    .catch(() => { $("name").textContent = "The pond is still asleep (creatures.json is missing)."; });
