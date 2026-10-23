"""Run Indra OCR over a pages.json produced by scripts/eval-arabic-ocr.mjs.

Invoked by the harness with the fetched Python environment:
  <venv-python> run_indra.py --pages pages.json --out indra.json --model-dir <models>
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pages", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--threads", type=int, default=4)
    args = parser.parse_args()

    import indra_ocr

    pages = json.loads(Path(args.pages).read_text(encoding="utf-8"))
    try:
        conv = indra_ocr.load(path=args.model_dir, threads=args.threads)
    except TypeError:
        conv = indra_ocr.load(threads=args.threads)

    results = []
    for item in pages:
        started = time.perf_counter()
        record = {
            "id": item["id"],
            "kind": item.get("kind"),
            "file": item.get("file"),
            "page": item.get("page"),
        }
        try:
            page_list = [page for _index, page in conv.convert(item["png"])]
            record["text"] = "\n".join((p.text or "") for p in page_list)
            record["markdown"] = "\n".join((p.markdown or "") for p in page_list)
            record["timings"] = page_list[0].timings if page_list else {}
        except Exception as exc:  # a failed page is data, not a crash
            record["error"] = repr(exc)
        record["ms"] = int((time.perf_counter() - started) * 1000)
        results.append(record)
        print(record["id"], record["ms"], len(record.get("text", "")), flush=True)

    Path(args.out).write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
