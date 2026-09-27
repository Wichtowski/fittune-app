# /// script
# requires-python = ">=3.12"
# dependencies = ["numpy>=2", "scikit-image>=0.25", "shapely>=2"]
# ///
"""Generates src/features/exercises/anatomy.generated.ts from BodyParts3D

    uv run scripts/anatomy/build.py

Downloads BodyParts3D (CC BY 4.0, cached in scripts/anatomy/.cache), keeps the bones
and skeletal muscles, renders orthographic front and back id buffers with Blender and
vectorises the visible part of every structure into SVG paths tagged with the
FitTune muscle group it trains. See scripts/anatomy/README.md
"""

import argparse
import csv
import io
import json
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile
from collections import defaultdict
from pathlib import Path

import numpy as np
from shapely import MultiPolygon, Polygon, box, make_valid
from shapely.ops import unary_union
from skimage import filters, measure

from mapping import COVERS, REVEALED, TENDINOUS_INTERSECTIONS, Structure, classify

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent
CACHE = HERE / ".cache"
OUTPUT = APP / "src/features/exercises/anatomy.generated.ts"

# Release 3.0 is used on purpose: 4.0 dropped latissimus dorsi and rectus abdominis, and
# its body is remodelled, so the two releases cannot be mixed
SOURCE = "https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915"
MESH_ARCHIVE = "BodyParts3D_3.0_obj_99.zip"
PARTS_LIST = "parts_list_e.txt"
PART_OF = "conventional_part_of.txt"

SKELETAL_SYSTEM = "FMA23881"
ARTICULAR_SYSTEM = "FMA23878"
MUSCULAR_SYSTEM = "FMA72954"

# Render resolution, SVG scale and cleanup thresholds
MM_PER_PX = 0.5
SVG_UNITS_PER_MM = 0.2
MIN_AREA_PX = 40
SMOOTH_SIGMA = 1.2
SIMPLIFY_PX = 0.9
INTERSECTION_PX = 3


def download(name: str) -> Path:
    target = CACHE / name
    if not target.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        print(f"downloading {name}")
        with urllib.request.urlopen(f"{SOURCE}/{name}") as response, open(target.with_suffix(".part"), "wb") as out:
            shutil.copyfileobj(response, out)
        target.with_suffix(".part").rename(target)
    return target


def mesh_dir() -> Path:
    directory = CACHE / MESH_ARCHIVE.removesuffix(".zip")
    if not directory.exists():
        directory.mkdir(parents=True)
        with zipfile.ZipFile(download(MESH_ARCHIVE)) as archive:
            # The archive uses Windows path separators
            for entry in archive.infolist():
                name = entry.filename.replace("\\", "/").rsplit("/", 1)[-1]
                if name.endswith(".obj"):
                    (directory / name).write_bytes(archive.read(entry))
    return directory


def read_table(name: str) -> list[list[str]]:
    with open(download(name), newline="") as fh:
        return list(csv.reader(fh, delimiter="\t"))[1:]


def descendants(children: dict[str, list[str]], root: str) -> set[str]:
    found: set[str] = set()
    pending = [root]
    while pending:
        for child in children[pending.pop()]:
            if child not in found:
                found.add(child)
                pending.append(child)
    return found


def select_structures() -> list[Structure]:
    names = {row[0]: row[1] for row in read_table(PARTS_LIST)}
    children: dict[str, list[str]] = defaultdict(list)
    for parent, _, child, _ in read_table(PART_OF):
        children[parent].append(child)
    bones = descendants(children, SKELETAL_SYSTEM) - descendants(children, ARTICULAR_SYSTEM)
    muscles = descendants(children, MUSCULAR_SYSTEM)

    structures = []
    for path in sorted(mesh_dir().glob("*.obj")):
        concept = path.stem
        kind = "bone" if concept in bones else "muscle" if concept in muscles else None
        structure = classify(concept, names[concept], kind, path) if kind else None
        if structure:
            structures.append(structure)
    return structures


def render(structures: list[Structure], work: Path) -> tuple[dict, dict[str, np.ndarray]]:
    covers = [i for i, s in enumerate(structures) if COVERS.search(s.label.lower())]
    manifest = {"mm_per_px": MM_PER_PX, "covers": covers, "meshes": [{"path": str(s.path), "name": s.label, "kind": s.kind, "muscle": s.muscle} for s in structures]}
    (work / "manifest.json").write_text(json.dumps(manifest))
    subprocess.run(
        ["blender", "--background", "--factory-startup", "--python", str(HERE / "render_ids.py"),
         "--", str(work / "manifest.json"), str(work)],
        check=True,
        stdout=subprocess.DEVNULL,
    )
    meta = json.loads((work / "meta.json").read_text())
    revealed = np.array([False] + [bool(REVEALED.search(s.label.lower())) for s in structures])
    buffers = {}
    for view in ("front", "back"):
        ids = np.load(work / f"{view}.npy")
        uncovered = np.load(work / f"{view}_uncovered.npy")
        cover_ids = np.array(covers) + 1
        reveal = np.isin(ids, cover_ids) & revealed[uncovered]
        ids[reveal] = uncovered[reveal]
        buffers[view] = ids
        np.save(work / f"{view}_final.npy", ids)
    return meta, buffers


