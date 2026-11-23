/**
 * 실 당김 3D 입체도형 DIY 워크북 인터랙티브 웹 애플리케이션
 * 바닐라 자바스크립트 컨트롤러
 */

// 1. Web Audio API 신디사이저 (외부 음원 파일 없이 경쾌한 효과음 생성)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // 실 당김 텐션음 (슬라이더 조작 시 부드러운 글리산도)
  playTension(progress) {
    if (this.muted) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = 180 + progress * 320; // 180Hz ~ 500Hz
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) { }
  }

  // 도형 완성 딸깍음 (Pop / Snap)
  playSnap() {
    if (this.muted) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) { }
  }

  // 정답 팡파레 효과음
  playSuccess() {
    if (this.muted) return;
    try {
      this.init();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch (e) { }
  }

  // 오답 부저음
  playError() {
    if (this.muted) return;
    try {
      this.init();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, this.ctx.currentTime);
      osc.frequency.setValueAtTime(130, this.ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.28);
    } catch (e) { }
  }
}

// 2. 8단계 실전 조작 매뉴얼 데이터 (PDF 제2장 실제 이미지 및 설명 연동)
const MANUAL_STEPS = [
  {
    step: 1,
    title: "평면 전개도 상태 관찰 및 손잡이 확인",
    phase: "기초 단계",
    timeTag: "0:02 정육면체 전개도",
    img: "images/final_crops/02_cube_net.png",
    desc: "워크북 페이지를 펼쳐 노란색 정사각형 6개로 연결된 정육면체(Cube)의 전개도를 확인합니다. 각 모서리에 뚫린 작은 구멍으로 끈이 지그재그로 통과되어 있으며, 끝부분에 'Pull' 라벨 탭이 연결되어 있습니다.",
    pointTitle: "관찰 지도 포인트",
    pointText: "실을 당기기 전, 아이에게 '정사각형이 모두 몇 개일까?'(6개), '어떤 면이 마주 볼까?'를 먼저 머릿속으로 추측해보게 하세요 (Mental Rotation 훈련).",
    badge: "정육면체 탐색"
  },
  {
    step: 2,
    title: "'Pull' 손잡이 탭을 잡고 부드럽게 당기기",
    phase: "기초 단계",
    timeTag: "0:06 손잡이 탭 조작",
    img: "images/final_crops/06_pull_tab.png",
    desc: "도화지를 한 손으로 가볍게 고정한 뒤, 다른 한 손으로 'Pull' 탭을 몸 쪽(바깥 방향)으로 천천히 잡아당깁니다. 급격하게 당기지 않고 일정한 힘으로 부드럽게 당겨주는 것이 요령입니다.",
    pointTitle: "조작 팁",
    pointText: "양쪽 끈의 길이가 균일하게 당겨지도록 손잡이 탭의 중앙을 잡고 수평 방향으로 당기면 면들이 어긋남 없이 반듯하게 일어납니다.",
    badge: "1초 원터치 조작"
  },
  {
    step: 3,
    title: "평면이 입체로 솟아오르는 변환 과정 체득",
    phase: "기초 단계",
    timeTag: "0:03 실 당김 변환 순간",
    img: "images/final_crops/03_cube_pull.png",
    desc: "끈이 팽팽해지면서 바닥에 붙어 있던 면들이 순차적으로 90도씩 접혀 올라옵니다. 분리되어 있던 외곽의 정사각형들이 공중에서 모서리를 맞대며 입체 공간을 형성합니다.",
    pointTitle: "발견의 순간",
    pointText: "'우와! 평평한 종이가 상자 모양으로 서네!' 아이가 2D에서 3D로의 물리적 변환을 가장 신기해하고 집중하는 핵심 단계입니다.",
    badge: "동적 조작 체험"
  },
  {
    step: 4,
    title: "완성된 3D 다면체 구조 탐구 (직육면체)",
    phase: "기초 단계",
    timeTag: "0:05 직육면체 완성",
    img: "images/final_crops/04_cuboid_done.png",
    desc: "실을 끝까지 당기면 틈새가 완전히 닫히며 완벽한 직육면체(Cuboid)가 완성됩니다. 손으로 상하좌우 면을 만져보며 마주 보는 면의 크기가 같은지, 모서리가 몇 개인지 직접 촉각으로 확인합니다.",
    pointTitle: "수학적 정리",
    pointText: "직육면체는 면 6개, 모서리 12개, 꼭짓점 8개로 구성되어 있음을 직접 세어보며 초등 5학년 교과서 개념과 즉시 일치시킵니다.",
    badge: "교과 개념 체득"
  },
  {
    step: 5,
    title: "각기둥 도형의 조립 (삼각기둥 / 사각기둥)",
    phase: "응용 단계",
    timeTag: "0:08 기둥 도형 조립",
    img: "images/final_crops/07_prism_folding.png",
    desc: "삼각형 밑면을 가진 삼각기둥과 사각기둥 전개도를 당기는 모습이 시연됩니다. 두 밑면이 서로 평행하게 마주보고, 옆면인 직사각형들이 옆을 둘러싸는 '기둥(Prism)'의 수학적 정의를 눈으로 확인합니다.",
    pointTitle: "핵심 개념",
    pointText: "모든 각기둥의 옆면은 항상 '직사각형'이라는 공통 규칙을 아이 스스로 발견하도록 유도하세요.",
    badge: "기둥의 공통 규칙"
  },
  {
    step: 6,
    title: "곡면 입체도형: 원기둥 (Cylinder) 완성",
    phase: "응용 단계",
    timeTag: "0:14 원기둥 완성",
    img: "images/final_crops/09_cylinder_done.png",
    desc: "다각형뿐만 아니라 곡면 도형도 완벽히 구현됩니다! 핑크색 원기둥 전개도는 평평했던 직사각형 옆면이 끈의 장력에 의해 부드러운 곡면으로 말리면서 상하 두 원형 밑면과 맞물려 매끄러운 원통을 이룹니다.",
    pointTitle: "초등 6-2 교과 핵심",
    pointText: "'원기둥의 옆면 전개도는 직사각형이고, 가로 길이는 밑면 원의 둘레(원주 = 2πr)와 같다'는 공식을 시각적으로 완벽히 증명합니다.",
    badge: "원주율 시각화"
  },
  {
    step: 7,
    title: "다각뿔 탐구: 별모양 전개도의 육각뿔 (Hexagonal Pyramid)",
    phase: "응용 단계",
    timeTag: "0:18 육각뿔 전개도",
    img: "images/final_crops/10_hex_pyramid_net.png",
    desc: "초록색 별 모양 종이는 육각뿔의 전개도입니다. 중앙의 정육각형 밑면을 중심으로 6개의 이등변삼각형이 사방으로 펼쳐져 있으며, 삼각형 끝 꼭짓점마다 노란색 실이 관통되어 있습니다.",
    pointTitle: "시각적 매력",
    pointText: "아이들에게 친숙한 '별(Star)' 모양 종이가 입체 뿔로 변하는 극적인 드라마를 제공하여 도형 학습에 대한 흥미를 극대화합니다.",
    badge: "별 모양 전개도"
  },
  {
    step: 8,
    title: "위쪽으로 끈을 당겨 피라미드 뿔 꼭짓점 완성 & 리셋",
    phase: "응용 단계",
    timeTag: "0:19 뿔 꼭짓점 모음",
    img: "images/final_crops/12_hex_pyramid_done.png",
    desc: "실을 위쪽으로 지그시 들어 올리면 6개의 삼각형 날개가 한꺼번에 오므라들면서 상단에 뾰족한 '각뿔의 꼭짓점'이 형성됩니다. 기둥(밑면 2개)과 뿔(밑면 1개, 뾰족한 꼭짓점)의 차이를 직관적으로 비교합니다.",
    pointTitle: "되돌리기 (Reset)",
    pointText: "실을 잡았던 손을 놓고 전개도를 살짝 누르면 원래의 평면 별 모양으로 즉시 돌아가(가역성), 언제든 무한 재도전할 수 있습니다.",
    badge: "무한 반복 가역성"
  }
];

