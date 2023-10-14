---
abstract: "Prompting and in-context learning (ICL) have become efficient learning paradigms for large language models (LLMs). However, LLMs suffer from prompt brittleness and various bias factors in the prompt, including but not limited to the formatting, the choice verbalizers, and the ICL examples. To address this problem that results in unexpected performance degradation, calibration methods have been developed to mitigate the effects of these biases while recovering LLM performance. In this work, we first conduct a systematic analysis of the existing calibration methods, where we both provide a unified view and reveal the failure cases. Inspired by these analyses, we propose Batch Calibration (BC), a simple yet intuitive method that controls the contextual bias from the batched input, unifies various prior approaches and effectively addresses the aforementioned issues. BC is zero-shot, inference-only, and incurs negligible additional costs. In the few-shot setup, we further extend BC to allow it to learn the contextual bias from labeled data. We validate the effectiveness of BC with PaLM 2-(S, M, L) and CLIP models and demonstrate state-of-the-art performance over previous calibration baselines across more than 10 natural language understanding and image classification tasks."
slides: ""
url_pdf: "https://arxiv.org/abs/2309.17249"
publication_types:
  - "3"
authors:
  - Han Zhou
  - Xingchen Wan
  - Lev Proleev
  - Diana Mincu
  - Jilin Chen
  - Katherine Heller
  - Subhrajit Roy
publication: "*arXiv:2309.17249*"
summary: "Batch Calibration: Rethinking Calibration for In-Context Learning and Prompt Engineering"
url_dataset: ""
url_project: ""
publication_short: "*arXiv:2309.17249*"
url_source: ""
url_video: ""
title: "Batch Calibration: Rethinking Calibration for In-Context Learning and Prompt Engineering"
doi: ""
featured: true
tags: []
projects: []
image:
  caption: ""
  focal_point: ""
  preview_only: false
date: 2023-09-29T00:00:00.000Z
url_slides: ""
publishDate: 2023-09-29T00:00:00.000Z
url_poster: ""
url_code: ""
links:
- name: Blog
  url: https://blog.research.google/2023/10/batch-calibration-rethinking.html
---
