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

function stopSound() {
    if (audio) { audio.pause(); audio.currentTime = 0; }
    $("listen").classList.remove("playing");
    $("listen-label").textContent = "listen";
}

function playSound() {
    const c = creatures[current];
    if (audio && !audio.paused) { stopSound(); return; }
    audio = new Audio(c.sound);
    audio.addEventListener("ended", stopSound);
    audio.play().then(() => {
        $("listen").classList.add("playing");
        $("listen-label").textContent = "listening…";
    }).catch(() => { $("listen-label").textContent = "tap again"; });
}

function show(k, imageIndex) {
    stopSound();
    current = (k + creatures.length) % creatures.length;
    const c = creatures[current];
    const images = imagesOf(current);
    currentImage = imageIndex ?? images[0];

    const card = $("postcard");
    card.classList.remove("flip"); void card.offsetWidth; card.classList.add("flip");   // replay the arrival animation

    $("main-image").src = imagePath(currentImage);
    $("main-image").alt = `${c.name}, an imagined jungle creature (sighting ${currentImage + 1} of ${IMAGE_COUNT})`;
    $("postmark").textContent = `sighting no. ${currentImage + 1}`;
    $("number").textContent = `postcard ${current + 1} of ${creatures.length}`;
    $("name").textContent = c.name;
    $("phrase").textContent = `“${c.phrase}”`;
    $("translation").textContent = c.translation;
    $("duration").textContent = `${Number(c.duration_s).toFixed(1)} s`;

    const sightings = $("sightings");
    sightings.replaceChildren(...images.map((i) => {
        const b = el("button", { type: "button", className: i === currentImage ? "current" : "", ariaLabel: `Show sighting ${i + 1}` });
        b.appendChild(el("img", { src: imagePath(i), alt: "", loading: "lazy" }));
        b.addEventListener("click", () => show(current, i));
        return b;
    }));

    document.querySelectorAll("#dots button").forEach((d, i) => d.classList.toggle("current", i === current));
    document.querySelectorAll("#album button").forEach((b, i) => b.classList.toggle("current", i === currentImage));
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

// Controls: arrows, keyboard, swipe
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
    playSound();            // the first sound plays right away, as a hello
});

// Sparkles
const sky = document.querySelector(".sparkles");
for (let i = 0; i < 26; i++) {
    const s = el("span");
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.animationDelay = `${-Math.random() * 9}s`;
    s.style.transform = `scale(${0.5 + Math.random()})`;
    sky.appendChild(s);
}

fetch("creatures.json")
    .then((r) => r.json())
    .then(build)
    .catch(() => { $("name").textContent = "The jungle is still sleeping (creatures.json is missing)."; });
