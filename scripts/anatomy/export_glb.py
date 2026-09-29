"""Export the selected BodyParts3D meshes as a small, grouped Draco GLB"""

import json
import sys
from collections import defaultdict

import bpy


manifest_path, output_path = sys.argv[sys.argv.index("--") + 1 :]
meshes = json.load(open(manifest_path))
bpy.ops.wm.read_factory_settings(use_empty=True)

groups = defaultdict(list)
for mesh in meshes:
    bpy.ops.wm.obj_import(filepath=mesh["path"], forward_axis="Y", up_axis="Z")
    obj = bpy.context.selected_objects[0]
    key = "bone" if mesh["kind"] == "bone" else mesh["muscle"] or "unmapped"
    groups[key].append(obj)

for key, objects in groups.items():
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = key
    obj["kind"] = "bone" if key == "bone" else "muscle"
    if key not in ("bone", "unmapped"):
        obj["muscle"] = key

    faces = len(obj.data.polygons)
    budget = 20000 if key == "bone" else 8000
    if faces > budget:
        modifier = obj.modifiers.new("mobile mesh budget", "DECIMATE")
        modifier.ratio = budget / faces
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.ops.object.shade_smooth()

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format="GLB",
    use_selection=True,
    export_extras=True,
    export_materials="NONE",
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=8,
)
