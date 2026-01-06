---
abstract: "Reinforcement Learning with Verifiable Rewards (RLVR) has advanced the reasoning capability of large language models (LLMs), enabling autonomous agents that can conduct effective multi-turn and tool-integrated reasoning. While instructions serve as the primary protocol for defining agents, RLVR typically relies on static and manually designed instructions. However, those instructions may be suboptimal for the base model, and the optimal instruction may change as the agent's policy improves and explores the interaction with the environment. To bridge the gap, we introduce INSPO, a novel Instruction-Policy co-evolution framework that integrates instruction optimization as a dynamic component of the reinforcement learning (RL) loop. INSPO maintains a dynamic population of instruction candidates that are sampled with questions, where reward signals in RL loops are automatically attributed to each instruction, and low performers are periodically pruned. New instructions are generated and verified through an on-policy reflection mechanism, where an LLM-based optimizer analyzes past experience from a replay buffer and evolves more effective strategies given the current policy. We conduct extensive experiments on multi-turn retrieval and reasoning tasks, demonstrating that INSPO substantially outperforms strong baselines relying on static instructions. INSPO discovers innovative instructions that guide the agent toward more strategic reasoning paths, achieving substantial performance gains with only a marginal increase in computational overhead."
slides: ""
url_pdf: "https://arxiv.org/abs/2512.01945"
publication_types:
  - "3"
authors:
  - admin
  - Xingchen Wan
  - Ivan Vulić
  - Anna Korhonen
publication: "arXiv preprint arXiv:2512.01945"
summary: "Dynamic instruction optimization in reinforcement learning for agents."
url_dataset: ""
url_project: ""
publication_short: "arXiv preprint arXiv:2512.01945"
url_source: ""
url_video: ""
title: "Agentic Policy Optimization via Instruction-Policy Co-Evolution"
doi: ""
featured: false
tags: 
  - "Language Agent"
projects: []
image:
  caption: ""
  focal_point: “”
  preview_only: false
date: 2025-12-04T00:00:00.000Z
url_slides: ""
publishDate: 2025-12-04T00:00:00.000Z
url_poster: ""
url_code: ""
links:
- name: "Abstract"
  url: https://arxiv.org/abs/2512.01945
---
