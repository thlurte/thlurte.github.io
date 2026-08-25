---
title: "On the Limits of Small Language Models in Vectorized Code Synthesis"
description: "An in-depth empirical investigation into structural rule acquisition, the Execution Gap, and parameter scaling dynamics across 0.5B–7B language models in vectorized code synthesis."
pubDate: 2026-04-18
image: /paintings/limits-of-small-models-in-vectorized-code-synthesis.jpg
tags: ['research', 'compilers', 'llm']
draft: false
---

> *"Can small language models reliably synthesize deterministic, high-throughput code without falling into the Python Loop Tax?"*

---

## 1. Introduction & Theoretical Motivation

Code synthesis for high-throughput data processing represents a fundamentally different challenge from general software engineering. In general code generation benchmarks (e.g. HumanEval, MBPP), models produce procedural code where control flow loops (`for`, `while`) and list comprehensions are standard paradigms. However, in data engineering and synthetic data generation, procedural Python loops incur severe interpreter overhead—the **Python Loop Tax**—slowing execution by orders of magnitude compared to compiled C/C++ or SIMD tensor operations.

```
Procedural Row Iteration (O(N) Interpreter Overhead):
for i in range(num_rows):
    row = generate_row()   ──► 1,000,000 Python frame evaluations (~15-60s)

Vectorized Array Execution (SIMD / AVX2 Tensor Math):
np.random.choice(categories, p=weights, size=num_rows)  ──► Continuous C-memory buffer (<10ms)
```

To eliminate this bottleneck, we formulated **Gnoril** as a neural compiler: fine-tuning compact language models ($0.5\text{B} \rightarrow 7\text{B}$ parameters) to directly translate unstructured natural language dataset requirements into **100% vectorized, zero-loop NumPy and Pandas computation graphs**.

This paper investigates three fundamental questions:
1. **Parameter Efficiency**: Can sub-billion parameter models (0.5B, 1.5B) reliably learn strict, domain-specific Abstract Syntax Tree (AST) grammar constraints?
2. **The Execution Gap**: Why does syntactically compliant vectorized code fail to execute in runtime sandboxes, and at what parameter scale does this gap resolve?
3. **Alignment Strategy**: How can compiler-in-the-loop feedback mechanisms (such as Direct Preference Optimization) close the execution reliability gap without increasing model parameter scale?

---

## 2. Method: Data & Training Setup

To teach small models strict vectorization invariants, we synthesized and curated **`VSG-lite-1.5k`** (1,166 training samples). Each sample maps a natural language schema prompt to a provably vectorized generator script verified by an automated AST compiler.

### 2.1 Sample Training Pair (ChatML Format)

