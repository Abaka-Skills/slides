/* In-slide 7-DOF Franka Panda, adapted from b7-servo-shadow-panda.html.
   Same rig: real Collada meshes (PANDA_MESHES), URDF joint frames, CCD IK
   about each joint's local Z with limits, null-space elbow orbit, spring
   cursor target, grip on pointerdown. Differences from the original:
   renders into a slide-mounted canvas, pointer is mapped to the slide
   rect, colors follow the knotwork palette, and the loop can stop/start
   as the slide leaves/enters. */
window.initPandaSlide = function (canvas) {
  "use strict";
  var slideEl = canvas.closest('.slide') || document.body;
  var roEl = document.getElementById('panda-ro');

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14100d);           /* cinema black */
  scene.fog = new THREE.Fog(0x14100d, 2.6, 5.2);
  var camera = new THREE.PerspectiveCamera(38, 1, 0.05, 20);

  scene.add(new THREE.HemisphereLight(0x8a7f74, 0x14100d, 0.45));
  var key = new THREE.DirectionalLight(0xfff3ec, 1.0);
  key.position.set(1.6, 2.4, 1.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -1.4; key.shadow.camera.right = 1.4;
  key.shadow.camera.top = 1.6; key.shadow.camera.bottom = -0.6;
  key.shadow.bias = -0.0004;
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xff8a63, 0.35);   /* hot-orange rim */
  rim.position.set(-1.8, 1.2, -1.4);
  scene.add(rim);

  /* bench */
  var desk = new THREE.Mesh(
    new THREE.BoxGeometry(2.7, 0.09, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x1d1712, roughness: 0.5, metalness: 0.25 })
  );
  desk.position.set(0, -0.045, -0.05);
  desk.receiveShadow = true;
  scene.add(desk);
  var mat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.012, 48),
    new THREE.MeshStandardMaterial({ color: 0x120e0b, roughness: 0.95 })
  );
  mat.position.y = 0.006; mat.receiveShadow = true; scene.add(mat);
  var cube = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xfd5f32, roughness: 0.55 })); /* brand cube */
  cube.position.set(0.45, 0.03, 0.3); cube.castShadow = cube.receiveShadow = true; scene.add(cube);

  /* real Panda meshes */
  var loader = new THREE.ColladaLoader();
  function link(name) {
    var dae = loader.parse(window.PANDA_MESHES[name], '');
    var obj = dae.scene;
    if (Math.abs(obj.rotation.x + Math.PI / 2) < 0.01) obj.rotation.x = 0;
    obj.traverse(function (n) {
      if (n.isMesh) {
        n.castShadow = true; n.receiveShadow = true;
        var src = Array.isArray(n.material) ? n.material : [n.material];
        var wrapped = src.map(function (m) {
          return new THREE.MeshStandardMaterial({
            color: m && m.color ? m.color.clone() : new THREE.Color(0xf0f0f2),
            roughness: 0.45, metalness: 0.2, side: THREE.FrontSide
          });
        });
        n.material = Array.isArray(n.material) ? wrapped : wrapped[0];
      }
    });
    return obj;
  }

  /* URDF chain — every joint rotates about local Z */
  function jointFrame(parent, xyz, rpy) {
    var g = new THREE.Group();
    g.position.set(xyz[0], xyz[1], xyz[2]);
    g.rotation.set(rpy[0], rpy[1], rpy[2], 'ZYX');
    parent.add(g);
    var spin = new THREE.Group();
    g.add(spin);
    return spin;
  }
  var P2 = Math.PI / 2;
  var robot = new THREE.Group();
  robot.rotation.x = -Math.PI / 2;
  scene.add(robot);
  robot.add(link('link0'));
  var J1 = jointFrame(robot, [0, 0, 0.333], [0, 0, 0]); J1.add(link('link1'));
  var J2 = jointFrame(J1, [0, 0, 0], [-P2, 0, 0]); J2.add(link('link2'));
  var J3 = jointFrame(J2, [0, -0.316, 0], [P2, 0, 0]); J3.add(link('link3'));
  var J4 = jointFrame(J3, [0.0825, 0, 0], [P2, 0, 0]); J4.add(link('link4'));
  var J5 = jointFrame(J4, [-0.0825, 0.384, 0], [-P2, 0, 0]); J5.add(link('link5'));
  var J6 = jointFrame(J5, [0, 0, 0], [P2, 0, 0]); J6.add(link('link6'));
  var J7 = jointFrame(J6, [0.088, 0, 0], [P2, 0, 0]); J7.add(link('link7'));
  var flange = new THREE.Group(); flange.position.set(0, 0, 0.107); J7.add(flange);
  var hand = new THREE.Group(); hand.rotation.z = -Math.PI / 4; flange.add(hand);
  hand.add(link('hand'));
  var fL = new THREE.Group(); fL.position.set(0, 0, 0.0584); hand.add(fL); fL.add(link('finger'));
  var fR = new THREE.Group(); fR.position.set(0, 0, 0.0584); fR.rotation.z = Math.PI; hand.add(fR); fR.add(link('finger'));
  var tcp = new THREE.Group(); tcp.position.set(0, 0, 0.1034); hand.add(tcp);

  scene.traverse(function (n) {  /* r128 sRGB washout fix */
    if (n.isMesh) (Array.isArray(n.material) ? n.material : [n.material])
      .forEach(function (m) { if (m && m.color) m.color.convertSRGBToLinear(); });
  });

  /* 7-DOF CCD IK with limits + ready-pose regularization */
  var joints = [J1, J2, J3, J4, J5, J6, J7];
  var HOME = [0, -0.4, 0, -2.0, 0, 1.6, 0.79];
  var q = HOME.slice();
  var LIM = [[-2.89, 2.89], [-1.6, 1.6], [-2.89, 2.89], [-2.9, -0.3], [-2.4, 2.4], [0.6, 3.0], [-2.89, 2.89]];
  joints.forEach(function (j, i) { j.rotation.z = q[i]; });

  var jw = new THREE.Vector3(), ew = new THREE.Vector3(), ax = new THREE.Vector3();
  var v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), tw = new THREE.Vector3();
  function ccd(target, nullBias, dt) {
    var k = Math.min(1, dt * 1.2);
    for (var i = 0; i < 7; i++) {
      if (i === 2) continue;
      q[i] += (HOME[i] - q[i]) * k * 0.5;
      joints[i].rotation.z = q[i];
    }
    q[2] += (nullBias - q[2]) * Math.min(1, dt * 1.5);
    joints[2].rotation.z = q[2];
    for (var iter = 0; iter < 5; iter++) {
      for (var j = joints.length - 1; j >= 0; j--) {
        robot.updateMatrixWorld(true);
        var J = joints[j];
        J.getWorldPosition(jw);
        tcp.getWorldPosition(ew);
        ax.set(0, 0, 1).applyQuaternion(J.getWorldQuaternion(new THREE.Quaternion())).normalize();
        v1.copy(ew).sub(jw); v1.addScaledVector(ax, -v1.dot(ax));
        tw.copy(target);
        v2.copy(tw).sub(jw); v2.addScaledVector(ax, -v2.dot(ax));
        if (v1.lengthSq() < 1e-8 || v2.lengthSq() < 1e-8) continue;
        v1.normalize(); v2.normalize();
        var ang = Math.acos(Math.min(1, Math.max(-1, v1.dot(v2))));
        var cross = new THREE.Vector3().crossVectors(v1, v2);
        if (cross.dot(ax) < 0) ang = -ang;
        ang = Math.max(-0.25, Math.min(0.25, ang * 0.9));
        q[j] = Math.max(LIM[j][0], Math.min(LIM[j][1], q[j] + ang));
        J.rotation.z = q[j];
      }
    }
    robot.updateMatrixWorld(true);
  }

  /* cursor → target within the slide, damped spring */
  var mx = 0.72, my = 0.5;
  slideEl.addEventListener('pointermove', function (e) {
    var r = slideEl.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width;
    my = (e.clientY - r.top) / r.height;
  });
  var grip = 0, gripping = false;
  canvas.addEventListener('pointerdown', function () { gripping = true; });
  addEventListener('pointerup', function () { gripping = false; });

  var spring = { x: 0.3, y: 0.4, z: 0.3, vx: 0, vy: 0, vz: 0 };
  function springTo(s, t, dt) {
    var w = 5.0;
    ['x', 'y', 'z'].forEach(function (k) {
      var v = 'v' + k;
      var a = -2 * w * s[v] - w * w * (s[k] - t[k]);
      s[v] += a * dt; s[k] += s[v] * dt;
    });
  }
  function cursorTarget() {
    return {
      x: (mx - 0.5) * 1.4,
      y: Math.max(0.08, (1 - my) * 0.85),
      z: 0.26 + my * 0.2
    };
  }

  function resize() {
    var box = canvas.parentElement;
    var w = box.clientWidth || 600, h = box.clientHeight || 400;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  var running = false, last = 0;
  var target = new THREE.Vector3();
  function tick(now) {
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    springTo(spring, cursorTarget(), dt);
    grip += ((gripping ? 1 : 0) - grip) * 0.14;
    var sgap = 0.038 - grip * 0.033;
    fL.position.y = sgap; fR.position.y = -sgap;
    var nullBias = Math.sin(now / 2600) * 0.85;
    target.set(spring.x, spring.y, spring.z);
    ccd(target, nullBias, dt);
    var cx = 1.05 + (mx - 0.5) * 0.22;
    var cy = 0.62 - (my - 0.5) * 0.16;
    camera.position.set(cx, cy, 1.5);
    camera.lookAt(0, 0.3, 0);
    renderer.render(scene, camera);
    if (roEl) roEl.textContent = 'q ' + q.map(function (v) { return (v * 57.3).toFixed(0); }).join('° ') + '° · grip ' + ((grip * 100) | 0) + '%';
    requestAnimationFrame(tick);
  }
  return {
    start: function () { if (running) return; running = true; last = performance.now(); resize(); requestAnimationFrame(tick); },
    stop: function () { running = false; }
  };
};
