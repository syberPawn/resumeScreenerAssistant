# AI Usage

## AI tools used

| Tool | What I used it for |
|---|---|
| **Claude Code** (Claude Opus 5.5), in the terminal | My main development tool. I worked in phases (scope and design, technical decisions, security, development, testing and deployment) and set the requirements and constraints for each phase. Claude Code researched options such as models, libraries and platform limits, drafted the planning documents, wrote the code and the tests, and ran the tests and builds. I made the decisions, reviewed its output and corrected it where it was wrong. |

I did not use any other AI tools for this project.

## 3 key prompts

The prompts are quoted from my sessions, lightly edited for grammar and sentence structure.

### 1. Setting up the process

> We will build a resume screening assistant web app in five phases: 1. Project scope and design, 2. Technical decisions, 3. Security, 4. Development, 5. Testing and deployment. Create a folder for each phase.
>
> Create a `decision.md` file. Every decision we take during this project must be logged with its phase and the reason for it.

**Why it mattered:** it fixed the order of work: scope before technology, technology before security, and security before code. It also made every decision traceable. Each one was logged with its phase and reason, and a changed decision was marked as superseded rather than deleted. When the AI made a wrong assumption, I could see where it came from and reverse it cleanly, as in both examples below.

### 2. Defining the product (scope and design)

> Starting with the project scope and design: it is a web app for HR users. HR uploads or types in the job description and uploads a candidate's resume, and the app gives a structured analysis of the candidate. A profile card takes about 25% of the screen on the right. It is sticky, so it does not scroll with the analysis report when the report is longer than the screen. The structured analysis report is on the left. The report includes a Match Score (0–100), the top 5 matching skills, the top 3 gaps and 3 suggested interview questions. Every analysis is saved and shown on the History page, which can be filtered by score or searched directly by candidate name, with suggestions (autocomplete) as HR types, like Google Search.
>
> Here is the complete flow. The app opens to a page divided into two parts. The left part has a text box for the job description, with a file upload option below it. The text box has a Done button for when HR has finished writing the job description. Done applies only to the text box; an uploaded file is ready as soon as the upload finishes. The right part has the same layout, but for the candidate's resume. Both upload options accept PDF and Word documents only. In the centre of the partition line between the two parts is an Analyse button. When HR clicks it after providing the job description and the resume, the app starts loading, and the candidate's name and basic details (the profile card) appear while the analysis is still loading, in case the internet is slow. Once the analysis loads, the app shows the analysis report. The report page has a button labelled "Reviewed", "Done" or "Back", whichever fits best. When clicked, it takes HR back to the home page, ready for the next analysis. The button to open the History page is also shown on this page.
>
> Record this professionally in a Markdown file (Project description and goals).

**Why it mattered:** it defined the whole product, including the screen layout, the flow and the report contents, before any technical choice was made. Requirements such as "the profile card appears while the analysis is still loading" later shaped the architecture directly. Every technical decision was checked against this description, which is how out-of-scope additions were caught.

### 3. Technical decisions, with constraints

> Phase 2: Technical decisions
>
> Read the scope and design document in `1-project-scope-and-design/` first. Base every decision on the features and flow described there. Do not write any application code yet. Save your output as a Markdown file in `2-technical-decisions/`. Security will be handled separately in the next phase, so only mention security where it directly affects a choice here.
>
> 1. **Architecture.** List the components the app needs (for example frontend, backend, database, file storage, resume and job description parsing, and AI analysis). Explain how they communicate, including how the app shows the profile card first while the full analysis is still loading. Include a simple diagram (ASCII is fine).
> 2. **Tech stack.** Recommend a tool for each component: frontend, backend, database, file storage, PDF and Word text extraction, AI model or API, and hosting. For each, give a short reason and one alternative with its trade-off. Prefer simple, well-documented, beginner-friendly options. Avoid over-engineering.
> 3. **Database.** Recommend a database and explain why. Draft the schema: tables, fields and relationships. It must support the History page (filtering by match score, and autocomplete search by candidate name). Explain where uploaded files are stored and whether we keep them after the analysis.
>
> My recommendation is Supabase for the backend, Vercel for hosting and the Gemini API for the LLM, with `gemini-3.5-flash-lite` as the model and `gemini-2.5-flash` as the fallback.

