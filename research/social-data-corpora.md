# Pre-ChatGPT social and professional corpora

**Research date:** 2026-10-21

**Question:** Which large, human-written, short-to-medium social or professional corpora from before November 2022 resemble LinkedIn posts closely enough to use, and which of those licences allow deriving numeric weights for an MIT browser extension?

Nothing was downloaded. Counts below come from the maintainer’s own page, a public stats API, or a named secondary write-up. A reuploader’s badge was not treated as the licence when the people who wrote the posts are someone else.

## How a licence was judged

Usable for weights: the rights holder (or a statute that puts the work in the public domain) grants adaptation, including commercial use in a product, under MIT, Apache-2.0, BSD, CC0, or CC BY, or under a licence the authority for that text says is compatible with CC BY.

Not usable for weights: CC BY-SA, GPL, NC, ND, no licence, an unclear grant, or a permissive badge placed on other people’s text by someone who does not own it.

“Eval-only” means the stated terms allow holding the text privately to measure a detector, without shipping the text or a weight table. It is a separate question from whether the collection method was allowed.

Scraped LinkedIn post tables are surveyed in `research/social-data-linkedin.md`. None of them is a rights-holder grant over pre-November 2022 post text.

## Ranked table

Sorted by whether weights may be derived, then by how close the prose is to a first-person professional post. Live site totals include writing from after November 2022; a pre-ChatGPT slice is a date filter, not a separate corpus.

