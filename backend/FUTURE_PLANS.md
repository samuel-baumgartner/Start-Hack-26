# Future AWS Integrations

Remaining AWS features to implement after MCP KB integration and AgentCore Memory.

---

## B. AgentCore Policy / Guardrails

**Goal:** Hard safety limits enforced at model level — LLM hallucination can't bypass.

**AWS Setup:** Create guardrail in Bedrock console with denied topics:
- Never reduce water below 50L
- Always maintain life support power (3kW minimum)
- Never sacrifice all zones simultaneously
- Never set temperature below 5C or above 40C

**Code:** Single-line change — add guardrail config to BedrockModel:
```python
model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    guardrail_id=os.environ.get("GUARDRAIL_ID"),
    guardrail_version=os.environ.get("GUARDRAIL_VERSION", "1"),
    guardrail_trace="enabled",
)
```

**Estimated time:** 15 min code + 15 min AWS console.

---

## C. Bedrock Knowledge Base (RAG)

**Goal:** Upload Syngenta MD files + USDA data to S3, create vector DB for grounded RAG answers.

**AWS Setup:**
1. Create S3 bucket, upload crop/Mars/nutrition MD files
2. Create Bedrock Knowledge Base pointing to S3, using Titan Embeddings v2
3. Sync the KB, note the Knowledge Base ID

**Code Option A** (simple): Set `STRANDS_KNOWLEDGE_BASE_ID` env var, add `from strands_tools.memory import memory` tool.

**Code Option B** (custom): Create `@tool def query_knowledge_base(query)` using `boto3 bedrock-agent-runtime retrieve()`.

**Estimated time:** 1-2 hours (mostly AWS console + data upload).
