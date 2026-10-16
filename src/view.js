import * as THREE from "../vendor/three.module.js";
import { damage, hit, hitBoss, STAGES, BOSS_INTRO_DURATION } from "./game.js";
import { cameraPose } from "./camera.js";
import { crossesDepth } from "./collision.js";
import { buildStageScenery, buildStageEnemy, buildStageBoss, animateStageBoss } from "./stage-art.js";
import { bossPose } from "./encounter.js";
const CYAN = 0x66fff1,
  PINK = 0xff397c;
export class FlightView {
  constructor(host, audio) {
    this.audio = audio;
    this.reduced = false;
    this.elapsed = 0;
    this.shot = 0;
    this.spawn = 0;
    this.entities = [];
    this.bullets = [];
    this.particles = [];
    this.bossMesh = null;
    this.bossShot = 0;
    this.shake = 0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080c22);
    this.scene.fog = new THREE.FogExp2(0x080c22, 0.009);
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0x96dfff, 0x24103c, 2.8));
    const light = new THREE.DirectionalLight(0xb0fff4, 3.5);
    light.position.set(-4, 12, 8);
    this.scene.add(light);
    const rim = new THREE.DirectionalLight(PINK, 3);
    rim.position.set(3, 5, -10);
    this.scene.add(rim);
    this.materials = {
      body: new THREE.MeshStandardMaterial({
        color: 0xc5ecf5,
        metalness: 0.6,
        roughness: 0.27,
      }),
      dark: new THREE.MeshStandardMaterial({
        color: 0x071025,
        metalness: 0.7,
        roughness: 0.24,
      }),
      glass: new THREE.MeshStandardMaterial({
        color: 0x18314e,
        metalness: 0.85,
        roughness: 0.13,
        emissive: 0x072341,
      }),
      pink: new THREE.MeshBasicMaterial({ color: PINK }),
      cyan: new THREE.MeshBasicMaterial({ color: CYAN }),
      wheel: new THREE.MeshStandardMaterial({
        color: 0x111422,
        roughness: 0.8,
      }),
    };
    this.glowTexture = this.makeGlow();
    this.car = this.makeCar();
    this.scene.add(this.car);
    this.makeWorld();
    this.resize();
  }
  makeGlow() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const ctx = c.getContext("2d"),
      g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.15, "rgba(255,255,255,.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  glow(color, size) {
    const m = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const s = new THREE.Sprite(m);
    s.scale.set(size, size, 1);
    return s;
  }
  box(w, h, d, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    return mesh;
  }
  makeCar() {
    const g = new THREE.Group(),
      m = this.materials;
    g.add(this.box(2.5, 0.42, 4.2, m.body, 0, 0, 0));
    g.add(this.box(2.65, 0.22, 3.7, m.dark, 0, -0.25, 0.05));
    g.add(this.box(1.9, 0.55, 1.7, m.glass, 0, 0.46, 0.1));
    g.add(this.box(1.7, 0.09, 1.15, m.body, 0, 0.78, 0.15));
    g.add(this.box(2.25, 0.14, 1.1, m.body, 0, 0.2, -1.43));
    g.add(this.box(2.45, 0.12, 0.75, m.body, 0, 0.19, 1.7));
    for (const x of [-1.26, 1.26])
      for (const z of [-1.2, 1.35]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.46, 0.3, 16),
          m.wheel,
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, -0.24, z);
        g.add(wheel);
        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 0.32, 12),
          m.cyan,
        );
        hub.rotation.z = Math.PI / 2;
        hub.position.copy(wheel.position);
        g.add(hub);
      }
    for (const x of [-0.85, 0.85]) {
      g.add(this.box(0.09, 0.52, 0.12, m.dark, x, 0.48, 1.65));
      g.add(this.box(0.55, 0.12, 0.08, m.pink, x, 0.1, 2.14));
      g.add(this.box(0.55, 0.1, 0.08, m.cyan, x, 0.12, -2.14));
      const glow = this.glow(CYAN, 2.1);
      glow.position.set(x, -0.28, 2.3);
      g.add(glow);
    }
    g.add(this.box(2.85, 0.12, 0.52, m.dark, 0, 0.78, 1.7));
    g.add(this.box(2.8, 0.035, 0.08, m.pink, 0, 0.86, 1.93));
    g.add(this.box(0.09, 0.025, 3.7, m.cyan, 0, 0.235, 0));
    g.add(this.box(2.4, 0.025, 0.07, m.cyan, 0, -0.33, 2.1));
    this.exhaust = [];
    for (const x of [-0.8, 0.8]) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.9, 10), m.cyan);
      f.rotation.x = Math.PI / 2;
      f.position.set(x, -0.16, 2.85);
      g.add(f);
      this.exhaust.push(f);
    }
    return g;
  }
  makeWorld() {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({
        color: 0x080f23,
        metalness: 0.55,
        roughness: 0.28,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.7, -120);
    this.scene.add(floor);
    this.floor = floor;
    this.grid = new THREE.GridHelper(500, 100, 0x1d5169, 0x16334f);
    this.grid.position.set(0, -0.65, -110);
    this.scene.add(this.grid);
    this.road = [];
    this.roadEdges=[];
    for (const x of [-12, 12]) {
      const l = this.box(0.12, 0.04, 320, this.materials.cyan, x, -0.5, -140);
      this.scene.add(l);this.roadEdges.push(l);
    }
    for (let i = 0; i < 30; i++) {
      const l = this.box(
        0.12,
        0.05,
        3,
        new THREE.MeshBasicMaterial({ color: 0x417e92 }),
        0,
        -0.52,
        -i * 10,
      );
      this.scene.add(l);
      this.road.push(l);
    }
    this.towers = [];
    for (let i = 0; i < 70; i++) {
      const h = 3 + Math.random() * 30,
        w = 2 + Math.random() * 5,
        x = (16 + Math.random() * 60) * (i % 2 ? 1 : -1),
        z = -Math.random() * 280;
      const g = new THREE.Group(),
        geo = new THREE.BoxGeometry(w, h, w),
        mat = new THREE.MeshStandardMaterial({
          color: i % 3 ? 0x10182f : 0x162143,
          metalness: 0.4,
          roughness: 0.6,
        });
      const b = new THREE.Mesh(geo, mat);
      b.position.y = h / 2 - 1;
      g.add(b);
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({
          color: i % 3 ? 0x195677 : 0x663a79,
          transparent: true,
          opacity: 0.65,
        }),
      );
      wire.position.copy(b.position);
      g.add(wire);
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.towers.push(g);
    }
    const sun = new THREE.Group();
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xff6a80 });
    for (let i = 0; i < 10; i++) {
      const y = -14 + i * 3.1,
        r = 23,
        half = Math.sqrt(Math.max(0, r * r - y * y));
      sun.add(this.box(half * 2, i < 4 ? 1.6 : 2.8, 0.1, sunMat, 0, y, 0));
    }
    sun.position.set(2, 35, -230);
    this.scene.add(sun);
    this.sun = sun;
    const halo = this.glow(0xff4269, 125);
    halo.position.set(2, 35, -231);
    this.scene.add(halo);
    this.halo = halo;
    const stars = new Float32Array(450 * 3);
    for (let i = 0; i < 450; i++) {
      stars[i * 3] = (Math.random() - 0.5) * 350;
      stars[i * 3 + 1] = 15 + Math.random() * 130;
      stars[i * 3 + 2] = -30 - Math.random() * 250;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    this.scene.add(
      new THREE.Points(
        geo,
        new THREE.PointsMaterial({
          color: 0x9daed6,
          size: 0.3,
          transparent: true,
          opacity: 0.75,
        }),
      ),
    );
    this.speedLines = [];
    for (let i = 0; i < 38; i++) {
      const l = this.box(
        0.025,
        0.025,
        2 + Math.random() * 5,
        new THREE.MeshBasicMaterial({
          color: i % 3 ? CYAN : PINK,
          transparent: true,
          opacity: 0.35,
        }),
        (Math.random() - 0.5) * 35,
        1 + Math.random() * 16,
        -Math.random() * 140,
      );
      this.scene.add(l);
      this.speedLines.push(l);
    }
  }
  setStage(stage) {
    this.worldStage=stage;
    const theme=STAGES[stage-1];
    this.scene.background.setHex(theme.sky);this.scene.fog.color.setHex(theme.sky);
    this.floor.material.color.setHex(theme.floor);
    this.materials.cyan.color.setHex(theme.accent);
    this.sun.children.forEach(part=>part.material.color.setHex(theme.sun));
    this.halo.material.color.setHex(theme.sun);
    this.sun.rotation.z = stage===4 ? .3 : 0;
    this.sun.scale.setScalar(stage===5 ? 1.4 : stage===3 ? .7 : 1);
    // Replace geometry, not just its palette. Side scenery never collides with the car.
    if(this.stageScenery)this.disposeObject(this.stageScenery);
    this.stageScenery=buildStageScenery(stage);this.scene.add(this.stageScenery);
    this.towers.forEach(t=>t.visible=false);
    this.road.forEach(t=>t.visible=stage===1);
    this.roadEdges.forEach(t=>t.visible=stage===1);
    this.grid.visible=stage===1||stage===5;
    this.sun.visible=stage!==3&&stage!==4;
    this.halo.visible=stage!==3&&stage!==4;
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.fov = cameraPose(this.camera.aspect).fov;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  setReduced(value) {
    this.reduced = value;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, value ? 1 : 1.7));
    this.resize();
  }
  disposeObject(obj) {
    this.scene.remove(obj);
    obj.traverse((n) => {
      if (n.geometry) n.geometry.dispose();
      if (n.material && !Object.values(this.materials).includes(n.material))
        n.material.dispose();
    });
  }
  reset() {
    for (const list of [this.entities, this.bullets, this.particles]) {
      for (const o of list) this.disposeObject(o.mesh);
      list.length = 0;
    }
    if (this.bossMesh) {
      this.disposeObject(this.bossMesh);
      this.bossMesh = null;
    }
    if(this.introPortal){this.disposeObject(this.introPortal);this.introPortal=null;}
    this.lastCombatPhase=null;
    this.shot = 0;
    this.spawn = 0.15;
    this.worldStage = 0;
    this.bossShot = 0;
    this.shake = 0;
  }
  enemy(s) {
    const kind = Math.random() < 0.22 ? "obstacle" : "drone";
    const g=buildStageEnemy(s.sector,kind==='obstacle');
    const x=(Math.random()-.5)*17,y=1.3+Math.random()*5.5;
    g.position.set(x, y, -120);
    this.scene.add(g);
    this.entities.push({
      mesh: g,
      kind,
      hp: kind === "drone" ? 2 : 5,
      r: kind === "drone" ? 1.3 : 1.25,
      speed: kind === "drone" ? 48 + s.sector * 4 : 46,
      baseX: x,baseY:y,stage:s.sector,
      phase: Math.random() * 6,
    });
  }
  projectile(x, y, z, hostile = false) {
    const mesh = this.box(
      hostile ? 0.22 : 0.2,
      hostile ? 0.22 : 0.2,
      hostile ? 0.7 : 3.8,
      hostile ? this.materials.pink : new THREE.MeshBasicMaterial({color:0xffffff}),
      x,
      y,
      z,
    );
    if (!hostile) {
      const sleeve=this.box(.42,.42,4.3,new THREE.MeshBasicMaterial({color:CYAN,transparent:true,opacity:.36,blending:THREE.AdditiveBlending,depthWrite:false}));
      mesh.add(sleeve);
    }
    this.scene.add(mesh);
    this.bullets.push({ mesh, hostile, speed: hostile ? 52 : -180 });
  }
  burst(pos, color, count = 18) {
    for (let i = 0; i < (this.reduced ? 6 : count) && this.particles.length < (this.reduced ? 80 : 360); i++) {
      const mesh = this.box(
        0.11,
        0.11,
        0.5,
        new THREE.MeshBasicMaterial({ color, transparent: true }),
      );
      mesh.position.copy(pos);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, 0);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        v: new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.25) * 12,
          (Math.random() - 0.5) * 20,
        ),
        life: 0.45 + Math.random() * 0.4,
      });
    }
    this.shake = Math.max(this.shake, this.reduced ? 0 : (count>12 ? 0.24 : 0));
  }
  explosion(pos,color) {
    this.burst(pos,color,this.reduced?6:42);
    if(this.reduced)return;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.8,.09,6,28),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false}));
    ring.name='kill-shockwave';ring.position.copy(pos);this.scene.add(ring);
    this.particles.push({mesh:ring,v:new THREE.Vector3(),life:.45,expansion:9});
    const flare=this.glow(0xffe5af,5);flare.position.copy(pos);this.scene.add(flare);
    this.particles.push({mesh:flare,v:new THREE.Vector3(),life:.22,expansion:3});
    this.shake=Math.max(this.shake,.38);
  }
  makeBoss(stage = 1) {
    const g = buildStageBoss(stage);
    g.position.set(0, 4, -140);
    this.scene.add(g);this.bossMesh=g;
  }
  clearCombat() {
    for(const list of [this.entities,this.bullets]) {
      for(const item of list)this.disposeObject(item.mesh);list.length=0;
    }
  }
  beginBossIntro(s) {
    this.clearCombat();this.bossShot=.65;
    if(!this.bossMesh)this.makeBoss(s.sector);
    if(this.introPortal)this.disposeObject(this.introPortal);
    const portal=new THREE.Group();portal.name='boss-entry-portal';
    for(let i=0;i<3;i++){
      const ring=new THREE.Mesh(new THREE.TorusGeometry(6+i*1.8,.12,6,48),new THREE.MeshBasicMaterial({color:STAGES[s.sector-1].accent,transparent:true,opacity:.65,depthWrite:false}));
      ring.rotation.z=i*.3;portal.add(ring);
    }
    portal.position.set(0,4,-65);this.scene.add(portal);this.introPortal=portal;
    this.audio.play('warning');
  }
  tick(dt, s, playing) {
    if (!playing && s?.status === "paused") {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    this.elapsed += dt;
    if(playing && this.worldStage !== s.sector) this.setStage(s.sector);
    if(playing && this.lastCombatPhase!==s.phase) {
      if(s.phase==='bossIntro')this.beginBossIntro(s);
      if(s.phase==='boss'&&this.lastCombatPhase!=='bossIntro')this.clearCombat();
      if(s.phase!=='bossIntro'&&this.introPortal){this.disposeObject(this.introPortal);this.introPortal=null;}
      this.lastCombatPhase=s.phase;
    }
    if(this.bossMesh && !s?.boss) {
      this.burst(this.bossMesh.position,STAGES[(s?.sector||1)-1].accent,75);
      this.disposeObject(this.bossMesh);this.bossMesh=null;
      for(const list of [this.entities,this.bullets]) {
        for(const item of list)this.disposeObject(item.mesh);list.length=0;
      }
    }
    const speed = playing ? STAGES[s.sector-1].speed * (s.boostTime>0 ? 2 : 1) : 20;
    this.grid.position.z = -110 + ((this.elapsed * speed) % 5);
    if(this.stageScenery)for(const motif of this.stageScenery.children) {
      if(!motif.userData.scroll)continue;
      motif.position.z+=dt*speed;
      if(motif.position.z>35)motif.position.z-=315;
    }
    for (const t of this.towers) {
      t.position.z += dt * speed;
      if (t.position.z > 30) t.position.z = -280;
    }
    for (const r of this.road) {
      r.position.z += dt * speed;
      if (r.position.z > 20) r.position.z = -280;
    }
    for (const l of this.speedLines) {
      l.visible = !this.reduced;
      l.position.z += dt * (speed + 20);
      if (l.position.z > 20) l.position.z = -140;
      l.scale.z = s?.boostTime > 0 ? 3 : 1;
    }
    if (playing) {
      this.car.position.lerp(
        new THREE.Vector3(s.x, s.y, 3),
        1 - Math.exp(-dt * 15),
      );
      this.car.rotation.z = THREE.MathUtils.lerp(
        this.car.rotation.z,
        (this.car.position.x - s.x) * 0.18,
        dt * 12,
      );
      this.car.rotation.y = THREE.MathUtils.lerp(
        this.car.rotation.y,
        (this.car.position.x - s.x) * 0.08,
        dt * 10,
      );
      this.car.rotation.x = THREE.MathUtils.lerp(
        this.car.rotation.x,
        (s.y - this.car.position.y) * 0.08,
        dt * 10,
      );
      this.car.visible =
        true;
      this.materials.body.emissive.setHex(s.invincible > 0 ? 0xff3355 : 0x000000);
      const pose = cameraPose(this.camera.aspect, s.boostTime > 0);
      this.camera.position.set(s.x * 0.16, 6.2 + s.y * 0.12, pose.z);
      this.camera.lookAt(s.x * 0.28, 3.4, -35);
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, pose.fov, dt * 5);
      this.camera.updateProjectionMatrix();
      this.shot -= dt;
      if (this.shot <= 0 && (s.phase === "wave" || s.phase === "boss")) {
        for (const x of [-0.8, 0.8]) this.projectile(s.x + x, s.y, 0);
        this.shot = s.boostTime > 0 ? 0.045 : 0.085;
        this.audio.play("shot");
      }
      if (s.phase === "wave") {
        this.spawn -= dt;
        if (this.spawn <= 0) {
          this.enemy(s);
          this.spawn = 0.44 - s.sector * 0.035;
        }
      }
      if (s.boss && !this.bossMesh) this.makeBoss(s.sector);
      if (this.bossMesh) {
        const b = this.bossMesh;
        if(s.phase==='bossIntro') {
          const p=1-s.introTime/BOSS_INTRO_DURATION,ease=1-Math.pow(1-p,3);
          const arrival=bossPose(s.sector,0);
          b.position.set(arrival.x*ease+Math.sin(p*Math.PI*2)*5*(1-p),4+(arrival.y-4)*ease+Math.sin(p*Math.PI)*3,-140+(140+arrival.z)*ease);
          b.rotation.set(0,(1-p)*Math.PI*1.3,(1-p)*-.45);
          if(this.introPortal){
            this.introPortal.rotation.z+=dt*(this.reduced?.1:.45);
            this.introPortal.scale.setScalar(.7+p*.5);
            this.introPortal.children.forEach(r=>r.material.opacity=Math.sin(p*Math.PI)*(this.reduced?.28:.7));
          }
        } else {
          const pose=bossPose(s.sector,s.bossTime||0);
          b.position.set(pose.x,pose.y,pose.z);
          b.rotation.set(.12*Math.sin((s.bossTime||0)*.8),-.14*Math.cos((s.bossTime||0)*.7),pose.roll);
          this.bossShot-=dt;
          // Shots originate at visible cannons, aimed at where the player was, never spawned next to them.
          if(this.bossShot<=0) {
            const spread=s.sector>=4?[-1,0,1]:[-1,1];
            for(const side of spread){
              this.projectile(b.position.x+side*2,b.position.y,b.position.z+2,true);
              const bullet=this.bullets[this.bullets.length-1];
              const dz=3-bullet.mesh.position.z,flight=dz/bullet.speed;
              bullet.vx=(s.x+side*1.4-bullet.mesh.position.x)/flight;
              bullet.vy=(s.y-bullet.mesh.position.y)/flight;
            }
            this.bossShot=1.35-s.sector*.09;
          }
        }
        animateStageBoss(b,s.sector,s.bossTime||this.elapsed);
      }
      for (let i = this.entities.length - 1; i >= 0; i--) {
        const e = this.entities[i],
          p = e.mesh.position;
        e.previousZ = p.z;
        p.z += dt * (e.speed + (s.boostTime > 0 ? 20 : 0));
        if (e.kind === "drone") {
          const t=this.elapsed+e.phase;
          p.x=e.baseX+Math.sin(t*(1.3+e.stage*.25))*(e.stage===4?2:1.2);
          p.y=e.baseY+Math.sin(t*(e.stage===3?2:1.2))*.45;
          e.mesh.rotation.z=e.stage===3?t*.7:Math.sin(t*2)*.3;
          if(e.stage===4)e.mesh.children.forEach((part,j)=>{part.rotation.y=Math.sin(t*3-j*.5)*.18;});
        } else e.mesh.rotation.y += dt;
        if (
          p.z > 1 &&
          p.z < 6 &&
          Math.abs(p.x - s.x) < e.r + 1 &&
          Math.abs(p.y - s.y) < (e.kind === "obstacle" ? 2.1 : 1)
        ) {
          if (damage(s, 20)) {
            this.audio.play("hit");
            this.shake = this.reduced ? 0 : 1.3;
            this.onDamage?.();
          }
          this.burst(p, PINK, 12);
          this.disposeObject(e.mesh);
          this.entities.splice(i, 1);
        } else if (p.z > 20) {
          this.disposeObject(e.mesh);
          this.entities.splice(i, 1);
        }
      }
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i],
          p = b.mesh.position,
          previousZ = p.z;
        p.z += dt * b.speed;
        p.x += dt*(b.vx||0);p.y += dt*(b.vy||0);
        let dead = p.z < -150 || p.z > 22;
        if (b.hostile) {
          if (
            p.z > 1 &&
            p.z < 6 &&
            Math.abs(p.x - s.x) < 1.2 &&
            Math.abs(p.y - s.y) < 0.9
          ) {
            if (damage(s, 12)) {
              this.audio.play("hit");
              this.shake = this.reduced ? 0 : 1.3;
            this.onDamage?.();
            }
            dead = true;
          }
        } else {
          if (
            s.phase === "boss" && this.bossMesh &&
            crossesDepth(
              previousZ,
              p.z,
              this.bossMesh.position.z,
              this.bossMesh.position.z,
              2.6,
            ) &&
            Math.abs(p.x - this.bossMesh.position.x) < 4.5 &&
            Math.abs(p.y - this.bossMesh.position.y) < 1.8
          ) {
            hitBoss(s, s.boostTime > 0 ? 2 : 1);
            this.burst(p, CYAN, 3);
            dead = true;
            if (!s.boss) this.burst(this.bossMesh.position, PINK, 65);
          }
          if (!dead)
            for (let j = this.entities.length - 1; j >= 0; j--) {
              const e = this.entities[j],
                q = e.mesh.position;
              if (
                crossesDepth(previousZ, p.z, e.previousZ ?? q.z, q.z, 2.2) &&
                Math.abs(p.x - q.x) < e.r &&
                Math.abs(p.y - q.y) < (e.kind === "obstacle" ? 1.8 : 1)
              ) {
                dead = true;
                e.hp -= s.boostTime > 0 ? 3 : 1;
                this.burst(p, CYAN, 3);
                if (e.hp <= 0) {
                  hit(s, e.kind === "drone" ? 100 : 150);
                  this.audio.play("kill");
                  this.explosion(q, e.kind === "drone" ? PINK : CYAN);
                  this.disposeObject(e.mesh);
                  this.entities.splice(j, 1);
                }
                break;
              }
            }
        }
        if (dead) {
          this.disposeObject(b.mesh);
          this.bullets.splice(i, 1);
        }
      }
    } else {
      this.car.visible = true;
      this.car.position.set(
        innerWidth < 700 ? 3.2 : 4.5,
        2.7 + Math.sin(this.elapsed) * 0.17,
        3,
      );
      this.car.rotation.set(
        0.03,
        Math.sin(this.elapsed * 0.22) * 0.12 - 0.28,
        -0.04,
      );
      this.camera.position.set(0, 6.5, 18);
      this.camera.lookAt(0, 3, -20);
      this.camera.fov = 58;
      this.camera.updateProjectionMatrix();
    }
    for (const f of this.exhaust)
      f.scale.y = (s?.boostTime > 0 ? 2.5 : 1) * (1 + Math.random() * 0.3);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.v, dt);
      p.mesh.material.opacity = Math.max(0, p.life * 1.5);
      p.mesh.scale.multiplyScalar(1 + dt*(p.expansion||1));
      if (p.life <= 0) {
        this.disposeObject(p.mesh);
        this.particles.splice(i, 1);
      }
    }
    if (this.shake > 0 && !this.reduced) {
      this.shake = Math.max(0,this.shake - dt*2.5);
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
