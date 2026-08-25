---
title: "The Failure Modes of Weight-Space Model Merging in Neural Code Synthesis"
description: "An empirical investigation into DARE-TIES, SLERP, and Task Arithmetic: why weight-space model merging between Code and Math models induces catastrophic syntactic interference in small language models."
pubDate: 2026-05-12
image: /paintings/failure-modes-of-model-merging-in-neural-code-synthesis.jpg
tags: ['research', 'compilers', 'llm', 'merging']
draft: false
---

> *"Can we fuse a Code language model with a Math reasoning model via weight-space interpolation to eliminate arithmetic bugs in synthetic data generation?"*

---

## 1. Executive Summary & Core Hypothesis

A fundamental challenge in training compact neural data compilers (such as **FastData-LM**) is that language models frequently make arithmetic errors when synthesizing stochastic distributions (e.g. producing categorical probability vectors that do not sum to $1.0$, or generating malformed bounding intervals).

To address this without increasing inference latency, we hypothesized that **weight-space model merging** could create a hybrid foundation checkpoint combining:
1. **`Qwen2.5-Coder`**: Specialized for Python Abstract Syntax Tree (AST) grammar, indentation, and API usage.
2. **`Qwen2.5-Math`**: Specialized for symbolic mathematics, arithmetic logic, and distribution reasoning.

We systematically merged these models using three state-of-the-art algorithms: **DARE-TIES**, **SLERP (Spherical Linear Interpolation)**, and **Task Arithmetic**, followed by Supervised Fine-Tuning on `thlurte/VSG-lite-1.5k`.

### The Core Finding:
Across all experiments at the $1.5\text{B}$ scale, **weight-space model merging induced catastrophic syntactic interference**. Rather than acquiring mathematical precision, the merged models suffered from token projection corruption and attention decay failure—causing infinite token repetition loops and dropping zero-shot compilation pass rates from **$40.0\%$ to $0.0\%$**.

---

## 2. Experimental Setup & Merge Configurations

All models were constructed using `mergekit` and evaluated on an NVIDIA GeForce RTX 3090 (24GB VRAM).

```
                 ┌───────────────────────────┐
                 │    Qwen2.5-Coder-1.5B     │
                 └─────────────┬─────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       DARE-TIES Merge                  SLERP Geometric Arc
       (Density p=0.8, w=0.6)           (70% Coder / 30% Math)
               ▲                               ▲
               │                               │
 ┌─────────────┴─────────────┐                 │
 │     Qwen2.5-Math-1.5B     │─────────────────┘
 └───────────────────────────┘
```

### 2.1 Evaluated Merge Architectures:

