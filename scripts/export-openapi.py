import os
import sys
import json
from pathlib import Path

# Add agent-platform to sys.path
agent_platform_dir = Path("/Users/dselck/Documents/agent-platform")
if str(agent_platform_dir) not in sys.path:
    sys.path.insert(0, str(agent_platform_dir))

# Set dev environment to avoid JWT key enforcement during spec extraction
os.environ["RUNTIME_ENV"] = "dev"

try:
    from app.main import app
    openapi_schema = app.openapi()

    output_dir = Path(__file__).parent.parent / "data"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "openapi.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(openapi_schema, f, indent=2)

    print(f"Successfully generated OpenAPI specification with {len(openapi_schema.get('paths', {}))} paths at {output_path}")

except Exception as e:
    print(f"Error generating OpenAPI spec: {e}", file=sys.stderr)
    sys.exit(1)