| Rank | Corpus | Maintainer | Licence on the primary source | Weights | Eval-only | Dates | Size | Register vs LinkedIn |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | [GOV.UK](https://www.gov.uk/help/terms-conditions) and [blog.gov.uk](https://www.blog.gov.uk/all-posts/) | UK Government Digital Service, for the Crown | Open Government Licence v3.0. The National Archives says the OGL is compatible with CC BY. | Usable, with attribution. OGL-UK-3.0 is not itself CC-BY-4.0. | Yes | GOV.UK from 2012. Filter on `first_published_at`. The blog index on this date lists posts through 20 October 2026. | Blog index: **10,113 posts** on 2026-10-21, including later posts. The pre-November 2022 slice was not counted. www.gov.uk news and speeches are a larger set and were not enumerated. | Medium. Civil-service blogs include first-person updates. Much of www.gov.uk is guidance and news in an institutional “we”. |
| 2 | [O\*NET 27.0 Database](https://www.onetcenter.org/license_db.html) | U.S. Department of Labor, ETA; National Center for O\*NET Development | CC BY 4.0, from the sponsor | Usable, with attribution and the trademark rules | Yes | Pin **27.0, August 2022**. 27.1 is dated November 2022. | Occupational database (tasks, skills, activities, titles). Not a post count. | Low. Professional vocabulary and task lines, not a person’s update. |
| 3 | U.S. federal employee writing | The authoring agency. Statute: [17 U.S.C. § 105](https://www.law.cornell.edu/uscode/text/17/105). Practical limits: [USAGov](https://www.usa.gov/government-copyright) | Public domain in the United States when it is a federal employee’s official work. Not a CC0 dedication. | Usable only for text that meets that definition | Yes, for that text | Any pre-November 2022 page the agency itself treats as a government work | No packaged social-post corpus was found | Low to medium. Agency blogs and releases are institutional. A raw `.gov` crawl is mixed. |
| 4 | [Blog Authorship Corpus](https://u.cs.biu.ac.il/~koppel/BlogCorpus.htm) | Jonathan Schler, Moshe Koppel, Shlomo Argamon, James Pennebaker | “Non-commercial research purposes” plus a required citation | Not usable | Yes, non-commercial research, with the citation | Collected from blogger.com in **August 2004**. Post dates inside the files are earlier. | **19,320 blogs, 681,288 posts, over 140 million words** | High for diary and life-update prose. A large share is teenagers. Career posts are a minority. |
| 5 | [Stack Exchange data dump](https://stackoverflow.com/help/licensing), especially [The Workplace](https://workplace.stackexchange.com/) | Stack Exchange, Inc.; posts by users under the ToS | CC BY-SA 2.5, 3.0, or 4.0 by contribution date. The dump is CC BY-SA. | Not usable | Private measurement can fit the licence. Shipping an adaptation under MIT does not. The current download also asks you to affirm no LLM training. | Network history from 2008. Filter `CreationDate` before November 2022. | Live on 2026-10-21, all years: Workplace 32,966 questions and 114,477 answers; Software Engineering 64,553 and 182,386; Freelancing 2,053 and 4,850. | Medium. First-person career advice in question-and-answer form. Closer on The Workplace and Freelancing than on Stack Overflow. |
| 6 | [Enron Email Dataset](https://www.cs.cmu.edu/~enron/) (May 7, 2015) | William W. Cohen, CMU; prepared by the CALO Project from the FERC release | No copyright licence. Distributed “as a resource for researchers”. | Not usable | The maintainer describes research use and asks for privacy care. That is not a copyright grant. | FERC investigative release of Enron mail. The CMU page does not print a start and end date. All of it is far before 2022. | **About 150 users, about 0.5 million messages.** The 2015 file is about 1.7 GB gzip. No attachments. | Medium-low. Real workplace email: requests, updates, arguments. Not a public post. Identifiable people. |
| 7 | [Hacker News on BigQuery](https://console.cloud.google.com/marketplace/details/y-combinator/hacker-news) | Y Combinator; Google hosts the table | Unclear for third parties. Users license YC for YC-related purposes. The API repo’s MIT licence is the software. | Not usable | Not clearly allowed. The terms prohibit scraping and data mining, and they reserve rights not expressly granted. | Stories and comments **since 2006**. Filter `timestamp`. | Google’s listing says “since 2006” and does not print a row count. A 2026 HN comment reported 47,049,059 rows with a latest timestamp of 2026-02-21. A Voltron Data write-up of an earlier snapshot reported 33,620,611 rows from 2006 into 2022 (28,897,394 comments, 4,691,514 stories). Those are secondary counts. | Medium for Ask HN, “Who is hiring”, and Show HN. Most of the mass is short technical comments. |
| 8 | [Pushshift Reddit](https://zenodo.org/records/3608135) and career subreddits | Jason Baumgartner and co-authors; posts owned by redditors | Zenodo badges the April 2019 sample **CC BY 4.0**. That badge is not the users’ licence. Reddit’s Data API Terms say users own the content. | Not usable. The CC BY badge does not clear the posts. | Not granted. Current API terms forbid model training without the rightsholder’s permission, and they require deletion of derived models when access ends. | Reddit from 2005. The 2020 paper describes monthly dumps. Public Pushshift dumps are generally treated as ending in early 2023. | Zenodo sample only: April 2019 submissions 5.6 GB and comments 15.5 GB, compressed. A full-corpus count was not on that record. | High on r/cscareerquestions, r/careerguidance, r/jobs, r/resumes, r/experienceddevs: first-person career posts. The dump is mostly other subreddits. |
| 9 | Mastodon / fediverse dumps | Instance operators and users. Annotated subset: Christophe Cerisara et al. | No network-wide content licence. [DialogSentimentMastodon](https://github.com/cerisara/DialogSentimentMastodon) is **GPL-3.0**. | Not usable | GPL-3.0 is copyleft if that small corpus is distributed. A bulk timeline is mixed user copyright. | Mastodon from 2016. The annotated subset is 2018. | Paper: about 800,000 posts crawled from one instance; the released annotation is 239 train dialogues (1,075 posts) and 266 test dialogues (1,142 posts). | Low. Microblog, default cap 500 characters. Not a professional update. |
| 10 | [DEV Community / dev.to](https://dev.to/terms) | Forem; articles owned by authors | Site licence: personal, non-commercial, transitory viewing. No third-party content grant. The AGPL applies to the Forem software. | Not usable | No. The same clause forbids copying the materials. | dev.to from about 2016. A pre-2022 slice would have to be filtered. | No rights-holder dump. | High. First-person engineering and career essays, often longer than a LinkedIn post. |
| 11 | [Medium](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f) | A Medium Corporation; stories owned by authors | Authors keep their rights. The licence they grant is to Medium, for the Services only. | Not usable | No third-party grant. A Kaggle scrape cannot relicense the stories. | Medium from 2012. | No rights-holder dump. | High. Career and advice essays. Longer than a feed post. |
| 12 | Twitter/X academic sets, chiefly [Sentiment140](https://huggingface.co/datasets/stanfordnlp/sentiment140) | Alec Go, Richa Bhayani, Lei Huang (Stanford). Platform terms: X. | Dataset card: freely available for research, **no open-source licence**, and users should follow Twitter’s developer policy. | Not usable | Unclear. The card says research. The platform rule in force when these sets were shared was ID-only redistribution. | Sentiment140 training file: **1.6 million tweets, 2009**. | 1.6 million tweet texts in the training file. Most other academic Twitter sets are ID lists, not text. | Low. Very short, public, not professional. |
| 13 | [20 Newsgroups](http://qwone.com/~jason/20Newsgroups/) | Jason Rennie’s distribution of a collection attributed to Ken Lang | The primary page states no licence. | Not usable | Not granted on the primary page. | The page does not state the year. It is the Usenet collection associated with Lang’s Newsweeder work. | About **20,000 documents** (bydate version: 18,846). | Low. Topic newsgroups, early Usenet. |
| 14 | [Common Crawl](https://www.commoncrawl.org/terms-of-use) | Common Crawl Foundation | A limited licence to the service. Page text stays under the site owner’s terms. | Not usable as a corpus | Not as a blanket set. The terms also require indemnity for AI uses. | Monthly crawls exist well before November 2022. | Web scale. | Mixed. A blog-like slice would still be other people’s copyright. |
| 15 | Company press and newsroom posts | Each company, or a wire (PR Newswire, Business Wire) | No permissive corpus was found. Wires are commercial feeds. | Not usable | No grant located | Would be filterable by dateline | No open dump under a rights-holder permissive licence | Medium for announcements. Corporate voice, not a person’s post. |

## Notes

### 1. GOV.UK and blog.gov.uk

Primary licence, [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/):

> The Licensor grants you a worldwide, royalty-free, perpetual, non-exclusive licence to use the Information subject to the conditions below.

> You are free to: copy, publish, distribute and transmit the Information; adapt the Information; exploit the Information commercially and non-commercially for example, by combining it with other Information, or by including it in your own product or application.

Attribution is required. If the publisher does not give its own line, the licence requires: “Contains public sector information licensed under the Open Government Licence v3.0.”

[The National Archives’ OGL page](https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/open-government-licence/) says:

> The OGL terms are compatible with the latest versions of the Creative Commons Attribution License and the Open Data Commons Attribution License. This means that when the information is adapted and licensed under either of those licences, you automatically meet the conditions of the OGL as long as you comply with the terms of the other licence.

[GOV.UK terms](https://www.gov.uk/help/terms-conditions), last updated 3 September 2024:

> Most content on GOV.UK is subject to Crown copyright protection and is published under the Open Government Licence (OGL), which also sets out which content is exempt.

The OGL does not cover personal data, logos, or third-party material the Crown is not authorised to license. [Reuse guidance](https://www.gov.uk/help/reuse-govuk-content) allows the Content API and allows scraping that respects `robots.txt`; too many requests are rate-limited. The Content API covers `www.gov.uk` HTML pages, not `blog.gov.uk`.

`blog.gov.uk` is the government’s WordPress platform. On 2026-10-21 its [all-posts index](https://www.blog.gov.uk/all-posts/) said “10113 posts”, and the newest entries were dated 20 October 2026, so that figure includes post-ChatGPT writing. GDS publishing guidance tells departments to use these blogs for work in progress, practice, and what a team is learning. Some posts are first person. Treat a post that credits a third party as outside the OGL until the notice says otherwise.

This is the only large, rights-holder-licensed body of professional prose found. It is a human baseline for formal and semi-personal workplace writing. It will under-represent LinkedIn habits: hashtags, “I got the job” arcs, and engagement questions.

The extension’s dictionary lock, as written in `src/lib/engine/packs/vendor/README.md`, names MIT, Apache-2.0, BSD, CC0-1.0, and CC-BY-4.0. OGL-UK-3.0 is not on that list. Using it for weights is allowed by the OGL and still needs an explicit gate decision.

### 2. O\*NET 27.0

[Database content licence](https://www.onetcenter.org/license_db.html):

> Except as noted below, the content of the O\*NET 31.0 Database is licensed under a Creative Commons Attribution 4.0 International License. You are free to copy or adapt the information from this database, as long as you: credit the O\*NET 31.0 Database and the U.S. Department of Labor, Employment and Training Administration as the original source, link to the license, and indicate where any changes were made to the original.

The same page says earlier versions “may be used under this license, or any previous license under which they were released,” and the attribution must name the version. The [release archive](https://www.onetcenter.org/db_releases.html) lists **O\*NET 27.0 August 2022** and **O\*NET 27.1 November 2022**. Pin 27.0. The licence does not cover the Career Exploration Tools or the rest of the website.

“O\*NET” is a trademark and has to stay an adjective. Registration of products that use the database is optional. Collection is a direct download from the sponsor. No ToS conflict showed up on the licence page.

Use it as a pre-ChatGPT professional-vocabulary control. Do not treat task statements as stand-ins for feed posts.

### 3. U.S. federal employee writing

[17 U.S.C. § 105(a)](https://www.law.cornell.edu/uscode/text/17/105):

> Copyright protection under this title is not available for any work of the United States Government, but the United States Government is not precluded from receiving and holding copyrights transferred to it by assignment, bequest, or otherwise.

The House report quoted on that page defines the work as one “prepared by an officer or employee of the United States Government as part of that person’s official duties,” and says the effect is to place those works in the public domain. Contractor and grantee text can still be copyrighted. Section 105 is a U.S. rule; USAGov says the government may assert copyright abroad.

[USAGov](https://www.usa.gov/government-copyright), updated 30 April 2026:

> Not everything that appears on a federal government website is a government work. Government work is something created by a U.S. government officer or employee as part of their official duties. Content on federal websites may include protected intellectual property used with the right holder's permission.

State and local government material is outside this rule. Agency logos and implied endorsement are outside it too.

No maintained dump of pre-2022 federal social posts was found. A usable slice is a page the agency marks as its own work, taken from the agency site, dated before November 2022. Pulling the same pages out of Common Crawl inherits Common Crawl’s terms, including the AI indemnity below. The Federal Reserve statements already in this repo are this class of text: official prose, not social posts.

### 4. Blog Authorship Corpus

[Primary page](https://u.cs.biu.ac.il/~koppel/BlogCorpus.htm):

> The corpus may be freely used for non-commercial research purposes. Any resulting publications should cite the following: J. Schler, M. Koppel, S. Argamon and J. Pennebaker (2006). Effects of Age and Gender on Blogging…

That sentence is the whole grant. It is not MIT, Apache, BSD, CC0, or CC BY. Weights shipped in a public extension are outside “non-commercial research purposes.”

The page’s own counts: 19,320 bloggers, 681,288 posts, over 140 million words, gathered from blogger.com in August 2004. Age bands on that page: 8,240 blogs ages 13–17, 8,086 ages 23–27, 2,994 ages 33–47. The 13–17 band is personal writing by minors. Leave it out of any sample even for a private eval. Industry labels exist and are often “unknown”; the register is personal blogging, with some workplace and student life, not a professional network.

Hugging Face and Kaggle copies repeat the same non-commercial sentence. They do not add a broader licence.

### 5. Stack Exchange

[Help Center, licensing](https://stackoverflow.com/help/licensing):

> Content contributed before 2011-04-08 (UTC) is distributed under the terms of CC BY-SA 2.5. Content contributed from 2011-04-08 up to but not including 2018-05-02 (UTC) is distributed under the terms of CC BY-SA 3.0. Content contributed on or after 2018-05-02 (UTC) is distributed under the terms of CC BY-SA 4.0.

[Public Network Terms](https://stackoverflow.com/legal/terms-of-service/public), last updated 13 November 2025:

> From time to time, Stack Overflow may make available compilations of all the Subscriber Content on the public Network (the “Creative Commons Data Dump”). The Creative Commons Data Dump is licensed under the CC BY-SA license. By downloading the Creative Commons Data Dump, you agree to be bound by the terms of that license.

[How to access a dump](https://stackoverflow.com/help/data-dumps):

> Check the box affirming that you do not intend to use the file for LLM training, and then use the “Download data” button to begin downloading the file.

Share-alike is why this cannot feed weights in an MIT extension. The checkbox is an extra access condition on the current file, aimed at LLM training. Fitting a weight table can fall inside that affirmation even when the measurement never ships. This pass did not log in, so the on-page byte size of the current dump was not read. Stack Overflow has said it no longer uploads the dump to archive.org. Older archive.org snapshots remain CC BY-SA.

Live totals on 2026-10-21 from `api.stackexchange.com/2.3/info` (all years): The Workplace, 32,966 questions and 114,477 answers; Software Engineering, 64,553 and 182,386; Freelancing, 2,053 and 4,850. The Workplace is the closest register: hiring, management, resignations, offers. It is still Q&A, with accepted-answer structure LinkedIn posts do not have.

### 6. Enron

[CMU page](https://www.cs.cmu.edu/~enron/):

> This data was originally made public, and posted to the web, by the Federal Energy Regulatory Commission during its investigation.

> I am distributing this dataset as a resource for researchers who are interested in improving current email tools, or understanding how email is currently used. […] In using this dataset, please be sensitive to the privacy of the people involved.

About 0.5 million messages, about 150 users, mostly senior management. The distributed version is 7 May 2015, about 1.7 GB gzip, without attachments, with some messages removed after employee requests. FERC’s publication during an investigation is not a copyright dedication, and CMU does not add one. A separate LDC topic-annotated edition is a signed research licence that forbids republishing the text; that licence is not the CMU file’s.

The mail is real workplace prose from before any modern chat model. It is also a privacy-sensitive corpus of identifiable people. Suitable only as a reminder of the genre, not as a weight source.

### 7. Hacker News

Google’s dataset listing says anyone may use the table under the terms of <https://github.com/HackerNews/API>, “AS IS”, with no warranty from Google. The file at that repository labelled `LICENSE` is the MIT licence and it covers “this software and associated documentation files.” It does not say it licenses comment text.

[Y Combinator Terms of Use](https://www.ycombinator.com/legal), read 2026-10-21:

> Except as expressly authorized by Y Combinator, you agree not to modify, copy, frame, scrape, rent, lease, loan, sell, distribute or create derivative works based on the Site or the Site Content, in whole or in part, except that the foregoing does not apply to your own User Content […] In connection with your use of the Site you will not engage in or use any data mining, robots, scraping or similar data gathering or extraction methods.

> By uploading any User Content you hereby grant and will grant Y Combinator and its affiliated companies a nonexclusive, worldwide, royalty free, fully paid up, transferable, sublicensable, perpetual, irrevocable license to copy, display, upload, perform, distribute, store, modify and otherwise use your User Content for any Y Combinator-related purpose in any form, medium or technology now known or later developed.

> Unless otherwise expressly authorized herein or in the Site, you agree not to display, distribute, license, perform, publish, reproduce, duplicate, copy, create derivative works from, modify, sell, resell, exploit, transfer or upload for any commercial purposes, any portion of the Site, use of the Site, or access to the Site.

The content licence runs to Y Combinator, for Y Combinator-related purposes. The MIT file runs to the API software. Together they are not a public licence on the comments. The official API is a real collection path and does not change that.

“Who is hiring” and Ask HN are the slices that sound most like LinkedIn. They are a small part of a comment corpus. Row counts in the table are from a 2026 comment on the site and from a Voltron Data blog, not from a fresh query.

### 8. Reddit and Pushshift

[Reddit Data API Terms](https://redditinc.com/policies/data-api-terms), effective 19 June 2023, last revised 20 July 2026:

> The Content created with or submitted to our Services by Users (“ User Content”) is owned by Users and not by Reddit. […] Except as expressly permitted by this section, no other rights or licenses are granted or implied, including any right to use User Content for other purposes, such as for training a machine learning or AI model, without the express permission of rightsholders in the applicable User Content.

The same terms say that if access ends you delete stored user content, “including any data or models that were derived from User Content.” The [User Agreement of 16 August 2024](https://redditinc.com/policies/user-agreement-august-16-2024) has users keep ownership and grant Reddit a broad sublicensable licence, including syndication to partners and AI training. That grant is to Reddit, not to the public.

The [Zenodo deposit of the Pushshift paper’s sample](https://zenodo.org/records/3608135) is marked Creative Commons Attribution 4.0 and contains the April 2019 submission and comment dumps (5.6 GB and 15.5 GB compressed). The authors are not the copyright owners of those posts. A repository CC BY badge on that sample does not make the comments CC BY. Later torrents of monthly dumps, including files past 2022, have the same gap; a public thread asking for the torrent’s licence did not produce one.

Career subreddits are the closest public prose to LinkedIn advice posts. They are also the clearest “do not use for weights” case: user copyright, an API contract that forbids training without permission, and a share-alike-looking badge that the rightsholders did not grant.

### 9. Mastodon

Cerisara, Jafaritazehjani, Oluokun, and Le, COLING 2018, [ACL Anthology](https://aclanthology.org/C18-1063/):

> Both the annotated corpus and deep network are released with an open-source license.

> the user-generated content in the Mastodon network typically follows a Creative Commons license, which allows redistribution of posts.

The footnote for that sentence points at one instance’s terms (`forum.etalab.gouv.fr`), not at a network policy. Mastodon does not have a single content licence. Each post stays with its author unless that author, or that instance’s rules, say otherwise. The paper’s claim is too broad to treat a timeline dump as CC BY.

The released annotation is small: 1,075 training posts and 1,142 test posts, from a crawl of about 800,000 posts on `octodon.social`. The GitHub repository is GPL-3.0. GPL-3.0 is not on the allow-list. Posts are capped, by the paper, at 500 characters by default.

A separate ICWSM 2019 corpus (Zignani et al., content warnings) describes more than 5 million public posts “spanning the entire life of Mastodon” as of that paper. This pass did not find a data-repository page stating a rights-holder permissive licence for that release. It stays unused.

Instance rules and robots vary. Public fetch of one server’s timeline can still be a ToS problem on that server, and it never produces one licence for the whole fediverse.

### 10. DEV

[DEV terms](https://dev.to/terms):

> Permission is granted to temporarily download one copy of the materials (information or software) on DEV Community's web site for personal, non-commercial transitory viewing only. […] under this license you may not: modify or copy the materials; use the materials for any commercial purpose, or for any public display (commercial or non-commercial); […] transfer the materials to another person or "mirror" the materials on any other server.

Authors certify they have rights to what they post. The terms do not grant those rights to readers or to dataset builders. Forem’s AGPL and CLA cover the application code, not the articles. The API is a product for Forem apps. It is not a content licence. No pre-2022 dump with the authors’ permission was found.

### 11. Medium

[Medium Terms of Service](https://policy.medium.com/medium-terms-of-service-9db0094a1e0f):

> You retain your rights to any content you submit, post or display on or through the Services. Unless otherwise agreed in writing, by submitting, posting, or displaying content on or through the Services, you grant Medium a nonexclusive, royalty-free, worldwide, fully paid, and sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, publicly perform and display your content […] on the Services.

> This license applies to our Services only, and does not grant us any permissions outside of our Services.

> These Terms don’t grant you any right, title or interest in the Services, other users’ content on the Services, or Medium trademarks, logos or other brand features.

Stories are often the right length and the right career register. The licence stops at Medium. Scraped article dumps do not change that.

### 12. Twitter / X

The [Sentiment140 card on Hugging Face](https://huggingface.co/datasets/stanfordnlp/sentiment140) says the set was made freely available for research, that no explicit open-source licence is attached, and that users should refer to Twitter’s developer policy. Training split on that card: 1,600,000 tweets. Test split: 498. The original `help.sentiment140.com` page returned 403 on this pass. Example dates published with the file are in 2009. The text is emoticon-labelled public tweets, not professional posts.

The developer policy that applied when researchers were told to share IDs is the 18 May 2017 wording, captured by the Internet Archive from `dev.twitter.com`:

> If you provide Content to third parties, including downloadable datasets of Content or an API that returns Content, you will only distribute or allow download of Tweet IDs, Direct Message IDs, and/or User IDs.

The live X developer-policy URL returned 403 on 2026-10-21, so the current primary wording was not verified. Secondary copies describe the same ID-only rule and a ban on using X content to train a foundation model other than Grok. Either reading blocks a weight table. ID-only deposits also fail the practical test: deleted posts cannot be hydrated, and hydrating the rest copies current X text under current terms.

### 13. 20 Newsgroups

[Jason Rennie’s page](http://qwone.com/~jason/20Newsgroups/) describes “approximately 20,000 newsgroup documents” and three bundles. It gives no permission sentence. A Kaggle mirror marked CC0 is a reuploader’s badge. The bydate split has 18,846 documents. The register is 1990s Usenet across computers, science, recreation, and talk. It is a weak LinkedIn analogue and an unclear licence.

### 14. Common Crawl

[Terms of Use](https://www.commoncrawl.org/terms-of-use), last updated 7 March 2024:

> You also acknowledge and agree that all information, data, text […] contained in, or otherwise made accessible to you in, the Service (collectively the "Crawled Content") may be subject to separate terms of use or terms of service from the owners of such Crawled Content.

> BY USING THE CRAWLED CONTENT, YOU AGREE TO RESPECT THE COPYRIGHTS AND OTHER APPLICABLE RIGHTS OF THIRD PARTIES IN AND TO THE MATERIAL CONTAINED THEREIN.

Section 9 requires the user to indemnify Common Crawl for claims arising from use of crawled content with AI systems, including training. The FAQ’s “as few restrictions as possible” points back at these terms. It is not a CC0 or CC BY grant over the pages. Pre-2022 monthly crawls are real and large. They are not a licensable social corpus. A page that is itself under CC BY can be used under that page’s licence, checked at the source, without relying on the crawl as the licence.

### 15. Company press and newsrooms

No dump of company newsroom or wire copy was found under MIT, Apache, BSD, CC0, or CC BY from the rights holder. Wire services sell the feed and keep the copy. An individual company can put its own blog under CC or, for a UK public body, the OGL; that has to be read on that site. Wikinews is CC BY-SA and falls on the Stack Exchange side of the line. Press-release prose is also a poor match for a personal LinkedIn update: it is institutional, templated, and full of boilerplate a detector could mistake for style.

## What this leaves for weights

The pre-November 2022 sources that can support weights are GOV.UK / blog.gov.uk under OGL v3.0 with attribution, O\*NET 27.0 (August 2022) under CC BY 4.0 with attribution, and U.S. federal text that is actually a government work. None of those is a LinkedIn-shaped social graph. The corpora that do look like career posts (Blog Authorship, Workplace Stack Exchange, career subreddits, DEV, Medium, Hacker News hiring threads) are non-commercial, share-alike, user-copyright, or silent. They can inform a reading of the register. They cannot be the source of shipped weights.
