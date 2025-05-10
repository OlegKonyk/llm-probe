"""
Security Detection Framework

Detects security vulnerabilities in LLM applications including:
- Prompt injection attempts
- PII leakage in outputs
- Jailbreak attempts
- Data exfiltration

Used for:
- Input validation before sending to LLM
- Output scanning before returning to users
- Transaction-level security analysis
- Security monitoring and alerting
"""

import re
from dataclasses import dataclass
from typing import Literal

MAX_INPUT_LENGTH = 100_000
MAX_OUTPUT_LENGTH = 50_000

PII_PATTERNS = {
    'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
    'creditCard': re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}\b'),
    'phone': re.compile(r'\b(\+1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'),
    'ipAddress': re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
    'streetAddress': re.compile(
        r'\b\d+\s+[A-Za-z\s]+?(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct)\b',
        re.IGNORECASE
    ),
    'apiKey': re.compile(r'\b(?:sk_|pk_|api_)[A-Za-z0-9_-]{20,}\b'),
    'awsKey': re.compile(r'\bAKIA[0-9A-Z]{16}\b'),
}

PROMPT_INJECTION_PATTERNS = [
    re.compile(
        r'ignore\s+(?:all\s+)?(?:previous|above|prior)\s+'
        r'(?:instructions|prompts|commands)',
        re.I
    ),
    re.compile(
        r'disregard\s+(?:all\s+)?(?:previous|above|prior)\s+'
        r'(?:instructions|prompts)',
        re.I
    ),
    re.compile(
        r'forget\s+(?:all\s+)?(?:previous|above|prior)\s+'
        r'(?:instructions|prompts)',
        re.I
    ),
    re.compile(r'you\s+are\s+now\s+(?:a|an)\s+\w+', re.I),
    re.compile(r'pretend\s+(?:you\s+are|to\s+be)\s+(?:a|an)\s+\w+', re.I),
    re.compile(
        r'act\s+as\s+(?:if\s+)?(?:you\s+are|you\'re)\s+(?:a|an)\s+\w+',
        re.I
    ),
    re.compile(
        r'what\s+(?:are|were|is)\s+your\s+(?:original|initial|system)\s+'
        r'(?:instructions|prompt|rules)',
        re.I
    ),
    re.compile(r'repeat\s+(?:your\s+)?(?:instructions|prompt|rules|initial\s+rules)', re.I),
    re.compile(r'show\s+(?:me\s+)?your\s+(?:system\s+)?prompt', re.I),
    re.compile(r'"""\s*\n\s*(?:Ignore|Disregard|Forget)', re.I),
    re.compile(r'###\s*(?:New\s+)?(?:Instructions|Prompt)', re.I),
    re.compile(r'traduire\s+en\s+français', re.I),
    re.compile(r'traduzir\s+para\s+português', re.I),
    re.compile(r'output\s+(?:in|as)\s+(?:json|xml|html|sql|python|javascript)', re.I),
]

JAILBREAK_PATTERNS = [
    re.compile(r'do\s+anything\s+now', re.I),
    re.compile(r'DAN\s+mode', re.I),
    re.compile(r'in\s+a\s+hypothetical\s+(?:world|scenario|situation)', re.I),
    re.compile(r'imagine\s+(?:a\s+)?(?:world|scenario)\s+where', re.I),
    re.compile(r'for\s+(?:educational|research|academic)\s+purposes\s+only', re.I),
    re.compile(r'this\s+is\s+(?:just|only)\s+(?:a|for)\s+(?:test|simulation|game)', re.I),
    re.compile(r'ignore\s+safety', re.I),
    re.compile(r'bypass\s+(?:filter|restriction|guideline)', re.I),
]

ViolationType = Literal['prompt_injection', 'pii_leakage', 'jailbreak', 'data_exfiltration']
Severity = Literal['low', 'medium', 'high', 'critical']


@dataclass
class SecurityViolation:
    """Security violation details"""
    type: ViolationType
    severity: Severity
    description: str
    matched_pattern: str
    location: str
    recommendation: str


@dataclass
class SecurityDetectionResult:
    """Security analysis result"""
    safe: bool
    violations: list[SecurityViolation]
    risk_score: int
    summary: str


