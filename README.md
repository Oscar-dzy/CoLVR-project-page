# CoLVR · Paper homepage

Research project page for **CoLVR: Enhancing Exploratory Latent Visual Reasoning via Contrastive Optimization**.

**NeurIPS 2026**

[Paper](https://arxiv.org/abs/2605.08802) · [OpenReview](https://openreview.net/forum?id=FdggkQpSHq) · [Code](https://github.com/Oscar-dzy/CoLVR/tree/main) · [Models](https://huggingface.co/collections/Oscar-dzy/colvr-models) · [Datasets](https://huggingface.co/datasets/Oscar-dzy/CoLVR-datasets)

## Local preview

Requires Node.js 18 or newer. The website has no runtime package dependencies.

```sh
npm run dev
```

Open http://127.0.0.1:4173. Set the `PORT` environment variable to use another port.

## Website files

- `index.html`: paper title, authors, affiliations, method, resources and citation.
- `styles.css`: responsive layout, typography and animation styles.
- `app.js`: interactive comparisons, reported experiment data, figure viewer and citation copying.
- `assets/figures/`: paper figures in WebP and original PDF formats.
- `assets/institutions/`: institution logos and their source credits.
- `assets/colvr.bib`: downloadable conference citation.

All images are served locally. The site does not require external fonts, a CDN or a backend API. The animated latent trajectories are conceptual illustrations, not model outputs.

## Validation

```sh
npm run check
```

For browser checks, install Playwright and its Chromium browser in your development environment, start the preview server, and run:

```sh
node scripts/verify.mjs
```

Alternatively, set `PLAYWRIGHT_MODULE` to an existing Playwright installation and `BROWSER_CHANNEL` to an installed browser channel such as `msedge`. Screenshots and the check report are saved in the ignored `tmp/qa/` directory.

## GitHub Pages compatibility

The site uses relative asset paths and supports both root domains and repository subpaths. GitHub Pages deployment is not enabled by this repository's initial commit.

To publish the static website later, serve these files while preserving their directory structure:

```text
index.html
styles.css
app.js
.nojekyll
assets/
```

Keep the PDF figures alongside the images so that the original-figure links remain available. Once a site URL is selected, a canonical URL and an absolute Open Graph image URL can be added.

## Citation

```bibtex
@inproceedings{ding2026colvr,
  title = {CoLVR: Enhancing Exploratory Latent Visual Reasoning via Contrastive Optimization},
  author = {Ziyang Ding and Linjian Meng and Yiming Wu and Yuhan Li and Yuhao Liu and Zhen Zhao},
  booktitle = {The Fortieth Annual Conference on Neural Information Processing Systems},
  year = {2026},
  url = {https://openreview.net/forum?id=FdggkQpSHq}
}
```
