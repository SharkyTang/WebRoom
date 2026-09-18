"""Author C fixtures/wall art through the main generator's existing helpers.

No scene reset, file I/O, export, registration or Blender import happens here.
After defining the shared helpers, the authorized caller can use:

    from v06c_fixture_geometry import install as install_fixture_geometry
    install_fixture_geometry(globals())

This registers two deferred builders. Calling install alone creates no geometry.
All coordinates below are original-anchor-local glTF Y-up metres.
"""
import math


CABINET_SEGMENTS = (
    ("Hogwarts", .39, 1.99),
    ("Eiffel", -.4675, .27),
    ("SLS", -.9475, -.5725),
    ("SmallReserved", -1.54, -1.0525),
)


def _surface_material(ns, role):
    """Allocate a distinct material for each future surface, without a binder."""
    material = ns["mat"]("Fixture" + role + "Surface", (.75, .72, .63), 0, .67)
    principled = material.node_tree.nodes.get("Principled BSDF")
    for key in ("Emission Color", "Emission"):
        if key in principled.inputs:
            principled.inputs[key].default_value = (0, 0, 0, 1)
    if "Emission Strength" in principled.inputs:
        principled.inputs["Emission Strength"].default_value = 0
    material["v06c_surface_role"] = "reserved-nonemissive; no runtime binding"
    return material


def _hollow_frustum(ns, name, y0, y1, bottom_radius, top_radius, thickness, material, parent, sides=24):
    """Closed, thin annular shell: no solid cone pretending to be a lampshade."""
    vertices = []
    for radius, y in ((bottom_radius, y0), (top_radius, y1),
                      (top_radius - thickness, y1), (bottom_radius - thickness, y0)):
        for index in range(sides):
            angle = index * 2 * math.pi / sides
            vertices.append((radius * math.cos(angle), y, radius * math.sin(angle)))
    faces = []
    for index in range(sides):
        following = (index + 1) % sides
        # Outer wall, inner wall, upper lip, lower lip; all outward winding.
        faces.extend(((index, sides + index, sides + following, following),
                      (3 * sides + index, 3 * sides + following, 2 * sides + following, 2 * sides + index),
                      (sides + index, 2 * sides + index, 2 * sides + following, sides + following),
                      (index, following, 3 * sides + following, 3 * sides + index)))
    return ns["polygon"](name, vertices, faces, material, parent)


def _table_lamp(ns, role, anchor, metal):
    name = "VIS_Fixture" + role
    parent = ns["root"](name, anchor)
    surface_material = _surface_material(ns, role)
    ns["cone"](name + "WeightedBase", (0, .012, 0), .087, .077, .024, metal, parent, 24)
    ns["cone"](name + "Stem", (0, .123, 0), .0085, .0085, .210, metal, parent, 12)
    ns["cone"](name + "SocketCollar", (0, .221, 0), .014, .014, .032, metal, parent, 12)
    # Three quiet structural spokes visibly connect the stem to the shade lower edge.
    for index in range(3):
        angle = index * 2 * math.pi / 3
        ns["rod"](name + "ShadeSupport", (0, .205, 0),
                  (.093 * math.cos(angle), .160, .093 * math.sin(angle)),
                  .0022, metal, parent, 6)
    surface = _hollow_frustum(ns, name + "Surface", .157, .377, .097, .073, .0025,
                             surface_material, parent)
    surface["v06c_surface_role"] = "independent opaque shade; reserved, nonemissive"
    # Thin metallic edge bindings give the hollow shade a readable manufactured rim.
    _hollow_frustum(ns, name + "LowerShadeBinding", .1555, .1585, .098, .0977, .0035,
                   metal, parent)
    _hollow_frustum(ns, name + "UpperShadeBinding", .3755, .3785, .0737, .0734, .0035,
                   metal, parent)
    parent["v06c_mapping"] = "bed-spatial-correspondence" if role == "Bedside" else "lounge-unassigned"
    ns["merge"](parent, keep=[surface.name])
    return parent


