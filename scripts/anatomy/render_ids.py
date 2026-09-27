"""Blender side of the anatomy pipeline: renders an id buffer per view

Run through build.py, not directly:
    blender --background --factory-startup --python render_ids.py -- <manifest.json> <out_dir>

Every mesh gets a unique flat colour that encodes its index, so each pixel of the
render tells which mesh is frontmost there. Workbench with flat lighting, no
anti-aliasing, no dithering and the Raw view transform keeps colours exact
"""

import json
import math
import sys

import bpy
import numpy as np

manifest_path, out_dir = sys.argv[sys.argv.index("--") + 1 :]
manifest = json.load(open(manifest_path))
mm_per_px = manifest["mm_per_px"]

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

bounds_min = np.full(3, np.inf)
bounds_max = np.full(3, -np.inf)

objects = []
for index, mesh in enumerate(manifest["meshes"]):
    # BodyParts3D is Z-up with the front of the body facing -Y; keep the raw coordinates
    bpy.ops.wm.obj_import(filepath=mesh["path"], forward_axis="Y", up_axis="Z")
    obj = bpy.context.selected_objects[0]
    code = index + 1
    objects.append(obj)
    obj.color = ((code & 0xFF) / 255, ((code >> 8) & 0xFF) / 255, 0, 1)
    corners = np.array([obj.matrix_world @ v.co for v in obj.data.vertices])
    bounds_min = np.minimum(bounds_min, corners.min(axis=0))
    bounds_max = np.maximum(bounds_max, corners.max(axis=0))

scene.render.engine = "BLENDER_WORKBENCH"
scene.display.shading.light = "FLAT"
scene.display.shading.color_type = "OBJECT"
scene.display.render_aa = "OFF"
scene.render.dither_intensity = 0
scene.render.film_transparent = True
scene.view_settings.view_transform = "Raw"
scene.view_settings.look = "None"
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"

margin = 10.0
width_mm = bounds_max[0] - bounds_min[0] + 2 * margin
height_mm = bounds_max[2] - bounds_min[2] + 2 * margin
scene.render.resolution_x = math.ceil(width_mm / mm_per_px)
scene.render.resolution_y = math.ceil(height_mm / mm_per_px)
scene.render.resolution_percentage = 100

camera_data = bpy.data.cameras.new("camera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = max(scene.render.resolution_x, scene.render.resolution_y) * mm_per_px
camera_data.clip_end = 100000
camera = bpy.data.objects.new("camera", camera_data)
scene.collection.objects.link(camera)
scene.camera = camera

centre_x = (bounds_min[0] + bounds_max[0]) / 2
centre_z = (bounds_min[2] + bounds_max[2]) / 2
depth = bounds_max[1] - bounds_min[1] + 1000

def render_ids(png: str) -> np.ndarray:
    scene.render.filepath = png
    bpy.ops.render.render(write_still=True)
    image = bpy.data.images.load(png)
    pixels = np.array(image.pixels[:], dtype=np.float32).reshape(image.size[1], image.size[0], 4)
    # Blender stores rows bottom-up
    channels = np.rint(np.flipud(pixels) * 255).astype(np.int32)
    ids = channels[..., 0] | (channels[..., 1] << 8)
    ids[channels[..., 3] == 0] = 0
    bpy.data.images.remove(image)
    return ids.astype(np.uint16)


views = {
    # Looking along +Y at the front of the body, the body's right side is on the image left
    "front": ((centre_x, bounds_min[1] - depth, centre_z), (math.pi / 2, 0, 0)),
    "back": ((centre_x, bounds_max[1] + depth, centre_z), (math.pi / 2, 0, math.pi)),
}

meta = {"width": scene.render.resolution_x, "height": scene.render.resolution_y, "mm_per_px": mm_per_px}
for view, (location, rotation) in views.items():
    camera.location = location
    camera.rotation_euler = rotation
    np.save(f"{out_dir}/{view}.npy", render_ids(f"{out_dir}/{view}.png"))
    # Second pass without the covering sheets so build.py can reveal what they hide
    for index in manifest["covers"]:
        objects[index].hide_render = True
    np.save(f"{out_dir}/{view}_uncovered.npy", render_ids(f"{out_dir}/{view}_uncovered.png"))
    for index in manifest["covers"]:
        objects[index].hide_render = False

json.dump(meta, open(f"{out_dir}/meta.json", "w"))
