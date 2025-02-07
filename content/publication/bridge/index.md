---
abstract: "Recent advances in long-context large language models (LLMs) have led to the emerging paradigm of many-shot in-context learning (ICL), where it is observed that scaling many more demonstrating examples beyond the conventional few-shot setup in the context can lead to performance benefits. However, despite its promise, it is unclear what aspects dominate the benefits and whether simply scaling to more examples is the most effective way of improving many-shot ICL. In this work, we first provide an analysis of the factors driving many-shot ICL, and we find that 1) many-shot performance can still be attributed to often a few disproportionately influential examples and 2) identifying such influential examples ('optimize') and using them as demonstrations to regenerate new examples ('generate') can lead to further improvements. Inspired by the findings, we propose BRIDGE, an algorithm that alternates between the optimize step with Bayesian optimization to discover the influential sets of examples and the generate step to reuse this set to expand the reasoning paths of the examples back to the many-shot regime automatically. On Gemini, Claude, and Mistral LLMs of different sizes, we show that BRIDGE to significant improvements across a diverse set of tasks, including symbolic reasoning, numerical reasoning, and code generation."
slides: ""
url_pdf: "https://arxiv.org/pdf/2502.00330.pdf"
publication_types:
  - "1"
authors:
  - Xingchen Wan
  - admin
  - Ruoxi Sun
  - Sercan Ö. Arık
publication: "International Conference on Learning Representations (ICLR)"
summary: "From Few to Many: Self-Improving Many-Shot Reasoners Through Iterative Optimization and Generation"
url_dataset: ""
url_project: ""
publication_short: "International Conference on Learning Representations (ICLR)"
url_source: ""
url_video: ""
title: "From Few to Many: Self-Improving Many-Shot Reasoners Through Iterative Optimization and Generation"
doi: ""
featured: true
tags: 
  - "Natural Language Processing"
  - "Large Language Models"
  - "In-Context Learning"
projects: []
image:
  caption: ""
  focal_point: “”
  preview_only: false
date: 2025-02-03T00:00:00.000Z
url_slides: ""
publishDate: 2025-02-03T00:00:00.000Z
url_poster: ""
url_code: ""
links:
- name: "Abstract"
  url: https://arxiv.org/abs/2502.00330
- name: "OpenReview"
  url: https://openreview.net/forum?id=JBXO05r4AV
---