// 3. 공간지각력 챌린지 퀴즈 데이터
const QUIZ_DATA = [
  {
    id: 1,
    question: "정육면체 전개도를 접을 때, 밑면(바닥)과 평행하게 마주 보게 되는 면은 몇 개인가요?",
    options: ["1개", "2개", "3개", "4개"],
    answerIndex: 0,
    explanation: "정육면체는 서로 마주 보는 평행한 합동의 면이 3쌍(총 6개)으로 구성되므로, 밑면과 마주 보는 면은 정확히 1개(윗면)입니다."
  },
  {
    id: 2,
    question: "초등 6학년 교과 규칙에 따라, '칠각기둥(n=7)'의 모서리는 모두 몇 개일까요?",
    options: ["14개", "21개", "28개", "9개"],
    answerIndex: 1,
    explanation: "n각기둥의 모서리 수는 3 × n개입니다 (윗밑면 7개 + 기둥 모서리 7개 + 아랫밑면 7개 = 3 × 7 = 21개)."
  },
  {
    id: 3,
    question: "오일러 다면체 공식 (꼭짓점 V - 모서리 E + 면 F = 2)에서, 꼭짓점이 8개이고 모서리가 12개인 직육면체의 면(F)의 개수는?",
    options: ["5개", "6개", "7개", "8개"],
    answerIndex: 1,
    explanation: "8 - 12 + F = 2 이므로 -4 + F = 2, 따라서 면(F)의 수는 6개입니다."
  },
  {
    id: 4,
    question: "워크북의 녹색 별 모양 전개도로 만드는 '육각뿔'의 밑면의 개수와 꼭짓점의 총합은?",
    options: ["밑면 2개, 꼭짓점 8개", "밑면 1개, 꼭짓점 7개", "밑면 1개, 꼭짓점 6개", "밑면 2개, 꼭짓점 6개"],
    answerIndex: 1,
    explanation: "각뿔은 밑면이 1개이며, n각뿔의 꼭짓점 수는 n + 1개(바닥 6개 + 상단 꼭짓점 1개 = 7개)입니다."
  },
  {
    id: 5,
    question: "원기둥을 펼친 전개도에서, 옆면 직사각형의 '가로 길이'는 무엇과 정확히 같을까요?",
    options: ["밑면 원의 지름", "밑면 원의 둘레 (원주 = 2πr)", "원기둥의 높이", "밑면 원의 반지름"],
    answerIndex: 1,
    explanation: "직사각형 종이가 둥글게 말려 원형 밑면을 감싸므로, 옆면 직사각형의 가로는 밑면 원의 둘레(원주 = 2 × π × r)와 완벽히 일치합니다."
  }
];

