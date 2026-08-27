# Examples

Paste each pair into the two panels at https://claims.gueden.com and press
Audit. The verdicts below are real output from the deployed service, not
predictions - if a run differs, the reason is in the note under each example.

The built-in fixture is deliberately flattering: I wrote it, so of course it
works. These are the ones that were not designed around the pipeline.

---

## 1. A different domain entirely

B2B SaaS retention instead of logistics, and different speaker labels, to show
that nothing is tied to the first transcript.

**Transcript**

```
INTERVIEWER: How did net revenue retention move while you were there?

OPERATOR: When I joined in 2019 we were at about 104%. By the time I left in 2022 we had pushed it to 118%. Almost all of that came from expansion inside existing accounts, not from reducing logo churn.

INTERVIEWER: What drove the expansion?

OPERATOR: Seat growth in the enterprise tier, mostly. We launched usage-based pricing for the API in 2021 and that added a second expansion lever, but seats were the bulk of it.

INTERVIEWER: And logo churn itself?

OPERATOR: Stubborn. Around 14% annually in the SMB segment the entire time. Enterprise was under 4%, which is where the money is anyway.

INTERVIEWER: Did the onboarding changes help?

OPERATOR: We rebuilt onboarding in the second half of 2021 and cut time to first value from six weeks to under two. SMB churn did move after that, but I cannot give you a clean number because we changed the definition of an active account in the same quarter.

INTERVIEWER: What about the competitive picture?

OPERATOR: The bundlers are the threat. When a platform gives your category away for free inside a suite, you are not competing on product any more, you are competing on procurement.
```

**Draft**

```
Net revenue retention rose from roughly 104% in 2019 to 118% by 2022. Logo churn ran at about 14% annually in SMB while enterprise stayed under 4%. SMB churn dropped to single digits after the onboarding rebuild. The onboarding rebuild was a better investment than the usage-based pricing launch. The company expects net revenue retention to exceed 125% by 2024.
```

**Result**

| Claim | Verdict |
|---|---|
| Retention 104% to 118% | `supported` |
| SMB 14%, enterprise under 4% | `supported` |
| SMB churn dropped to single digits | `unsupported` |
| Onboarding was the better investment | `unsupported` |
| Expects to exceed 125% by 2024 | `unsupported` |

This is the example that found a bug. Before it, the fourth sentence - a
comparative judgement - was **silently dropped** by segmentation and the audit
returned four claims for a five-sentence draft. In a quality control tool a
missing sentence is worse than a wrong verdict, because silence reads as
approval. The fix and the reasoning are in
[DECISIONS.md](../DECISIONS.md#i-rejected-from-the-agent).

---

## 2. A figure that drifted

The realistic hallucination in research is not an invented sentence, it is a
number that moved by one digit while everything around it stayed plausible.
Here the source says the PPAP stage took **12 weeks** and the draft says **8**.

**Transcript**

```
ANALYST: How long did a qualification cycle take with a new automotive customer?

SUPPLIER: Realistically about 14 months from first sample to series production. The PPAP stage alone was usually 12 weeks, and that was when things went well.

ANALYST: Did that shorten over time?

SUPPLIER: Marginally. We got the internal steps faster, but the customer side never moved. The bottleneck was never us.

ANALYST: What about pricing pressure?

SUPPLIER: Annual give-backs of 3% were written into most contracts. On a programme running seven years that compounds into something serious.

ANALYST: Did you ever refuse one?

SUPPLIER: Once, on a low-volume programme. They resourced it to a competitor within eighteen months and we did not bid again.
```

**Draft**

```
A qualification cycle with a new automotive customer took roughly 14 months from first sample to series production. The PPAP stage alone typically ran 8 weeks. Contracts commonly included annual price give-backs of 3%. Refusing a give-back cost the supplier the programme.
```

**Result**

| Claim | Verdict | Note |
|---|---|---|
| Roughly 14 months, sample to series | `supported` | |
| PPAP stage ran 8 weeks | `partial` | *"the passage supports that the PPAP stage alone had a typical duration, but states 12 weeks rather than 8 weeks"* |
| Annual give-backs of 3% | `supported` | |
| Refusing a give-back cost the programme | `unsupported` | The source says the programme was resourced to a competitor. It never states the refusal caused it |

The second row is the one worth reading. It did not merely flag the sentence -
it located the passage that should have supported it and named the discrepancy.
The fourth row is the precision-over-recall tradeoff again, on a causal link a
human would probably have accepted.

---

## 3. A transcript with no speaker turns

Not a demo, a boundary. Chunking splits on `SPEAKER:` at the start of a line, so
a document written as continuous prose produces no chunks at all.

**Transcript**

```
The company reported revenue of 42 million euros in 2023, up from 35 million in 2022. Gross margin held at 61% across both years. Headcount grew from 180 to 240 over the same period, with most of the additions in engineering rather than sales.
```

**Draft**

```
Revenue grew from 35 million euros in 2022 to 42 million in 2023. Gross margin held at 61%. Headcount reached 240 by the end of 2023.
```

**Result:** every claim returns `unsupported`, with the reasoning *"No source
passage was retrieved for this claim."*

All three claims are in fact stated in the text, word for word. The tool cannot
see them because it never produced a passage to compare against.

The failure direction is the right one. It **fails closed**: an unparsed source
produces unsupported, never supported, so nothing false is waved through. But
the message is honest without being useful - it says nothing was retrieved, when
what the reader needs to hear is that the transcript had no speaker turns to
split on. Distinguishing "no passage supports this" from "this document could
not be read" is the first thing to add before running on sources of mixed
format, and it is the same principle as the dropped sentence in example 1: never
report a verdict you did not really compute.

Interviews in the format this tool targets always carry speaker labels, which is
why the limit was documented rather than removed inside the build window.
