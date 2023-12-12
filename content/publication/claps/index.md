---
abstract: "Prompt-based learning has been an effective paradigm for large pretrained language models (LLM), enabling few-shot or even zero-shot learning. Black-box prompt search has received growing interest recently for its distinctive properties of gradient-free optimization, proven particularly useful and powerful for model-as-a-service usage. However, the discrete nature and the complexity of combinatorial optimisation hinder the efficiency of modern black-box approaches. Despite extensive research on search algorithms, the crucial aspect of search space design and optimisation has been largely overlooked. In this paper, we first conduct a sensitivity analysis by prompting LLM, revealing that only a small number of tokens exert a disproportionate amount of influence on LLM predictions. Leveraging this insight, we propose the Clustering and Pruning for Efficient Black-box Prompt Search (ClaPS), a simple black-box search method that first clusters and prunes the search space to focus exclusively on influential prompt tokens. By employing even simple search methods within the pruned search space, ClaPS achieves state-of-the-art performance across various tasks and LLMs, surpassing the performance of complex approaches while significantly reducing search costs. Our findings underscore the critical role of search space design and optimization in enhancing both the usefulness as well as the efficiency of black-box prompt-based learning."
slides: ""
url_pdf: "https://aclanthology.org/2023.findings-emnlp.870"
publication_types:
  - "1"
authors:
  - Han Zhou
  - Xingchen Wan
  - Ivan Vulić
  - Anna Korhonen
author_notes: 
  - "Equal contribution"
  - "Equal contribution"
publication: "Findings of The 2023 Conference on Empirical Methods in Natural Language Processing (EMNLP), 2023"
summary: "Survival of the Most Influential Prompts: Efficient Black-Box Prompt Search via Clustering and Pruning"
url_dataset: ""
url_project: ""
publication_short: "Findings of the Association for Computational Linguistics (EMNLP)"
url_source: ""
url_video: ""
title: "Survival of the Most Influential Prompts: Efficient Black-Box Prompt Search via Clustering and Pruning"
doi: ""
featured: true
tags: []
projects: []
image:
  caption: ""
  focal_point: ""
  preview_only: false
date: 2023-10-07T01:00:00.000Z
url_slides: ""
publishDate: 2023-10-07T01:00:00.000Z
url_poster: ""
url_code: "https://github.com/cambridgeltl/ClaPS"
---
