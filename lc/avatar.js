/* LightCode avatar – a human figure made of light with one layer of marks per system.
   Needs THREE (r128) and window.LC_BODY (MakeHuman base mesh, CC0). Draws only what the page hands over:
   points, lines and particle tones. Front of the body is +z, feet at y = -2.68, crown at y = 3.02. */
(() => {
  const T3 = window.THREE, BODY = window.LC_BODY;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = t => 1 - Math.pow(1 - cl(t), 3);
  const b64 = (s, T) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return new T(u.buffer); };
  const INTRO = 5.4, CY = 1.2;

  function create(box, opts = {}) {
    const reduce = !!opts.reduce, small = !!opts.small;
    const renderer = new T3.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setClearColor(0x09080c, 1);
    const cvs = renderer.domElement; cvs.className = 'pt-gl'; box.appendChild(cvs);
    const lbl = document.createElement('div'); lbl.className = 'pt-labels'; box.appendChild(lbl);
    const scene = new T3.Scene(), camera = new T3.PerspectiveCamera(38, 1, .1, 200);
    const world = new T3.Group(); scene.add(world);

    const tex = (stops) => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const r = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(([o, a]) => r.addColorStop(o, `rgba(255,255,255,${a})`)); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new T3.CanvasTexture(c); };
    const GLOW = tex([[0, 1], [.18, .75], [.45, .2], [1, 0]]);
    const RING = tex([[0, 0], [.5, 0], [.62, .95], [.74, .25], [1, 0]]);
    const sprite = (map, color, op) => new T3.Sprite(new T3.SpriteMaterial({ map, color, transparent: true, opacity: op, blending: T3.AdditiveBlending, depthWrite: false }));

    // Far glow behind the figure, so the scene has depth
    const neb = [[0x5a3cff, -6, 3, -9, 15, .1], [0xff8a4a, 6, -2, -10, 15, .07], [0x3fb4ff, 0, 7, -12, 18, .07]].map(([c, x, y, z, s, o]) => { const sp = sprite(GLOW, c, o); sp.position.set(x, y, z); sp.scale.setScalar(s); scene.add(sp); return sp; });
    const dustN = small ? 160 : 320, dustP = new Float32Array(dustN * 3), dustV = [];
    for (let i = 0; i < dustN; i++) { const a = Math.random() * 6.283, r = 2.2 + Math.random() * 7; dustP.set([Math.cos(a) * r, -4.5 + Math.random() * 9, Math.sin(a) * r], i * 3); dustV.push(.05 + Math.random() * .12); }
    const dustG = new T3.BufferGeometry(); dustG.setAttribute('position', new T3.BufferAttribute(dustP, 3));
    scene.add(new T3.Points(dustG, new T3.PointsMaterial({ map: GLOW, color: 0xe8e0ff, size: .1, transparent: true, opacity: .5, depthWrite: false, blending: T3.AdditiveBlending })));

    // ---- body: a fresnel shell plus points of light spread over the surface ----
    const BIDX = b64(BODY.idx, Uint16Array);
    function bodyGeo(sex) {
      const B = BODY[sex], q = b64(B.pos, Int16Array), p = new Float32Array(q.length);
      for (let i = 0; i < q.length; i++) { const k = i % 3; p[i] = B.min[k] + (q[i] + 32768) / 65535 * (B.max[k] - B.min[k]); }
      const g = new T3.BufferGeometry(); g.setAttribute('position', new T3.BufferAttribute(p, 3)); g.setIndex(new T3.BufferAttribute(BIDX, 1)); g.computeVertexNormals(); return g;
    }
    function surfPts(g, n) {
      const p = g.attributes.position.array, ix = g.index.array, C = []; let s = 0;
      const a = new T3.Vector3(), b = new T3.Vector3(), c = new T3.Vector3();
      for (let i = 0; i < ix.length; i += 3) { a.fromArray(p, ix[i] * 3); b.fromArray(p, ix[i + 1] * 3); c.fromArray(p, ix[i + 2] * 3); s += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2; C.push(s); }
      const out = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) {
        const r = Math.random() * s; let lo = 0, hi = C.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (C[m] < r) lo = m + 1; else hi = m; }
        let u = Math.random(), w = Math.random(); if (u + w > 1) { u = 1 - u; w = 1 - w; }
        a.fromArray(p, ix[lo * 3] * 3); b.fromArray(p, ix[lo * 3 + 1] * 3); c.fromArray(p, ix[lo * 3 + 2] * 3);
        out[k * 3] = a.x * (1 - u - w) + b.x * u + c.x * w; out[k * 3 + 1] = a.y * (1 - u - w) + b.y * u + c.y * w; out[k * 3 + 2] = a.z * (1 - u - w) + b.z * u + c.z * w;
      }
      return out;
    }
    const holo = new T3.ShaderMaterial({
      transparent: true, depthWrite: false, blending: T3.AdditiveBlending,
      uniforms: { uFill: { value: -9 }, uScan: { value: -9 }, uOp: { value: 0 }, uCool: { value: new T3.Color(.5, .52, 1) }, uWarm: { value: new T3.Color(1, .93, .84) } },
      vertexShader: 'varying vec3 vN;varying vec3 vV;varying float vY;void main(){vec4 w=modelMatrix*vec4(position,1.);vY=position.y;vec4 mv=viewMatrix*w;vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'uniform float uFill;uniform float uScan;uniform float uOp;uniform vec3 uCool;uniform vec3 uWarm;varying vec3 vN;varying vec3 vV;varying float vY;void main(){float f=pow(1.-abs(dot(vN,vV)),2.4);float lit=step(vY,uFill);vec3 c=mix(uCool,uWarm,lit*.55);float scan=smoothstep(.07,0.,abs(vY-uScan));float a=(f*.9+.03+scan*.4)*uOp*(.25+.75*lit);gl_FragColor=vec4(c*(.45+f*1.3+scan*1.4),a);}',
    });
    const bodyG = new T3.Group(); world.add(bodyG);
    let N = 0, SURF, POS, COL, TONE, DEL, PH, ptsGeo, y0 = -2.68, y1 = 3.02, sex = opts.sex === 'm' ? 'm' : 'f', tones = [[.9, .88, 1]];
    function buildBody() {
      while (bodyG.children.length) { const c = bodyG.children[0]; bodyG.remove(c); c.geometry.dispose(); }
      const g = bodyGeo(sex); bodyG.add(new T3.Mesh(g, holo));
      N = small ? 5500 : 9000; SURF = surfPts(g, N); POS = new Float32Array(N * 3); COL = new Float32Array(N * 3); TONE = new Float32Array(N * 3);
      DEL = new Float32Array(N); PH = new Float32Array(N);
      for (let i = 0; i < N; i++) { DEL[i] = (SURF[i * 3 + 1] - y0) / (y1 - y0) * 1.7 + Math.random() * .3; PH[i] = Math.random(); }
      ptsGeo = new T3.BufferGeometry(); ptsGeo.setAttribute('position', new T3.BufferAttribute(POS, 3)); ptsGeo.setAttribute('color', new T3.BufferAttribute(COL, 3));
      bodyG.add(new T3.Points(ptsGeo, new T3.PointsMaterial({ map: GLOW, size: .05, vertexColors: true, transparent: true, blending: T3.AdditiveBlending, depthWrite: false })));
      paint(); settled = false;
    }
    // Each particle takes the colour of one open system (squared for saturation); some stay pearl white
    function paint() {
      for (let i = 0; i < N; i++) {
        const r = PH[i], c = r < .16 ? [.86, .84, 1] : tones[Math.floor((r - .16) / .84 * tones.length) % tones.length];
        TONE[i * 3] = c[0] * c[0]; TONE[i * 3 + 1] = c[1] * c[1]; TONE[i * 3 + 2] = c[2] * c[2];
      }
      settled = false;
    }

    // ---- intro props: the six rings of the code fold into a spark, a line of light, then the body ----
    const C0 = new T3.Vector3(0, CY, 0);
    const circle = (r, n = 96) => { const a = []; for (let k = 0; k < n; k++) a.push(new T3.Vector3(Math.cos(k / n * 6.2832) * r, Math.sin(k / n * 6.2832) * r, 0)); return new T3.BufferGeometry().setFromPoints(a); };
    const introRings = (opts.colors || []).map((c, i) => { const l = new T3.LineLoop(circle(1.15 + i * .34), new T3.LineBasicMaterial({ color: new T3.Color(c[0] / 255, c[1] / 255, c[2] / 255), transparent: true, opacity: 0, blending: T3.AdditiveBlending, depthWrite: false })); l.position.copy(C0); scene.add(l); return l; });
    const flare = sprite(GLOW, 0xfff3e0, 0); flare.position.copy(C0); scene.add(flare);
    const axisG = new T3.BufferGeometry().setFromPoints([C0.clone(), C0.clone()]);
    const axis = new T3.Line(axisG, new T3.LineBasicMaterial({ color: 0xfff6e8, transparent: true, opacity: 0, blending: T3.AdditiveBlending, depthWrite: false })); world.add(axis);

    // ---- system layers ----
    let layers = [], points = [], labels = [], focusSys = null, selected = null;
    function clearLayers() {
      layers.forEach(L => { world.remove(L.g); L.g.traverse(o => { if (o.geometry && o.type !== 'Sprite') o.geometry.dispose(); if (o.material) o.material.dispose(); }); });
      layers = []; points = []; lbl.innerHTML = ''; labels = [];
    }
    function setModel(m) {
      clearLayers();
      tones = (m.tones && m.tones.length ? m.tones : [[240, 236, 255]]).map(c => c.map(v => v / 255));
      if (N) paint();
      const nSys = m.colors.length;
      for (let s = 0; s < nSys; s++) layers.push({ g: new T3.Group(), k: 0, f: 1, lines: [], col: new T3.Color(m.colors[s][0] / 255, m.colors[s][1] / 255, m.colors[s][2] / 255) });
      layers.forEach(L => world.add(L.g));
      for (const ln of m.lines || []) {
        const L = layers[ln.sys], geo = new T3.BufferGeometry().setFromPoints(ln.pts.map(p => new T3.Vector3(p[0], p[1], p[2])));
        const mat = new T3.LineBasicMaterial({ color: L.col, transparent: true, opacity: 0, blending: T3.AdditiveBlending, depthWrite: false });
        const o = ln.closed ? new T3.LineLoop(geo, mat) : new T3.Line(geo, mat); o.userData.a = ln.a ?? .5; L.g.add(o); L.lines.push(o);
      }
      for (const pt of m.points || []) {
        const L = layers[pt.sys], r = pt.r || 1;
        const halo = sprite(pt.hollow ? RING : GLOW, L.col, 0), core = pt.hollow ? null : sprite(GLOW, 0xffffff, 0);
        halo.position.set(pt.p[0], pt.p[1], pt.p[2]); L.g.add(halo);
        if (core) { core.position.copy(halo.position); L.g.add(core); }
        const P = { ...pt, r, halo, core, pos: halo.position, ph: Math.random() * 6.28, lab: null };
        if (pt.t && !pt.mute) { const d = document.createElement('div'); d.className = 'pt-l'; d.textContent = pt.t; d.style.color = `rgb(${m.colors[pt.sys].join(',')})`; lbl.appendChild(d); P.lab = d; }
        points.push(P);
      }
    }

    // ---- camera: the figure turns slowly, a drag turns it by hand ----
    let shooting = false, W = 1, Hh = 1, rot = 0, rotT = 0, pitch = 0, pitchT = 0, drag = null, moved = 0, idle = 0;
    const camTarget = new T3.Vector3(0, small ? 1.2 : .62, 0); // phones: the tool bar sits over the top of the stage, so the figure stands lower
    function resize() {
      const r = box.getBoundingClientRect(); W = Math.max(1, r.width); Hh = Math.max(1, r.height);
      renderer.setSize(W, Hh, false); cvs.style.width = W + 'px'; cvs.style.height = Hh + 'px';
      camera.aspect = W / Hh; camera.updateProjectionMatrix();
    }
    const fitRad = () => Math.max(12.2, 10.4 / camera.aspect) * (small && !shooting ? 1.17 : 1);
    cvs.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, rot: rotT, pitch: pitchT }; moved = 0; try { cvs.setPointerCapture(e.pointerId); } catch (er) {} });
    cvs.addEventListener('pointermove', e => {
      if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; moved = Math.max(moved, Math.hypot(dx, dy));
      rotT = drag.rot + dx * .009; pitchT = cl(drag.pitch + dy * .004, -.35, .45); idle = 0;
    });
    const v = new T3.Vector3();
    const toScreen = p => { v.copy(p).applyMatrix4(world.matrixWorld).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * Hh, v.z]; };
    cvs.addEventListener('pointerup', e => {
      const wasDrag = moved > 7; drag = null; if (wasDrag || !opts.onPick) return;
      const r = cvs.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; let best = null, bd = 34;
      for (const P of points) { if (P.mute || layers[P.sys].k * layers[P.sys].f < .5) continue; const [sx, sy] = toScreen(P.pos), d = Math.hypot(sx - x, sy - y); if (d < bd) { bd = d; best = P; } }
      selected = best ? best.id : null; opts.onPick(selected);
    });
    cvs.addEventListener('pointercancel', () => { drag = null; });

    // ---- frame ----
    let T = reduce ? INTRO : 0, running = false, raf = 0, last = 0, settled = false, t = 0, rangLayer = -1;
    function step(dt) {
      t += dt; T = Math.min(INTRO, T + dt); idle += dt;
      if (!drag && idle > 1.2 && !reduce) rotT += dt * .16;
      rot += (rotT - rot) * Math.min(1, dt * 5); pitch += (pitchT - pitch) * Math.min(1, dt * 5);
      world.rotation.y = rot;
      const rad = fitRad() * (1 + .22 * (1 - ease(T / 3.2)));
      camera.position.set(0, camTarget.y + Math.sin(pitch) * rad, Math.cos(pitch) * rad); camera.lookAt(camTarget);
      world.updateMatrixWorld();

      // rings fold in
      const rk = ease(T / .95);
      introRings.forEach((l, i) => { const s = Math.max(.001, 1 - rk); l.scale.setScalar(s); l.rotation.z = (i % 2 ? 1 : -1) * rk * 2.2; l.material.opacity = T < .95 ? .9 * Math.min(1, T / .15) * (1 - rk * rk) : 0; l.visible = T < .95; });
      const fl = T < .9 ? ease(T / .9) : 1 - cl((T - .9) / 1.4);
      flare.scale.setScalar(.3 + fl * 3.2); flare.material.opacity = fl * .95; flare.visible = fl > .002;
      // line of light along the body axis
      const ak = ease((T - .75) / .9), ap = axisG.attributes.position.array;
      ap[1] = CY + (y1 - CY) * ak; ap[4] = CY + (y0 - CY) * ak; axisG.attributes.position.needsUpdate = true;
      axis.material.opacity = ak * (1 - cl((T - 2.6) / 1.4)) * .9;
      // body: particles wind onto the surface from the feet up, the scan follows the front
      const bt = T - 1.55, front = y0 + (y1 - y0) * cl(bt / 1.7);
      holo.uniforms.uFill.value = bt > 0 ? front + .05 : -9; holo.uniforms.uScan.value = bt > 0 && bt < 2 ? front : -9;
      holo.uniforms.uOp.value = cl(bt / .6) * (.5 + .05 * Math.sin(t * 1.3));
      if (!settled) {
        let all = true;
        for (let i = 0; i < N; i++) {
          const k = cl((bt - DEL[i]) / .75), e = 1 - Math.pow(1 - k, 3), a = (1 - e) * 2.6, x = SURF[i * 3] * e, z = SURF[i * 3 + 2] * e, ca = Math.cos(a), sa = Math.sin(a);
          POS[i * 3] = x * ca - z * sa; POS[i * 3 + 1] = SURF[i * 3 + 1]; POS[i * 3 + 2] = x * sa + z * ca;
          const fl2 = k > 0 && k < 1 ? 1.6 * (1 - k) : 0, b = k > 0 ? Math.min(1, .25 + e) : 0;
          COL[i * 3] = TONE[i * 3] * b + fl2; COL[i * 3 + 1] = TONE[i * 3 + 1] * b + fl2; COL[i * 3 + 2] = TONE[i * 3 + 2] * b + fl2;
          if (k < 1) all = false;
        }
        ptsGeo.attributes.position.needsUpdate = true; ptsGeo.attributes.color.needsUpdate = true; settled = all;
      }
      bodyG.scale.setScalar(1 + .004 * Math.sin(t * 1.1));
      // layers arrive one after another
      layers.forEach((L, s) => {
        const k = ease((T - 3.3 - s * .26) / .6); L.k = k;
        if (k > .05 && s > rangLayer && T < INTRO) { rangLayer = s; if (opts.onLayer) opts.onLayer(s); }
        const want = focusSys === null || focusSys === s ? 1 : .1; L.f += (want - L.f) * Math.min(1, dt * 6);
        const a = k * L.f; L.g.visible = a > .003;
        L.lines.forEach(o => { o.material.opacity = o.userData.a * a; });
      });
      for (const P of points) {
        const L = layers[P.sys], a = L.k * L.f, pulse = 1 + .12 * Math.sin(t * 1.8 + P.ph), sel = selected === P.id ? 1.7 + .25 * Math.sin(t * 5) : 1;
        const dim = P.dim ? .4 : 1;
        P.halo.scale.setScalar((P.hollow ? .34 : .62) * P.r * pulse * sel * Math.max(.001, L.k)); P.halo.material.opacity = (P.hollow ? .55 : .8) * a * dim;
        if (P.core) { P.core.scale.setScalar(.2 * P.r * sel * Math.max(.001, L.k)); P.core.material.opacity = .95 * a * dim; }
        if (P.lab) {
          const [sx, sy, sz] = toScreen(P.pos), dx = P.lx ?? 0, dy = P.ly ?? -16;
          P.lab.style.opacity = (sz < 1 ? a * (selected === null || selected === P.id ? 1 : .55) : 0).toFixed(2);
          P.lab.style.transform = `translate(${(sx + dx).toFixed(1)}px,${(sy + dy).toFixed(1)}px) translate(-50%,-50%)`;
        }
      }
      for (let i = 0; i < dustN; i++) { dustP[i * 3 + 1] += dustV[i] * dt; if (dustP[i * 3 + 1] > 4.5) dustP[i * 3 + 1] = -4.5; }
      dustG.attributes.position.needsUpdate = true;
      renderer.render(scene, camera);
    }
    function loop(now) { if (!running) return; const dt = Math.min(.05, (now - last) / 1000 || .016); last = now; step(dt); raf = requestAnimationFrame(loop); }

    buildBody(); resize();
    const ro = window.ResizeObserver ? new ResizeObserver(() => { resize(); if (!running) step(0); }) : null; if (ro) ro.observe(box);

    return {
      setModel,
      play(from = 0) { T = reduce ? INTRO : from; rangLayer = -1; settled = false; rot = rotT = 0; pitch = pitchT = 0; idle = 0; selected = null; },
      setSex(s) { if (s === sex) return; sex = s; buildBody(); if (!reduce) { T = Math.min(T, .8); rangLayer = -1; } },
      focus(s) { focusSys = s; },
      select(id) { selected = id; },
      start() { if (running) return; running = true; last = performance.now(); resize(); raf = requestAnimationFrame(loop); },
      stop() { running = false; cancelAnimationFrame(raf); },
      // Still frame for the story image: front view, everything assembled
      snapshot(w, h) {
        const keep = { T, rot, rotT, pitch, pitchT, focusSys, selected, pr: renderer.getPixelRatio() };
        T = INTRO; rot = rotT = 0; pitch = pitchT = 0; focusSys = null; selected = null; settled = false; shooting = true;
        layers.forEach(L => { L.f = 1; });
        renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); W = w; Hh = h;
        step(0);
        const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(cvs, 0, 0, w, h);
        shooting = false; renderer.setPixelRatio(keep.pr); ({ T, rot, rotT, pitch, pitchT, focusSys, selected } = keep); settled = false; resize(); step(0);
        return c;
      },
    };
  }
  window.LCAvatar = { create, ok: () => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } } };
})();