// 4. 메인 앱 컨트롤러 클래스
class MainApp {
  constructor() {
    this.sound = new SoundFX();
    this.simulator = null;
    this.currentStepIdx = 0;
    this.quizAnswers = {};
    this.quizSubmitted = false;

    // 공식 계산기 상태
    this.calcN = 6; // 기본 육각
    this.calcType = 'prism'; // 'prism' | 'pyramid'

    // FAQ 데이터
    this.faqItems = [
      {
        category: 'trouble',
        q: '실을 당겼는데 중간에 걸려서 뻑뻑하게 안 움직여요. 어떻게 하죠?',
        a: '가이드 홀 주변에 미세한 종이 가루가 끼었거나 실 매듭이 비틀어졌을 수 있습니다. 실을 무리하게 세게 잡아당기지 마시고, 전개도를 손으로 살짝 들어주면서 끈을 뒤로 뺐다가 다시 부드럽게 당겨주시면 매끄럽게 작동합니다.'
      },
      {
        category: 'age',
        q: '몇 살부터 활용하는 것이 가장 적합한가요?',
        a: '5~7세 유아는 촉각 놀이 및 신기한 팝업북 형태로 모양 맞추기 놀이로 접근하기 좋으며, 초등 3~6학년 학생은 교과서 전개도 문제와 대조하며 모서리와 꼭짓점을 직접 세고 분석하는 전문 교구로 가장 강력한 효과를 냅니다.'
      },
      {
        category: 'school',
        q: '학교나 학원 수업에서 단체 모둠 학습용으로 활용 가능한가요?',
        a: '가위와 접착제가 전혀 필요 없어 쓰레기나 안전사고 위험이 0%이므로, 학교 수학 시간, 영재학급, 방과후 창의수학 클래스의 모둠별 체험 실습용으로 매우 적합합니다.'
      },
      {
        category: 'maintenance',
        q: '종이가 구겨지거나 실이 엉키지 않게 오래 보관하는 팁이 있나요?',
        a: '보관할 때는 항상 모든 도형을 평면 상태로 완전히 펼쳐서 바인더를 닫아 책장에 세워 보관해야 종이 탄성이 오래 유지됩니다. 처음 조립할 때 접는 선 가이드를 손톱으로 가볍게 한 번 눌러 길을 들여주시면 면이 꺾이지 않습니다.'
      }
    ];

    document.addEventListener('DOMContentLoaded', () => this.init());
  }

