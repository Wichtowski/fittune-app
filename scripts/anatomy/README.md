# Anatomy pipeline

Generates `src/features/exercises/anatomy.generated.ts` and `public/anatomy/bodyparts3d-3.glb` from the same selected structures and muscle group mapping.
The GLB is Draco compressed, limited to 3 MB, and fetched only when the exercise detail viewer opens.
The 3D model is projected from real anatomy.
The app's 2D figure now uses the separate MuscleMap pipeline described below.

```bash
make anatomy        # same as: uv run scripts/anatomy/build.py
```

Requirements: `uv` and `blender` (5.x) on `PATH`.
The first run downloads about 130 MB into `scripts/anatomy/.cache/` (gitignored), later runs take about a minute.
Run it only when the mapping or rendering changes, and commit both regenerated files.
Use `uv run scripts/anatomy/build.py --3d-only` when iterating on the 3D export alone.

## Source data

[BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/) by the Database Center for Life Science (DBCLS), licensed under [CC BY 4.0](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html).
The attribution is shown in the 3D viewer and in the generated module header.
The OBJ files of both 3.0 and 4.0 still carry the older CC BY-SA 2.1 Japan header.
The current DBCLS license page grants CC BY 4.0 for "part or whole of this database", which we read as superseding those headers for the archived 3.0 release too (Human Atlas reads the same headers in 4.0 that way).
If that ever needs to be stricter, ShareAlike would apply only to the generated figure module, not to the app code.

The pipeline uses release 3.0 (`20110915`) on purpose.
Release 4.0 has no latissimus dorsi or rectus abdominis meshes, and its body was remodelled, so meshes from the two releases do not line up and cannot be mixed.

## How it works

1. `build.py` reads the part-of tree and keeps the skeletal system (minus joints) and the muscular system
2. `mapping.py` drops structures that do not belong in the figure (eye, larynx and facial expression muscles) and maps muscle names to FitTune muscle groups
3. `render_ids.py` runs inside Blender and renders orthographic front and back views where every mesh has a unique flat colour, so each pixel identifies the frontmost structure
4. A second pass hides the obliques, whose meshes include the rectus sheath, so the rectus abdominis can be revealed the way atlases draw it
5. `build.py` smooths each structure's visible pixels into polygons, merges left and right sides, and writes SVG paths plus the view that best shows each muscle group
6. `export_glb.py` joins structures by FitTune group, decimates each mesh, and exports the group in GLB node extras for the viewer

## Changing the mapping

Edit `GROUPS` in `mapping.py`, rerun `make anatomy`, and check the result in the app.
`bun run typecheck` fails if a generated group is not a valid `Muscle`, and the muscle map tests fail if a group ends up with no visible region.
Use `uv run scripts/anatomy/build.py --keep <dir>` to keep the id buffers and renders for debugging.

## 2D body figure

`python3 scripts/anatomy/build-muscle-map.py` generates `src/features/exercises/body-shapes.generated.ts` and `public/licenses/muscle-map.txt` directly from the original MIT-licensed MuscleMap Swift path data.
The revision is pinned in the script, and `--source-dir <dir>` accepts downloaded originals for offline regeneration.
Sub-group overlays are omitted to avoid drawing the same muscle twice.
The two lateral panels in the original upper-back group map to FitTune's lats; the scapular panels map to upper back.
Obliques map to abs, while muscle groups outside FitTune's taxonomy and non-muscle regions stay neutral.
This figure is bundled for offline use; rendering and heat colours are FitTune code, independent of openGym's AGPL implementation.
