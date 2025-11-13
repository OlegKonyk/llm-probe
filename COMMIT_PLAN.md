# Commit Plan - LLM Testing Framework
## 4-Week Development Timeline (March 10 - April 6, 2025)

---

## Week 1: Foundation & Basic Backend (March 10-16)

### PR #1: Initial project setup
**Branch:** `feat/initial-setup`
**Commits:**
1. `add workspace config and gitignore` - March 10, 10:00 AM
2. `setup backend with express and typescript` - March 10, 2:30 PM
3. `add basic error handling` - March 11, 9:15 AM

### PR #2: Environment & config foundation
**Branch:** `feat/config-validation`
**Commits:**
4. `add env validator and config types` - March 11, 3:45 PM
5. `add logger utility` - March 12, 10:30 AM
6. `add basic middleware structure` - March 12, 2:00 PM

### PR #3: LLM provider interface
**Branch:** `feat/llm-interface`
**Commits:**
7. `add llm provider interface` - March 13, 9:00 AM
8. `add llm factory pattern` - March 13, 1:30 PM
9. `add token counter utility` - March 13, 4:15 PM

### PR #4: Ollama integration
**Branch:** `feat/ollama-provider`
**Commits:**
10. `implement ollama provider` - March 14, 10:00 AM
11. `add bedrock provider stub` - March 14, 3:00 PM
12. `fix ollama timeout handling` - March 15, 11:00 AM
13. `improve error messages` - March 15, 2:30 PM

---

## Week 2: Core Service & Testing Foundation (March 17-23)

### PR #5: Summarization service
**Branch:** `feat/summarization-service`
**Commits:**
14. `add summarization service` - March 17, 9:30 AM
15. `add prompt builder` - March 17, 2:00 PM
16. `wire up api endpoints` - March 18, 10:15 AM
17. `add request validation schemas` - March 18, 3:30 PM

### PR #6: Golden dataset
**Branch:** `feat/golden-dataset`
**Commits:**
18. `add golden dataset structure` - March 19, 9:00 AM
19. `add sample test cases` - March 19, 1:30 PM
20. `add dataset loader utility` - March 19, 4:00 PM

### PR #7: Test framework basics
**Branch:** `feat/test-framework`
**Commits:**
21. `setup test workspace` - March 20, 10:00 AM
22. `add text similarity metrics` - March 20, 2:30 PM
23. `add summary evaluator` - March 21, 9:30 AM
24. `add basic unit tests` - March 21, 1:00 PM
25. `fix evaluator edge cases` - March 21, 3:30 PM

---

## Week 3: Advanced Testing Types (March 24-30)

### PR #8: Integration & component tests
**Branch:** `feat/integration-tests`
**Commits:**
26. `add integration test helpers` - March 24, 9:00 AM
27. `add api integration tests` - March 24, 1:30 PM
28. `add component tests for evaluator` - March 25, 10:00 AM
29. `add regression tests` - March 25, 2:30 PM

### PR #9: E2E testing
**Branch:** `feat/e2e-tests`
**Commits:**
30. `add e2e test setup` - March 26, 9:30 AM
31. `add live ollama e2e tests` - March 26, 2:00 PM
32. `add golden dataset e2e validation` - March 27, 10:30 AM
33. `improve e2e reliability` - March 27, 3:00 PM

### PR #10: Property-based testing
**Branch:** `feat/property-tests`
**Commits:**
34. `add fast-check dependency` - March 28, 9:00 AM
35. `add property tests for metrics` - March 28, 1:00 PM
36. `add property tests for evaluator` - March 28, 4:00 PM
37. `tune property test parameters` - March 29, 10:00 AM

---

## Week 4: Security, Performance & Polish (March 31 - April 6)

### PR #11: Security testing
**Branch:** `feat/security-tests`
**Commits:**
38. `add security test framework` - March 31, 9:30 AM
39. `add prompt injection tests` - March 31, 1:30 PM
40. `add pii detection` - April 1, 10:00 AM
41. `add threat scoring` - April 1, 2:30 PM
42. `add api key auth middleware` - April 2, 9:00 AM
43. `add auth provider interfaces` - April 2, 1:00 PM

### PR #12: Performance & monitoring
**Branch:** `feat/performance-monitoring`
**Commits:**
44. `add performance metrics tracker` - April 3, 9:30 AM
45. `add monitoring framework` - April 3, 1:00 PM
46. `add regression detection` - April 3, 4:00 PM
47. `add performance tests` - April 4, 10:00 AM
48. `add monitoring tests` - April 4, 2:00 PM

### PR #13: Python framework
**Branch:** `feat/python-framework`
**Commits:**
49. `add python test framework structure` - April 5, 9:00 AM
50. `add python evaluators and metrics` - April 5, 1:00 PM
51. `add python unit tests` - April 5, 3:30 PM

### PR #14: Docker & deployment
**Branch:** `feat/docker-deployment`
**Commits:**
52. `add docker support` - April 6, 10:00 AM
53. `add env examples and deployment configs` - April 6, 1:30 PM
54. `add hugging face deployment` - April 6, 3:00 PM

### PR #15: Core documentation
**Branch:** `feat/core-docs`
**Commits:**
55. `add comprehensive readme` - April 7, 9:00 AM
56. `add architecture docs` - April 7, 1:00 PM
57. `add testing guide and contributing guide` - April 7, 3:30 PM

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
