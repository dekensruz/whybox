# Whybox

**A lab in every pocket.** Whybox turns any lesson (a photo of a notebook page, a blackboard, a typed or spoken question) into an interactive experiment a child explores with their own hands, with a tutor who explains every step out loud.

Live app: [whybox-app.vercel.app](https://whybox-app.vercel.app)

## Why

In many schools, especially in Africa, children learn science without a textbook and without a lab. They copy the lesson, memorize it, and never see it work. Whybox was built in Goma, in eastern DR Congo, to give every lesson an experiment, on a single phone.

## What a lesson looks like

1. **Ask.** Photograph a notebook page or a blackboard, type a question, or ask it out loud.
2. **Guess first.** Before seeing anything, the child predicts what will happen, and gets a clear verdict.
3. **Play to find out.** Every step of the tour is a challenge: the child drags the objects in the scene (the battery, the rope, the Sun) until they find the answer, and wins up to three stars.
4. **Test a wrong idea.** A wrong prediction gets its own short experiment, built against that idea.
5. **Name it, practise it.** Key words come after the discovery, illustrated with scenes from the child's daily life, then an exercise on a new situation, answered by typing, choosing or speaking, and corrected kindly.
6. **Missions.** Extra levels played in the same experiment.
7. **Do it for real.** For physics lessons, the child films a real experiment at home (a ball that falls, a pendulum) and Whybox measures it and compares it with the lesson.

Throughout, a **3D tutor** reads every card aloud with a natural voice, gestures and celebrates, and can be turned off.

## Made for each child

- Lessons adapt to the learner's level, country, interests and the subjects they find hard.
- A learner memory keeps recent lessons and wrong ideas, and makes the next lessons simpler or deeper.
- The dashboard suggests what to learn next: lessons to review, to go further, and to discover.
- Progress: points and levels, days in a row, stars, mastery per subject, and badges.
- Two kinds of experiments: **quantities** (science, math, technology) and **situations** (speaking in public, everyday life), where people in the scene react to the child's choices, with no invented numbers.
- Lessons in French and in English for now; the interface in both languages.
- Safety: medical, war or political questions are kindly refused, with a nearby question the child can explore instead.

## A team of agents behind every lesson

| Agent | Model | Job |
| --- | --- | --- |
| Planner | Muse Spark | Reads the notebook photo or the question and plans the lesson, the challenges and the exercise |
| Young reader | Muse Spark | Reads the lesson as a 10-year-old and flags every sentence a child would not understand |
| Editor | Muse Spark | Rewrites the lesson from those notes and checks the science |
| Builder | Muse Wonder | Builds the interactive experiment with the Whybox scene kit (2D or 3D) |
| Verifier | (code) | Drives the experiment and checks every measurement against the lesson's formulas |
| Visual reviewer | Muse Wonder | Looks at pictures of each step, rejects unclear scenes and triggers a repair |
| Illustrator | Muse Image | Draws the opening question, each key word, the exercise and the summary |
| Tutor | Muse Spark + Kokoro | Writes what the tutor says on each card, spoken with an open-weight voice |
| Listener | Muse Voice Transcribe | Turns spoken questions and answers into text |
| Real-experiment analyst | SAM 3.1 + Muse Spark | Tracks the object in the child's video, measures its motion and compares it with the lesson |
| Answer reader | Muse Spark Open (Baseten) | Reads the child's written answers and wrong ideas |
| Guide | Muse Spark | Suggests the next questions to explore, from the learner's profile and progress |

**Open-weight by design.** The most personal data a child gives (their own answers and their wrong ideas) is read by Muse Spark Open, an open-weight model served on Baseten, that a school or a country can host on its own servers. If it is unavailable, Muse Spark takes over so the child always gets an answer.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS, three.js
- Serverless API routes on Vercel (`api/`), shared types in `shared/`
- Supabase for accounts, profiles and real-experiment videos (deleted after analysis)
- The scene kit (`src/features/lesson/runtime/kit`): controls, measurements, people, places, pictograms and drag handles, injected into every generated experiment, which runs sandboxed
- The tutor's voice: Kokoro on Modal (`modal/tts.py`), with the device's voice as fallback

## Getting started

Requirements: Node.js 20 or later, a Meta Model API key, and a Supabase project.

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `.env` (see `.env.example`): `MODEL_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `BASETEN_API_KEY` (Muse Spark Open), `TTS_URL` and `TTS_TOKEN` (tutor voice). Run the SQL files in `supabase/migrations` on your Supabase project.

To deploy the tutor voice: `python -m modal deploy modal/tts.py` (reads `TTS_TOKEN` from `.env`).

## Built for

The Meta Global AI Developer Hackathon, October 26 to November 4, 2026, by Dekens Ruzuba (Goma, DR Congo).

## License

MIT
