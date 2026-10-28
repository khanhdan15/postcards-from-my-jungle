# Postcards from my jungle

**Website:** https://khanhdan15.github.io/postcards-from-my-jungle/

A slideshow of 16 fairy creatures from an imagined jungle. Each postcard has a picture, a phrase in their language (Liluvé), a translation and a sound.

## Images (image-generation.ipynb)

I trained a small diffusion model from zero in Colab (free T4), based on the class notebook. For data I used AFHQv2 animal faces (I wanted cats too, but the stream only gave wild ones: lions, tigers, foxes, wolves) and mixed in 800 butterflies so the creatures get wing colours.

I changed one thing at a time:

| | size | images | steps | min | loss | copying |
|---|---|---|---|---|---|---|
| A | 32 px | 1000 | 1000 | 3 | 0.096 | 0.417 |
| B | 64 px | 150 | 1200 | 11 | 0.072 | 0.410 |
| C | 64 px | 4800 | 1200 | 11 | 0.076 | 0.404 |
| final | 64 px | 4800 | 7200 | 65 | 0.060 | 0.420 |

32 px was fast but just blobs. 64 px looked like real animals. With only 150 images (B) the loss was low but the results were really close to the training photos, so it was kind of copying. For the final model I kept training C for 6000 more steps, then generated 50 images and upscaled them to 256 px.

## Language and sounds (sound-generation.ipynb)

The language comes from GPT-4.1 (OpenAI Responses API) with a structured prompt: a role, a sound system (only soft letters), grammar rules (verb first, -i for small things, -ō happy, -ū sleepy, -ē alarm) and an output schema. It gave me 16 creatures with a "voice" description each. That text went into Stable Audio Open 1.0 to make 16 sounds with different lengths (1.7 to 8.3 s).

## What could be better

The images are small and blurry, more training or a bigger GPU would help, and a better mix of animals. Some sounds are more wind or rain than animal, so I could make a few per creature and pick the best.

## AI tools

I used Claude (paid) to help me write the code and the website and to understand the steps.
