# Whybox

Whybox is an AI lab that turns any lesson into an interactive simulation that verifies itself before teaching.

A child takes a photo of a notebook page, a blackboard or a textbook, or simply asks a question. Whybox builds an experiment they can play with, showing what is normally invisible: electrons moving through a wire, the force that keeps a canoe afloat, light bending in water. Before the child sees it, an agent tests the simulation against the formulas of the lesson and fixes it if something is wrong.

## Why

In many schools, especially in Africa, kids learn science, math and technology without a lab and often without a textbook. They memorize formulas without seeing what they mean or how things really work, so many of them lose interest. Whybox gives every lesson a lab, on a single phone, even for a whole group of students.

## How it works

1. **Read** the lesson from a photo, a typed question or a spoken question.
2. **Generate** an interactive simulation as a single, offline, self-contained HTML file.
3. **Verify** it: the agent drives the simulation through a test interface, compares the measured values with the lesson's formulas and checks the rendering visually, then fixes it until it passes.
4. **Personalize**: the child predicts before observing, and when a misconception shows up, Whybox generates a new experiment targeted at it.

## Built with Meta models

| Task | Model |
| --- | --- |
| Reading lessons and generating simulations | Muse Spark |
| Visual verification of the simulations | Muse Wonder |
| Isolating diagrams and tracking objects in real experiments | SAM 3.1 |
| Spoken questions | Muse Voice Transcribe |
| Local illustrations | Muse Image |

## Project status

Built during the Meta Global AI Developer Hackathon (October 26 to November 4, 2026). Work in progress.

## Getting started

Requirements: Node.js 20 or later and a Meta Model API key.

```bash
cp .env.example .env
```

Set `MODEL_API_KEY` in `.env`, then run the generation spike:

```bash
npm run spike:generate -- --lesson "Electric current in a simple circuit"
```

## License

MIT