class SecurityDetector:
    """
    Security Detector

    Analyzes inputs and outputs for security vulnerabilities
    """

    def analyze_input(self, input_text: str) -> SecurityDetectionResult:
        """
        Analyze Input for Security Vulnerabilities

        Checks for:
        - Prompt injection attempts
        - Jailbreak attempts
        - Excessive input length (DoS/ReDoS)

        Args:
            input_text: User input to analyze

        Returns:
            Security detection result
        """
        violations: list[SecurityViolation] = []

        if len(input_text) > MAX_INPUT_LENGTH:
            violations.append(SecurityViolation(
                type='data_exfiltration',
                severity='high',
                description=(
                    f'Input exceeds maximum length ({MAX_INPUT_LENGTH} characters) '
                    f'- potential DoS/ReDoS attack'
                ),
                matched_pattern=f'{len(input_text)} characters',
                location='input',
                recommendation='Reject or truncate input to prevent ReDoS attacks.'
            ))
            return self._build_result(violations)

        # Check for prompt injection
        for pattern in PROMPT_INJECTION_PATTERNS:
            match = pattern.search(input_text)
            if match:
                violations.append(SecurityViolation(
                    type='prompt_injection',
                    severity='high',
                    description='Potential prompt injection attempt detected',
                    matched_pattern=match.group(0),
                    location='input',
                    recommendation=(
                        'Sanitize or reject this input. User may be attempting '
                        'to override system instructions.'
                    )
                ))

        # Check for jailbreak attempts
        for pattern in JAILBREAK_PATTERNS:
            match = pattern.search(input_text)
            if match:
                violations.append(SecurityViolation(
                    type='jailbreak',
                    severity='high',
                    description='Potential jailbreak attempt detected',
                    matched_pattern=match.group(0),
                    location='input',
                    recommendation=(
                        'Block this request. User may be attempting '
                        'to bypass safety guidelines.'
                    )
                ))

        return self._build_result(violations)

    def analyze_output(self, output_text: str) -> SecurityDetectionResult:
        """
        Analyze Output for Security Vulnerabilities

        Checks for:
        - PII leakage
        - Excessive output length

        Args:
            output_text: LLM output to analyze

        Returns:
            Security detection result
        """
        violations: list[SecurityViolation] = []

        if len(output_text) > MAX_OUTPUT_LENGTH:
            violations.append(SecurityViolation(
                type='data_exfiltration',
                severity='medium',
                description=(
                    f'Output exceeds maximum length ({MAX_OUTPUT_LENGTH} characters) '
                    f'- potential data exfiltration'
                ),
                matched_pattern=f'{len(output_text)} characters',
                location='output',
                recommendation=(
                    'Truncate output or investigate why LLM generated excessive text.'
                )
            ))
            return self._build_result(violations)

        # Check for PII leakage
        for pii_type, pattern in PII_PATTERNS.items():
            matches = list(pattern.finditer(output_text))
            if matches:
                severity = self._get_pii_severity(pii_type)
                for match in matches:
                    violations.append(SecurityViolation(
                        type='pii_leakage',
                        severity=severity,
                        description=(
                            f'{self._format_pii_type(pii_type)} detected in output'
                        ),
                        matched_pattern=self._mask_sensitive_data(match.group(0)),
                        location='output',
                        recommendation=(
                            f'Remove or redact {self._format_pii_type(pii_type)} '
                            f'before returning to user.'
                        )
                    ))

        return self._build_result(violations)

    def analyze_transaction(self, input_text: str, output_text: str) -> SecurityDetectionResult:
        """
        Analyze Complete Transaction

        Performs both input and output analysis

        Args:
            input_text: User input
            output_text: LLM output

        Returns:
            Combined security detection result
        """
        input_analysis = self.analyze_input(input_text)
        output_analysis = self.analyze_output(output_text)

        all_violations = input_analysis.violations + output_analysis.violations
        risk_score = self._calculate_risk_score(all_violations)

        return SecurityDetectionResult(
            safe=len(all_violations) == 0,
            violations=all_violations,
            risk_score=risk_score,
            summary=self._generate_summary(all_violations, risk_score)
        )

    def _build_result(self, violations: list[SecurityViolation]) -> SecurityDetectionResult:
        """Build security detection result"""
        risk_score = self._calculate_risk_score(violations)

        return SecurityDetectionResult(
            safe=len(violations) == 0,
            violations=violations,
            risk_score=risk_score,
            summary=self._generate_summary(violations, risk_score)
        )

    def _calculate_risk_score(self, violations: list[SecurityViolation]) -> int:
        """Calculate risk score from violations"""
        weights = {
            'critical': 40,
            'high': 25,
            'medium': 15,
            'low': 10
        }

        score = sum(weights[v.severity] for v in violations)
        return min(score, 100)

    def _generate_summary(self, violations: list[SecurityViolation], risk_score: int) -> str:
        """Generate human-readable summary"""
        if not violations:
            return 'No security violations detected.'

        by_type: dict[str, int] = {}
        for v in violations:
            by_type[v.type] = by_type.get(v.type, 0) + 1

        parts = [
            f"{count} {vtype.replace('_', ' ')}{'s' if count > 1 else ''}"
            for vtype, count in by_type.items()
        ]

        return f"Detected: {', '.join(parts)}. Risk score: {risk_score}/100."

    def _get_pii_severity(self, pii_type: str) -> Severity:
        """Get severity level for PII type"""
        critical_pii = ['ssn', 'creditCard', 'awsKey']
        high_pii = ['email', 'phone', 'apiKey']
        medium_pii = ['streetAddress']

        if pii_type in critical_pii:
            return 'critical'
        if pii_type in high_pii:
            return 'high'
        if pii_type in medium_pii:
            return 'medium'
        return 'low'

    def _format_pii_type(self, pii_type: str) -> str:
        """Format PII type for display"""
        formats = {
            'email': 'Email address',
            'ssn': 'Social Security Number',
            'creditCard': 'Credit card number',
            'phone': 'Phone number',
            'ipAddress': 'IP address',
            'streetAddress': 'Street address',
            'apiKey': 'API key',
            'awsKey': 'AWS access key',
        }
        return formats.get(pii_type, pii_type)

    def _mask_sensitive_data(self, value: str) -> str:
        """Mask sensitive data for logging"""
        if len(value) <= 4:
            return '***'

        start = value[:2]
        end = value[-2:]
        masked = '*' * min(len(value) - 4, 8)

        return f'{start}{masked}{end}'
