// GENERATED FILE — do not edit.
// Produced by scripts/buildQnaBank.js from private master documents.
// Only answers whose first paragraph stands alone are included; anything
// qualified further down is skipped rather than truncated. See the script.

export const QNA_BANK: { q: string; a: string; source: string }[] = [
  {
    "q": "What was in the preprocessing pipeline?",
    "a": "Automated data-quality validation, Z-score outlier filtering, and PII masking before anything reached the model. Together those cut data-preparation effort by about 30%.",
    "source": "DELOITTE"
  },
  {
    "q": "Why are there more modifications than creations?",
    "a": "12,500 against 7,500 is the expected shape for master data — a customer record is created once and amended many times across its life as addresses, contacts and terms change.",
    "source": "DELOITTE"
  },
  {
    "q": "Why validate before requesting approvals?",
    "a": "Because approver attention is the most expensive resource in the process. Sending an incomplete request to the CFO wastes days and generates a rejection that has to round-trip.",
    "source": "DELOITTE"
  },
  {
    "q": "What test and why?",
    "a": "A Welch two-sample t-test. It compares the means of two independent groups and asks how likely a difference at least this large would be if the populations actually had the same mean.",
    "source": "DELOITTE"
  },
  {
    "q": "How did the integration layer work?",
    "a": "REST from Pega into Informatica MDM, and MDM distributes to SAP and the other consuming systems. Pega orchestrates and holds workflow state; MDM is the authority on what the customer record is.",
    "source": "DELOITTE"
  },
  {
    "q": "What responsible-AI practices did you apply?",
    "a": "Concretely: PII masking before inference, automated input validation, outlier filtering, and a human in the loop on the decision that mattered — classification that determines approval routing.",
    "source": "DELOITTE"
  },
  {
    "q": "Why REST rather than batch file transfer?",
    "a": "Decoupling with explicit per-call success or failure and synchronous confirmation. Batch is simpler and you find out the next morning that a record failed, by which time the business has been waiting.",
    "source": "DELOITTE"
  },
  {
    "q": "Why keep a human in the loop at 92%?",
    "a": "Because misclassification bypasses a financial approval. An 8% error rate on a component sitting in the control environment is not acceptable for unsupervised routing. The model triaged; a reviewer confirmed.",
    "source": "DELOITTE"
  },
  {
    "q": "Why does that matter commercially?",
    "a": "For a company operating in around 190 countries, sixteen days between \"we have a customer\" and \"we can transact with them\" is a direct constraint on revenue recognition and on the sales team's ability to close.",
    "source": "DELOITTE"
  },
  {
    "q": "Could approvals run in parallel?",
    "a": "Where they are independent, yes, and that is the right design. The manual process was sequential largely because it ran on email, and sequencing independent approvals multiplies the wait for no control benefit.",
    "source": "DELOITTE"
  },
  {
    "q": "Why exponential backoff rather than immediate retry?",
    "a": "If a downstream system is failing because it is overloaded, immediate retries add load at exactly the wrong moment and the retry storm becomes the outage. Widening intervals give the dependency room to recover.",
    "source": "DELOITTE"
  },
  {
    "q": "How were examples selected?",
    "a": "Driven by error analysis rather than chosen up front. You look at what the current prompt is getting wrong, characterize the failure mode, and add an example that demonstrates the distinction the model is missing.",
    "source": "DELOITTE"
  },
  {
    "q": "How did you measure 92%?",
    "a": "Take a sample of real requests, have humans label each with the correct request type, run the prompt over the same sample, and compare. 92% means the model assigned the same class as the human on 92 of 100 requests.",
    "source": "DELOITTE"
  },
  {
    "q": "What is a parameterized query?",
    "a": "One written with placeholders for the values that vary — date range, team, region — rather than rewritten per combination. One template for \"resolution time by team over a date range\" serves every team and every period.",
    "source": "DELOITTE"
  },
  {
    "q": "How did you divide the work?",
    "a": "\"The pipeline had three natural stages — automation, simulation execution and data handling, and analysis and post-processing — so that was the structure. I was hands-on across all three, which on a four-person team is necessary: the stages are tightly coupled, and decisions in one constrain the others. What the automation writes out determines what features are extractable, which determines what the regression can establish. Someone had to hold that end to end.",
    "source": "DRDO"
  },
  {
    "q": "How did you validate these signatures?",
    "a": "Against published clinical literature on the physiology, not against labelled patient outcomes. There is no ground-truth diagnosis dataset here.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "Cost per user per month?",
    "a": "Not measured. It could be modelled from quota limits and the pricing table, but it would be modelled rather than measured and I would label it that way.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "Why keep the heuristic at all?",
    "a": "Deterministic fallback. An LLM call can time out or fail, and ranking still has to return something — so the heuristic is the floor rather than an error path.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "What did it cost?",
    "a": "Approximately $0.0018 per meal-logging request — parse plus rank, with judge cost excluded because the harness separates production cost from evaluation cost.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "what does rhythm flattening indicate?",
    "a": "Loss of amplitude — the body is not cycling normally. Combined with nighttime elevation, where values that should trough overnight do not, it is a stress signal.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "does grading all three together bias it?",
    "a": "Yes. One call sees all three picks, so the three grades are not independent. It buys comparison consistency and costs independence — a tradeoff, not an oversight.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "Why physical-device testing?",
    "a": "The Health Connect per-type sharing behaviour does not reproduce on an emulator. Some platform behaviour only exists on real hardware with real vendor apps installed.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "Regulatory exposure?",
    "a": "Wellness positioning, not a medical device. The non-diagnostic guard is what keeps the product on that side of the line — a legal boundary, not only an ethical preference.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "Why does the mobile app never call the ML service directly?",
    "a": "Auth, rate limiting, quota enforcement and persistence all live in the Spring layer. A direct path would duplicate all of it in Python and expose an internal service publicly.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "What supervised models are there?",
    "a": "HealthMLEngine — scikit-learn and XGBoost regression for sleep-to-mood, sleep-quality and recovery, activity-to-stress, HRV-to-recovery-readiness, and sunlight-to-mood and sleep.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "How well tested is it?",
    "a": "The Flutter suite runs 2,397 tests at a 99.2% pass rate with 54.1% line coverage. The backend suite has 1,534 tests, and the headline number there is misleading in a way worth explaining.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "Why Z-scores?",
    "a": "They normalize across metrics with completely different units and variances, so HRV in milliseconds and step count in thousands become comparable. Graded mild, moderate and severe with direction.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "Which of your numbers is weakest?",
    "a": "The 91% ranking result. n=22, a skewed query distribution, and an unvalidated judge from the same model family as the system it grades. Directional, not conclusive. Volunteering that is the point.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "why include raw retrieval?",
    "a": "That decision is what made the exercise worthwhile. Without a do-nothing baseline the comparison is only \"new thing versus old thing,\" and you cannot detect that the old thing was worse than nothing.",
    "source": "PEAKROUTINE"
  },
  {
    "q": "Why depthwise-separable convolutions?",
    "a": "Latency. A radiologist won't wait minutes per study, so the design question was how much capacity we could trade away while keeping segmentation useful.",
    "source": "PRANA"
  },
  {
    "q": "what's the ceiling?",
    "a": "k³ — for a 3×3×3 kernel that's 27×, since the 1/C_out term vanishes as channels grow. Exceeding 27× means there's a larger kernel somewhere in the stack.",
    "source": "PRANA"
  },
  {
    "q": "how does it relate to IoU?",
    "a": "IoU is intersection over union. They're monotonically related, so ranking models by one ranks them the same way by the other. Dice is more common in medical imaging by convention.",
    "source": "PRANA"
  },
  {
    "q": "How did you have time for this during a full-time degree?",
    "a": "More than fifteen hours a week, though it flexed with the semester — heavier over breaks, lighter during exams. That intermittency is what makes 27 months alongside a degree add up.",
    "source": "PRANA"
  },
  {
    "q": "You said sub-second inference. Is that the whole pipeline?",
    "a": "No, and I'd say so before being asked. That's the batched GPU forward pass. End-to-end is around four seconds, and I/O dominates — decoding a 512³ volume takes longer than the inference does.",
    "source": "PRANA"
  },
  {
    "q": "which specific e3nn modules?",
    "a": "I'd be reconstructing if I named APIs from four years ago. What I remember clearly is the design constraints — irreps up to ℓ=2, gated nonlinearities, and why pointwise activations don't work.",
    "source": "PRANA"
  },
  {
    "q": "What was your role?",
    "a": "One of four founding engineers, part-time alongside my undergraduate degree. I owned the volumetric data pipeline and the super-resolution work. Not the sole engineer and not the company founder.",
    "source": "PRANA"
  },
  {
    "q": "Is there anything I can look at?",
    "a": "No — no paper, no public repository, no demo. It rests on my being able to explain it, which is why I'd rather be precise about what I measured versus what I'm reconstructing from four years ago.",
    "source": "PRANA"
  },
  {
    "q": "Where does the 8–40× range come from?",
    "a": "The ratio is 1/(1/C_out + 1/k³). Narrow early layers with 16 channels give about 10×; wide deep layers with 256 channels give about 24×; a 5³ kernel gives about 42×. So the range spans the network.",
    "source": "PRANA"
  },
  {
    "q": "Why is the saving larger in 3D than 2D?",
    "a": "Because the reduction is bounded by k³ rather than k². For k=3 that's 27 versus 9. The spatial term dominates the cost in 3D in a way it doesn't in 2D, so factorizing it out is roughly three times more valuable.",
    "source": "PRANA"
  },
  {
    "q": "Why not accuracy?",
    "a": "Because with a 95:5 background-to-tumour split, predicting background everywhere scores 95% accuracy and finds nothing. That's the trivial baseline, so accuracy carries essentially no information about segmentation quality here.",
    "source": "PRANA"
  },
  {
    "q": "What were the results?",
    "a": "SSIM went from 0.662 for trilinear to 0.892 for the equivariant model — about +34.7%. PSNR went from 26.4 to 34.8 dB, about +31.8%. Both round to roughly 35% and agree in direction, which is a stronger statement than either alone.",
    "source": "PRANA"
  },
  {
    "q": "why does the resume lead with SSIM?",
    "a": "Because it's both more meaningful for this task and more defensible. A 35% relative gain in SSIM, 0.662 to 0.892, is ordinary for learned 4× volumetric SR. A 35% relative gain in PSNR would be +8.4 dB, which is a much larger claim.",
    "source": "PRANA"
  },
  {
    "q": "Did this ever run on real patient data?",
    "a": "Not in clinical use. It was research-grade — benchmark results on our own data from partner hospitals. The company was working toward FDA clearance and clinical trials, but nothing was deployed and no clinician used it on patients.",
    "source": "PRANA"
  },
  {
    "q": "Which embedding model?",
    "a": "OpenAI text embeddings. I won't name the specific variant, because I can't verify it from code or config and I'd rather not claim a model I might be wrong about.",
    "source": "SUNBASE"
  },
  {
    "q": "Did it serve real customers?",
    "a": "No. The web chat agent was still in internal development and validation. Evaluation was on the curated scenarios and internal multi-turn conversations, not production traffic. No customer volume, no conversion impact.",
    "source": "SUNBASE"
  },
  {
    "q": "Anything shipped publicly or open-sourced?",
    "a": "No public artifact — it was proprietary product work. I demoed the AI functionality to company leadership, covering both the technical workflow and the user-facing behavior, and wrote internal handoff documentation so full-time engineers could continue staging work and production hardening after I left.",
    "source": "SUNBASE"
  },
  {
    "q": "What was your baseline?",
    "a": "The pretrained YOLO11 model without domain-specific fine-tuning. That's an explicit ablation isolating what the fine-tuning bought, separately from what the pretrained weights already provide. It's the right baseline for \"was this worth doing.\" It's not a comparison against a competing architecture, and I wouldn't describe it as one.",
    "source": "SUNBASE"
  },
  {
    "q": "How did you handle class imbalance?",
    "a": "Targeted augmentation of the under-represented classes plus per-class precision and recall monitoring, so aggregate metrics couldn't hide a class doing badly. Error analysis then drove more dataset curation, especially for the low-recall classes. I want to be precise about what I didn't do: no weighted loss and no class-aware sampler. Those are different claims.",
    "source": "SUNBASE"
  },
  {
    "q": "Why named intermediate states rather than just RUNNING?",
    "a": "Because TRANSCRIBING → FAILED and ANALYZING → FAILED are different incidents with different causes and different fixes — an STT or audio problem versus a transcript processing or sentiment problem. Collapsing them into RUNNING → FAILED destroys that information at exactly the moment you need it. Named stages cost nothing to add and turn a failure into a diagnosis.",
    "source": "SUNBASE"
  },
  {
    "q": "What monitoring did you have?",
    "a": "Application-level structured logging around AI requests and responses, processing status, external API failures, and inference errors, plus job state and failure tracking across the async stages. Not production monitoring, not drift detection, not cost dashboards. Those were outside intern access and owned by full-time engineering, and I wouldn't claim model monitoring as a skill.",
    "source": "SUNBASE"
  },
  {
    "q": "How did the async pipeline work?",
    "a": "Spring Boot @Async workers running the pipeline off the request thread, with job state persisted in the existing database as a state machine: pending, transcribing, analyzing, then completed or failed. The API returns immediately on submission, and React retrieves state and displays insights when they're available. Not SQS, not RabbitMQ, not Celery — I want to be specific about that.",
    "source": "SUNBASE"
  },
  {
    "q": "When would you not do that?",
    "a": "If latency were tight enough that the hop mattered, if the model were small enough to run in-process through something like ONNX Runtime in the JVM, or if the operational cost of an extra service outweighed the isolation benefit for a very small team. The trade is real in both directions. Here the model iterates weekly and the backend iterates on its own schedule, so decoupling won easily.",
    "source": "SUNBASE"
  },
  {
    "q": "Why mAP and not accuracy?",
    "a": "Accuracy isn't well defined for object detection. There's no fixed set of items to be right or wrong about — the model proposes a variable number of boxes, and whether a box corresponds to a real object is itself a threshold decision on IoU. mAP is standard because it scores classification and localization together and summarizes the whole precision-recall curve rather than one arbitrary operating point.",
    "source": "SUNBASE"
  },
  {
    "q": "Did it ship?",
    "a": "Prototype to staging. I integrated inference into the application workflow so roof images could be submitted and localized detections returned for review, and validated the end-to-end workflow and model behavior in staging including representative failure cases. Then I handed it to the full-time team for production hardening and rollout. It did not reach production or real customers during my internship.",
    "source": "SUNBASE"
  },
  {
    "q": "Did you deploy it?",
    "a": "No. Interns didn't have deployment access. I did container configuration, environment setup, and staging validation, and full-time engineers handled the actual deployment. I worked with them during handoff to resolve integration issues. That's also why I'd claim Docker but describe AWS as \"worked within an AWS staging environment\" rather than claiming infrastructure ownership, and why Kubernetes isn't on my resume.",
    "source": "SUNBASE"
  },
  {
    "q": "Why does augmentation-free evaluation matter?",
    "a": "Two reasons. If you augment at evaluation time you're measuring performance on a distribution that doesn't exist, so the number doesn't describe what will happen in production. And it makes results incomparable across experiments, because changing the augmentation policy changes the test set — you can no longer tell whether a metric moved because the model improved or because you altered what you were measuring against.",
    "source": "SUNBASE"
  },
  {
    "q": "What existed before you arrived?",
    "a": "The core Java Spring Boot and React application, the CRM and sales workflows, the existing business data model, and the AI sales agent initiative including its architecture, its conversation state management, and the choice of Pinecone and LangChain. I added two capabilities that didn't exist in any form — there was no computer vision anywhere in the product, and no conversation intelligence at all — and extended the third.",
    "source": "SUNBASE"
  },
  {
    "q": "What is the loss?",
    "a": "Unweighted sum of two cross-entropy terms, with sub-word continuations and special tokens labeled -100 so they are excluded from the slot loss.",
    "source": "VIMAAN"
  },
  {
    "q": "What is your biggest testing gap?",
    "a": "Real audio. The gold-audio harness exists but the .wav fixtures have never been recorded, so the microphone-to-command path is untested end to end.",
    "source": "VIMAAN"
  },
  {
    "q": "no class weighting?",
    "a": "No, and that is the honest answer. The interventions were the split and the metric. Class weighting on the intent loss would be the next thing to try.",
    "source": "VIMAAN"
  },
  {
    "q": "Why DistilBERT?",
    "a": "Six layers, roughly 66M parameters — the accuracy-versus-latency point that fit a real-time simulator loop while still being a genuine pretrained transformer.",
    "source": "VIMAAN"
  },
  {
    "q": "What if two key presses happen?",
    "a": "A lock plus an _is_listening flag prevents a second worker spawning. Without that, two captures would compete for the microphone and post interleaved results.",
    "source": "VIMAAN"
  },
  {
    "q": "why are engines different?",
    "a": "Engines are marked stateless: True because starters are momentary — there is no persistent binary state to read, so the read-before-act pattern does not apply.",
    "source": "VIMAAN"
  },
  {
    "q": "Why must `xp.*` be main-thread only?",
    "a": "Because the simulator owns that state and its API is not thread-safe. Calling from another thread is undefined behaviour — corrupted state, crashes, or silent no-ops.",
    "source": "VIMAAN"
  },
  {
    "q": "What happens if a dataref is missing?",
    "a": "That is the fail-safe case. Interlock predicates return three-valued results, and unknown is treated as risky, so the command is gated rather than executed unchecked.",
    "source": "VIMAAN"
  },
  {
    "q": "How did you discover it?",
    "a": "By treating a suspiciously good number as a bug report rather than a result, and then measuring the overlap explicitly rather than reasoning about whether it could exist.",
    "source": "VIMAAN"
  },
  {
    "q": "How do you handle class imbalance?",
    "a": "Stratified three-way split so every class appears in every partition proportionally, and macro-F1 as the tracked metric so a failing minority class drags the headline number.",
    "source": "VIMAAN"
  },
  {
    "q": "How did you decide whether to generate more data?",
    "a": "I ran the experiment instead of guessing. Trained on 10%, 25%, 50% and 100% of the training split with validation and test held fixed and identical, then evaluated identically.",
    "source": "VIMAAN"
  },
  {
    "q": "Why ONNX?",
    "a": "Inference speed with behaviour preserved. ONNX Runtime executes the graph with operator fusion, memory planning and hardware-specific kernels that eager PyTorch does not apply.",
    "source": "VIMAAN"
  },
  {
    "q": "Why ship it if it is slower?",
    "a": "A deliberate trade: half the resident memory for 1.6 ms. And it is derived deterministically from the fp32 weights at load time, so no separate int8 artifact needs distributing.",
    "source": "VIMAAN"
  },
  {
    "q": "Why the dataset SHA specifically?",
    "a": "Because filenames lie. Someone regenerates a dataset under the same name with different content and every downstream claim silently changes meaning. A content hash does not lie.",
    "source": "VIMAAN"
  }
];

export default QNA_BANK;