def mask_polygons(mask: np.ndarray) -> list[Polygon]:
    """Smooth sub-pixel outline of a boolean mask, holes included"""
    padded = np.pad(mask.astype(np.float32), 2)
    smooth = filters.gaussian(padded, sigma=SMOOTH_SIGMA)
    rings = [Polygon(np.fliplr(c) - 2) for c in measure.find_contours(smooth, 0.5) if len(c) >= 4]
    shape = None
    # Even-odd composition turns nested rings into holes
    for ring in sorted(rings, key=lambda r: -r.area):
        ring = make_valid(ring)
        shape = ring if shape is None else shape.symmetric_difference(ring)
    if shape is None or shape.is_empty:
        return []
    shape = shape.simplify(SIMPLIFY_PX)
    parts = shape.geoms if hasattr(shape, "geoms") else [shape]
    return [p for p in parts if isinstance(p, Polygon) and p.area >= MIN_AREA_PX]


def to_path(polygons: list[Polygon], scale: float) -> str:
    def ring(coords) -> str:
        points = [f"{x * scale:.1f} {y * scale:.1f}" for x, y in list(coords)[:-1]]
        return "M" + " ".join(points) + "Z"

    return "".join(ring(p.exterior.coords) + "".join(ring(h.coords) for h in p.interiors) for p in polygons)


def vectorise(structures: list[Structure], ids: np.ndarray, scale: float) -> tuple[str, list[dict]]:
    silhouette = mask_polygons(ids > 0)
    grouped: dict[tuple, list[Polygon]] = defaultdict(list)
    present = np.unique(ids)
    for code in present[present > 0]:
        structure = structures[code - 1]
        key = (structure.label, structure.kind, structure.muscle)
        grouped[key].extend(mask_polygons(ids == code))

    regions = []
    for (label, kind, muscle), polygons in grouped.items():
        if not polygons:
            continue
        merged = unary_union(polygons)
        if label in TENDINOUS_INTERSECTIONS:
            min_x, min_y, max_x, max_y = merged.bounds
            for fraction in TENDINOUS_INTERSECTIONS[label]:
                y = min_y + fraction * (max_y - min_y)
                merged = merged.difference(box(min_x, y - INTERSECTION_PX / 2, max_x, y + INTERSECTION_PX / 2))
        parts = list(merged.geoms) if isinstance(merged, MultiPolygon) else [merged]
        regions.append({"name": label, "kind": kind, "muscle": muscle, "d": to_path(parts, scale), "area": merged.area})
    # Bones first, then muscles, larger first, so the output diff stays stable and small parts sit on top
    regions.sort(key=lambda r: (r["kind"] != "bone", -r["area"], r["name"]))
    return to_path(silhouette, scale), regions


def focus_views(structures: list[Structure], buffers: dict[str, np.ndarray]) -> dict[str, str]:
    """The view that shows the most of each muscle group, used by compact thumbnails"""
    groups = np.array([None] + [s.muscle for s in structures], dtype=object)
    visible: dict[str, dict[str, int]] = defaultdict(dict)
    for view, ids in buffers.items():
        codes, counts = np.unique(ids, return_counts=True)
        for code, count in zip(codes, counts):
            if groups[code]:
                visible[groups[code]][view] = visible[groups[code]].get(view, 0) + int(count)
    return {group: max(views, key=views.get) for group, views in sorted(visible.items())}


def write_module(meta: dict, views: dict[str, tuple[str, list[dict]]], focus: dict[str, str], scale: float) -> None:
    width = round(meta["width"] * scale, 1)
    height = round(meta["height"] * scale, 1)
    out = io.StringIO()
    out.write("// Generated by scripts/anatomy/build.py from BodyParts3D, do not edit by hand\n")
    out.write("// BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution 4.0 International\n\n")
    out.write('import type { AnatomyView, TrainableMuscle, ViewName } from "./anatomy";\n\n')
    out.write(f"export const anatomyViewBox = {{ width: {width}, height: {height} }} as const;\n\n")
    out.write("export const anatomyViews: Record<ViewName, AnatomyView> = {\n")
    for view, (silhouette, regions) in views.items():
        out.write(f"  {view}: {{\n    silhouette: {json.dumps(silhouette)},\n    regions: [\n")
        for r in regions:
            muscle = json.dumps(r["muscle"]) if r["muscle"] else "null"
            out.write(f'      {{ name: {json.dumps(r["name"])}, kind: "{r["kind"]}", muscle: {muscle}, d: {json.dumps(r["d"])} }},\n')
        out.write("    ],\n  },\n")
    out.write("};\n\n")
    out.write("// The view that shows the most of each muscle group\n")
    out.write("export const focusView: Record<TrainableMuscle, ViewName> = {\n")
    for group, view in focus.items():
        out.write(f'  {group}: "{view}",\n')
    out.write("};\n")
    OUTPUT.write_text(out.getvalue())
    print(f"wrote {OUTPUT.relative_to(APP)} ({OUTPUT.stat().st_size // 1024} KB)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--keep", type=Path, help="keep intermediate renders in this directory")
    args = parser.parse_args()

    structures = select_structures()
    print(f"{len(structures)} structures selected")
    work = args.keep or Path(tempfile.mkdtemp(prefix="anatomy-"))
    work.mkdir(parents=True, exist_ok=True)
    meta, buffers = render(structures, work)
    scale = MM_PER_PX * SVG_UNITS_PER_MM
    views = {view: vectorise(structures, ids, scale) for view, ids in buffers.items()}
    write_module(meta, views, focus_views(structures, buffers), scale)
    if not args.keep:
        shutil.rmtree(work)


if __name__ == "__main__":
    main()
