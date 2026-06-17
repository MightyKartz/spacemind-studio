#!/usr/bin/env python3
import json
from pathlib import Path

from jsonschema import Draft202012Validator


ROOT = Path(__file__).resolve().parents[1]

PAIRS = [
    ("schemas/project.schema.json", "samples/schema-examples/project.example.json"),
    ("schemas/scheme.schema.json", "samples/schema-examples/scheme.example.json"),
    ("schemas/case.schema.json", "samples/schema-examples/case.example.json"),
    ("schemas/revit-import.schema.json", "samples/schema-examples/revit-import.example.json"),
]


def load(path: str):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def validate_object(schema_path: str, payload) -> list:
    schema = load(schema_path)
    validator = Draft202012Validator(schema)
    return sorted(validator.iter_errors(payload), key=lambda e: list(e.path))


def print_errors(title: str, errors) -> None:
    print(f"FAIL {title}")
    for error in errors:
        path = ".".join(str(part) for part in error.path) or "<root>"
        print(f"  {path}: {error.message}")


def main() -> int:
    for schema_path, example_path in PAIRS:
        example = load(example_path)
        errors = validate_object(schema_path, example)
        if errors:
            print_errors(f"{example_path} against {schema_path}", errors)
            return 1
        print(f"OK {example_path}")

    seed_cases_path = ROOT / "samples/seed-cases.json"
    if seed_cases_path.exists():
        seed_cases = json.loads(seed_cases_path.read_text(encoding="utf-8")).get("cases", [])
        for index, case_item in enumerate(seed_cases, start=1):
            errors = validate_object("schemas/case.schema.json", case_item)
            if errors:
                case_id = case_item.get("caseId", f"case #{index}")
                print_errors(f"samples/seed-cases.json {case_id}", errors)
                return 1
        print(f"OK samples/seed-cases.json ({len(seed_cases)} cases)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
