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

// ---------- sound ----------
function stopSound() {
    if (audio) { audio.pause(); audio.currentTime = 0; }
    $("listen").classList.remove("playing");
    $("ring").classList.remove("singing");
    $("listen-label").textContent = "listen";
}

function playSound() {
    const c = creatures[current];
    if (!c) return;
    if (audio && !audio.paused) { stopSound(); return; }
    audio = new Audio(c.sound);
    audio.addEventListener("ended", stopSound);
    audio.play().then(() => {
        $("listen").classList.add("playing");
        $("ring").classList.add("singing");
        $("listen-label").textContent = "singing…";
    }).catch(() => { $("listen-label").textContent = "tap again"; });
}

// ---------- one creature ----------
function show(k, imageIndex) {
    stopSound();
    current = (k + creatures.length) % creatures.length;
    const c = creatures[current];
    const images = imagesOf(current);
    currentImage = imageIndex ?? images[0];

    const card = $("postcard");
    card.classList.remove("flip"); void card.offsetWidth; card.classList.add("flip");   // replay the appear animation

    $("main-image").src = imagePath(currentImage);
    $("main-image").alt = `${c.name}, an imagined forest creature (sighting ${currentImage + 1} of ${IMAGE_COUNT})`;
    $("postmark").textContent = `spotted near the ${["big tree", "lily pond", "flower hill", "mushroom ring", "sunny rock"][currentImage % 5]} · #${currentImage + 1}`;
    $("number").textContent = `creature ${current + 1} of ${creatures.length}`;
    $("name").textContent = c.name;
    $("phrase").textContent = `“${c.phrase}”`;
    $("translation").textContent = c.translation;
    $("duration").textContent = `${Number(c.duration_s).toFixed(1)} s`;

    $("sightings").replaceChildren(...images.map((i) => {
        const b = el("button", { type: "button", className: i === currentImage ? "current" : "", ariaLabel: `Show sighting ${i + 1}` });
        b.appendChild(el("img", { src: imagePath(i), alt: "", loading: "lazy" }));
        b.addEventListener("click", () => show(current, i));
        return b;
    }));

    document.querySelectorAll("#dots button").forEach((d, i) => d.classList.toggle("current", i === current));
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
        const d = el("button", { type: "button", ariaLabel: c.name, title: c.name });
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
$("postcard").addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
$("postcard").addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
    touchX = null;
});

$("enter").addEventListener("click", () => {
    $("welcome").classList.add("gone");
    playSound();            // the first creature sings right away, as a hello
});

// ---------- drawing the meadow ----------
// Each layer is an SVG strip: a soft rolling hill with round, fluffy trees on it.
// Far layers are paler (like haze), near layers are brighter and greener, and the front one has flowers.
const LAYERS = {
    4: { hill: "#b9e6c9", tree: ["#9fd8c0", "#8ccdb9"], light: "#c9efdc", trees: 9 },
    3: { hill: "#a8dc72", tree: ["#5fbf8a", "#3aa6a0", "#7cc95a"], light: "#a8e6a0", trees: 7 },
    2: { hill: "#8cd05a", tree: ["#3f9a59", "#2f8f80", "#5cb85a"], light: "#8fdc7a", trees: 4 },
    1: { hill: "#c8ee5a", tree: [], light: "", trees: 0, flowers: 70 },
};

function random(seed) {             // small seeded random, so the meadow looks the same every visit
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function drawLayer(div) {
    const depth = Number(div.dataset.depth);
    const L = LAYERS[depth];
    const rand = random(depth * 777 + 3);
    const W = 1600, H = 500;
    let svg = "";

    // rolling hill made of smooth curves
    const top = H * (depth === 1 ? 0.45 : 0.55);
    let hill = `M0 ${H} L0 ${top} `;
    for (let x = 0; x < W; x += 400) {
        hill += `Q${x + 200} ${top - 40 - rand() * 90} ${x + 400} ${top + rand() * 30} `;
    }
    hill += `L${W} ${H} Z`;

    // round trees: a trunk and a few overlapping circles, with a lighter highlight
    for (let i = 0; i < L.trees; i++) {
        const x = (i + 0.2 + rand() * 0.6) * (W / L.trees);
        const r = 55 + rand() * 45 + (4 - depth) * 18;
        const base = top + 30;
        const cy = base - r * 1.5;
        const colour = L.tree[Math.floor(rand() * L.tree.length)];
        svg += `<rect x="${x - r * 0.1}" y="${cy}" width="${r * 0.2}" height="${base - cy + 20}" rx="${r * 0.1}" fill="#9a6b55"/>`;
        svg += `<g fill="${colour}"><circle cx="${x}" cy="${cy - r * 0.35}" r="${r * 0.8}"/>` +
            `<circle cx="${x - r * 0.6}" cy="${cy + r * 0.1}" r="${r * 0.65}"/>` +
            `<circle cx="${x + r * 0.6}" cy="${cy + r * 0.05}" r="${r * 0.7}"/></g>`;
        svg += `<circle cx="${x - r * 0.25}" cy="${cy - r * 0.6}" r="${r * 0.28}" fill="${L.light}" opacity="0.8"/>`;
    }
    svg += `<path d="${hill}" fill="${L.hill}"/>`;

    // little flowers in the front grass
    const colours = ["#ff7eb6", "#ffffff", "#ffe27a", "#7fcdf7"];
    for (let i = 0; i < (L.flowers || 0); i++) {
        const x = rand() * W, y = top + 50 + rand() * (H - top - 60);
        const c = colours[Math.floor(rand() * colours.length)];
        const s = 5 + rand() * 5;
        svg += `<g transform="translate(${x} ${y})"><circle r="${s}" cx="${s}" fill="${c}"/><circle r="${s}" cx="${-s}" fill="${c}"/>` +
            `<circle r="${s}" cy="${s}" fill="${c}"/><circle r="${s}" cy="${-s}" fill="${c}"/><circle r="${s * 0.7}" fill="#ffd24d"/></g>`;
    }
    div.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">${svg}</svg>`;
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
for (let i = 0; i < 26; i++) {
    const p = el("span", { className: ["", "", "yellow", "white"][i % 4] });
    p.style.left = `${Math.random() * 100}%`;
    p.style.animationDuration = `${12 + Math.random() * 14}s`;
    p.style.animationDelay = `${-Math.random() * 26}s`;
    p.style.transform = `scale(${0.7 + Math.random() * 0.8})`;
    air.appendChild(p);
}

fetch("creatures.json")
    .then((r) => r.json())
    .then(build)
    .catch(() => { $("name").textContent = "The meadow is still asleep (creatures.json is missing)."; });
