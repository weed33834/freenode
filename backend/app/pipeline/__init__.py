"""Pipeline package — adapts the existing scripts/ modules for the backend.

Rather than duplicating logic, we import from the project's `scripts/` directory
so there is a single source of truth for crawling/parsing/verifying/formatting.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the project-root scripts/ directory is importable.
_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_SCRIPTS_DIR = _PROJECT_ROOT / "scripts"
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))