def _desk_strip(ns, metal):
    name = "VIS_FixtureDeskStrip"
    parent = ns["root"](name, "FUR_Desk")
    material = _surface_material(ns, "DeskStrip")
    # U-channel under the existing rear overhang: behind the original rear brace,
    # outside the B piano corridor. Full envelope: x +/- .8, y .665..6695,
    # z -.405..-.395. The top stays .5mm below the real A desktop underside.
    ns["box"](name + "TopChannel", (0, .6689, -.400), (1.6, .0012, .010), metal, parent, 0, 1)
    for z in (-.4044, -.3956):
        ns["box"](name + "ChannelSide", (0, .66665, z), (1.6, .0033, .0012), metal, parent, 0, 1)
    for x in (-.7985, .7985):
        ns["box"](name + "EndCap", (x, .66725, -.400), (.003, .0045, .010), metal, parent, 0, 1)
    surface = ns["box"](name + "Surface", (0, .6655, -.400), (1.594, .001, .0076), material, parent, 0, 1)
    surface["v06c_surface_role"] = "underside diffuser; reserved, nonemissive"
    parent["v06c_mapping"] = "desk-static-candidate; original point light stays in place"
    parent["v06c_proxy_suppression"] = "none; preserve A desk and B piano"
    ns["merge"](parent, keep=[surface.name])
    return parent


def _cabinet_strip(ns, metal):
    name = "VIS_FixtureCabinetStrip"
    parent = ns["root"](name, "FUR_DisplayCabinet")
    material = _surface_material(ns, "CabinetStrip")
    surfaces = []
    for segment, start, end in CABINET_SEGMENTS:
        z, length = (start + end) / 2, end - start
        ns["box"](name + segment + "TopChannel", (.26, 2.524, z), (.024, .001, length), metal, parent, 0, 1)
        for x in (.249, .271):
            ns["box"](name + segment + "ChannelSide", (x, 2.522, z), (.002, .003, length), metal, parent, 0, 1)
        for edge in (start + .001, end - .001):
            ns["box"](name + segment + "EndCap", (.26, 2.5225, edge), (.024, .004, .002), metal, parent, 0, 1)
        surfaces.append(ns["box"](name + segment + "Diffuser", (.26, 2.5209, z),
                                   (.020, .0008, length - .004), material, parent, 0, 1))
    # All four segments belong to the one reserved Cabinet surface; no segment
    # crosses a divider and no material is shared with Desk/Bed/Lounge surfaces.
    surface = ns["combine"](name + "Surface", surfaces)
    surface["v06c_surface_role"] = "four separated underside diffusers; reserved, nonemissive"
    parent["v06c_mapping"] = "cabinet-static-candidate; original point light stays in place"
    parent["v06c_proxy_suppression"] = "none; preserve A cabinet and all original Bounds"
    ns["merge"](parent, keep=[surface.name])
    return parent


def build_fixtures(ns):
    metal = ns["mat"]("FixtureBrushedBronze", (.18, .135, .081), .58, .43)
    _table_lamp(ns, "Bedside", "DEC_Lamp_Bedside", metal)
    _table_lamp(ns, "Lounge", "DEC_Lamp_Lounge", metal)
    _desk_strip(ns, metal)
    _cabinet_strip(ns, metal)
    ns["DETAILS"]["fixtures"] = {
        "stateSurface": None, "surfaceRole": "none", "runtimeBinder": "none",
        "surfaces": {"VIS_Fixture" + role + "Surface": "MAT_V06C_Fixture" + role + "Surface"
                     for role in ("Bedside", "Lounge", "DeskStrip", "CabinetStrip")},
        "emissiveRGB": [0, 0, 0], "emissionStrength": 0,
        "tableLampLocalEnvelope": {"min": [-.098, 0, -.098], "max": [.098, .3785, .098]},
        "deskStripLocalEnvelope": {"min": [-.8, .665, -.405], "max": [.8, .6695, -.395]},
        "cabinetStripLocalX": [.248, .272], "cabinetStripLocalY": [2.5205, 2.5245],
        "cabinetStripSegmentsZ": [[name, start, end] for name, start, end in CABINET_SEGMENTS],
        "candidateGroups": {"Bedside": "Bed: original shade and source share X/Z",
                            "DeskStrip": "Desk candidate; source point light is not relocated",
                            "CabinetStrip": "Cabinet candidate; source point light is not relocated",
                            "Lounge": "Unassigned; not Desk and not a fourth controlled group"},
        "scope": "Static visible housings and isolated reserved surfaces only; original three lights and master switch unchanged",
        "needsExportValidation": "Real A panel contact, all B piano poses, four unique surface materials, original lamp envelopes",
    }


