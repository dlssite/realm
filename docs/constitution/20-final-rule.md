# 20. Final Rule

> **This platform will succeed not by the quantity of its features, but by the quality of its architecture.**

## The Priority Hierarchy
- **Simple** > Clever
- **Modular** > Monolithic
- **Owned Code** > Heavy External Dependencies
- **Consistent UX** > Feature Quantity
- **Long-term Maintainability** > Rushed Prototypes
- **Proven Stack** > Framework Chasing
- **Explicit Patterns** > Magical Abstractions

---

## The Solo Developer Validation Test
Before adding any feature, abstraction layer, or dependency, ask:

1. *Can I understand and modify this code effortlessly 6 months from now?*
2. *Can an AI coding assistant process this file context in a single prompt?*
3. *Does this deliver immediate value without compromising architectural simplicity?*
4. *Does this make the codebase harder to maintain or refactor?*
5. *Am I building this because it is needed, or because it is novel?*

If the answer to any question indicates unnecessary complexity, simplify immediately.

---

## Constitutional Amendment Process
This document is an evolving blueprint. To amend:
1. Draft an Architecture Decision Record (ADR).
2. Update the corresponding `docs/constitution/*.md` file.
3. Update dependent code implementations accordingly.
