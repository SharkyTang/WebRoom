import { Box3, Matrix4, Mesh, Ray, Triangle, Vector3, type Object3D } from 'three';

/** Visible mesh triangles, not a furniture bounding box that would seal every opening. */
export function createCameraCollision(room: Object3D, radius = .045) {
  const records: { mesh: Mesh; matrix: Matrix4; box: Box3; triangles: Triangle[] }[] = [];
  room.traverse(node => {
    if (!(node instanceof Mesh) || node.userData.roomProxySuppressed) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    if (!node.visible || !materials.some(m => m.visible)) return;
    records.push({ mesh: node, matrix: new Matrix4().makeScale(0, 0, 0), box: new Box3(), triangles: [] });
  });
  const ray = new Ray(), hit = new Vector3(), closest = new Vector3(), segment = new Box3(), expanded = new Box3();
  function refresh() {
    room.updateWorldMatrix(true, true);
    for (const record of records) {
      if (record.matrix.equals(record.mesh.matrixWorld)) continue;
      record.matrix.copy(record.mesh.matrixWorld); record.box.makeEmpty(); record.triangles = [];
      const positions = record.mesh.geometry.getAttribute('position'), indices = record.mesh.geometry.index;
      for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
        const point = (j: number) => new Vector3().fromBufferAttribute(positions, indices?.getX(i+j) ?? i+j).applyMatrix4(record.matrix);
        const triangle = new Triangle(point(0), point(1), point(2));
        if (triangle.getArea() < 1e-12) continue;
        record.triangles.push(triangle);
        record.box.expandByPoint(triangle.a).expandByPoint(triangle.b).expandByPoint(triangle.c);
      }
    }
  }
  return {
    refresh,
    allows(from: Vector3, to: Vector3) {
      if (![...to].every(Number.isFinite) || to.y < radius) return false;
      const distance = from.distanceTo(to);
      if (distance < 1e-9) return true;
      segment.setFromPoints([from, to]).expandByScalar(radius);
      ray.set(from, to.clone().sub(from).normalize());
      for (const record of records) {
        if (!segment.intersectsBox(expanded.copy(record.box).expandByScalar(radius))) continue;
        for (const triangle of record.triangles) {
          // Double-sided intersection prevents passing through either side of a wall.
          if (ray.intersectTriangle(triangle.a, triangle.b, triangle.c, false, hit) && from.distanceTo(hit) <= distance + radius) return false;
          triangle.closestPointToPoint(to, closest);
          if (closest.distanceToSquared(to) < radius * radius && closest.distanceToSquared(from) >= radius * radius) return false;
        }
      }
      return true;
    },
  };
}