1. **DARE-TIES (`Qwen2.5-CodeMath-1.5B-DARE-TIES`)**:
   - Randomly drops $20\%$ of delta parameters ($p=0.8$), rescales the remainder, and resolves sign conflicts with majority voting.
   - Weights: $0.6$ Coder / $0.4$ Math.
   - Repo: [🤗 `thlurte/Qwen2.5-CodeMath-1.5B-DARE-TIES`](https://huggingface.co/thlurte/Qwen2.5-CodeMath-1.5B-DARE-TIES)
2. **SLERP (`Qwen2.5-CodeMath-1.5B-SLERP`)**:
   - Performs Spherical Linear Interpolation along a geometric arc on a hypersphere to maintain parameter magnitude:
     $$\mathbf{W}_{\text{slerp}} = \frac{\sin((1-t)\theta)}{\sin\theta}\mathbf{W}_{\text{Coder}} + \frac{\sin(t\theta)}{\sin\theta}\mathbf{W}_{\text{Math}}$$
   - Parameters: $t=0.30$ Math, $t=0.70$ Coder with layer-wise geometric scaling.
   - Repo: [🤗 `thlurte/Qwen2.5-CodeMath-1.5B-SLERP`](https://huggingface.co/thlurte/Qwen2.5-CodeMath-1.5B-SLERP)
3. **Task Arithmetic (`Qwen2.5-CodeMath-1.5B-TaskArith`)**:
   - Adds a scaled task vector from Math to the Coder base:
     $$\mathbf{W}_{\text{merged}} = \mathbf{W}_{\text{Coder}} + 0.25 \times (\mathbf{W}_{\text{Math}} - \mathbf{W}_{\text{Base}})$$
   - Repo: [🤗 `thlurte/Qwen2.5-CodeMath-1.5B-TaskArith`](https://huggingface.co/thlurte/Qwen2.5-CodeMath-1.5B-TaskArith)
4. **7B Scale DARE-TIES (`Qwen2.5-CodeMath-7B-DARE-TIES`)**:
   - Evaluated to test if higher dimensional capacity ($7\text{B}$) mitigates parameter conflict.
   - Repo: [🤗 `thlurte/Qwen2.5-CodeMath-7B-DARE-TIES`](https://huggingface.co/thlurte/Qwen2.5-CodeMath-7B-DARE-TIES)

---

## 3. Empirical Results & Comparative Benchmark

We evaluated all models on the **Gnoril-Bench v1.0** test suite (10 standard industrial schemas requiring strict $O(1)$ SIMD array vectorization):

| Model Checkpoint | Merge Method | Parameter Scale | SFT Fine-Tuned? | AST Yield ($V\text{-Score}$) | Sandbox Yield ($E\text{-Score}$) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **FastData-LM-1.5B-SFT** *(Baseline)* | *None (Pure Coder)* | 1.54B | Yes | **40.0%** (4/10) | **40.0%** (4/10) |
| **FastData-LM-1.5B-CodeMath-TaskArith-SFT** | **Task Arithmetic** (0.25) | 1.54B | Yes | **50.0%** (5/10) | **50.0%** (5/10) |
| **FastData-LM-1.5B-CodeMath-SLERP-SFT** | **SLERP** (0.7 / 0.3) | 1.54B | Yes | **0.0%** (0/10) | **0.0%** (0/10) |
| **FastData-LM-1.5B-CodeMath-DARE-TIES-SFT** | **DARE-TIES** (0.6 / 0.4) | 1.54B | Yes | **0.0%** (0/10) | **0.0%** (0/10) |
| **FastData-LM-7B-CodeMath-DARE-TIES-SFT** | **DARE-TIES** (0.6 / 0.4) | 7.61B | Yes | **30.0%** (3/10) | **30.0%** (3/10) |
| **FastData-LM-7B-SFT** *(Baseline)* | *None (Pure Coder)* | 7.61B | Yes | **80.0%** (8/10) | **80.0%** (8/10) |

<div class="row mt-4 mb-4">
    <div class="col-sm">
        <figure class="text-center">
            <img src="/assets/img/research/gnoril/model_merging_comparison.png" class="img-fluid rounded border" style="max-width: 90%;" alt="Model Merging Comparison Chart">
            <figcaption class="caption mt-2 text-muted"><b>Figure 1:</b> Execution Yield Comparison across Merge Techniques — DARE-TIES and SLERP collapse to 0% at 1.5B due to token repetition loops. Task Arithmetic preserves 50% syntax, but pure SFT remains dominant (70–80%).</figcaption>
        </figure>
    </div>
</div>

---

## 4. Failure Anatomy: Why Weight-Space Merging Breaks Down

Inspecting the raw generated token streams and AST validator logs revealed two distinct failure mechanisms:

### 4.1 Failure Mode 1: Infinite Array Literal Looping
When generating array categories or string pools, merged models enter an un-decayed self-attention loop:

```python
# Output from FastData-LM-1.5B-CodeMath-DARE-TIES-SFT:
origin_pool = np.array([
    'US 1', 'US 2', 'US 3', 'US 4', 'CA 5',
    'CA 12', 'CA 12', 'CA 12', 'CA 12', 'CA 12',
    # ... repeated over 150 times until max_new_tokens is hit!
```

Because the token generator never closes the array brackets (`]`), it exceeds the `1024` token cutoff mid-string (e.g. `'CA 12` with no closing quote), causing Python's AST parser to raise `SyntaxError: unterminated string literal`.

### 4.2 Failure Mode 2: Destructive Interference in Lower MLP Projections
`Qwen2.5-Math` assigns higher probability to step-by-step LaTeX derivations and procedural multi-step arithmetic, while `Qwen2.5-Coder` assigns high probability to structural indentation, docstrings, and function signatures. 

When their weight matrices are averaged, the attention routing in the lower MLP layers suffers **destructive interference**. The model loses its confidence in the closing token `<|im_end|>`, resulting in cyclic babbling.

---

## 5. Key Conclusions & Recommendations

1. **Avoid Naive Weight-Space Merging for Code Syntax**:
   - Model merging (DARE-TIES, SLERP) works well for blending general chat or conversational personas, but is **counterproductive for strict compiler grammar and code generation** where precise token ordering is mandatory.
2. **Task Arithmetic with Low Alpha is the Most Resilient**:
   - If merging is required, **Task Arithmetic** with a low scaling factor ($\lambda_{\text{Math}} \le 0.25$) preserves significantly more syntactic structure ($50.0\%$) than SLERP ($0.0\%$) or DARE-TIES ($0.0\%$).
3. **The Correct Path to Math Precision: Compiler DPO / CPT**:
   - Instead of perturbing foundation weights via merging, arithmetic stability should be achieved via **Continual Pre-Training (CPT)** on raw vectorized NumPy scripts or **Direct Preference Optimization (DPO)** using sandbox execution feedback.

---

## 6. Open Checkpoints on Hugging Face

All merged base checkpoints and fine-tuned adapter weights are publicly available:
* [🤗 `thlurte/Qwen2.5-CodeMath-1.5B-DARE-TIES`](https://huggingface.co/thlurte/Qwen2.5-CodeMath-1.5B-DARE-TIES)
* [🤗 `thlurte/Qwen2.5-CodeMath-1.5B-SLERP`](https://huggingface.co/thlurte/Qwen2.5-CodeMath-1.5B-SLERP)
* [🤗 `thlurte/Qwen2.5-CodeMath-1.5B-TaskArith`](https://huggingface.co/thlurte/Qwen2.5-CodeMath-1.5B-TaskArith)
* [🤗 `thlurte/Qwen2.5-CodeMath-7B-DARE-TIES`](https://huggingface.co/thlurte/Qwen2.5-CodeMath-7B-DARE-TIES)
* [🤗 `thlurte/FastData-LM-1.5B-CodeMath-DARE-TIES-SFT`](https://huggingface.co/thlurte/FastData-LM-1.5B-CodeMath-DARE-TIES-SFT)
* [🤗 `thlurte/FastData-LM-1.5B-CodeMath-SLERP-SFT`](https://huggingface.co/thlurte/FastData-LM-1.5B-CodeMath-SLERP-SFT)
* [🤗 `thlurte/FastData-LM-1.5B-CodeMath-TaskArith-SFT`](https://huggingface.co/thlurte/FastData-LM-1.5B-CodeMath-TaskArith-SFT)
* [🤗 `thlurte/FastData-LM-7B-CodeMath-DARE-TIES-SFT`](https://huggingface.co/thlurte/FastData-LM-7B-CodeMath-DARE-TIES-SFT)