  init() {
    this.initSimulator();
    this.renderManualSteps();
    this.initCalculator();
    this.initCurriculumTabs();
    this.initQuiz();
    this.initFAQ();
    this.bindGlobalEvents();
  }

  // 1. 3D 시뮬레이터 초기화 및 UI 바인딩
  initSimulator() {
    const container = document.getElementById('canvas3d-container');
    if (!container) return;

    this.simulator = new ShapeSimulator3D('canvas3d-container');

    // UI 요소
    const slider = document.getElementById('pull-slider');
    const pullValueText = document.getElementById('pull-value-text');
    const btnPull = document.getElementById('btn-anim-pull');
    const btnReset = document.getElementById('btn-anim-reset');
    const btnWireframe = document.getElementById('btn-toggle-wireframe');
    const btnRotate = document.getElementById('btn-toggle-rotate');
    const btnCamReset = document.getElementById('btn-reset-cam');

    // 슬라이더 입력 이벤트
    if (slider) {
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        this.simulator.setPullProgress(val);
        this.sound.playTension(val);
      });
    }

    // 시뮬레이터 프로그레스 변경 시 콜백
    this.simulator.onProgressChange = (progress) => {
      const pct = Math.round(progress * 100);
      if (slider) slider.value = pct;
      if (pullValueText) pullValueText.textContent = `${pct}%`;

      const angleText = document.getElementById('hud-angle-text');
      if (angleText) {
        const deg = Math.round(progress * 90);
        angleText.textContent = `${deg}°`;
      }

      if (progress >= 1.0) {
        this.sound.playSnap();
      }
    };

    // 도형 변경 시 HUD 업데이트 콜백
    this.simulator.onShapeChange = (meta) => {
      const titleEl = document.getElementById('hud-shape-title');
      const descEl = document.getElementById('hud-shape-desc');
      const facesEl = document.getElementById('hud-faces');
      const edgesEl = document.getElementById('hud-edges');
      const verticesEl = document.getElementById('hud-vertices');
      const eulerEl = document.getElementById('hud-euler');
      const currBadge = document.getElementById('hud-curriculum');

      if (titleEl) titleEl.textContent = meta.name;
      if (descEl) descEl.textContent = meta.desc;
      if (facesEl) facesEl.textContent = meta.faces;
      if (edgesEl) edgesEl.textContent = meta.edges;
      if (verticesEl) verticesEl.textContent = meta.vertices;
      if (eulerEl) eulerEl.textContent = meta.formula;
      if (currBadge) currBadge.textContent = meta.curriculum;
    };

    // 도형 선택 탭 버튼
    const shapeBtns = document.querySelectorAll('.shape-select-btn');
    shapeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        shapeBtns.forEach(b => b.classList.remove('active', 'bg-indigo-600', 'text-white'));
        btn.classList.add('active', 'bg-indigo-600', 'text-white');
        const shape = btn.getAttribute('data-shape');
        this.simulator.loadShape(shape);
      });
    });

    // 1초 원터치 풀 애니메이션 버튼
    if (btnPull) {
      btnPull.addEventListener('click', () => {
        this.simulator.animatePull(1.0, 1000);
      });
    }

    // 다시 펼치기 (가역성) 버튼
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        this.simulator.animatePull(0.0, 900);
      });
    }

    // 보조 컨트롤 버튼들
    if (btnWireframe) {
      btnWireframe.addEventListener('click', () => {
        const isWire = this.simulator.toggleWireframe();
        btnWireframe.classList.toggle('bg-slate-200', isWire);
      });
    }

    if (btnRotate) {
      btnRotate.addEventListener('click', () => {
        const isRot = this.simulator.toggleAutoRotate();
        btnRotate.classList.toggle('bg-slate-200', isRot);
      });
    }

    if (btnCamReset) {
      btnCamReset.addEventListener('click', () => {
        this.simulator.resetCamera();
      });
    }
  }

  // 2. 8단계 실전 조작 매뉴얼 렌더링
  renderManualSteps() {
    const listContainer = document.getElementById('manual-step-list');
    const detailContainer = document.getElementById('manual-step-detail');
    if (!listContainer || !detailContainer) return;

    listContainer.innerHTML = '';
    MANUAL_STEPS.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.className = `w-full text-left p-3.5 rounded-xl transition flex items-center justify-between border ${
        idx === this.currentStepIdx
          ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-semibold shadow-sm'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
      }`;
      btn.innerHTML = `
        <div class="flex items-center space-x-3">
          <span class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
            idx === this.currentStepIdx ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
          }">0${item.step}</span>
          <span class="text-sm truncate max-w-[200px] sm:max-w-xs">${item.title}</span>
        </div>
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">${item.phase}</span>
      `;
      btn.addEventListener('click', () => {
        this.currentStepIdx = idx;
        this.renderManualSteps();
      });
      listContainer.appendChild(btn);
    });

    const curr = MANUAL_STEPS[this.currentStepIdx];
    detailContainer.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        <div class="md:w-1/2 bg-slate-900 flex items-center justify-center relative p-4 group">
          <img src="${curr.img}" alt="${curr.title}" class="max-h-80 w-auto rounded-lg object-contain shadow-md transition transform group-hover:scale-[1.02]" />
          <div class="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full font-mono">
            ${curr.timeTag}
          </div>
          <div class="absolute bottom-4 right-4 bg-indigo-600/90 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full font-medium">
            ${curr.badge}
          </div>
        </div>
        <div class="md:w-1/2 p-6 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-indigo-600 uppercase tracking-wider">STEP 0${curr.step} · ${curr.phase}</span>
              <span class="text-xs text-slate-400 font-mono">${this.currentStepIdx + 1} / ${MANUAL_STEPS.length}</span>
            </div>
            <h3 class="text-xl font-bold text-slate-900 mb-3">${curr.title}</h3>
            <p class="text-slate-600 text-sm leading-relaxed mb-5">${curr.desc}</p>
            
            <div class="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl">
              <div class="flex items-center space-x-2 text-amber-800 font-semibold text-xs mb-1">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/></svg>
                <span>${curr.pointTitle}</span>
              </div>
              <p class="text-amber-900/90 text-xs leading-relaxed">${curr.pointText}</p>
            </div>
          </div>
          
          <div class="flex items-center justify-between pt-6 border-t border-slate-100 mt-6">
            <button id="step-prev-btn" class="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center space-x-1 ${
              this.currentStepIdx === 0 ? 'opacity-40 cursor-not-allowed' : ''
            }">
              <span>← 이전 단계</span>
            </button>
            <button id="step-next-btn" class="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold flex items-center space-x-1 ${
              this.currentStepIdx === MANUAL_STEPS.length - 1 ? 'opacity-40 cursor-not-allowed' : ''
            }">
              <span>다음 단계 →</span>
            </button>
          </div>
        </div>
      </div>
    `;

    const prevBtn = document.getElementById('step-prev-btn');
    const nextBtn = document.getElementById('step-next-btn');
    if (prevBtn && this.currentStepIdx > 0) {
      prevBtn.addEventListener('click', () => {
        this.currentStepIdx--;
        this.renderManualSteps();
      });
    }
    if (nextBtn && this.currentStepIdx < MANUAL_STEPS.length - 1) {
      nextBtn.addEventListener('click', () => {
        this.currentStepIdx++;
        this.renderManualSteps();
      });
    }
  }

  // 3. 기하학 공식 계산기 ($n$각기둥 & $n$각뿔 마스터)
  initCalculator() {
    const sliderN = document.getElementById('calc-n-slider');
    const textN = document.getElementById('calc-n-value');
    const btnPrism = document.getElementById('calc-tab-prism');
    const btnPyramid = document.getElementById('calc-tab-pyramid');

    const updateCalc = () => {
      const n = this.calcN;
      const isPrism = this.calcType === 'prism';

      if (textN) textN.textContent = `${n}각형`;

      const shapeNameEl = document.getElementById('calc-shape-name');
      const baseDescEl = document.getElementById('calc-base-desc');
      const sideDescEl = document.getElementById('calc-side-desc');
      const facesEl = document.getElementById('calc-res-faces');
      const facesFormulaEl = document.getElementById('calc-res-faces-formula');
      const edgesEl = document.getElementById('calc-res-edges');
      const edgesFormulaEl = document.getElementById('calc-res-edges-formula');
      const vertEl = document.getElementById('calc-res-vertices');
      const vertFormulaEl = document.getElementById('calc-res-vertices-formula');
      const eulerFormulaEl = document.getElementById('calc-res-euler');

      if (isPrism) {
        // n각기둥
        const F = n + 2;
        const E = 3 * n;
        const V = 2 * n;

        if (shapeNameEl) shapeNameEl.textContent = `${n}각기둥 (${n}-gonal Prism)`;
        if (baseDescEl) baseDescEl.textContent = `${n}각형 밑면 2개 (서로 평행하고 합동)`;
        if (sideDescEl) sideDescEl.textContent = `직사각형 옆면 ${n}개`;
        if (facesEl) facesEl.textContent = F;
        if (facesFormulaEl) facesFormulaEl.textContent = `n + 2 = ${n} + 2 = ${F}`;
        if (edgesEl) edgesEl.textContent = E;
        if (edgesFormulaEl) edgesFormulaEl.textContent = `3 × n = 3 × ${n} = ${E}`;
        if (vertEl) vertEl.textContent = V;
        if (vertFormulaEl) vertFormulaEl.textContent = `2 × n = 2 × ${n} = ${V}`;
        if (eulerFormulaEl) eulerFormulaEl.textContent = `${V} - ${E} + ${F} = ${V - E + F} (항상 2 성립!)`;
      } else {
        // n각뿔
        const F = n + 1;
        const E = 2 * n;
        const V = n + 1;

        if (shapeNameEl) shapeNameEl.textContent = `${n}각뿔 (${n}-gonal Pyramid)`;
        if (baseDescEl) baseDescEl.textContent = `${n}각형 밑면 1개`;
        if (sideDescEl) sideDescEl.textContent = `이등변삼각형 옆면 ${n}개 (상단 꼭짓점으로 모임)`;
        if (facesEl) facesEl.textContent = F;
        if (facesFormulaEl) facesFormulaEl.textContent = `n + 1 = ${n} + 1 = ${F}`;
        if (edgesEl) edgesEl.textContent = E;
        if (edgesFormulaEl) edgesFormulaEl.textContent = `2 × n = 2 × ${n} = ${E}`;
        if (vertEl) vertEl.textContent = V;
        if (vertFormulaEl) vertFormulaEl.textContent = `n + 1 = ${n} + 1 = ${V}`;
        if (eulerFormulaEl) eulerFormulaEl.textContent = `${V} - ${E} + ${F} = ${V - E + F} (항상 2 성립!)`;
      }
    };

    if (sliderN) {
      sliderN.addEventListener('input', (e) => {
        this.calcN = parseInt(e.target.value, 10);
        updateCalc();
      });
    }

    if (btnPrism && btnPyramid) {
      btnPrism.addEventListener('click', () => {
        this.calcType = 'prism';
        btnPrism.className = 'flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-sm transition';
        btnPyramid.className = 'flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-sm transition';
        updateCalc();
      });

      btnPyramid.addEventListener('click', () => {
        this.calcType = 'pyramid';
        btnPyramid.className = 'flex-1 py-2.5 rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-sm transition';
        btnPrism.className = 'flex-1 py-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-sm transition';
        updateCalc();
      });
    }

    updateCalc();
  }

  // 4. 초등 교과 연계 로드맵 탭
  initCurriculumTabs() {
    const tabs = document.querySelectorAll('.curriculum-tab-btn');
    const contents = document.querySelectorAll('.curriculum-tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.getAttribute('data-target');
        tabs.forEach(t => {
          t.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
          t.classList.add('bg-white', 'text-slate-700');
        });
        tab.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
        tab.classList.remove('bg-white', 'text-slate-700');

        contents.forEach(c => {
          if (c.id === target) {
            c.classList.remove('hidden');
          } else {
            c.classList.add('hidden');
          }
        });
      });
    });
  }

  // 5. 공간지각력 챌린지 퀴즈
  initQuiz() {
    const quizList = document.getElementById('quiz-questions-list');
    const submitBtn = document.getElementById('quiz-submit-btn');
    const resetBtn = document.getElementById('quiz-reset-btn');
    const resultBox = document.getElementById('quiz-result-box');
    if (!quizList) return;

    quizList.innerHTML = '';
    QUIZ_DATA.forEach((q, qIdx) => {
      const card = document.createElement('div');
      card.className = 'bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition';
      card.id = `quiz-card-${qIdx}`;

      let optionsHtml = '';
      q.options.forEach((opt, optIdx) => {
        optionsHtml += `
          <label class="flex items-center space-x-3 p-3 rounded-xl border border-slate-100 hover:bg-indigo-50/50 hover:border-indigo-200 cursor-pointer transition select-none quiz-opt-label">
            <input type="radio" name="quiz_q_${qIdx}" value="${optIdx}" class="text-indigo-600 focus:ring-indigo-500 h-4 w-4">
            <span class="text-sm text-slate-700">${opt}</span>
          </label>
        `;
      });

      card.innerHTML = `
        <div class="flex items-start space-x-3 mb-4">
          <span class="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">Q${qIdx + 1}</span>
          <h4 class="text-base font-semibold text-slate-900 leading-snug">${q.question}</h4>
        </div>
        <div class="space-y-2 mb-3">
          ${optionsHtml}
        </div>
        <div id="quiz-feedback-${qIdx}" class="hidden p-3 rounded-xl text-xs leading-relaxed"></div>
      `;

      quizList.appendChild(card);
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        let score = 0;
        let allAnswered = true;

        QUIZ_DATA.forEach((q, qIdx) => {
          const selected = document.querySelector(`input[name="quiz_q_${qIdx}"]:checked`);
          const fbBox = document.getElementById(`quiz-feedback-${qIdx}`);

          if (!selected) {
            allAnswered = false;
            return;
          }

          const userAns = parseInt(selected.value, 10);
          fbBox.classList.remove('hidden');

          if (userAns === q.answerIndex) {
            score++;
            fbBox.className = 'p-3.5 rounded-xl text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 leading-relaxed';
            fbBox.innerHTML = `<strong>정답입니다! 🎉</strong> ${q.explanation}`;
          } else {
            fbBox.className = 'p-3.5 rounded-xl text-xs bg-rose-50 border border-rose-200 text-rose-800 leading-relaxed';
            fbBox.innerHTML = `<strong>오답입니다.</strong> 정답은 <b>"${q.options[q.answerIndex]}"</b> 입니다.<br>${q.explanation}`;
          }
        });

        if (!allAnswered) {
          alert('모든 문제를 선택해 주세요!');
          return;
        }

        if (resultBox) {
          resultBox.classList.remove('hidden');
          const scoreText = document.getElementById('quiz-score-text');
          if (scoreText) scoreText.textContent = `${score} / ${QUIZ_DATA.length}`;

          if (score === QUIZ_DATA.length) {
            this.sound.playSuccess();
            if (window.confetti) {
              window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            }
          } else {
            this.sound.playSnap();
          }
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        QUIZ_DATA.forEach((_, qIdx) => {
          const fbBox = document.getElementById(`quiz-feedback-${qIdx}`);
          if (fbBox) fbBox.classList.add('hidden');
        });
        if (resultBox) resultBox.classList.add('hidden');
      });
    }
  }

  // 6. FAQ 실시간 검색 및 아코디언
  initFAQ() {
    const listEl = document.getElementById('faq-accordion-list');
    const searchInput = document.getElementById('faq-search-input');
    const filterBtns = document.querySelectorAll('.faq-filter-btn');
    if (!listEl) return;

    let currentFilter = 'all';
    let searchQuery = '';

    const render = () => {
      listEl.innerHTML = '';
      const filtered = this.faqItems.filter(item => {
        const matchCategory = currentFilter === 'all' || item.category === currentFilter;
        const matchSearch = !searchQuery || item.q.toLowerCase().includes(searchQuery) || item.a.toLowerCase().includes(searchQuery);
        return matchCategory && matchSearch;
      });

      if (filtered.length === 0) {
        listEl.innerHTML = `
          <div class="text-center py-8 text-slate-400 text-sm">
            검색 결과가 없습니다. 다른 키워드로 검색해 보세요.
          </div>
        `;
        return;
      }

      filtered.forEach((item, idx) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm';
        itemEl.innerHTML = `
          <button class="w-full p-4 text-left font-semibold text-slate-800 flex justify-between items-center hover:bg-slate-50 transition">
            <span class="text-sm pr-4">Q. ${item.q}</span>
            <span class="text-slate-400 text-xs font-mono faq-icon">+</span>
          </button>
          <div class="faq-content hidden p-4 pt-0 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/50">
            ${item.a}
          </div>
        `;

        const btn = itemEl.querySelector('button');
        const content = itemEl.querySelector('.faq-content');
        const icon = itemEl.querySelector('.faq-icon');

        btn.addEventListener('click', () => {
          const isOpen = !content.classList.contains('hidden');
          content.classList.toggle('hidden', isOpen);
          icon.textContent = isOpen ? '+' : '−';
        });

        listEl.appendChild(itemEl);
      });
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        render();
      });
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('bg-indigo-600', 'text-white');
          b.classList.add('bg-slate-100', 'text-slate-600');
        });
        btn.classList.add('bg-indigo-600', 'text-white');
        btn.classList.remove('bg-slate-100', 'text-slate-600');

        currentFilter = btn.getAttribute('data-category');
        render();
      });
    });

    render();
  }

  // 7. 글로벌 UI 이벤트 바인딩 (사운드 토글, 스무스 스크롤 등)
  bindGlobalEvents() {
    const muteBtn = document.getElementById('btn-sound-toggle');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = this.sound.toggleMute();
        muteBtn.textContent = isMuted ? '🔇 사운드 끔' : '🔊 사운드 켬';
        muteBtn.classList.toggle('bg-rose-100', isMuted);
        muteBtn.classList.toggle('text-rose-700', isMuted);
      });
    }

    // 네비게이션 스무스 스크롤
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }
}

// 글로벌 인스턴스 실행
window.app = new MainApp();
