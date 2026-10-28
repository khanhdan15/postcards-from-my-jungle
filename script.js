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
    $("listen-label").textContent = "hear its song";
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
        $("listen-label").textContent = "it is singing…";
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
    $("postmark").textContent = `seen by the ${["old oak", "moss pond", "fern hollow", "moon stones", "willow"][currentImage % 5]} · no. ${currentImage + 1}`;
    $("number").textContent = `The ${ordinal(current + 1)} creature of sixteen`;
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

// ---------- drawing the forest ----------
// Each layer is an SVG strip of tree silhouettes: pointy firs and round, fluffy trees.
// Far layers are lighter and bluer (like mist), near layers are almost black.
const LAYER_COLOURS = { 4: "#4f7f84", 3: "#2f5c5a", 2: "#1b3a37", 1: "#0c1d1b" };

function random(seed) {             // small seeded random, so the forest looks the same every visit
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

function fir(x, base, h, w) {
    let d = "";
    const tiers = 4;
    for (let t = 0; t < tiers; t++) {
        const top = base - h + (t * h) / (tiers + 1);
        const bottom = top + h / (tiers - 0.5);
        const half = (w / 2) * ((t + 1.4) / (tiers + 0.4));
        d += `M${x} ${top} L${x + half} ${bottom} L${x - half} ${bottom} Z `;
    }
    return d + `M${x - w * 0.05} ${base - h * 0.2} h${w * 0.1} V${base} h${-w * 0.1} Z `;
}

function roundTree(x, base, h, w) {
    const r = w / 2;
    return `M${x - w * 0.06} ${base} V${base - h * 0.5} h${w * 0.12} V${base} Z ` +
        `M${x - r} ${base - h * 0.55} a${r} ${r * 0.9} 0 1 1 ${w} 0 a${r * 0.7} ${r * 0.5} 0 0 1 ${-w} 0 Z ` +
        `M${x - r * 0.6} ${base - h * 0.8} a${r * 0.7} ${r * 0.7} 0 1 1 ${r * 1.2} 0 Z `;
}

function drawLayer(div) {
    const depth = Number(div.dataset.depth);
    const rand = random(depth * 999);
    const W = 1600, H = 500;
    let d = `M0 ${H} `;
    // rolling ground
    for (let x = 0; x <= W; x += 100) d += `L${x} ${H - 30 - rand() * 30} `;
    d += `L${W} ${H} Z `;
    let x = -40;
    while (x < W + 40) {
        const h = H * (0.5 + rand() * 0.45);
        const w = 70 + rand() * 90 - depth * 8;
        d += rand() < 0.6 ? fir(x, H - 20, h, w) : roundTree(x, H - 20, h * 0.85, w * 1.2);
        x += w * (0.45 + rand() * 0.5);
    }
    div.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path fill="${LAYER_COLOURS[depth]}" d="${d}"/></svg>`;
}
document.querySelectorAll(".trees").forEach(drawLayer);

// gentle parallax: near trees move more than far ones
window.addEventListener("pointermove", (e) => {
    const dx = e.clientX / window.innerWidth - 0.5;
    const dy = e.clientY / window.innerHeight - 0.5;
    document.querySelectorAll(".trees").forEach((t) => {
        const s = (5 - Number(t.dataset.depth)) * 6;
        t.style.transform = `translate(${-dx * s}px, ${-dy * s * 0.3}px)`;
    });
});

// fireflies
const sky = document.querySelector(".fireflies");
for (let i = 0; i < 34; i++) {
    const f = el("span");
    f.style.left = `${Math.random() * 100}%`;
    f.style.top = `${30 + Math.random() * 68}%`;
    f.style.animationDelay = `${-Math.random() * 14}s, ${-Math.random() * 3.2}s`;
    f.style.animationDuration = `${10 + Math.random() * 10}s, ${2 + Math.random() * 3}s`;
    sky.appendChild(f);
}

fetch("creatures.json")
    .then((r) => r.json())
    .then(build)
    .catch(() => { $("name").textContent = "The forest is still asleep (creatures.json is missing)."; });
