# RasoiSaathi kitchen roadmap

The cook starts Kitchen Mode once and sets her phone down. She says “RasoiSaathi” to get the day’s tally, manage orders, record a receipt, dictate a menu, or hear incoming messages. A Hindi customer can request a skip, the Kannada-speaking cook hears and approves it in Kannada, and the customer gets a Hindi reply for the correct date.

The starting build includes Docker startup without keys, server-managed Gemini, M and tap-to-talk, spoken replies, order changes, full payments, menu drafts, and simulated WhatsApp. The previous baseline passed 32 unit tests, six browser tests, and one live Gemini tally request.

| Phase | Goal and expected outcome | Completion evidence |
|---|---|---|
| 1. Foreground Kitchen Mode | One startup tap, then wake by name, hear a cue, speak a command, hear the answer, and return to waiting. Stop by voice. | Fifteen minutes on Android with the app visible, ten wake attempts and at least nine first-attempt successes. Check navigation, calls, backgrounding, kitchen noise, and zero unintended updates. |
| 2. Daily business by voice | Read today and tomorrow’s prep, named extras, balances, and order changes. Resolve ambiguous names aloud, record partial receipts with confirmation, and review menus and reminders. | Add, skip, resume, record a ₹1,000 receipt against ₹3,500, hear the ₹2,500 balance, and save a menu. Refresh and replay the receipt to verify persistence and no duplicate credit. |
| 3. Multilingual inbox | Announce arrivals at the next pause. Translate into the cook’s language, wait for approval, apply once, and prepare the customer-language reply from the outcome. | Decline a Hindi skip for tomorrow in Kannada, then approve it. Verify today’s tally stays the same, tomorrow drops by one, and the Hindi reply names the correct date. Repeat with queued arrivals, an English sender, and a reload. |
| 4. Six languages and keyless operation | Qualify Hindi, Kannada, English, Tamil, Telugu, and Marathi. Use configured Gemini first, optional browser Local AI, and Basic Mode. Preserve the original when translation is unavailable. | For each language, a fluent reviewer tries wake, tally, a dated mutation, amount, inbox, reply, and menu on a real phone. Record device, browser, model/tier, and issues. Check the main cross-language flow with Gemini and Local AI, and test Basic Mode with no model or key. |
| 5. Rehearse and submit | Start the exact submission commit on fresh Docker volumes and complete the morning workflow on a phone. | Pass build, lint, types, unit, API, browser, and persistence checks. Push the verified commit and prepare the ≤3-minute demo, pitch PDF, and submission links by November 30, 11:59 pm IST. |

Kitchen Mode runs in the visible mobile app. Browser speech recognition can use an online service. The live WhatsApp business-number pilot follows the simulator submission and needs a configured account, an HTTPS webhook, a delivery test, and handling for duplicate events. Optional public deployment follows review of dependencies and database persistence.

Record a phase as verified only after its completion evidence is available. Record automated checks and physical-phone results separately.

## Implementation status

November 28 local working tree passed 35 unit tests, 10 browser tests, type checking, lint, the keyless production API suite, and Docker cold start and restart persistence. The browser tests inject recognition events and check real database changes. The table below tracks the physical and release checks separately.

| Phase | Evidence and remaining work |
|---|---|
| 1. Foreground Kitchen Mode | Browser tests inject transcripts to verify wake by name, the listening cue, rearming, and stopping. The counter-distance Android session and interruption checks still need a physical phone. |
| 2. Daily business by voice | Automated checks cover tally, order changes, partial receipts, and correcting and approving a menu draft. The UPI preview is a simulation inside the app. Native-language phrasing and customer clarification need testing with speakers. |
| 3. Multilingual inbox | The browser test declines and reopens a Hindi request in Kannada, applies tomorrow’s skip once, and approves the dated Hindi draft. The keyless test uses a structured Kannada summary. Full live Gemini and downloaded Local AI translation quality needs separate testing. |
| 4. Six languages | The six locales have Kitchen Mode controls and tally phrases. Marathi has a UI dictionary. The six-language phone scorecard is pending, and some existing operation-specific speech and app labels still use fallback language. |
| 5. Rehearse and submit | Automated startup, API, browser, and persistence checks use seeded data on an isolated keyless Docker build. Recording, pitch PDF, submission and release of a verified commit follow the physical-phone sign-off. |

## Rehearsal and sign-off

Use seeded records in a separate demo instance. On a phone, open the app from a trusted HTTPS origin and allow microphone access. Set Kannada in the language picker and start Kitchen Mode. Keep the app visible with the phone at counter distance.

1. Say “ರಸೋಯಿ ಸಾಥಿ.” After the cue, ask “ಇಂದು ಎಷ್ಟು ಟಿಫಿನ್?” The initial answer should report eight tiffins. Say “ರಸೋಯಿ ಸಾಥಿ, ನಾಳೆ ಎಷ್ಟು ಟಿಫಿನ್?” and note tomorrow’s count.
2. From another app tab, create a Hindi message from Priya Sharma with “कल मेरा टिफिन मत भेजना।” Keep the phone on the Kitchen Mode screen. The app should announce the sender and the skip date in Kannada. A keyless structured summary acknowledges that full translation is unavailable.
3. Say “ಬೇಡ.” Both totals should stay unchanged. Say “ರಸೋಯಿ ಸಾಥಿ ಸಂದೇಶಗಳನ್ನು ಓದಿ” to reopen the deferred message, then “ಹೌದು” to apply the skip. Tomorrow should drop by one and today should still be eight.
4. Listen to the reply meaning in Kannada and approve it. Open the inbox and check the original Hindi, the dated Hindi draft, and the simulated reply approval. Reload and verify the change remains a single skip.
5. Repeat the operating flow for the payment and menu. In English, “RasoiSaathi, Priya paid 1000” should read back Priya and ₹1,000. Say “yes” and confirm the remaining balance is ₹2,500. Dictate a menu and use “edit” before approving to replace the draft. Verify the receipt and menu after refresh.
6. Stop by voice. Restart a session, background the app or take a call, and confirm the screen offers a way to resume. Test a quiet room and normal kitchen noise, then log failures and unintended actions.

| Language | Fluent reviewer and phone/browser | Wake and rearm | Tally and dated change | Receipt and amount | Inbox, reply and menu | Tier |
|---|---|---|---|---|---|---|
| Hindi | Pending | Pending | Pending | Pending | Pending | Pending |
| Kannada | Pending | Pending | Pending | Pending | Pending | Pending |
| English | Pending | Pending | Pending | Pending | Pending | Pending |
| Tamil | Pending | Pending | Pending | Pending | Pending | Pending |
| Telugu | Pending | Pending | Pending | Pending | Pending | Pending |
| Marathi | Pending | Pending | Pending | Pending | Pending | Pending |

Review mixed-language names and food names with a fluent speaker. Check the Kannada and Hindi bridge separately with Gemini and with the downloaded Local AI model. Record whether the app produced a full translation, a structured summary, or an unavailable notice.
