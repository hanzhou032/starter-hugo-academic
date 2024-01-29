---
abstract: "![Prompting and in-context learning (ICL) have become efficient learning paradigms for large language models (LLMs). However, LLMs suffer from prompt brittleness and various bias factors in the prompt, including but not limited to the formatting, the choice verbalizers, and the ICL examples. To address this problem that results in unexpected performance degradation, calibration methods have been developed to mitigate the effects of these biases while recovering LLM performance. In this work, we first conduct a systematic analysis of the existing calibration methods, where we both provide a unified view and reveal the failure cases. Inspired by these analyses, we propose Batch Calibration (BC), a simple yet intuitive method that controls the contextual bias from the batched input, unifies various prior approaches and effectively addresses the aforementioned issues. BC is zero-shot, inference-only, and incurs negligible additional costs. In the few-shot setup, we further extend BC to allow it to learn the contextual bias from labeled data. We validate the effectiveness of BC with PaLM 2-(S, M, L) and CLIP models and demonstrate state-of-the-art performance over previous calibration baselines across more than 10 natural language understanding and image classification tasks.](featured_animation.gif)"
slides: ""
url_pdf: "https://arxiv.org/pdf/2309.17249.pdf"
publication_types:
  - "1"
authors:
  - admin
  - Xingchen Wan
  - Lev Proleev
  - Diana Mincu
  - Jilin Chen
  - Katherine Heller
  - Subhrajit Roy
publication: "International Conference on Learning Representations (ICLR)"
summary: "Mitigating prompt biases and unifying existing calibration approaches without labeled data."
url_dataset: ""
url_project: ""
publication_short: "International Conference on Learning Representations (ICLR)"
url_source: ""
url_video: ""
title: "Batch Calibration: Rethinking Calibration for In-Context Learning and Prompt Engineering"
doi: ""
featured: true
tags: 
  - "Natural Language Processing"
  - "Large Language Models"
  - "In-Context Learning"
  - "Prompt Engineering"
  - "Calibration"
  - "Responsible AI"
projects: []
image:
  caption: ""
  focal_point: “”
  preview_only: false
date: 2024-01-03T00:00:00.000Z
url_slides: ""
publishDate: 2024-01-03T00:00:00.000Z
url_poster: ""
url_code: ""
links:
- name: "Abstract"
  url: https://arxiv.org/abs/2309.17249
- name: "OpenReview"
  url: https://openreview.net/forum?id=L3FHMoKZcS
- name: "Blog (Google AI)"
  url: https://blog.research.google/2023/10/batch-calibration-rethinking.html
- name: "Talk (NeurIPS Spotlight)"
  url: https://neurips.cc/virtual/2023/76688
---
