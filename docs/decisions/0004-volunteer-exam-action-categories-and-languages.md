# ADR-0004: Volunteer exam, action categories and pilgrim languages

**Status:** Proposed (the medical members review the categories and rules; native speakers review the translations)

**Date:** 2026-10-14

**Authors:** Mohammed Alharbi, with the team's medical members (question list, exam steps and category sheet)

---

## Context

The first prototype asked the deck's six yes/no questions, read the pressure platform and turned both into Low, Moderate or High risk with illustrative rules. On 2026-10-09 the medical members sent four changes:

1. **A new question list:** 11 questions answered Yes, No or Unsure. Symptoms also record the left foot, the right foot or both. They noted that question 2 (past ulcer, slow wound or amputation) makes question 3 (diagnosed poor circulation, nerve damage or dialysis) unnecessary, and that the pilgrim answers "10 questions".
2. **A volunteer exam, based on the evidence:** questions alone can't place a pilgrim. The medical volunteer inspects both feet (wounds, blisters, callus, deformity, redness, swelling). They test protective sensation with a 10-g monofilament and check circulation by pulses. Temperature and pressure alone can't rule out neuropathy or poor circulation.
3. **A six-step flow:** scan the pilgrim's card (name, age, sex, nationality); the volunteer records the exam; the pilgrim stands on the station and answers their questions; the station measures; the report shows the category; the volunteer acts on it.
4. **Proposed action categories** for pilgrims with and without diabetes: Low concern, Moderate concern, High concern (priority clinical review), Urgent override and Incomplete assessment. The highest applicable category applies. The sheet cites APMA, IWGDF 2023 (prevention, infection, Charcot) and the 2014 Hajj foot-injury study. It says the categories need clinical review and prospective validation, and are not injury probabilities.

The team also wants the station in Arabic, English and the languages most pilgrims read.

## Decision

**Questions.** The station asks ten questions: the team's list without question 3. Its content (known poor circulation or neuropathy) is now found by the exam's monofilament and pulse checks. Three questions ask a follow-up on the same card after a "yes". Each follow-up is phrased so "yes" is the worrying answer:
- pain → "Does the pain stop you from walking?"
- infection signs → "Do you feel feverish or unwell?"
- recent injury → "Is it hard to stand or walk on that foot?"

The team's "where and how severe" for pain is recorded as the foot side only. Symptoms (pain, numbness, skin break, infection signs, injury) ask which foot.

**Flow.** The screens follow the team's six steps:
1. **Card:** the volunteer scans the card, or continues without one.
2. **Exam:** the volunteer records the exam.
3. **Handover:** the pilgrim picks a language.
4. **Questions:** the pilgrim answers the ten questions.
5. **Scan:** the station takes the pressure scan.
6. **Result:** the pilgrim sees their result. The volunteer opens the clinical report, which states the category's criteria and the required action.

An urgent finding in the exam or the answers stops routine device testing. The scan is skipped and the report opens at once, as the sheet requires. The team's evidence note put the questions before the exam, but the six-step flow puts the exam first. We follow the six steps, and the order is easy to swap.

**Card.** A barcode scanner that types like a keyboard (USB or Bluetooth HID) types into a focused field and presses Enter. The real card format isn't known, so the prototype accepts only six invented sample cards. The profile stays in memory for one screening. It is never stored or put in the QR code, and the screen labels it as a sample record.

**Rule engine.** `assessScreening(answers, exam, pressure)` replaces `assessRisk`. Every rule in `models/rules.ts` maps to a sheet row. Each rule cites the sheet's sources, or is tagged `illustrative` when it is our reading of the sheet:
- Pain that stops walking counts as "inability to bear weight".
- A hot, swollen foot without neuropathy is High concern.
- An urgent sign the volunteer is unsure of is High concern.
- A single-scan pressure flag is Moderate concern. The sheet asks for a repeatable finding.
- Self-reported numbness, pain and minor injury are Moderate concern.

Ranking: urgent > high > incomplete > moderate > low. Incomplete sits above Moderate, so a missing exam never lets the station report low or moderate. Incomplete fires when:
- any exam item is unrecorded,
- the monofilament or pulse result is "unsure", or
- there is no pressure reading.

Diabetes alone, with normal sensation and pulses, is Low concern (IWGDF risk 0). It still makes a lesion count as "on a vulnerable foot". "Unsure" answers from the pilgrim don't move the category; the report shows them.

**Languages.** The pilgrim's screens (handover, questions, scan, result) come in 11 languages:
- Arabic and English, the team's own text
- Urdu, Indonesian, Bengali, Hindi, Turkish, French, Malay, Hausa and Russian

We picked these from the largest delegations (Indonesia, Pakistan, India, Bangladesh, Nigeria, Türkiye, Malaysia, Egypt and Algeria) and the languages Nusuk confirms (Arabic, English, French, Turkish, Urdu, Malay). Persian was dropped at the team's request (2026-10-14); a card from a nationality with no mapped language opens in English. The card's nationality picks the starting language, and the pilgrim can change it.

The staff screens (card, exam, clinical report, volunteer list) stay in Arabic and English. Each language is one typed file in `src/i18n/locales/`, so a missing string fails the type check. A test checks that every language fills every string with the same placeholders. The nine new languages are marked as draft translations. The handover screen and the report say so until a native speaker checks them.

## Consequences

### Positive
- The category follows the team's evidence-based sheet. The report shows each rule's source and the action the volunteer must take.
- Incomplete is explicit, so the station can't call a pilgrim low concern without a sensation and circulation check.
- Urgent cases skip the scan instead of waiting for it.
- The pilgrim reads the questions in their own language. The Arabic line under each heading lets the volunteer follow along.

### Negative
- The screening is longer. The exam alone has 12 items, which works against the deck's 60–90 s target. We should time it with the team.
- The nine new translations are drafts written without native review. Medical wording in Hausa, Bengali and Hindi especially needs checking before any pilgrim sees them.
- A name, age, sex and nationality now appear on staff screens. That is personal data, which makes open question 1 (PDPL) more pressing.

### Neutral but worth noting
- Thermal imaging still isn't connected. The sheet's IWGDF note (a >2.2 °C left/right difference on two consecutive days) is for serial monitoring, so the station uses no single-visit temperature cutoff. A missing thermal reading doesn't make a screening incomplete. The medical members should confirm this.
- The QR payload is now `FOOTGUARD v1 | <category> | refer | zones | simulated`.

## Alternatives considered

- **Keep both question 2 and question 3.** The team said question 2 covers question 3, and the exam tests what question 3 asked. Dropping it keeps the count at ten.
- **Translate every screen into every language.** Staff are Saudi volunteers and clinicians, so Arabic and English cover them. Translating staff copy would multiply the review work without helping pilgrims.
- **Treat a missing thermal reading as incomplete.** Every screening would be incomplete until the thermal camera exists. Left as an open question for the medical members.