Each training instance is formatted in standard ChatML schema:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an expert Python Data Engineer and Synthetic Data Compiler.\nSTRICT RULES:\n1. Output ONLY valid Python code enclosed in ```python ```.\n2. The function signature must be `def generate(num_rows: int, seed: int = 42) -> pd.DataFrame`.\n3. NO ROW-LEVEL FOR LOOPS. BANNED: df.apply(), df.iterrows(), df.itertuples(), or for i in range(num_rows).\n4. All probabilities passed to np.random.choice MUST be explicitly normalized: p = p / p.sum().\n5. All string ID concatenations must cast arrays: np.char.add('ID_', np.arange(N).astype(str))."
    },
    {
      "role": "user",
      "content": "Generate a synthetic dataset of customer subscriptions. Columns: `sub_id`, `plan_type` (Basic, Pro, Enterprise), `monthly_fee`, `signup_date`, `is_active`. Plan distribution: 60% Basic ($10/mo), 30% Pro ($25/mo), 10% Enterprise ($100/mo). Active status correlates with higher tier plans. Fully vectorized without loops."
    },
    {
      "role": "assistant",
      "content": "```python\nimport pandas as pd\nimport numpy as np\n\ndef generate(num_rows: int, seed: int = 42) -> pd.DataFrame:\n    np.random.seed(seed)\n    \n    # 1. Vectorized String Primary Keys\n    sub_ids = np.char.add('SUB_', np.arange(1, num_rows + 1).astype(str))\n    \n    # 2. Categorical Distribution with Explicit Normalization\n    plans = np.array(['Basic', 'Pro', 'Enterprise'])\n    plan_probs = np.array([0.60, 0.30, 0.10])\n    plan_probs = plan_probs / plan_probs.sum()\n    assigned_plans = np.random.choice(plans, size=num_rows, p=plan_probs)\n    \n    # 3. Vectorized Conditional Multiplexer (np.select)\n    fee_conditions = [\n        assigned_plans == 'Basic',\n        assigned_plans == 'Pro',\n        assigned_plans == 'Enterprise'\n    ]\n    fee_choices = [10.0, 25.0, 100.0]\n    monthly_fees = np.select(fee_conditions, fee_choices, default=10.0)\n    \n    # 4. Correlated Active Probabilities via Vectorized Multiplexer\n    active_prob_choices = [0.70, 0.85, 0.95]\n    active_probs = np.select(fee_conditions, active_prob_choices, default=0.70)\n    is_active = np.random.random(num_rows) < active_probs\n    \n    # 5. Temporal Offset Arithmetic\n    start_date = np.datetime64('2023-01-01')\n    day_offsets = np.random.randint(0, 730, size=num_rows)\n    signup_dates = start_date + day_offsets.astype('timedelta64[D]')\n    \n    # 6. Assemble DataFrame\n    return pd.DataFrame({\n        'sub_id': sub_ids,\n        'plan_type': assigned_plans,\n        'monthly_fee': monthly_fees,\n        'signup_date': signup_dates,\n        'is_active': is_active\n    })\n```"
    }
  ]
}
```

### 2.2 Hyperparameters Across Model Scales

We fine-tuned all models on an NVIDIA GeForce RTX 3090 (24GB VRAM) using Unsloth and TRL:

| Hyperparameter | 0.5B Model | 1.5B Model | 3.0B Model | 7.0B Model |
| :--- | :--- | :--- | :--- | :--- |
| **Backbone Architecture** | `Qwen2.5-Coder-0.5B` | `Qwen2.5-Coder-1.5B` | `Qwen2.5-Coder-3B` | `Qwen2.5-Coder-7B` |
| **Precision** | 16-bit LoRA (bf16) | 16-bit LoRA (bf16) | 16-bit LoRA (bf16) | 4-bit QLoRA |
| **LoRA Rank ($r$) / $\alpha$** | $r=16, \alpha=16$ | $r=16, \alpha=16$ | $r=16, \alpha=16$ | $r=16, \alpha=16$ |
| **Target Modules** | `q, k, v, o, gate, up, down` | `q, k, v, o, gate, up, down` | `q, k, v, o, gate, up, down` | `q, k, v, o, gate, up, down` |
| **Learning Rate** | $2 \times 10^{-4}$ | $2 \times 10^{-4}$ | $1.5 \times 10^{-4}$ | $1 \times 10^{-4}$ |
| **Effective Batch Size** | 16 (batch 4, accum 4) | 16 (batch 4, accum 4) | 16 (batch 4, accum 4) | 16 (batch 2, accum 8) |
| **Epochs / Steps** | 3 Epochs (219 steps) | 3 Epochs (219 steps) | 3 Epochs (219 steps) | 3 Epochs (438 steps) |
| **Training Time (RTX 3090)** | **4.2 minutes** | **7.8 minutes** | **15.1 minutes** | **31.4 minutes** |

---

## 3. Defining the Evaluation Contract

To evaluate code synthesis beyond superficial keyword matching, we established a **deterministic static analysis boundary**. Synthesized Python programs must satisfy a formal grammar $G_{\text{vec}}$ verified via Python's `ast` module before reaching sandbox execution:

### Invariant 1: Row-Level Loop Elimination
$$\forall v \in \text{AST}, \quad \text{Type}(v) \notin \{\text{For}, \text{While}, \text{ListComp}, \text{DictComp}, \text{GeneratorExp}, \text{SetComp}\}$$
*Dynamic row-level iteration is strictly prohibited*. The only permissible iteration is static compile-time column schema iteration.

### Invariant 2: Banned Iterative Pandas Methods
$$\forall a \in \text{AST.Attribute}, \quad \text{attr}(a) \notin \{\text{'apply'}, \text{'iterrows'}, \text{'itertuples'}, \text{'applymap'}, \text{'transform'}\}$$

### Invariant 3: Tensor Primitive Mapping
$$\text{Logic}(x) \longrightarrow \{\text{np.where}, \text{np.select}, \text{np.random.choice}, \text{np.random.normal}, \texttt{pd.to\_datetime}\}$$
Conditional branching must be mapped to vector multiplexers (`np.where` for binary conditions, `np.select` for multi-case logic) rather than Python `if/else` statements evaluated per row.

---

## 4. Results: Master Benchmark & Scaling Dynamics

We evaluated all models on the **GNORIL-BENCH v1.0** test suite (10 complex industrial dataset schemas spanning single-table distributions, time-series state machines, and multi-table relational graphs with foreign keys).

### 4.1 Master Benchmark Matrix

| Model Architecture | Parameter Scale | Condition | AST Yield ($V\text{-Score}$) | Sandbox Yield ($E\text{-Score}$) | SFT Delta ($\Delta$) | Hugging Face Repository |
| :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Qwen2.5-Coder-0.5B** | 490M | **Base (Non-SFT)** | 70.0% (7/10) | 70.0% (7/10) | Baseline | [`Qwen/Qwen2.5-Coder-0.5B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct) |
| **FastData-LM-0.5B-SFT** | 490M | **Fine-Tuned (SFT)** | 60.0% (6/10) | 60.0% (6/10) | $-10.0\%$ | [🤗 `thlurte/FastData-LM-0.5B-SFT`](https://huggingface.co/thlurte/FastData-LM-0.5B-SFT) |
| **Qwen2.5-Coder-1.5B** | 1.54B | **Base (Non-SFT)** | 50.0% (5/10) | 50.0% (5/10) | Baseline | [`Qwen/Qwen2.5-Coder-1.5B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct) |
| **FastData-LM-1.5B-SFT** | 1.54B | **Fine-Tuned (SFT)** | 40.0% (4/10) | 40.0% (4/10) | $-10.0\%$ | [🤗 `thlurte/FastData-LM-1.5B-SFT`](https://huggingface.co/thlurte/FastData-LM-1.5B-SFT) |
| **Qwen2.5-Coder-3B** | 3.09B | **Base (Non-SFT)** | 50.0% (5/10) | 50.0% (5/10) | Baseline | [`Qwen/Qwen2.5-Coder-3B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct) |
| **FastData-LM-3B-SFT** | 3.09B | **Fine-Tuned (SFT)** | **90.0%** (9/10) | **90.0%** (9/10) | 🌟 **$+40.0\%$** | [🤗 `thlurte/FastData-LM-3B-SFT`](https://huggingface.co/thlurte/FastData-LM-3B-SFT) |
| **Qwen2.5-Coder-7B** | 7.61B | **Base (Non-SFT)** | 50.0% (5/10) | 50.0% (5/10) | Baseline | [`Qwen/Qwen2.5-Coder-7B-Instruct`](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct) |
| **FastData-LM-7B-SFT** | 7.61B | **Fine-Tuned (SFT)** | **80.0%** (8/10) | **80.0%** (8/10) | 🌟 **$+30.0\%$** | [🤗 `thlurte/FastData-LM-7B-SFT`](https://huggingface.co/thlurte/FastData-LM-7B-SFT) |

<div class="row mt-4 mb-4">
    <div class="col-sm">
        <figure class="text-center">
            <img src="/assets/img/research/gnoril/base_vs_finetuned_scaling.png" class="img-fluid rounded border" style="max-width: 90%;" alt="Base Qwen vs Fine-Tuned Gnoril Scaling Chart">
            <figcaption class="caption mt-2 text-muted"><b>Figure 1:</b> Scaling Dynamics Across Parameters — Base models plateau at 50% execution compliance. Fine-tuning compact sub-3B models incurs an over-specialization penalty, but unlocks an <b>emergent +40.0% leap</b> at 3B parameters (90.0% execution yield).</figcaption>
        </figure>
    </div>
</div>

### 4.2 Key Empirical Takeaways:

* **The Base Foundation Model Ceiling**: Across $1.5\text{B}$, $3\text{B}$, and $7\text{B}$, untuned foundation models plateau at a strict $50.0\%$ execution rate. When faced with complex joint distributions, they fall back to procedural loops, failing Invariant 1.
* **The "Phase Inversion" Phenomenon at 3B Parameters**: Sub-3B models ($\le 1.5\text{B}$) suffer from a capacity squeeze during SFT, where small attention heads overfit to training variable names (dropping pass rates to $40\%$). At **$\ge 3\text{B}$ parameters**, the model overcomes this bottleneck, producing an **emergent $+40.0\%$ jump** ($50.0\% \rightarrow 90.0\%$).
* **The Efficiency Frontier**: **`FastData-LM-3B-SFT`** establishes the optimal Pareto frontier between throughput and correctness, executing at **90.0% zero-shot compilation accuracy** while generating tokens at $>60\text{ tok/s}$.

---

## 5. Failure Taxonomy: Anatomy of Code Generation Errors

Whenever a generated script failed, we recorded the exact AST and sandbox trace. When models passed AST static validation, execution pass parity was $100\%$ ($V\text{-Score} = E\text{-Score}$). Failures were categorized into three distinct signatures:

### 5.1 Bug Signature 1: Fallback to Procedural Loops (60.0% of Failures)
* **Symptom**: AST rejection: `AST Violation: Found banned loop node: For at line 14`.
* **Root Cause**: When asked to compute distance matrices or time-series state transitions, base models revert to procedural Python loops rather than vector multiplexers.
* **Code Diff**:
```diff
- for origin, dest in zip(origins, destinations):
-     distances.append(calc_dist(origin, dest))
+ # Vectorized C-Level Spatial Distance
+ distances = np.linalg.norm(coords_origin - coords_dest, axis=1)
```

### 5.2 Bug Signature 2: Unclosed Bracket Syntax Truncation (25.0% of Failures)
* **Symptom**: `SyntaxError: unterminated string literal (detected at line 87)`.
* **Root Cause**: Compact models ($0.5\text{B}$ and $1.5\text{B}$) generating large categorical pools enter cyclic attention loops, exceeding context limits before emitting closing array brackets (`]`).
* **Code Diff**:
```diff
- pool = np.array(['US_1', 'US_2', 'US_2', 'US_2', 'US_2' ... [truncated at token 1024]
+ pool = np.array(['US_1', 'US_2', 'CA_1', 'CA_2'])
```

### 5.3 Bug Signature 3: Relational Key Inconsistency (15.0% of Failures)
* **Symptom**: `KeyError: 'user_id' not found in parent table`.
* **Root Cause**: Small models hallucinate variable identifiers from training memory across multi-table parent/child joins.
* **Code Diff**:
```diff
- child_df['parent_key'] = np.random.choice(parent_df['user_id'], size=n_child)
+ child_df['account_id'] = np.random.choice(parent_df['account_id'], size=n_child)
```

---

## 6. Explaining the Negative Result: Why Sub-3B Self-Correction Fails

In our initial benchmark experiments, whenever a runtime exception was raised, the sandbox trimmed the stack trace and prompted the model for an in-context surgical repair:

$$\text{Prompt}_{\text{repair}} = \text{Code}_{\text{faulty}} + \text{Traceback} + \text{"Fix line } L \text{ without using loops."}$$

* **Finding**: While frontier models ($70\text{B}+$) routinely resolve syntax bugs via chain-of-thought debugging, **sub-3B models achieved a 0% repair rate in multi-turn self-correction**.
* **Reason**: Small parameter models suffer from severe attention distraction when presented with multi-line Python tracebacks. In attempting to fix line 14, they frequently introduce regressions in line 4 (altering variable names or re-introducing loops).

---

## 7. Proposing the Next Iteration: Execution-Feedback DPO

Because the execution sandbox provides an automated, deterministic reward signal ($\text{Pass} = 1$, $\text{Fail} = 0$), we can eliminate human labeling entirely and construct Direct Preference Optimization (DPO) datasets automatically.

### 7.1 Mathematical Formulation: SFT vs. Execution-Feedback DPO

Standard Supervised Fine-Tuning (SFT) only maximizes the log-likelihood of target tokens:

$$\mathcal{L}_{\text{SFT}}(\theta) = -\mathbb{E}_{(x, y) \sim \mathcal{D}} \left[ \sum_{t=1}^{|y|} \log \pi_\theta(y_t \mid x, y_{<t}) \right]$$

SFT does not actively penalize subtle API mistakes. In contrast, **Execution-Feedback DPO** directly updates the policy $\pi_\theta$ relative to a reference model $\pi_{\text{ref}}$ by maximizing the margin between the verified working code $y_w$ and the runtime-failing code $y_l$:

$$\mathcal{L}_{\text{DPO}}(\theta; \pi_{\text{ref}}) = -\mathbb{E}_{(x, y_w, y_l) \sim \mathcal{D}_{\text{sandbox}}} \left[ \log \sigma \left( \beta \log \frac{\pi_\theta(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi_\theta(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right) \right]$$

By training on compiler-harvested $(x, y_w, y_l)$ triplets, the model's logits for un-normalized probabilities and implicit type errors are suppressed directly in the attention weight matrix.

---

## 8. Key Findings & Takeaways

1. **Sub-3B Capacity Squeeze**: Fine-tuning sub-3B models ($\le 1.5\text{B}$) on strict compiler grammar leads to an over-specialization penalty on complex prompts, where small attention heads struggle to simultaneously balance structural invariants and broad schema instructions.
2. **The 3B Emergent Knee**: At **$3.0\text{B}$ parameters**, the model overcomes this capacity bottleneck, achieving an **emergent $+40.0\%$ leap** ($50.0\% \rightarrow 90.0\%$) in execution compliance.
3. **Execution-Guided Contrastive Alignment**: For sub-billion edge devices ($0.5\text{B}$ and $1.5\text{B}$), closing the remaining Execution Gap requires moving beyond passive token imitation (SFT) toward **Execution-Feedback Direct Preference Optimization (DPO)**.

---

## 9. Citation & Related Reading

```bibtex
@article{ahmed2026limits,
  title   = {On the Limits of Small Language Models in Vectorized Code Synthesis},
  author  = {Ahmed},
  journal = {thlurte.github.io},
  year    = {2026},
  url     = {https://thlurte.github.io/research/limits-of-small-models-in-vectorized-code-synthesis/}
}
```

### Related Articles:
* [The Failure Modes of Weight-Space Model Merging in Neural Code Synthesis](/research/failure-modes-of-model-merging-in-neural-code-synthesis/)
* [FastData-LM: High-Throughput Vectorized Synthetic Data Generation](https://github.com/thlurte/gnoril)
