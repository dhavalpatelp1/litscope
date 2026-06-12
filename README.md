# LitScope

**Open literature discovery and citation-trail exploration for researchers.**

LitScope is a lightweight, browser-based tool for searching scholarly literature through **OpenAlex** and **Semantic Scholar**, following references and citing papers, building a personal reading library, and exporting records to reference managers.

## Why LitScope exists

Literature discovery often becomes fragmented across search engines, spreadsheets, notes, and citation managers. LitScope brings the early discovery and screening workflow into one simple interface:

1. Search papers by keyword.
2. Filter by year, citation count, publication type, and open-access availability.
3. Follow references and citing papers to snowball through the literature.
4. Save promising papers to a local reading library.
5. Add notes and reading statuses.
6. Export to CSV, BibTeX, or RIS for Zotero, Mendeley, and EndNote.

## Features

- Search OpenAlex or Semantic Scholar
- Retrieve up to 500 results per query
- Filter by publication year, citations, article type, and open access
- Sort by relevance, citation count, or recency
- Explore references and citing papers
- Save papers into a local reading library
- Assign statuses: **To read**, **Reading**, **Read**, or **Not relevant**
- Add private browser-local notes
- Export CSV, BibTeX, and RIS
- Back up and restore the library as JSON
- No account required
- No API key required
- Single self-contained web application

## Live application

After GitHub Pages is enabled, LitScope will be available at:

```text
https://dhavalpatelp1.github.io/litscope/
```

## Run locally

No installation is required.

1. Download the repository.
2. Open `index.html` in a modern browser.

A local web server may also be used:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## GitHub Pages deployment

This repository includes a GitHub Actions workflow.

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main`, or manually run the deployment workflow.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- OpenAlex API
- Semantic Scholar Graph API
- Browser LocalStorage
- GitHub Pages

## Privacy

- Saved papers and notes stay in the current browser's local storage.
- Search requests are sent directly to OpenAlex or Semantic Scholar.
- No account or API key is required.
- Avoid entering confidential, clinical, personally identifiable, or unpublished sensitive information in notes, especially on a shared computer.
- Use the **Backup** button regularly because clearing browser data can remove the local library.

## Limitations

- Coverage, metadata quality, and ranking depend on the selected scholarly index.
- API rate limits and temporary outages can interrupt searches.
- Metadata and open-access links should be verified against publisher records.
- LitScope supports discovery and early screening; it is not a complete systematic-review management platform.

## Responsible research use

For formal systematic or scoping reviews, document:

- databases and APIs searched;
- full search strings;
- search dates;
- inclusion and exclusion criteria;
- deduplication and screening procedures;
- any AI-assisted or automated steps.

## Development statement

LitScope was conceptualised, specified, tested, and iteratively developed as a researcher-focused workflow tool. Development used human-led design and validation with AI-assisted coding support.

## Author

**Dhaval Patel**  
PhD Candidate in Food Science  
Lincoln University, New Zealand

## Citation

Citation metadata is available in [`CITATION.cff`](CITATION.cff).

## Licence

MIT Licence. See [`LICENSE`](LICENSE).
