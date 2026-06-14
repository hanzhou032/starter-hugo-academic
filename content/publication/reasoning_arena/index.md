---
abstract: "Reinforcement learning with verifiable rewards (RLVR) has become a leading paradigm for improving the reasoning ability of large language models through outcome-based supervision. However, verifiable rewards frequently become uninformative at the group level: when all sampled traces of a given prompt receive identical rewards, group-relative advantage estimation provides no gradient signal, even though the traces may differ substantially in reasoning quality. We propose Reasoning Arena, an adaptive training framework that routes such non-diverse reward groups to a judge system instead of discarding them. Beyond examining the final answer, Reasoning Arena constructs trace tournaments, where reasoning traces are compared head-to-head to expose finer-grained preferences within the group, converting reasoning quality into rich relative reward signals. To make reward estimation efficient, rather than exhaustively comparing every pair, each new trace is evaluated against a small, dynamically updated pool of previously generated traces as anchors to efficiently establish a relative ranking. We then fit a Bradley-Terry model on the incomplete comparison graph, enabling scalable RL integration without quadratic pairwise comparisons. Empirical results demonstrate that Reasoning Arena consistently outperforms the RLVR baseline by 7.6% on average in competition mathematics and coding benchmarks. By converting otherwise wasted zero-advantage samples into useful gradient updates, our method accelerates training by 27% to 41%, saving nearly 50% of generation compute, and substantially improves overall reasoning performance."
slides: ""
url_pdf: "https://arxiv.org/abs/2606.09380"
publication_types:
  - "3"
authors:
  - admin
  - Adam Yang
  - Laurence Aitchison
  - Anna Korhonen
  - Albert Jiang
publication: "arXiv preprint arXiv:2606.09380"
summary: "Trace Tournaments When Verifiable Rewards Fall Short."
url_dataset: ""
url_project: ""
publication_short: "arXiv preprint arXiv:2606.09380"
url_source: ""
url_video: ""
title: "Reasoning Arena: Trace Tournaments When Verifiable Rewards Fall Short"
doi: ""
featured: false
tags: 
  - "Reinforcement Learning"
projects: []
image:
  caption: ""
  focal_point: “”
  preview_only: false
date: 2026-06-08T00:00:00.000Z
url_slides: ""
publishDate: 2026-06-08T00:00:00.000Z
url_poster: ""
url_code: ""
links:
- name: "Abstract"
  url: https://arxiv.org/abs/2606.09380
---
