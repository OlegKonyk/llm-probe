// Security detection framework for LLM applications (prompt injection, PII leakage, jailbreaking)

const MAX_INPUT_LENGTH = 100000;
const MAX_OUTPUT_LENGTH = 50000;

const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}\b/g,
  phone: /\b(\+1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  streetAddress: /\b\d+\s+[A-Za-z\s]+?(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b/gi,
  apiKey: /\b(?:sk_|pk_|api_)[A-Za-z0-9_-]{20,}\b/g,
  awsKey: /\bAKIA[0-9A-Z]{16}\b/g,
};

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions|prompts|commands)/i,
  /disregard\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions|prompts)/i,
  /forget\s+(?:all\s+)?(?:previous|above|prior)\s+(?:instructions|prompts)/i,
  /you\s+are\s+now\s+(?:a|an)\s+\w+/i,
  /pretend\s+(?:you\s+are|to\s+be)\s+(?:a|an)\s+\w+/i,
  /act\s+as\s+(?:if\s+)?(?:you\s+are|you're)\s+(?:a|an)\s+\w+/i,
  /what\s+(?:are|were|is)\s+your\s+(?:original|initial|system)\s+(?:instructions|prompt|rules)/i,
  /repeat\s+(?:your\s+)?(?:instructions|prompt|rules|initial\s+rules)/i,
  /show\s+(?:me\s+)?your\s+(?:system\s+)?prompt/i,
  /"""\s*\n\s*(?:Ignore|Disregard|Forget)/i,
  /###\s*(?:New\s+)?(?:Instructions|Prompt)/i,
  /traduire\s+en\s+français/i,
  /traduzir\s+para\s+português/i,
  /output\s+(?:in|as)\s+(?:json|xml|html|sql|python|javascript)/i,
];

const JAILBREAK_PATTERNS = [
  /do\s+anything\s+now/i,
  /DAN\s+mode/i,
  /in\s+a\s+hypothetical\s+(?:world|scenario|situation)/i,
  /imagine\s+(?:a\s+)?(?:world|scenario)\s+where/i,
  /for\s+(?:educational|research|academic)\s+purposes\s+only/i,
  /this\s+is\s+(?:just|only)\s+(?:a|for)\s+(?:test|simulation|game)/i,
  /ignore\s+safety/i,
  /bypass\s+(?:filter|restriction|guideline)/i,
];

export interface SecurityDetectionResult {
  safe: boolean;
  violations: SecurityViolation[];
  riskScore: number;
  summary: string;
}

export interface SecurityViolation {
  type: 'prompt_injection' | 'pii_leakage' | 'jailbreak' | 'data_exfiltration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  matchedPattern: string;
  location: string;
  recommendation: string;
}

export class SecurityDetector {
  analyzeInput(input: string): SecurityDetectionResult {
    const violations: SecurityViolation[] = [];

    if (input.length > MAX_INPUT_LENGTH) {
      violations.push({
        type: 'data_exfiltration',
        severity: 'high',
        description: `Input exceeds maximum length (${MAX_INPUT_LENGTH} characters) - potential DoS/ReDoS attack`,
        matchedPattern: `${input.length} characters`,
        location: 'input',
        recommendation: 'Reject or truncate input to prevent ReDoS attacks.',
      });

      return this.buildResult(violations);
    }

    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        violations.push({
          type: 'prompt_injection',
          severity: 'high',
          description: 'Potential prompt injection attempt detected',
          matchedPattern: match[0],
          location: 'input',
          recommendation: 'Sanitize or reject this input. User may be attempting to override system instructions.',
        });
      }
    }

    for (const pattern of JAILBREAK_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        violations.push({
          type: 'jailbreak',
          severity: 'high',
          description: 'Potential jailbreak attempt detected',
          matchedPattern: match[0],
          location: 'input',
          recommendation: 'Block this request. User may be attempting to bypass safety guidelines.',
        });
      }
    }

    return this.buildResult(violations);
  }

  analyzeOutput(output: string): SecurityDetectionResult {
    const violations: SecurityViolation[] = [];

    if (output.length > MAX_OUTPUT_LENGTH) {
      violations.push({
        type: 'data_exfiltration',
        severity: 'medium',
        description: `Output exceeds maximum length (${MAX_OUTPUT_LENGTH} characters) - potential data exfiltration`,
        matchedPattern: `${output.length} characters`,
        location: 'output',
        recommendation: 'Truncate output or investigate why LLM generated excessive text.',
      });

      return this.buildResult(violations);
    }

    for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = Array.from(output.matchAll(pattern));
      if (matches.length > 0) {
        const severity = this.getPIISeverity(piiType);

        for (const match of matches) {
          violations.push({
            type: 'pii_leakage',
            severity,
            description: `${this.formatPIIType(piiType)} detected in output`,
            matchedPattern: this.maskSensitiveData(match[0]),
            location: 'output',
            recommendation: `Remove or redact ${this.formatPIIType(piiType)} before returning to user.`,
          });
        }
      }
    }

    return this.buildResult(violations);
  }

  analyzeTransaction(input: string, output: string): SecurityDetectionResult {
    const inputAnalysis = this.analyzeInput(input);
    const outputAnalysis = this.analyzeOutput(output);

    const allViolations = [...inputAnalysis.violations, ...outputAnalysis.violations];
    const riskScore = this.calculateRiskScore(allViolations);

    return {
      safe: allViolations.length === 0,
      violations: allViolations,
      riskScore,
      summary: this.generateSummary(allViolations, riskScore),
    };
  }

  private buildResult(violations: SecurityViolation[]): SecurityDetectionResult {
    const riskScore = this.calculateRiskScore(violations);

    return {
      safe: violations.length === 0,
      violations,
      riskScore,
      summary: this.generateSummary(violations, riskScore),
    };
  }

  private calculateRiskScore(violations: SecurityViolation[]): number {
    const weights = {
      critical: 40,
      high: 25,
      medium: 15,
      low: 10,
    };

    const score = violations.reduce((total, violation) => {
      return total + weights[violation.severity];
    }, 0);

    return Math.min(score, 100);
  }

  private generateSummary(violations: SecurityViolation[], riskScore: number): string {
    if (violations.length === 0) {
      return 'No security violations detected.';
    }

    const byType = violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const parts = Object.entries(byType).map(([type, count]) =>
      `${count} ${type.replace(/_/g, ' ')}${count > 1 ? 's' : ''}`
    );

    return `Detected: ${parts.join(', ')}. Risk score: ${riskScore}/100.`;
  }

  private getPIISeverity(piiType: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalPII = ['ssn', 'creditCard', 'awsKey'];
    const highPII = ['email', 'phone', 'apiKey'];
    const mediumPII = ['streetAddress'];

    if (criticalPII.includes(piiType)) return 'critical';
    if (highPII.includes(piiType)) return 'high';
    if (mediumPII.includes(piiType)) return 'medium';
    return 'low';
  }

  private formatPIIType(piiType: string): string {
    const formats: Record<string, string> = {
      email: 'Email address',
      ssn: 'Social Security Number',
      creditCard: 'Credit card number',
      phone: 'Phone number',
      ipAddress: 'IP address',
      streetAddress: 'Street address',
      apiKey: 'API key',
      awsKey: 'AWS access key',
    };

    return formats[piiType] || piiType;
  }

  private maskSensitiveData(value: string): string {
    if (value.length <= 4) {
      return '***';
    }

    const start = value.substring(0, 2);
    const end = value.substring(value.length - 2);
    const masked = '*'.repeat(Math.min(value.length - 4, 8));

    return `${start}${masked}${end}`;
  }
}
