#!/bin/bash

# Check for API key
if [ -z "$API_KEY" ]; then
  echo "❌ Error: API_KEY environment variable not set"
  echo ""
  echo "Usage: API_KEY=your_api_key ./test-api.sh"
  echo ""
  echo "Or set it in your environment:"
  echo "  export API_KEY=your_api_key"
  echo "  ./test-api.sh"
  exit 1
fi

echo "==================================="
echo "Testing LLM Summarization Service"
echo "==================================="
echo ""

echo "1. Health Check (no auth required)"
echo "-----------------------------------"
curl -s http://localhost:3000/health | jq '.'
echo ""
echo ""

echo "2. Golden Dataset Test (call_001)"
echo "----------------------------------"
echo "Transcript: Password reset call with email mismatch issue"
echo ""

RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "transcript": "Agent: Thank you for calling customer support, how can I help you today?\n\nCustomer: Hi, I'\''m locked out of my account. I forgot my password and the reset link isn'\''t working.\n\nAgent: I'\''m sorry to hear that. Let me help you with that. Can I have your email address please?\n\nCustomer: Sure, it'\''s john.smith@email.com\n\nAgent: Thank you. I can see your account here. The issue is that your email address on file was slightly different - it had an extra dot. I'\''ve updated it now. Let me send you a new password reset link.\n\nCustomer: Oh, that makes sense. I recently changed my email.\n\nAgent: The reset link has been sent to john.smith@email.com. You should receive it within a few minutes. Is there anything else I can help you with?\n\nCustomer: No, that'\''s all. Thank you so much!\n\nAgent: You'\''re welcome! Have a great day."
  }')

echo "Generated Summary:"
echo "$RESPONSE" | jq -r '.summary'
echo ""

echo "Metadata:"
echo "$RESPONSE" | jq '.metadata'
echo ""

echo "Expected Golden Summary:"
echo "Customer was locked out of account due to forgotten password. Reset link wasn't working because email address on file was outdated. Agent updated the email address from incorrect format to john.smith@email.com and resent password reset link. Issue resolved successfully."
echo ""

echo "==================================="
echo "Test Complete"
echo "==================================="
