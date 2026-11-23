/**
 * 3D 실 당김 시뮬레이터 엔진 (Three.js 기반) - 워크북 실물 재현 & 무결점 기하학 힌지 아키텍처
 * PosGroup(위치 & Y축 방향 고정) + RotGroup(로컬 X축 순수 힌지 회전) 2단계 리그 구조로
 * 바닥 관통 및 오일러 각도 꼬임 결함을 수학적으로 100% 원천 해결
 */

class ShapeSimulator3D {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found`);
      return;
    }

    this.currentShapeType = 'cube';
    this.pullProgress = 0.0;
    this.autoRotate = false;
    this.wireframeMode = false;
    this.isAnimating = false;
    this.animationId = null;

    this.onProgressChange = null;
    this.onShapeChange = null;

    this.initThree();
    this.setupLights();
    this.setupWorkbookEnvironment();
    this.loadShape(this.currentShapeType);
    this.setupEvents();
    this.animate();
  }

  initThree() {
    const width = this.container.clientWidth || 700;
    const height = this.container.clientHeight || 500;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    // Camera (실제 책상을 내려다보는 원근 뷰)
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.camera.position.set(0, 5.8, 7.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // 책상 아래로는 내려가지 않게 제한
    this.controls.minDistance = 3.5;
    this.controls.maxDistance = 15;
    this.controls.target.set(0, 0.4, 0.1);

    this.deskGroup = new THREE.Group();
    this.scene.add(this.deskGroup);

    this.shapeGroup = new THREE.Group();
    this.scene.add(this.shapeGroup);

    this.stringGroup = new THREE.Group();
    this.scene.add(this.stringGroup);
  }

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xfffaf0, 0.9);
    mainLight.position.set(5, 12, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 25;
    mainLight.shadow.camera.left = -6;
    mainLight.shadow.camera.right = 6;
    mainLight.shadow.camera.top = 6;
    mainLight.shadow.camera.bottom = -6;
    mainLight.shadow.bias = -0.0003;
    this.scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xe0f2fe, 0.35);
    rimLight.position.set(-6, 5, -5);
    this.scene.add(rimLight);
  }

  // 실제 유튜브 영상 속 원목 책상과 스프링 스케치북 워크북
  setupWorkbookEnvironment() {
    // 1. 원목 책상 상판
    const deskGeo = new THREE.BoxGeometry(16, 0.5, 14);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0xbaa187,
      roughness: 0.7,
      metalness: 0.05
    });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, -0.26, 0);
    desk.receiveShadow = true;
    this.deskGroup.add(desk);

    // 2. 워크북 화이트 스케치북 본체
    const bookWidth = 7.0;
    const bookHeight = 0.08;
    const bookDepth = 5.4;

    const bookGeo = new THREE.BoxGeometry(bookWidth, bookHeight, bookDepth);
    const bookMat = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      roughness: 0.9,
      metalness: 0.02
    });
    this.workbook = new THREE.Mesh(bookGeo, bookMat);
    this.workbook.position.set(0, bookHeight / 2, 0.1);
    this.workbook.receiveShadow = true;
    this.workbook.castShadow = true;
    this.deskGroup.add(this.workbook);

    const bookEdgeGeo = new THREE.EdgesGeometry(bookGeo);
    const bookEdgeMat = new THREE.LineBasicMaterial({ color: 0xd1d5db });
    const bookEdges = new THREE.LineSegments(bookEdgeGeo, bookEdgeMat);
    bookEdges.position.copy(this.workbook.position);
    this.deskGroup.add(bookEdges);

    // 3. 트윈 링 스프링 제본 (좌측 모서리)
    const ringCount = 18;
    const ringRadius = 0.16;
    const ringTube = 0.022;
    const ringSpacing = (bookDepth - 0.6) / (ringCount - 1);
    const startZ = -(bookDepth - 0.6) / 2 + 0.1;

    const ringGeo = new THREE.TorusGeometry(ringRadius, ringTube, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8
    });

    for (let i = 0; i < ringCount; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(-bookWidth / 2 + 0.02, bookHeight / 2 + 0.06, startZ + i * ringSpacing);
      ring.rotation.y = Math.PI / 2;
      ring.castShadow = true;
      this.deskGroup.add(ring);
    }
  }

  setupEvents() {
    const handleResize = () => {
      if (!this.container) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width === 0 || height === 0) return;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => handleResize());
      this.resizeObserver.observe(this.container);
    }
    setTimeout(handleResize, 100);
  }

  getShapeMeta(type) {
    const meta = {
      cube: {
        id: 'cube',
        name: '정육면체 (Cube)',
        desc: '6개의 합동인 정사각형 면으로 이루어진 기본 다면체 (실을 당기면 3D 상자로 완성)',
        color: '#facc15', // Sunflower Yellow (실물 교구 노란색)
        stroke: '#ca8a04',
        faces: 6,
        edges: 12,
        vertices: 8,
        formula: '8 - 12 + 6 = 2 (오일러 공식 성립)',
        curriculum: '초등 5-2 5단원 직육면체',
        pullType: 'forward'
      },
      cuboid: {
        id: 'cuboid',
        name: '직육면체 (Cuboid)',
        desc: '마주 보는 면이 합동인 직사각형 6개로 둘러싸인 기둥형 다면체',
        color: '#38bdf8', // Sky Blue
        stroke: '#0284c7',
        faces: 6,
        edges: 12,
        vertices: 8,
        formula: '8 - 12 + 6 = 2 (오일러 공식 성립)',
        curriculum: '초등 5-2 5단원 직육면체',
        pullType: 'forward'
      },
      prism: {
        id: 'prism',
        name: '삼각기둥 (Triangular Prism)',
        desc: '두 밑면이 합동인 삼각형이고 옆면이 3개의 직사각형인 기둥 도형',
        color: '#fb923c', // Warm Orange
        stroke: '#ea580c',
        faces: 5,
        edges: 9,
        vertices: 6,
        formula: '6 - 9 + 5 = 2 (오일러 공식 성립)',
        curriculum: '초등 6-1 2단원 각기둥과 각뿔',
        pullType: 'forward'
      },
      pyramid: {
        id: 'pyramid',
        name: '육각뿔 (Hexagonal Pyramid)',
        desc: '초록색 별(Star) 모양 전개도에서 실을 위로 당겨 꼭짓점으로 모으는 피라미드',
        color: '#4ade80', // Mint Green (실물 교구 녹색 별모양 전개도)
        stroke: '#16a34a',
        faces: 7,
        edges: 12,
        vertices: 7,
        formula: '7 - 12 + 7 = 2 (오일러 공식 성립)',
        curriculum: '초등 6-1 2단원 각기둥과 각뿔',
        pullType: 'upward'
      },
      cylinder: {
        id: 'cylinder',
        name: '원기둥 (Cylinder)',
        desc: '핑크색 직사각형 종이가 둥글게 말려 상하 두 원형 밑면과 결합되는 곡면 도형',
        color: '#f472b6', // Pastel Pink (실물 교구 핑크색)
        stroke: '#db2777',
        faces: '3 (밑면 2 + 곡면 1)',
        edges: '2 (곡선 모서리)',
        vertices: 0,
        formula: '곡면 다면체 제외 (전개도 가로 = 원주 2πr)',
        curriculum: '초등 6-2 6단원 원기둥, 원뿔, 구',
        pullType: 'forward'
      }
    };
    return meta[type] || meta.cube;
  }

  // 힌지 메쉬 생성 (로컬: x in [-w/2, w/2], z in [0, L], y = 0)
  createHingedMesh(width, length, color, strokeColor, options = {}) {
    const group = new THREE.Group();
    const w2 = width / 2;
    const l = length;

    const geom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -w2, 0, 0,
       w2, 0, 0,
       w2, 0, l,

      -w2, 0, 0,
       w2, 0, l,
      -w2, 0, l
    ]);

    const normals = new Float32Array([
      0, 1, 0,  0, 1, 0,  0, 1, 0,
      0, 1, 0,  0, 1, 0,  0, 1, 0
    ]);

    geom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.05,
      wireframe: this.wireframeMode
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(strokeColor), linewidth: 2 });
    const line = new THREE.LineSegments(edges, lineMat);
    group.add(line);

    if (options.holes && options.holes.length > 0) {
      const holeGeo = new THREE.RingGeometry(0.02, 0.065, 16);
      const holeMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide });
      options.holes.forEach(pos => {
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(pos.x, 0.003, pos.z);
        group.add(hole);
      });
    }

    return group;
  }

  // 바닥 고정 밑면
  createFlatBase(width, depth, color, strokeColor) {
    const group = new THREE.Group();
    const geom = new THREE.PlaneGeometry(width, depth);
    geom.rotateX(-Math.PI / 2);

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0.05,
      wireframe: this.wireframeMode
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    group.add(mesh);

    const edges = new THREE.EdgesGeometry(geom);
    const lineMat = new THREE.LineBasicMaterial({ color: new THREE.Color(strokeColor), linewidth: 2 });
    const line = new THREE.LineSegments(edges, lineMat);
    group.add(line);

    return group;
  }

  /**
   * [2단계 힌지 어셈블리 생성기]
   * posGroup: 힌지의 위치(hingeX, hingeY, hingeZ)와 방향(yawAngle)을 고정.
   * rotGroup: posGroup의 자식. 오직 로컬 X축 회전만 담당하여 오일러 회전 각도 꼬임을 100% 방지.
   */
  createHingeAssembly(hingeX, hingeY, hingeZ, yawAngle, childMesh, maxAngle, parent = null) {
    const posGroup = new THREE.Group();
    posGroup.position.set(hingeX, hingeY, hingeZ);
    posGroup.rotation.y = yawAngle;

    const rotGroup = new THREE.Group();
    rotGroup.add(childMesh);
    posGroup.add(rotGroup);

    if (parent) {
      parent.add(posGroup);
    } else {
      this.shapeGroup.add(posGroup);
    }

    this.pivots.push({ rotGroup, maxAngle });
    return { posGroup, rotGroup };
  }

  loadShape(type) {
    this.currentShapeType = type;

    while (this.shapeGroup.children.length > 0) {
      this.shapeGroup.remove(this.shapeGroup.children[0]);
    }
    while (this.stringGroup.children.length > 0) {
      this.stringGroup.remove(this.stringGroup.children[0]);
    }

    this.pivots = [];
    this.pullTabMesh = null;
    this.stringLines = [];

    const meta = this.getShapeMeta(type);

    switch (type) {
      case 'cube':
        this.buildCube(meta);
        break;
      case 'cuboid':
        this.buildCuboid(meta);
        break;
      case 'prism':
        this.buildPrism(meta);
        break;
      case 'pyramid':
        this.buildPyramid(meta);
        break;
      case 'cylinder':
        this.buildCylinder(meta);
        break;
    }

    this.setPullProgress(this.pullProgress);

    if (this.onShapeChange) {
      this.onShapeChange(meta);
    }
  }

  // ================= 1. 정육면체 (Cube) - 6면 완전 밀폐 =================
  buildCube(meta) {
    const S = 1.6; // 한 변 길이
    const bookY = 0.085;

    // 1. 밑면
    const base = this.createFlatBase(S, S, meta.color, meta.stroke);
    base.position.set(0, bookY, 0);
    this.shapeGroup.add(base);

    // 2. 앞면 (Front): z = +S/2 힌지, yaw = 0
    const frontMesh = this.createHingedMesh(S, S, meta.color, meta.stroke, {
      holes: [{ x: -S / 2 + 0.15, z: S - 0.15 }, { x: S / 2 - 0.15, z: S - 0.15 }]
    });
    const front = this.createHingeAssembly(0, bookY, S / 2, 0, frontMesh, Math.PI / 2);

    // 3. 뒷면 (Back): z = -S/2 힌지, yaw = Math.PI (뒤쪽 방향)
    const backMesh = this.createHingedMesh(S, S, meta.color, meta.stroke);
    const back = this.createHingeAssembly(0, bookY, -S / 2, Math.PI, backMesh, Math.PI / 2);

    // 4. 윗면 (Top Lid): 뒷면의 rotGroup 끝(z=S)에 종속된 2차 힌지!
    const topMesh = this.createHingedMesh(S, S, '#fef08a', meta.stroke, {
      holes: [{ x: -S / 2 + 0.15, z: S - 0.15 }, { x: S / 2 - 0.15, z: S - 0.15 }]
    });
    // back.rotGroup 안에 z=S 위치에 추가!
    this.createHingeAssembly(0, 0, S, 0, topMesh, Math.PI / 2, back.rotGroup);

    // 5. 왼쪽면 (Left): x = -S/2 힌지, yaw = -Math.PI / 2 (왼쪽 방향)
    const leftMesh = this.createHingedMesh(S, S, meta.color, meta.stroke);
    this.createHingeAssembly(-S / 2, bookY, 0, -Math.PI / 2, leftMesh, Math.PI / 2);

    // 6. 오른쪽면 (Right): x = +S/2 힌지, yaw = Math.PI / 2 (오른쪽 방향)
    const rightMesh = this.createHingedMesh(S, S, meta.color, meta.stroke);
    this.createHingeAssembly(S / 2, bookY, 0, Math.PI / 2, rightMesh, Math.PI / 2);

    // 실물 전방 PULL 탭 & 스트링 연동
    this.setupWorkbookForwardPull({
      anchorLeft: { pivot: front.rotGroup, localPos: new THREE.Vector3(-S / 2 + 0.15, 0, S - 0.15) },
      anchorRight: { pivot: front.rotGroup, localPos: new THREE.Vector3(S / 2 - 0.15, 0, S - 0.15) },
      guideLeft: new THREE.Vector3(-S / 2 + 0.15, bookY, S / 2 + 0.2),
      guideRight: new THREE.Vector3(S / 2 - 0.15, bookY, S / 2 + 0.2),
      pullTabStartY: bookY,
      pullTabStartZ: S / 2 + 1.2,
      pullTabDistance: 1.4,
      tabColor: 0xfacc15
    });
  }

  // ================= 2. 직육면체 (Cuboid) =================
  buildCuboid(meta) {
    const W = 2.2;
    const H = 1.4;
    const D = 1.5;
    const bookY = 0.085;

    // 밑면
    const base = this.createFlatBase(W, D, meta.color, meta.stroke);
    base.position.set(0, bookY, 0);
    this.shapeGroup.add(base);

    // 앞면 (W x H)
    const frontMesh = this.createHingedMesh(W, H, meta.color, meta.stroke, {
      holes: [{ x: -W / 2 + 0.2, z: H - 0.15 }, { x: W / 2 - 0.2, z: H - 0.15 }]
    });
    const front = this.createHingeAssembly(0, bookY, D / 2, 0, frontMesh, Math.PI / 2);

    // 뒷면 (W x H)
    const backMesh = this.createHingedMesh(W, H, meta.color, meta.stroke);
    const back = this.createHingeAssembly(0, bookY, -D / 2, Math.PI, backMesh, Math.PI / 2);

    // 윗면 (W x D) - 뒷면 끝(z=H)에 연결
    const topMesh = this.createHingedMesh(W, D, '#bae6fd', meta.stroke);
    this.createHingeAssembly(0, 0, H, 0, topMesh, Math.PI / 2, back.rotGroup);

    // 왼쪽면 (D x H)
    const leftMesh = this.createHingedMesh(D, H, meta.color, meta.stroke);
    this.createHingeAssembly(-W / 2, bookY, 0, -Math.PI / 2, leftMesh, Math.PI / 2);

    // 오른쪽면 (D x H)
    const rightMesh = this.createHingedMesh(D, H, meta.color, meta.stroke);
    this.createHingeAssembly(W / 2, bookY, 0, Math.PI / 2, rightMesh, Math.PI / 2);

    this.setupWorkbookForwardPull({
      anchorLeft: { pivot: front.rotGroup, localPos: new THREE.Vector3(-W / 2 + 0.2, 0, H - 0.15) },
      anchorRight: { pivot: front.rotGroup, localPos: new THREE.Vector3(W / 2 - 0.2, 0, H - 0.15) },
      guideLeft: new THREE.Vector3(-W / 2 + 0.2, bookY, D / 2 + 0.2),
      guideRight: new THREE.Vector3(W / 2 - 0.2, bookY, D / 2 + 0.2),
      pullTabStartY: bookY,
      pullTabStartZ: D / 2 + 1.2,
      pullTabDistance: 1.4,
      tabColor: 0x38bdf8
    });
  }

  // ================= 3. 삼각기둥 (Triangular Prism) =================
  buildPrism(meta) {
    const L = 2.0;
    const H = 1.8;
    const hTri = L * (Math.sqrt(3) / 2);
    const rIn = hTri / 3;
    const bookY = 0.085;

    // 밑면 정삼각형
    const triShape = new THREE.Shape();
    triShape.moveTo(-L / 2, -rIn);
    triShape.lineTo(L / 2, -rIn);
    triShape.lineTo(0, 2 * rIn);
    triShape.closePath();

    const triGeo = new THREE.ShapeGeometry(triShape);
    triGeo.rotateX(-Math.PI / 2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(meta.color),
      side: THREE.DoubleSide,
      roughness: 0.55
    });
    const base = new THREE.Mesh(triGeo, baseMat);
    base.position.set(0, bookY, 0);
    this.shapeGroup.add(base);

    const baseLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(triGeo),
      new THREE.LineBasicMaterial({ color: new THREE.Color(meta.stroke) })
    );
    baseLine.position.copy(base.position);
    this.shapeGroup.add(baseLine);

    // 1. 앞쪽 직사각형 옆면
    const rect1 = this.createHingedMesh(L, H, meta.color, meta.stroke, {
      holes: [{ x: -L / 2 + 0.2, z: H - 0.15 }, { x: L / 2 - 0.2, z: H - 0.15 }]
    });
    const front = this.createHingeAssembly(0, bookY, rIn, 0, rect1, Math.PI / 2);

    // 윗면 뚜껑 삼각형 (front의 z=H에 결합)
    const topCapGroup = new THREE.Group();
    const topCapMesh = new THREE.Mesh(triGeo, new THREE.MeshStandardMaterial({
      color: 0xfed7aa,
      side: THREE.DoubleSide,
      roughness: 0.55
    }));
    topCapMesh.rotation.y = Math.PI;
    topCapMesh.position.set(0, 0, rIn);
    topCapGroup.add(topCapMesh);
    this.createHingeAssembly(0, 0, H, 0, topCapGroup, Math.PI / 2, front.rotGroup);

    // 2. 우측 옆면 (120도)
    const pX2 = rIn * Math.cos(Math.PI / 6);
    const pZ2 = -rIn * Math.sin(Math.PI / 6);
    const rect2 = this.createHingedMesh(L, H, meta.color, meta.stroke);
    this.createHingeAssembly(pX2, bookY, pZ2, (2 * Math.PI) / 3, rect2, Math.PI / 2);

    // 3. 좌측 옆면 (240도)
    const rect3 = this.createHingedMesh(L, H, meta.color, meta.stroke);
    this.createHingeAssembly(-pX2, bookY, pZ2, -(2 * Math.PI) / 3, rect3, Math.PI / 2);

    this.setupWorkbookForwardPull({
      anchorLeft: { pivot: front.rotGroup, localPos: new THREE.Vector3(-L / 2 + 0.2, 0, H - 0.15) },
      anchorRight: { pivot: front.rotGroup, localPos: new THREE.Vector3(L / 2 - 0.2, 0, H - 0.15) },
      guideLeft: new THREE.Vector3(-L / 2 + 0.2, bookY, rIn + 0.2),
      guideRight: new THREE.Vector3(L / 2 - 0.2, bookY, rIn + 0.2),
      pullTabStartY: bookY,
      pullTabStartZ: rIn + 1.2,
      pullTabDistance: 1.4,
      tabColor: 0xf97316
    });
  }

  // ================= 4. 육각뿔 (Hexagonal Pyramid) - 6개 날개 완전 수렴 =================
  buildPyramid(meta) {
    const R = 1.7; // 외접원 반지름
    const S = R; // 한 변 길이
    const rIn = R * (Math.sqrt(3) / 2); // 힌지까지 거리 (~1.472)
    const H = 2.2; // 피라미드 높이
    const slantH = Math.sqrt(rIn * rIn + H * H); // 모선 높이
    const bookY = 0.085;

    // 1. 밑면 정육각형
    const hexShape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = R * Math.cos(angle);
      const z = R * Math.sin(angle);
      if (i === 0) hexShape.moveTo(x, z);
      else hexShape.lineTo(x, z);
    }
    hexShape.closePath();

    const hexGeo = new THREE.ShapeGeometry(hexShape);
    hexGeo.rotateX(-Math.PI / 2);
    const baseMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(meta.color),
      side: THREE.DoubleSide,
      roughness: 0.55
    });
    const base = new THREE.Mesh(hexGeo, baseMat);
    base.position.set(0, bookY, 0);
    this.shapeGroup.add(base);

    const baseLine = new THREE.LineSegments(
      new THREE.EdgesGeometry(hexGeo),
      new THREE.LineBasicMaterial({ color: new THREE.Color(meta.stroke) })
    );
    baseLine.position.copy(base.position);
    this.shapeGroup.add(baseLine);

    // 2. 이등변삼각형 지오메트리 (x in [-S/2, S/2], z in [0, slantH])
    const triGeom = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -S / 2, 0, 0,
       S / 2, 0, 0,
       0,     0, slantH
    ]);
    const normals = new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0]);
    triGeom.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    triGeom.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

    const foldAngleMax = Math.atan2(H, rIn);
    this.pyramidWingAnchors = [];

    // 6개 변의 바깥 방향으로 정확하게 힌지 리그 배치
    for (let i = 0; i < 6; i++) {
      const alpha = (i * Math.PI) / 3 + Math.PI / 6;
      const hX = rIn * Math.cos(alpha);
      const hZ = rIn * Math.sin(alpha);
      const yawAngle = Math.PI / 2 - alpha; // 로컬 +z가 바깥쪽을 향하도록 정렬

      const triGroup = new THREE.Group();
      const triMesh = new THREE.Mesh(triGeom, baseMat);
      triMesh.castShadow = true;
      triMesh.receiveShadow = true;
      triGroup.add(triMesh);

      const triLine = new THREE.LineSegments(
        new THREE.EdgesGeometry(triGeom),
        new THREE.LineBasicMaterial({ color: new THREE.Color(meta.stroke), linewidth: 2 })
      );
      triGroup.add(triLine);

      // 끝 꼭짓점 홀
      const hole = new THREE.Mesh(
        new THREE.RingGeometry(0.02, 0.065, 16),
        new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide })
      );
      hole.rotation.x = -Math.PI / 2;
      hole.position.set(0, 0.003, slantH - 0.1);
      triGroup.add(hole);

      const assembly = this.createHingeAssembly(hX, bookY, hZ, yawAngle, triGroup, foldAngleMax);
      this.pyramidWingAnchors.push({ pivot: assembly.rotGroup, localPos: new THREE.Vector3(0, 0, slantH - 0.1) });
    }

    this.setupWorkbookUpwardPull({
      anchors: this.pyramidWingAnchors,
      maxHeight: H + 0.35,
      bookY: bookY
    });
  }

  // ================= 5. 원기둥 (Cylinder) =================
  buildCylinder(meta) {
    const R = 0.95;
    const H = 2.0;
    const W = 2 * Math.PI * R;
    const segs = 36;
    const bookY = 0.085;

    this.cylinderGroup = new THREE.Group();
    this.shapeGroup.add(this.cylinderGroup);

    // 밑면
    const circleGeo = new THREE.CircleGeometry(R, 32);
    circleGeo.rotateX(-Math.PI / 2);
    const capMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(meta.color),
      side: THREE.DoubleSide,
      roughness: 0.55
    });
    const bottomCap = new THREE.Mesh(circleGeo, capMat);
    bottomCap.position.set(0, bookY, 0);
    this.shapeGroup.add(bottomCap);

    // 윗면 뚜껑
    this.cylinderTopCap = new THREE.Mesh(circleGeo, new THREE.MeshStandardMaterial({
      color: 0xfbcfe8,
      side: THREE.DoubleSide,
      roughness: 0.55
    }));
    this.cylinderTopCap.position.set(0, bookY + H, 0);
    this.shapeGroup.add(this.cylinderTopCap);

    this.cylinderStrips = [];
    const stripWidth = W / segs;
    const stripGeo = new THREE.PlaneGeometry(stripWidth, H);

    for (let i = 0; i < segs; i++) {
      const stripMesh = new THREE.Mesh(stripGeo, capMat);
      stripMesh.castShadow = true;
      stripMesh.receiveShadow = true;
      this.cylinderGroup.add(stripMesh);
      this.cylinderStrips.push({ mesh: stripMesh, index: i });
    }

    this.cylinderMeta = { R, H, W, segs, bookY };

    this.setupWorkbookForwardPull({
      anchorLeft: { pivot: this.cylinderStrips[0].mesh, localPos: new THREE.Vector3(0, -H / 2 + 0.2, 0) },
      anchorRight: { pivot: this.cylinderStrips[segs - 1].mesh, localPos: new THREE.Vector3(0, -H / 2 + 0.2, 0) },
      guideLeft: new THREE.Vector3(-R * 0.5, bookY, R + 0.3),
      guideRight: new THREE.Vector3(R * 0.5, bookY, R + 0.3),
      pullTabStartY: bookY,
      pullTabStartZ: R + 1.2,
      pullTabDistance: 1.4,
      tabColor: 0xec4899
    });
  }

  // ================= 워크북 전방 PULL 탭 메커니즘 =================
  setupWorkbookForwardPull(config) {
    this.forwardPullConfig = config;

    const tabGeo = new THREE.BoxGeometry(0.7, 0.02, 0.45);
    const tabMat = new THREE.MeshStandardMaterial({
      color: config.tabColor || 0xfacc15,
      roughness: 0.6
    });
    this.pullTabMesh = new THREE.Mesh(tabGeo, tabMat);
    this.pullTabMesh.position.set(0, config.pullTabStartY + 0.015, config.pullTabStartZ);
    this.pullTabMesh.castShadow = true;
    this.stringGroup.add(this.pullTabMesh);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 36px Pretendard, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PULL', 64, 32);

    const textTex = new THREE.CanvasTexture(canvas);
    const labelGeo = new THREE.PlaneGeometry(0.55, 0.3);
    const labelMat = new THREE.MeshBasicMaterial({ map: textTex, transparent: true });
    const labelMesh = new THREE.Mesh(labelGeo, labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.y = 0.012;
    this.pullTabMesh.add(labelMesh);

    this.stringLines = [];
    for (let i = 0; i < 2; i++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3()
      ]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
      const line = new THREE.Line(lineGeo, lineMat);
      this.stringGroup.add(line);
      this.stringLines.push(line);
    }
  }

  // ================= 워크북 상단 수직 인장 실 메커니즘 (육각뿔) =================
  setupWorkbookUpwardPull(config) {
    this.upwardPullConfig = config;

    const ringGeo = new THREE.TorusGeometry(0.12, 0.025, 8, 20);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xeab308 });
    this.upwardKnotMesh = new THREE.Mesh(ringGeo, ringMat);
    this.upwardKnotMesh.rotation.x = Math.PI / 2;
    this.upwardKnotMesh.position.set(0, config.bookY + 0.1, 0);
    this.stringGroup.add(this.upwardKnotMesh);

    this.stringLines = [];
    for (let i = 0; i < 6; i++) {
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 3 });
      const line = new THREE.Line(lineGeo, lineMat);
      this.stringGroup.add(line);
      this.stringLines.push(line);
    }
  }

  // ================= 실 당김 슬라이더 연동 (0.0 ~ 1.0) =================
  setPullProgress(progress) {
    this.pullProgress = Math.max(0.0, Math.min(1.0, progress));
    const t = this.pullProgress;

    if (this.currentShapeType === 'cylinder') {
      this.updateCylinderRolling(t);
    } else {
      // 2단계 힌지 구조: rotGroup.rotation.x만 순수 음수 회전 (바닥 위로 솟아오름 100% 보장)
      if (this.pivots && this.pivots.length > 0) {
        this.pivots.forEach(p => {
          p.rotGroup.rotation.x = -p.maxAngle * t;
        });
      }
    }

    this.updatePullVisuals(t);

    if (this.onProgressChange) {
      this.onProgressChange(this.pullProgress);
    }
  }

  updateCylinderRolling(t) {
    if (!this.cylinderMeta) return;
    const { R, H, W, segs, bookY } = this.cylinderMeta;

    for (let i = 0; i < segs; i++) {
      const u = (i + 0.5) / segs;
      const flatX = (u - 0.5) * W;

      if (t < 0.001) {
        this.cylinderStrips[i].mesh.position.set(flatX, bookY + 0.005, -R * 1.3);
        this.cylinderStrips[i].mesh.rotation.set(-Math.PI / 2, 0, 0);
      } else {
        const phi = (u - 0.5) * (2 * Math.PI * t);
        const curR = R;
        const curX = Math.sin(phi) * curR;
        const curZ = -Math.cos(phi) * curR * t - (1 - t) * R * 1.3;
        const curY = bookY + (H / 2) * t;

        this.cylinderStrips[i].mesh.position.set(curX, curY, curZ);
        this.cylinderStrips[i].mesh.rotation.set((-Math.PI / 2) * (1 - t), -phi, 0);
      }
    }

    if (this.cylinderTopCap) {
      this.cylinderTopCap.position.set(0, bookY + H * t, 0);
      this.cylinderTopCap.visible = t > 0.05;
    }
  }

  updatePullVisuals(t) {
    if (this.forwardPullConfig && this.pullTabMesh) {
      const cfg = this.forwardPullConfig;
      const tabZ = cfg.pullTabStartZ + t * cfg.pullTabDistance;
      this.pullTabMesh.position.z = tabZ;

      const vAnchorL = new THREE.Vector3();
      const vAnchorR = new THREE.Vector3();

      if (cfg.anchorLeft.pivot) {
        vAnchorL.copy(cfg.anchorLeft.localPos);
        cfg.anchorLeft.pivot.localToWorld(vAnchorL);
      }
      if (cfg.anchorRight.pivot) {
        vAnchorR.copy(cfg.anchorRight.localPos);
        cfg.anchorRight.pivot.localToWorld(vAnchorR);
      }

      const tabWorldL = new THREE.Vector3(-0.15, cfg.pullTabStartY + 0.02, tabZ);
      const tabWorldR = new THREE.Vector3(0.15, cfg.pullTabStartY + 0.02, tabZ);

      if (this.stringLines[0]) {
        const ptsL = this.stringLines[0].geometry.attributes.position.array;
        ptsL[0] = vAnchorL.x; ptsL[1] = vAnchorL.y; ptsL[2] = vAnchorL.z;
        ptsL[3] = cfg.guideLeft.x; ptsL[4] = cfg.guideLeft.y; ptsL[5] = cfg.guideLeft.z;
        ptsL[6] = tabWorldL.x; ptsL[7] = tabWorldL.y; ptsL[8] = tabWorldL.z;
        this.stringLines[0].geometry.attributes.position.needsUpdate = true;
      }

      if (this.stringLines[1]) {
        const ptsR = this.stringLines[1].geometry.attributes.position.array;
        ptsR[0] = vAnchorR.x; ptsR[1] = vAnchorR.y; ptsR[2] = vAnchorR.z;
        ptsR[3] = cfg.guideRight.x; ptsR[4] = cfg.guideRight.y; ptsR[5] = cfg.guideRight.z;
        ptsR[6] = tabWorldR.x; ptsR[7] = tabWorldR.y; ptsR[8] = tabWorldR.z;
        this.stringLines[1].geometry.attributes.position.needsUpdate = true;
      }
    }

    if (this.upwardPullConfig && this.upwardKnotMesh) {
      const cfg = this.upwardPullConfig;
      const knotY = THREE.MathUtils.lerp(cfg.bookY + 0.1, cfg.maxHeight, t);
      this.upwardKnotMesh.position.y = knotY;

      const tempVec = new THREE.Vector3();
      cfg.anchors.forEach((anc, idx) => {
        if (!this.stringLines[idx]) return;
        tempVec.copy(anc.localPos);
        anc.pivot.localToWorld(tempVec);

        const pts = this.stringLines[idx].geometry.attributes.position.array;
        pts[0] = tempVec.x; pts[1] = tempVec.y; pts[2] = tempVec.z;
        pts[3] = 0; pts[4] = knotY; pts[5] = 0;
        this.stringLines[idx].geometry.attributes.position.needsUpdate = true;
      });
    }
  }

  animatePull(toValue = 1.0, durationMs = 1100, onComplete = null) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const startVal = this.pullProgress;
    const diff = toValue - startVal;
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);

      const ease = 1 - Math.pow(1 - progress, 3);
      this.setPullProgress(startVal + diff * ease);

      if (progress < 1.0) {
        requestAnimationFrame(step);
      } else {
        this.setPullProgress(toValue);
        this.isAnimating = false;
        if (onComplete) onComplete();
      }
    };

    requestAnimationFrame(step);
  }

  toggleWireframe(enabled = null) {
    this.wireframeMode = (enabled !== null) ? enabled : !this.wireframeMode;
    this.shapeGroup.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.wireframe = this.wireframeMode;
      }
    });
    return this.wireframeMode;
  }

  toggleAutoRotate(enabled = null) {
    this.autoRotate = (enabled !== null) ? enabled : !this.autoRotate;
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = 1.8;
    return this.autoRotate;
  }

  resetCamera() {
    this.camera.position.set(0, 5.8, 7.2);
    this.controls.target.set(0, 0.4, 0.1);
    this.controls.update();
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

window.ShapeSimulator3D = ShapeSimulator3D;