def _relief_polygon(ns, name, points, front, thickness, material, parent):
    """Original flat artwork with real shallow closed geometry, facing room +Z."""
    area = sum(points[i][0] * points[(i + 1) % len(points)][1]
               - points[(i + 1) % len(points)][0] * points[i][1] for i in range(len(points)))
    if area < 0:
        points = list(reversed(points))
    count = len(points)
    vertices = [(x, y, z) for z in (front - thickness, front) for x, y in points]
    faces = [tuple(range(count - 1, -1, -1)), tuple(range(count, 2 * count))]
    faces += [(index, (index + 1) % count, (index + 1) % count + count, index + count)
              for index in range(count)]
    return ns["polygon"](name, vertices, faces, material, parent)


def build_wallart(ns):
    parent = ns["root"]("VIS_WallArt", "DEC_WallArt")
    frame = ns["mat"]("WallArtWalnutFrame", (.24, .155, .095), 0, .59)
    paper = ns["mat"]("WallArtWarmPaper", (.79, .77, .66), 0, .86)
    distant = ns["mat"]("WallArtDistantSage", (.37, .49, .47), 0, .82)
    middle = ns["mat"]("WallArtMiddleTeal", (.21, .36, .37), 0, .82)
    foreground = ns["mat"]("WallArtForeground", (.12, .25, .28), 0, .82)
    moon = ns["mat"]("WallArtMutedMoon", (.79, .67, .39), 0, .78)
    ns["box"]("VIS_WallArtBacking", (0, 0, -.009), (.856, .876, .010), frame, parent, .001, 1)
    for x in (-.414, .414):
        ns["box"]("VIS_WallArtVerticalFrame", (x, 0, .001), (.030, .878, .030), frame, parent, .001, 1)
    for y in (-.424, .424):
        ns["box"]("VIS_WallArtHorizontalFrame", (0, y, .001), (.798, .030, .030), frame, parent, .001, 1)
    ns["box"]("VIS_WallArtPaper", (0, 0, .003), (.795, .815, .014), paper, parent, 0, 1)
    moon_points = [(.245 + .061 * math.cos(index * 2 * math.pi / 32),
                    .253 + .061 * math.sin(index * 2 * math.pi / 32)) for index in range(32)]
    _relief_polygon(ns, "VIS_WallArtMoon", moon_points, .0106, .0006, moon, parent)
    _relief_polygon(ns, "VIS_WallArtFarRidge", [(-.377, -.055), (-.245, .175), (-.14, .075),
                    (.02, .24), (.165, .06), (.275, .155), (.377, -.03), (.377, -.355), (-.377, -.355)],
                    .0108, .0008, distant, parent)
    _relief_polygon(ns, "VIS_WallArtMiddleRidge", [(-.377, -.18), (-.285, -.09), (-.18, -.15),
                    (-.065, .075), (.035, -.01), (.145, -.06), (.26, .045), (.377, -.14),
                    (.377, -.355), (-.377, -.355)], .0115, .0015, middle, parent)
    _relief_polygon(ns, "VIS_WallArtNearRidge", [(-.377, -.25), (-.2, -.19), (-.05, -.26),
                    (.095, -.155), (.24, -.235), (.377, -.205), (.377, -.355), (-.377, -.355)],
                    .0122, .0022, foreground, parent)
    ns["merge"](parent)
    parent["v06c_authorship"] = "Original abstract mountain and moon geometry; not a personal photo, named landscape or document"
    ns["DETAILS"]["wallart"] = {
        "anchor": "DEC_WallArt", "frontNormalYUp": [0, 0, 1],
        "localEnvelope": {"min": [-.429, -.439, -.014], "max": [.429, .439, .016]},
        "originalEnvelope": {"min": [-.43, -.44, -.0175], "max": [.43, .44, .0175]},
        "artwork": "Original layered mountains and muted moon made with shallow closed polygons",
        "externalImages": [], "textures": 0, "personalText": False, "newInteractions": False,
    }


def install(namespace):
    """Register deferred builder functions only; the main dispatcher owns execution."""
    required = ("root", "mat", "cone", "rod", "box", "polygon", "merge", "combine", "DETAILS")
    missing = [name for name in required if name not in namespace]
    if missing:
        raise ValueError("Fixture module needs existing generator helpers: " + ", ".join(missing))
    namespace["fixtures"] = lambda: build_fixtures(namespace)
    namespace["wallart"] = lambda: build_wallart(namespace)
    return ("fixtures", "wallart")
