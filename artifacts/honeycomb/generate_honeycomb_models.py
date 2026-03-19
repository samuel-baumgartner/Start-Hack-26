import math
import os
import bpy
import json
import time
from mathutils import Vector


OUT_DIR = r"C:\Gleb\Uni\Starthack\Start-Hack-26\artifacts\honeycomb"
LOGO_PATH = r"C:\Gleb\Uni\Starthack\Start-Hack-26\artifacts\honeycomb\syngenta_schweiz_logo.png"
HEX_RADIUS = 0.5
HEX_HEIGHT = 0.56
LOGO_UV_SCALE_X = 0.92
LOGO_UV_SCALE_Y = 0.90
DEBUG_LOG_PATH = r"C:\Gleb\Uni\Starthack\Start-Hack-26\debug-36dc86.log"
DEBUG_SESSION_ID = "36dc86"


def debug_log(run_id, hypothesis_id, location, message, data):
    payload = {
        "sessionId": DEBUG_SESSION_ID,
        "runId": run_id,
        "hypothesisId": hypothesis_id,
        "location": location,
        "message": message,
        "data": data,
        "timestamp": int(time.time() * 1000),
    }
    with open(DEBUG_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(payload, ensure_ascii=True) + "\n")

# 7-cell cluster in axial coordinates (center + 6 neighbors).
AXIAL_RING_1 = [
    (0, 0),
    (1, 0),
    (0, 1),
    (-1, 1),
    (-1, 0),
    (0, -1),
    (1, -1),
]

