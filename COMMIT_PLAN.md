# Commit Plan - LLM Testing Framework
## 4-Week Development Timeline (April 21 - May 18, 2025)

---

## Week 1: Foundation & Basic Backend (April 21-27)

### PR #1: Initial project setup
**Branch:** `feat/initial-setup`
**Commits:**
1. `add workspace config and gitignore` - April 21, 10:00 AM
2. `setup backend with express and typescript` - April 21, 2:30 PM
3. `add basic error handling` - April 22, 9:15 AM

### PR #2: Environment & config foundation
**Branch:** `feat/config-validation`
**Commits:**
4. `add env validator and config types` - April 22, 3:45 PM
5. `add logger utility` - April 23, 10:30 AM
6. `add basic middleware structure` - April 23, 2:00 PM

### PR #3: LLM provider interface
**Branch:** `feat/llm-interface`
**Commits:**
7. `add llm provider interface` - April 24, 9:00 AM
8. `add llm factory pattern` - April 24, 1:30 PM
9. `add token counter utility` - April 24, 4:15 PM

### PR #4: Ollama integration
**Branch:** `feat/ollama-provider`
**Commits:**
10. `implement ollama provider` - April 25, 10:00 AM
11. `add bedrock provider stub` - April 25, 3:00 PM
12. `fix ollama timeout handling` - April 26, 11:00 AM
13. `improve error messages` - April 26, 2:30 PM

---

## Week 2: Core Service & Testing Foundation (April 28 - May 4)

### PR #5: Summarization service
**Branch:** `feat/summarization-service`
**Commits:**
14. `add summarization service` - April 28, 9:30 AM
15. `add prompt builder` - April 28, 2:00 PM
16. `wire up api endpoints` - April 29, 10:15 AM
17. `add request validation schemas` - April 29, 3:30 PM

### PR #6: Golden dataset
**Branch:** `feat/golden-dataset`
**Commits:**
18. `add golden dataset structure` - April 30, 9:00 AM
19. `add sample test cases` - April 30, 1:30 PM
20. `add dataset loader utility` - April 30, 4:00 PM

### PR #7: Test framework basics
**Branch:** `feat/test-framework`
**Commits:**
21. `setup test workspace` - May 1, 10:00 AM
22. `add text similarity metrics` - May 1, 2:30 PM
23. `add summary evaluator` - May 2, 9:30 AM
24. `add basic unit tests` - May 2, 1:00 PM
25. `fix evaluator edge cases` - May 2, 3:30 PM

---

## Week 3: Advanced Testing Types (May 5-11)

### PR #8: Integration & component tests
**Branch:** `feat/integration-tests`
**Commits:**
26. `add integration test helpers` - May 5, 9:00 AM
27. `add api integration tests` - May 5, 1:30 PM
28. `add component tests for evaluator` - May 6, 10:00 AM
29. `add regression tests` - May 6, 2:30 PM

### PR #9: E2E testing
**Branch:** `feat/e2e-tests`
**Commits:**
30. `add e2e test setup` - May 7, 9:30 AM
31. `add live ollama e2e tests` - May 7, 2:00 PM
32. `add golden dataset e2e validation` - May 8, 10:30 AM
33. `improve e2e reliability` - May 8, 3:00 PM

### PR #10: Property-based testing
**Branch:** `feat/property-tests`
**Commits:**
34. `add fast-check dependency` - May 9, 9:00 AM
35. `add property tests for metrics` - May 9, 1:00 PM
36. `add property tests for evaluator` - May 9, 4:00 PM
37. `tune property test parameters` - May 10, 10:00 AM

---

## Week 4: Security, Performance & Polish (May 12-18)

### PR #11: Security testing
**Branch:** `feat/security-tests`
**Commits:**
38. `add security test framework` - May 12, 9:30 AM
39. `add prompt injection tests` - May 12, 1:30 PM
40. `add pii detection` - May 13, 10:00 AM
41. `add threat scoring` - May 13, 2:30 PM
42. `add api key auth middleware` - May 14, 9:00 AM
43. `add auth provider interfaces` - May 14, 1:00 PM

### PR #12: Performance & monitoring
**Branch:** `feat/performance-monitoring`
**Commits:**
44. `add performance metrics tracker` - May 15, 9:30 AM
45. `add monitoring framework` - May 15, 1:00 PM
46. `add regression detection` - May 15, 4:00 PM
47. `add performance tests` - May 16, 10:00 AM
48. `add monitoring tests` - May 16, 2:00 PM

### PR #13: Python framework
**Branch:** `feat/python-framework`
**Commits:**
49. `add python test framework structure` - May 17, 9:00 AM
50. `add python evaluators and metrics` - May 17, 1:00 PM
51. `add python unit tests` - May 17, 3:30 PM

### PR #14: Docker & deployment
**Branch:** `feat/docker-deployment`
**Commits:**
52. `add docker support` - May 18, 10:00 AM
53. `add env examples and deployment configs` - May 18, 1:30 PM
54. `add hugging face deployment` - May 18, 3:00 PM

### PR #15: Core documentation
**Branch:** `feat/core-docs`
**Commits:**
55. `add comprehensive readme` - May 19, 9:00 AM
56. `add architecture docs` - May 19, 1:00 PM
57. `add testing guide and contributing guide` - May 19, 3:30 PM

---

## Summary
- **Total commits:** 57
- **Total PRs:** 15
- **Timeline:** 4 weeks
- **Average:** ~2 commits/day (realistic for side project)
- **PR frequency:** 2-3 per week

## Commit Message Style
- Keep it casual but professional
- Use imperative mood: "add", "fix", "improve"
- No periods at end
- Keep under 50 chars when possible
- Occasional longer messages for complex changes