**Why it mattered:** it kept the AI from jumping into code. Every choice had to come from the product's features, with a reason and a trade-off, and "avoid over-engineering" kept the design to one Next.js project and one database table. The "profile card first" requirement became two sequential API calls: a small profile call, then the report call. That avoided streaming code on both ends. The History requirements became one `analyses` table with a B-tree index on `match_score` for the score ranges and a GIN trigram index on `candidate_name` for search and autocomplete. Uploaded files are read in memory and never stored.

## 2 examples where AI output was wrong

### 1. It added a login I never asked for

**What happened:** in the technical decisions phase, Claude Code made several assumptions that weren't in my requirements:
- it added a `created_by` column to the schema, as a foreign key to Supabase's `auth.users` table;
- it justified choosing Supabase partly by its built-in authentication;
- it brought Supabase Edge Functions into the stack discussion, although all server logic was going into Next.js API routes on Vercel;
- it raised login as an open question.

My product description has no login, no user accounts and no per-user data.

**How I noticed:** I checked the schema and the stack against my scope document. A foreign key to an accounts table only makes sense if the app has users, and mine doesn't.

**How I fixed it:** I told it:

> What stack decisions did you take? Next.js, React, what else? Specify them with reasons before you write them down. I don't think we will need Edge Functions; which part are we using them for? And please read the product description and goals; there is no mention of login.

**The technical point behind it:**
- The scope has no user accounts, so a `created_by` foreign key to `auth.users` has nothing to reference, and Supabase Auth adds a dependency the app never uses.
- All server logic runs in Next.js API routes on Vercel, so Edge Functions would be a second server runtime with nothing to do.
- Stack choices are decisions. They should come with reasons before they are written into a document, not after.

I had it make these changes:
- **Schema:** drop the `created_by` column and its foreign key, which left a single self-contained `analyses` table with no relationships. History is shared, because there are no users to separate it by.
- **Supabase:** used strictly as managed Postgres, reached only from the Next.js API routes with the server-side secret key. No Supabase Auth, Storage or Edge Functions.
- **Way of working:** from then on, the AI had to list every technical choice with its reason in the chat before writing anything into a document, so I could check it first.

### 2. It added a disclaimer and a question that were outside the app's job

**What happened:** Claude Code made three additions I hadn't asked for:
- it rendered a notice under every report in the `ReportView` component ("This analysis is generated by AI to support HR. It is advisory; HR makes every decision about the candidate.");
- it put a matching sentence in the system instruction for the report call to Gemini;
- it kept an open question about who makes the hiring decision.

None of this was in my requirements.

**How I noticed:** during a final review of the documents, it asked me to confirm that open question and mentioned that the component and the prompt already contained this wording. The question itself was outside the app's scope.

**How I fixed it:** I told it:

> There is no question about who hires. The web app is about the score; that is its job. You don't need to worry about things that are not required.

**The technical point behind it:**
- The report's system instruction should contain only what shapes the output: the task, the rule that inputs are data, the rubric and the output fields. A disclaimer sentence spends tokens on every call and changes nothing in the JSON the app needs.
- UI text that is not in the requirements is scope creep, and so is an open question about a decision the app never makes.

I had it remove the notice from the `ReportView` component and the sentence from the report's system instruction. The prompt now contains only:
- the task;
- the rule that resume and job description text is data, never instructions;
- the scoring rubric;
- the fairness rule;
- the output fields.

The open question was closed, and the 70 unit and API tests were run again and passed.