# Side face index -> axial neighbor direction for pointy-top layout.
SIDE_NEIGHBOR_DIRS = [
    (0, 1),
    (-1, 1),
    (-1, 0),
    (0, -1),
    (1, -1),
    (1, 0),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for mesh in bpy.data.meshes:
        bpy.data.meshes.remove(mesh)
    for material in bpy.data.materials:
        bpy.data.materials.remove(material)
    for camera in bpy.data.cameras:
        bpy.data.cameras.remove(camera)
    for light in bpy.data.lights:
        bpy.data.lights.remove(light)
    for collection in bpy.data.collections:
        if collection.users == 0:
            bpy.data.collections.remove(collection)


def axial_to_world_pointy(q, r, size):
    x = size * math.sqrt(3.0) * (q + r / 2.0)
    y = size * 1.5 * r
    return x, y


def hex_points(radius, z, angle_offset=0.0):
    points = []
    for i in range(6):
        angle = angle_offset + (math.pi / 3.0) * i
        points.append((radius * math.cos(angle), radius * math.sin(angle), z))
    return points


def create_solid_hex_mesh(name):
    # Pointy-top hex so orientation matches axial_to_world_pointy spacing.
    outer_top = hex_points(HEX_RADIUS, HEX_HEIGHT, angle_offset=math.pi / 6.0)
    outer_bottom = hex_points(HEX_RADIUS, 0.0, angle_offset=math.pi / 6.0)

    vertices = outer_top + outer_bottom
    faces = []

    ot = list(range(0, 6))
    ob = list(range(6, 12))

    for i in range(6):
        j = (i + 1) % 6
        faces.append([ob[i], ob[j], ot[j], ot[i]])

    faces.append(ob[::-1])
    faces.append(ot)

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    return mesh


def _create_principled_material(name, roughness=0.38, specular=0.25):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    output.location = (300, 0)
    bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")
    bsdf.location = (40, 0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Specular IOR Level"].default_value = specular
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return mat, bsdf, nodes, links


def build_base_material():
    mat, bsdf, _, _ = _create_principled_material("HoneycombBaseMaterial")
    # Slightly darker wall tone makes the side logo read more clearly.
    bsdf.inputs["Base Color"].default_value = (0.80, 0.80, 0.80, 1.0)
    return mat


def build_logo_material():
    mat, bsdf, nodes, links = _create_principled_material("HoneycombLogoMaterial")
    logo_tex = nodes.new(type="ShaderNodeTexImage")
    logo_tex.location = (-240, 0)
    logo_tex.interpolation = "Linear"
    logo_tex.extension = "CLIP"
    logo_tex.image = bpy.data.images.load(LOGO_PATH, check_existing=True)
    # region agent log
    debug_log(
        "pre-fix",
        "H1_logo_source_or_load",
        "generate_honeycomb_models.py:build_logo_material",
        "Loaded logo texture in Blender material",
        {
            "logo_path": LOGO_PATH,
            "image_name": logo_tex.image.name if logo_tex.image else None,
            "image_size": list(logo_tex.image.size) if logo_tex.image else None,
            "image_exists": os.path.exists(LOGO_PATH),
        },
    )
    # endregion
    links.new(logo_tex.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def get_perimeter_side_indices(q, r, occupied):
    perimeter = []
    for side_index, (dq, dr) in enumerate(SIDE_NEIGHBOR_DIRS):
        if (q + dq, r + dr) not in occupied:
            perimeter.append(side_index)
    return perimeter


def apply_perimeter_logo_uv(mesh, perimeter_side_indices):
    uv_layer = mesh.uv_layers.active
    if uv_layer is None:
        uv_layer = mesh.uv_layers.new(name="UVMap")

    for side_index in perimeter_side_indices:
        poly = mesh.polygons[side_index]
        loops = poly.loop_indices
        verts = [mesh.vertices[mesh.loops[l].vertex_index].co.copy() for l in loops]

        center_xy = Vector((poly.center.x, poly.center.y))
        if center_xy.length < 1e-8:
            continue

        normal_xy = center_xy.normalized()
        tangent_xy = Vector((-normal_xy.y, normal_xy.x))
        tangential = [v.x * tangent_xy.x + v.y * tangent_xy.y for v in verts]
        t_min = min(tangential)
        t_max = max(tangential)
        t_span = max(t_max - t_min, 1e-8)

        for loop_idx, vert, t in zip(loops, verts, tangential):
            u_norm = (t - t_min) / t_span
            v_norm = vert.z / HEX_HEIGHT
            u = 0.5 + (u_norm - 0.5) * LOGO_UV_SCALE_X
            v = 0.5 + (v_norm - 0.5) * LOGO_UV_SCALE_Y
            uv_layer.data[loop_idx].uv = (u, v)
    # region agent log
    logo_uvs = []
    for poly_idx in perimeter_side_indices:
        poly = mesh.polygons[poly_idx]
        for loop_idx in poly.loop_indices:
            logo_uvs.append(tuple(uv_layer.data[loop_idx].uv))
    debug_log(
        "pre-fix",
        "H3_uv_scale_or_mapping",
        "generate_honeycomb_models.py:apply_perimeter_logo_uv",
        "Applied UVs to perimeter logo faces",
        {
            "mesh_name": mesh.name,
            "perimeter_face_count": len(perimeter_side_indices),
            "uv_min_u": min([uv[0] for uv in logo_uvs]) if logo_uvs else None,
            "uv_max_u": max([uv[0] for uv in logo_uvs]) if logo_uvs else None,
            "uv_min_v": min([uv[1] for uv in logo_uvs]) if logo_uvs else None,
            "uv_max_v": max([uv[1] for uv in logo_uvs]) if logo_uvs else None,
        },
    )
    # endregion


def create_honeycomb_collection(root_name, side_orientation=False):
    collection = bpy.data.collections.new(root_name)
    bpy.context.scene.collection.children.link(collection)

    root = bpy.data.objects.new(root_name, None)
    collection.objects.link(root)
    root.empty_display_type = "PLAIN_AXES"
    base_material = build_base_material()
    logo_material = build_logo_material()
    occupied = set(AXIAL_RING_1)

    tile_objects = []
    total_logo_faces = 0
    for idx, (q, r) in enumerate(AXIAL_RING_1):
        x, y = axial_to_world_pointy(q, r, HEX_RADIUS)
        mesh = create_solid_hex_mesh(f"HexTileMesh_{idx:03d}")
        perimeter_side_indices = get_perimeter_side_indices(q, r, occupied)
        if side_orientation:
            # For side deliverable, stamp logos on all side walls so at least
            # one visible wall per cell carries the logo in the side camera.
            perimeter_side_indices = [0, 1, 2, 3, 4, 5]
        for side_face_index in perimeter_side_indices:
            mesh.polygons[side_face_index].material_index = 1
        total_logo_faces += len(perimeter_side_indices)
        apply_perimeter_logo_uv(mesh, perimeter_side_indices)

        obj = bpy.data.objects.new(f"HexTile_{idx:03d}", mesh)
        obj.location = (x, y, 0.0)
        obj.name = f"HexTile_{idx:03d}"
        obj.parent = root
        obj.data.materials.append(base_material)
        obj.data.materials.append(logo_material)
        if collection.objects.get(obj.name) is None:
            collection.objects.link(obj)
        tile_objects.append(obj)
        # region agent log
        debug_log(
            "pre-fix",
            "H2_face_assignment_or_visibility",
            "generate_honeycomb_models.py:create_honeycomb_collection",
            "Assigned logo perimeter faces per tile",
            {
                "root_name": root_name,
                "tile_name": obj.name,
                "q": q,
                "r": r,
                "perimeter_side_indices": perimeter_side_indices,
                "side_orientation": side_orientation,
            },
        )
        # endregion

    if side_orientation:
        # region agent log
        debug_log(
            "pre-fix",
            "H4_side_orientation_changes_face_visibility",
            "generate_honeycomb_models.py:create_honeycomb_collection",
            "Skipped side orientation transform to keep wall faces visible",
            {"root_name": root_name},
        )
        # endregion

    # region agent log
    debug_log(
        "pre-fix",
        "H2_face_assignment_or_visibility",
        "generate_honeycomb_models.py:create_honeycomb_collection",
        "Completed logo face assignment for collection",
        {
            "root_name": root_name,
            "tile_count": len(tile_objects),
            "total_logo_faces_assigned": total_logo_faces,
            "side_orientation": side_orientation,
        },
    )
    # endregion

    return collection, root, tile_objects


def add_camera_and_light(view):
    cam_data = bpy.data.cameras.new(name=f"{view}_CamData")
    cam_obj = bpy.data.objects.new(f"{view}_Camera", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj

    light_data = bpy.data.lights.new(name=f"{view}_LightData", type="SUN")
    light_data.energy = 3.0
    light_obj = bpy.data.objects.new(f"{view}_Light", light_data)
    bpy.context.scene.collection.objects.link(light_obj)

    if view == "top":
        cam_obj.location = (0.0, 0.0, 8.0)
        cam_obj.rotation_euler = (0.0, 0.0, 0.0)
        cam_data.type = "ORTHO"
        cam_data.ortho_scale = 5.5
        light_obj.location = (2.0, -2.0, 6.0)
        light_obj.rotation_euler = (math.radians(35.0), 0.0, math.radians(35.0))
    else:
        cam_obj.location = (0.0, -7.0, 0.8)
        cam_obj.rotation_euler = (math.radians(82.0), 0.0, 0.0)
        cam_data.type = "PERSP"
        cam_data.lens = 50
        light_obj.location = (2.0, -3.0, 4.0)
        light_obj.rotation_euler = (math.radians(45.0), 0.0, math.radians(20.0))


def validate_meshes(tile_objects):
    report = []
    for obj in tile_objects:
        mesh = obj.data
        changed = mesh.validate(verbose=False)
        report.append((obj.name, changed, len(mesh.vertices), len(mesh.polygons)))
    return report


def camera_facing_logo_faces(tile_objects, camera_obj):
    total_logo_faces = 0
    facing_logo_faces = 0
    for obj in tile_objects:
        if obj.type != "MESH":
            continue
        mesh = obj.data
        for poly in mesh.polygons:
            if poly.material_index != 1:
                continue
            total_logo_faces += 1
            world_center = obj.matrix_world @ poly.center
            world_normal = (obj.matrix_world.to_3x3() @ poly.normal).normalized()
            to_camera = (camera_obj.location - world_center).normalized()
            if world_normal.dot(to_camera) > 0.0:
                facing_logo_faces += 1
    return total_logo_faces, facing_logo_faces


def ray_visible_logo_faces(tile_objects, camera_obj):
    scene = bpy.context.scene
    depsgraph = bpy.context.evaluated_depsgraph_get()
    total_logo_faces = 0
    ray_visible_faces = 0

    for obj in tile_objects:
        if obj.type != "MESH":
            continue
        for poly in obj.data.polygons:
            if poly.material_index != 1:
                continue
            total_logo_faces += 1
            target = obj.matrix_world @ poly.center
            ray_dir = (target - camera_obj.location)
            ray_len = ray_dir.length
            if ray_len < 1e-8:
                continue
            ray_dir.normalize()
            hit, _loc, _normal, face_index, hit_obj, _matrix = scene.ray_cast(
                depsgraph, camera_obj.location, ray_dir, distance=ray_len + 1e-4
            )
            if hit and hit_obj == obj and face_index == poly.index:
                ray_visible_faces += 1

    return total_logo_faces, ray_visible_faces


def render_preview(filepath):
    scene = bpy.context.scene
    # region agent log
    debug_log(
        "pre-fix",
        "H8_render_engine_ignores_textures",
        "generate_honeycomb_models.py:render_preview",
        "Rendering preview with current engine",
        {"render_engine": scene.render.engine, "target": filepath},
    )
    # endregion
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = filepath
    bpy.ops.render.render(write_still=True)


def export_glb(filepath):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format="GLB",
        export_apply=False,
        export_animations=False,
        export_cameras=True,
        export_lights=False,
        export_draco_mesh_compression_enable=False,
    )


def save_blend(filepath):
    bpy.ops.wm.save_as_mainfile(filepath=filepath)


def build_variant(view):
    clear_scene()
    side = view == "side"
    root_name = "HoneycombSide" if side else "HoneycombTop"
    _, _, tiles = create_honeycomb_collection(root_name, side_orientation=side)
    add_camera_and_light(view)
    if bpy.context.scene.camera:
        total_logo_faces, facing_logo_faces = camera_facing_logo_faces(
            tiles, bpy.context.scene.camera
        )
        # region agent log
        debug_log(
            "pre-fix",
            "H6_logo_faces_not_camera_facing",
            "generate_honeycomb_models.py:build_variant",
            "Computed camera-facing logo faces",
            {
                "view": view,
                "total_logo_faces": total_logo_faces,
                "facing_logo_faces": facing_logo_faces,
                "camera_name": bpy.context.scene.camera.name,
            },
        )
        # endregion
        total_logo_faces_raycast, ray_visible_faces = ray_visible_logo_faces(
            tiles, bpy.context.scene.camera
        )
        # region agent log
        debug_log(
            "pre-fix",
            "H7_logo_faces_occluded",
            "generate_honeycomb_models.py:build_variant",
            "Computed raycast-visible logo faces",
            {
                "view": view,
                "total_logo_faces": total_logo_faces_raycast,
                "ray_visible_logo_faces": ray_visible_faces,
                "camera_name": bpy.context.scene.camera.name,
            },
        )
        # endregion
    validation = validate_meshes(tiles)

    blend_path = os.path.join(OUT_DIR, f"honeycomb_{view}.blend")
    png_path = os.path.join(OUT_DIR, f"honeycomb_{view}.png")
    glb_path = os.path.join(OUT_DIR, f"honeycomb_{view}.glb")

    render_preview(png_path)
    export_glb(glb_path)
    save_blend(blend_path)
    # region agent log
    debug_log(
        "pre-fix",
        "H5_export_contains_logo_material",
        "generate_honeycomb_models.py:build_variant",
        "Exported variant artifacts",
        {
            "view": view,
            "blend_path": blend_path,
            "png_path": png_path,
            "glb_path": glb_path,
            "glb_exists": os.path.exists(glb_path),
            "glb_size_bytes": os.path.getsize(glb_path) if os.path.exists(glb_path) else None,
        },
    )
    # endregion

    print(f"[{view}] blend={blend_path}")
    print(f"[{view}] screenshot={png_path}")
    print(f"[{view}] glb={glb_path}")
    for name, changed, verts, faces in validation:
        print(f"[{view}] validate {name}: changed={changed} verts={verts} faces={faces}")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    # region agent log
    debug_log(
        "pre-fix",
        "H1_logo_source_or_load",
        "generate_honeycomb_models.py:main",
        "Starting generator run",
        {
            "logo_path": LOGO_PATH,
            "logo_exists_before_run": os.path.exists(LOGO_PATH),
            "logo_uv_scale_x": LOGO_UV_SCALE_X,
            "logo_uv_scale_y": LOGO_UV_SCALE_Y,
            "hex_height": HEX_HEIGHT,
        },
    )
    # endregion
    build_variant("top")
    build_variant("side")
    print("done")


if __name__ == "__main__":
    main()
