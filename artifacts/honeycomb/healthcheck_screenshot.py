import bpy

bpy.context.scene.render.filepath = (
    r"C:\Gleb\Uni\Starthack\Start-Hack-26\artifacts\honeycomb\healthcheck.png"
)
bpy.context.scene.render.resolution_x = 800
bpy.context.scene.render.resolution_y = 600
bpy.ops.render.render(write_still=True)
print("screenshot_ok")
