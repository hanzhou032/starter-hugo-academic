---
abstract: "Text-to-image (T2I) models, while offering immense creative potential, are highly reliant on human intervention, posing significant usability challenges that often necessitate manual, iterative prompt engineering over often underspecified prompts. This paper introduces Maestro, a novel self-evolving image generation system that enables T2I models to autonomously self-improve generated images through iterative evolution of prompts, using only an initial prompt. Maestro incorporates two key innovations: 1) self-critique, where specialized multimodal LLM (MLLM) agents act as 'critics' to identify weaknesses in generated images, correct for under-specification, and provide interpretable edit signals, which are then integrated by a 'verifier' agent while preserving user intent; and 2) self-evolution, utilizing MLLM-as-a-judge for head-to-head comparisons between iteratively generated images, eschewing problematic images, and evolving creative prompt candidates that align with user intents. Extensive experiments on complex T2I tasks using black-box models demonstrate that Maestro significantly improves image quality over initial prompts and state-of-the-art automated methods, with effectiveness scaling with more advanced MLLM components. This work presents a robust, interpretable, and effective pathway towards self-improving T2I generation."
slides: ""
url_pdf: "https://arxiv.org/pdf/2509.10704.pdf"
publication_types:
  - "3"
authors:
  - Xingchen Wan
  - admin
  - Ruoxi Sun
  - Hootan Nakhost
  - Ke Jiang
  - Rajarishi Sinha
  - Sercan Ö. Arık
publication: "arXiv preprint arXiv:2509.10704"
summary: "Self-evolving T2I through iterative evolution of prompts."
url_dataset: ""
url_project: ""
publication_short: "arXiv preprint arXiv:2509.10704"
url_source: ""
url_video: ""
title: "Maestro: Self-Improving Text-to-Image Generation via Agent Orchestration"
doi: ""
featured: false
tags: 
  - "Computer Vision"
projects: []
image:
  caption: ""
  focal_point: “”
  preview_only: false
date: 2025-09-12T00:00:00.000Z
url_slides: ""
publishDate: 2025-09-12T00:00:00.000Z
url_poster: ""
url_code: ""
links:
- name: "Abstract"
  url: https://arxiv.org/abs/2509.10704
---
