// =====================================================
// 전역 저장(부활용 체크포인트 + 마지막 게임오버 이미지)
// =====================================================
const Save = {
  lastCheckpoint: {
    storyId: "crossroad",
    runnerNext: "crossroad"
  },
  lastGameOver: {
    imgKey: null,
    from: null // "runner" | "story"
  }
};

// =====================================================
// 원본 해상도(그림 기준)
// =====================================================
const BASE_W = 1536;
const BASE_H = 864;

// =====================================================
// ✅ 스토리 데이터 (요청 확률 반영)
// crossroad -> bridge -> suspicious -> hospital -> car
// =====================================================
const STORY = {
  crossroad: {
    title: "갈림길",
    img: "선택지1.png",
    // 5% 독사 / 5% 길없음 / 90% 진행
    img_go1: "선택지1-게임오버1-독사떼.png",
    img_go2: "선택지1-게임오버2-길없음.png",
    img_ok: "선택지1-게임진행.png",
    probs: { go1: 0.05, go2: 0.05, ok: 0.9 },
    next: "bridge"
  },

  bridge: {
    title: "끊어진 다리",
    img: "끊어진 다리 - 상황 설명.png",
    next: "suspicious"
  },

  suspicious: {
    title: "수상한 사람",
    img: "수상한 사람 선택화면.png",
    // 13% 조폭(게임오버) / 7% 군인(클리어) / 80% 다음
    img_gang: "수상한 사람 - 조폭 만나기.png",
    img_soldier: "수상한 사람 - 군인 만나기.png",
    img_notHuman: "수상한 사람 - 사람 아니어서 다음 화면으로 넘어가기.png",
    probs: { gang: 0.13, soldier: 0.07, notHuman: 0.8 },
    next: "hospital"
  },

  hospital: {
    title: "폐허가 된 병원",
    img: "폐허가 된 병원 선택화면.png",
    img_lost: "폐허가 된 병원 - 길 잃기.png",
    img_nothing: "폐허가 된 병원 - 아무것도 안 보임.png",
    img_clear: "폐허가 된 병원 - 대피소여서 게임 클리어.png",
    next: "car"
  },

  car: {
    title: "주인없는 자동차",
    img: "주인없는 자동차 선택지.png",
    img_boom: "게임오버- 차 폭발.png",
    next: null
  }
};

// =====================================================
// 공용: 이미지 꽉 채우기
// =====================================================
function addFullImage(scene, key) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const img = scene.add.image(w / 2, h / 2, key).setOrigin(0.5);
  img.setDisplaySize(w, h);
  return img;
}

// =====================================================
// 공용: “이미지 속 네모 박스” 클릭존 만들기
// =====================================================
function addHitBox(scene, box, onClick) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const sx = w / BASE_W;
  const sy = h / BASE_H;

  const rx1 = box.x1 * sx;
  const ry1 = box.y1 * sy;
  const rx2 = box.x2 * sx;
  const ry2 = box.y2 * sy;

  const bw = rx2 - rx1;
  const bh = ry2 - ry1;
  const cx = rx1 + bw / 2;
  const cy = ry1 + bh / 2;

  const hit = scene.add
    .rectangle(cx, cy, bw, bh, 0x00ff00, 0.0)
    .setInteractive({ useHandCursor: true });

  hit.on("pointerdown", onClick);
  return hit;
}

// =====================================================
// 공용: 저장 + 게임오버로 보내기
// =====================================================
function goGameOverWithImage(scene, imgKeyOrNull, from = "story") {
  Save.lastGameOver.imgKey = imgKeyOrNull;
  Save.lastGameOver.from = from;
  scene.scene.start("GameOverScene");
}

// =====================================================
// ✅ 공용: 이어하기(체크포인트 복귀)
// =====================================================
function resumeFromCheckpoint(scene) {
  scene.scene.start("StoryScene", { storyId: Save.lastCheckpoint.storyId });
}

// =====================================================
// ✅ 공용: "진짜 종료" 시도 (브라우저 제한 때문에 fallback 포함)
// =====================================================
function tryExitGame() {
  // 1) window.close() 시도 (대부분 탭 직접 연 게 아니면 막힘)
  try {
    window.close();
  } catch (e) {}

  // 2) 그래도 안 닫히면 about:blank로 보내기 시도
  try {
    window.location.href = "about:blank";
    return;
  } catch (e) {}

  // 3) 최후: 그냥 시작 화면으로 (게임 내 종료 대체)
  // (이건 호출한 쪽에서 StartScene으로 보내는 방식으로 처리)
}

// =====================================================
// 0) Start Scene
// =====================================================
class StartScene extends Phaser.Scene {
  constructor() {
    super("StartScene");
  }

  preload() {
    this.load.image("startBG", "images/시작화면.png");
    this.load.video("introVideo", "images/intro.mp4", "loadeddata", false, true);
    this.load.image("player", "images/졸라맨.png");
  }

  create() {
    addFullImage(this, "startBG");

    // 시작하기 박스 (네가 준 좌표 그대로)
    const startBox = { x1: 626, y1: 660, x2: 995, y2: 828 };

    addHitBox(this, startBox, () => {
      Save.lastCheckpoint.storyId = "crossroad";
      Save.lastCheckpoint.runnerNext = "crossroad";
      Save.lastGameOver.imgKey = null;
      Save.lastGameOver.from = null;
      this.scene.start("VideoScene");
    });
  }
}

// =====================================================
// 0-1) Video Scene (끝나면 러너로)
// =====================================================
class VideoScene extends Phaser.Scene {
  constructor() {
    super("VideoScene");
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#000");

    const video = this.add.video(w / 2, h / 2, "introVideo").setOrigin(0.5);
    video.setMute(true);

    const goNext = () => {
      try { video.stop(); } catch (e) {}
      try { video.destroy(); } catch (e) {}
      this.scene.start("RunnerScene", { nextStoryId: "crossroad" });
    };

    video.once("createdata", () => {
      const el = video.getVideoElement();
      const vw = el.videoWidth || 1280;
      const vh = el.videoHeight || 720;
      const scale = Math.min(w / vw, h / vh);
      video.setScale(scale);
      video.play(false);
    });

    video.once("complete", goNext);

    // 안전장치
    this.time.delayedCall(1500, () => {
      if (!video.isPlaying()) {
        try { video.play(false); } catch (e) {}
      }
    });
  }
}

// =====================================================
// 1) Runner Scene (졸라맨 장애물 피하기)
// =====================================================
class RunnerScene extends Phaser.Scene {
  constructor() {
    super("RunnerScene");
  }

  init(data) {
    this.nextStoryId = (data && data.nextStoryId) || "crossroad";
    Save.lastCheckpoint.runnerNext = this.nextStoryId;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#111");

    const groundY = h * 0.88;
    const g = this.add.graphics();
    g.lineStyle(Math.max(2, h * 0.008), 0x444444, 1);
    g.strokeLineShape(new Phaser.Geom.Line(0, groundY, w, groundY));

    // 플레이어
    this.player = this.physics.add.sprite(w * 0.2, groundY - h * 0.12, "player");
    this.player.body.setAllowGravity(false);
    this.player.setCollideWorldBounds(true);

    const scaleRatio = (h / 900) * 0.22;
    this.player.setScale(scaleRatio);

    // 히트박스 축소
    const bw = this.player.width * 0.45;
    const bh = this.player.height * 0.45;
    this.player.body.setSize(bw, bh);
    this.player.body.setOffset((this.player.width - bw) / 2, (this.player.height - bh) / 2);

    this.cursors = this.input.keyboard.createCursorKeys();

    this.topLimit = h * 0.18;
    this.bottomLimit = groundY - this.player.displayHeight * 0.5;

    // 장애물
    this.obstacles = this.physics.add.group();
    this.obstacleSpeed = w * 0.7;

    const og = this.make.graphics({ x: 0, y: 0, add: false });
    const obsSize = Math.round(h * 0.06);
    og.fillStyle(0xff5555, 1);
    og.fillRect(0, 0, obsSize, obsSize);
    og.generateTexture("obstacle", obsSize, obsSize);

    // 점수
    this.score = 0;
    this.goal = 10;
    this.scoreText = this.add.text(w * 0.03, h * 0.03, `SCORE: ${this.score}/${this.goal}`, {
      fontSize: Math.round(h * 0.05) + "px",
      color: "#ffffff",
      fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    });

    this.spawnEvent = this.time.addEvent({
      delay: 850,
      loop: true,
      callback: () => this.spawnObstacle()
    });

    // 충돌 → 러너 게임오버(텍스트 UI)
    this.physics.add.overlap(this.player, this.obstacles, () => {
      Save.lastGameOver.imgKey = null;
      Save.lastGameOver.from = "runner";
      this.scene.start("RunnerGameOverScene");
    });
  }

  spawnObstacle() {
    const w = this.scale.width;
    const y = Phaser.Math.Between(this.topLimit, this.bottomLimit);
    const obs = this.obstacles.create(w + 60, y, "obstacle");
    obs.body.setAllowGravity(false);
    obs.setVelocityX(-this.obstacleSpeed);
  }

  update() {
    const h = this.scale.height;
    const move = h * 0.02;

    if (this.cursors.up.isDown) this.player.y -= move;
    if (this.cursors.down.isDown) this.player.y += move;

    if (this.player.y < this.topLimit) this.player.y = this.topLimit;
    if (this.player.y > this.bottomLimit) this.player.y = this.bottomLimit;

    // 장애물 제거 + 점수 증가
    this.obstacles.getChildren().forEach((o) => {
      if (o.x < -80) {
        o.destroy();
        this.score += 1;
        this.scoreText.setText(`SCORE: ${this.score}/${this.goal}`);

        if (this.score >= this.goal) {
          if (this.spawnEvent) this.spawnEvent.remove(false);
          this.obstacles.clear(true, true);

          // 러너 클리어 → 다음 스토리
          this.scene.start("StoryScene", { storyId: this.nextStoryId });
        }
      }
    });
  }
}

// =====================================================
// 러너 전용 게임오버(글씨 깨짐 방지 폰트 지정)
// =====================================================
class RunnerGameOverScene extends Phaser.Scene {
  constructor() {
    super("RunnerGameOverScene");
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#000");

    this.add.text(w * 0.5, h * 0.30, "GAME OVER", {
      fontSize: Math.round(h * 0.11) + "px",
      color: "#ff3333",
      fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    }).setOrigin(0.5);

    this.add.text(w * 0.5, h * 0.42, "장애물에 맞아 사망...", {
      fontSize: Math.round(h * 0.055) + "px",
      color: "#ffffff",
      fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    }).setOrigin(0.5);

    const btnW = w * 0.20;
    const btnH = h * 0.10;

    const mkBtn = (cx, cy, label, onClick) => {
      const r = this.add.rectangle(cx, cy, btnW, btnH, 0xffffff, 0.15)
        .setStrokeStyle(3, 0xffffff)
        .setInteractive({ useHandCursor: true });

      const t = this.add.text(cx, cy, label, {
        fontSize: Math.round(h * 0.05) + "px",
        color: "#ffffff",
        fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      }).setOrigin(0.5);

      r.on("pointerover", () => r.setFillStyle(0xffffff, 0.22));
      r.on("pointerout",  () => r.setFillStyle(0xffffff, 0.15));
      r.on("pointerdown", onClick);

      t.setInteractive({ useHandCursor: true });
      t.on("pointerdown", onClick);
    };

    mkBtn(w * 0.42, h * 0.65, "이어하기", () => {
      resumeFromCheckpoint(this);
    });

    // ✅ 러너에서도 "그만두기" 누르면 천사 플로우로
    mkBtn(w * 0.62, h * 0.65, "그만두기", () => {
      this.scene.start("QuitAngelScene");
    });
  }
}

// =====================================================
// 2) Story Scene (선택지 화면 이미지 + 네모 박스 클릭)
// =====================================================
class StoryScene extends Phaser.Scene {
  constructor() {
    super("StoryScene");
  }

  preload() {
    // 스토리 이미지 로드
    Object.keys(STORY).forEach((k) => {
      const s = STORY[k];
      if (s.img) this.load.image(`story_${k}`, `images/${s.img}`);

      if (s.img_go1) this.load.image(`cross_go1`, `images/${s.img_go1}`);
      if (s.img_go2) this.load.image(`cross_go2`, `images/${s.img_go2}`);
      if (s.img_ok)  this.load.image(`cross_ok`,  `images/${s.img_ok}`);

      if (s.img_gang)     this.load.image(`sus_gang`,     `images/${s.img_gang}`);
      if (s.img_soldier)  this.load.image(`sus_soldier`,  `images/${s.img_soldier}`);
      if (s.img_notHuman) this.load.image(`sus_notHuman`, `images/${s.img_notHuman}`);

      if (s.img_lost)    this.load.image(`hos_lost`,    `images/${s.img_lost}`);
      if (s.img_nothing) this.load.image(`hos_nothing`, `images/${s.img_nothing}`);
      if (s.img_clear)   this.load.image(`hos_clear`,   `images/${s.img_clear}`);

      if (s.img_boom) this.load.image(`car_boom`, `images/${s.img_boom}`);
    });

    // 최종 클리어
    this.load.image("final_clear", "images/게임 클리어.png");

    // ✅ 그만두기 플로우 이미지
    this.load.image("quit_angel", "images/그만두기 - 천사 나옴.png");
    this.load.image("quit_confirm", "images/천사 다음에 그만둘건지 선택.png");
  }

  init(data) {
    this.storyId = (data && data.storyId) || "crossroad";
    Save.lastCheckpoint.storyId = this.storyId; // ✅ 이어하기는 항상 여기로
  }

  create() {
    const s = STORY[this.storyId];

    addFullImage(this, `story_${this.storyId}`);

    // ✅ 선택지 박스 좌표(기본값)
    const boxes3 = [
      { x1: 920, y1: 300, x2: 1470, y2: 410 },
      { x1: 920, y1: 450, x2: 1470, y2: 560 },
      { x1: 920, y1: 600, x2: 1470, y2: 710 }
    ];
    const boxes2 = [
      { x1: 920, y1: 360, x2: 1470, y2: 500 },
      { x1: 920, y1: 560, x2: 1470, y2: 700 }
    ];

    // ----------------------------
    // 갈림길: 5%/5%/90%
    // ----------------------------
    if (this.storyId === "crossroad") {
      const roll = () => {
        const r = Math.random();
        const p = s.probs;

        if (r < p.go1) {
          this.scene.start("ShowResultScene", { imgKey: "cross_go1", type: "gameover", goImgKey: "cross_go1" });
        } else if (r < p.go1 + p.go2) {
          this.scene.start("ShowResultScene", { imgKey: "cross_go2", type: "gameover", goImgKey: "cross_go2" });
        } else {
          this.scene.start("ShowResultScene", { imgKey: "cross_ok", type: "nextRunner", nextRunner: s.next });
        }
      };

      boxes3.forEach((b) => addHitBox(this, b, roll));
      return;
    }

    // ----------------------------
    // 끊어진 다리: 1번=다음러너 / 2,3=게임오버(텍스트)
    // ----------------------------
    if (this.storyId === "bridge") {
      addHitBox(this, boxes3[0], () => {
        this.scene.start("ShowTextScene", {
          text: "아무도 대답하지 않는다...\n그래도 더 걸어가자.",
          type: "nextRunner",
          nextRunner: s.next
        });
      });

      addHitBox(this, boxes3[1], () => {
        this.scene.start("ShowTextScene", {
          text: "생각해보니 이건 좀 아닌거 같다.\n난 수영 못한다.",
          type: "gameover",
          goImgKey: null
        });
      });

      addHitBox(this, boxes3[2], () => {
        this.scene.start("ShowTextScene", {
          text: "다시 생각해봐도 무모한 짓은 안하는게 맞는거 같다...",
          type: "gameover",
          goImgKey: null
        });
      });

      return;
    }

    // ----------------------------
    // 수상한 사람: 13% 조폭(게임오버) / 7% 군인(클리어) / 80% 다음
    // ----------------------------
    if (this.storyId === "suspicious") {
      const roll = () => {
        const r = Math.random();
        const p = s.probs;

        if (r < p.gang) {
          this.scene.start("ShowResultScene", { imgKey: "sus_gang", type: "gameover", goImgKey: "sus_gang" });
        } else if (r < p.gang + p.soldier) {
          this.scene.start("ShowResultScene", { imgKey: "sus_soldier", type: "clear" });
        } else {
          this.scene.start("ShowResultScene", { imgKey: "sus_notHuman", type: "nextRunner", nextRunner: s.next });
        }
      };

      boxes3.forEach((b) => addHitBox(this, b, roll));
      return;
    }

    // ----------------------------
    // 병원
    // ----------------------------
    if (this.storyId === "hospital") {
      addHitBox(this, boxes3[0], () =>
        this.scene.start("ShowResultScene", { imgKey: "hos_lost", type: "gameover", goImgKey: "hos_lost" })
      );

      addHitBox(this, boxes3[1], () =>
        this.scene.start("ShowResultScene", { imgKey: "hos_nothing", type: "nextRunner", nextRunner: s.next })
      );

      addHitBox(this, boxes3[2], () =>
        this.scene.start("ShowResultScene", { imgKey: "hos_clear", type: "clear" })
      );
      return;
    }

    // ----------------------------
    // 자동차
    // ----------------------------
    if (this.storyId === "car") {
      addHitBox(this, boxes2[0], () =>
        this.scene.start("ShowResultScene", { imgKey: "car_boom", type: "gameover", goImgKey: "car_boom" })
      );

      addHitBox(this, boxes2[1], () => {
        this.scene.start("FinalClearScene");
      });

      return;
    }
  }
}

// =====================================================
// 결과 이미지 보여주기 + (그림 속) 다음 버튼 클릭
// =====================================================
class ShowResultScene extends Phaser.Scene {
  constructor() {
    super("ShowResultScene");
  }

  init(data) {
    this.imgKey = data.imgKey;
    this.type = data.type; // "gameover" | "nextRunner" | "clear"
    this.nextRunner = data.nextRunner || null;
    this.goImgKey = data.goImgKey || null;
  }

  create() {
    addFullImage(this, this.imgKey);

    // ✅ “다음→” 버튼이 오른쪽 아래에 있다고 가정한 클릭존
    // (안 맞으면 여기 숫자만 수정)
    const nextBox = { x1: 1100, y1: 600, x2: 1510, y2: 830 };

    addHitBox(this, nextBox, () => {
      if (this.type === "gameover") {
        goGameOverWithImage(this, this.goImgKey, "story");
      } else if (this.type === "nextRunner") {
        this.scene.start("RunnerScene", { nextStoryId: this.nextRunner });
      } else {
        this.scene.start("FinalClearScene");
      }
    });
  }
}

// =====================================================
// 텍스트 결과 + “다음” 버튼(코드로 무조건 표시)
// =====================================================
class ShowTextScene extends Phaser.Scene {
  constructor() {
    super("ShowTextScene");
  }

  init(data) {
    this.text = data.text || "";
    this.type = data.type || "gameover";
    this.nextRunner = data.nextRunner || "crossroad";
    this.goImgKey = data.goImgKey || null;
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    this.cameras.main.setBackgroundColor("#000");

    this.add.text(w * 0.10, h * 0.22, this.text, {
      fontSize: Math.round(h * 0.07) + "px",
      color: "#ffffff",
      wordWrap: { width: w * 0.80, useAdvancedWrap: true },
      lineSpacing: 12,
      fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    });

    // ✅ 끊어진 다리에서 "다음 박스가 없어서 안 넘어감" 방지:
    // 무조건 보이는 '다음' 버튼을 코드로 생성
    const btnW = w * 0.22;
    const btnH = h * 0.10;
    const cx = w * 0.80;
    const cy = h * 0.78;

    const btn = this.add.rectangle(cx, cy, btnW, btnH, 0xffffff, 0.18)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    const label = this.add.text(cx, cy, "다음", {
      fontSize: Math.round(h * 0.055) + "px",
      color: "#ffffff",
      fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    }).setOrigin(0.5);

    const goNext = () => {
      if (this.type === "gameover") {
        goGameOverWithImage(this, this.goImgKey, "story");
      } else if (this.type === "nextRunner") {
        this.scene.start("RunnerScene", { nextStoryId: this.nextRunner });
      } else {
        this.scene.start("FinalClearScene");
      }
    };

    btn.on("pointerover", () => btn.setFillStyle(0xffffff, 0.25));
    btn.on("pointerout",  () => btn.setFillStyle(0xffffff, 0.18));
    btn.on("pointerdown", goNext);

    label.setInteractive({ useHandCursor: true });
    label.on("pointerdown", goNext);
  }
}

// =====================================================
// ✅ GameOverScene
// - 이미지가 있으면 그 이미지 + 이미지 버튼 박스 클릭
// - 이미지가 없으면(끊어진 다리 텍스트 GO 같은 경우) 버튼을 코드로 표시
// - "그만두기"는 StartScene이 아니라 QuitAngelScene으로!
// =====================================================
class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  preload() {
    // 혹시 StoryScene 로딩보다 먼저 올 수도 있으니 안전 로드
    if (!this.textures.exists("quit_angel")) {
      this.load.image("quit_angel", "images/그만두기 - 천사 나옴.png");
    }
    if (!this.textures.exists("quit_confirm")) {
      this.load.image("quit_confirm", "images/천사 다음에 그만둘건지 선택.png");
    }
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;

    const hasImg = Save.lastGameOver.imgKey && this.textures.exists(Save.lastGameOver.imgKey);

    if (hasImg) {
      addFullImage(this, Save.lastGameOver.imgKey);

      // ✅ 네 그림 속 버튼 박스(기본값)
      // (안 맞으면 여기만 조절)
      const continueBox = { x1: 740, y1: 680, x2: 1110, y2: 820 }; // “이어서하기”
      const quitBox     = { x1: 1140, y1: 680, x2: 1495, y2: 820 }; // “그만두기”

      addHitBox(this, continueBox, () => {
        resumeFromCheckpoint(this);
      });

      addHitBox(this, quitBox, () => {
        this.scene.start("QuitAngelScene");
      });

    } else {
      // ✅ 이미지 없는 게임오버(끊어진 다리 텍스트 GO 등)
      this.cameras.main.setBackgroundColor("#000");

      this.add.text(w * 0.5, h * 0.33, "GAME OVER", {
        fontSize: Math.round(h * 0.12) + "px",
        color: "#ff3333",
        fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
      }).setOrigin(0.5);

      const btnW = w * 0.22;
      const btnH = h * 0.11;

      const mkBtn = (cx, cy, label, onClick) => {
        const r = this.add.rectangle(cx, cy, btnW, btnH, 0xffffff, 0.15)
          .setStrokeStyle(3, 0xffffff)
          .setInteractive({ useHandCursor: true });

        const t = this.add.text(cx, cy, label, {
          fontSize: Math.round(h * 0.055) + "px",
          color: "#ffffff",
          fontFamily: "Malgun Gothic, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
        }).setOrigin(0.5);

        r.on("pointerover", () => r.setFillStyle(0xffffff, 0.23));
        r.on("pointerout",  () => r.setFillStyle(0xffffff, 0.15));
        r.on("pointerdown", onClick);

        t.setInteractive({ useHandCursor: true });
        t.on("pointerdown", onClick);
      };

      mkBtn(w * 0.42, h * 0.65, "이어하기", () => {
        resumeFromCheckpoint(this);
      });

      mkBtn(w * 0.62, h * 0.65, "그만두기", () => {
        this.scene.start("QuitAngelScene");
      });
    }
  }
}

// =====================================================
// ✅ 그만두기(1단계): 천사 나옴 이미지
// - 이어서하기: 체크포인트로
// - 그만두기: 진짜 그만둘래? 화면으로
// =====================================================
class QuitAngelScene extends Phaser.Scene {
  constructor() {
    super("QuitAngelScene");
  }

  preload() {
    if (!this.textures.exists("quit_angel")) {
      this.load.image("quit_angel", "images/그만두기 - 천사 나옴.png");
    }
    if (!this.textures.exists("quit_confirm")) {
      this.load.image("quit_confirm", "images/천사 다음에 그만둘건지 선택.png");
    }
  }

  create() {
    addFullImage(this, "quit_angel");

    // ✅ 첫 번째 천사 이미지의 버튼 박스(기본값: GameOver 버튼 박스랑 동일하게 둠)
    // “이어서하기” / “그만두기”
    // (안 맞으면 여기만 조절)
    const continueBox = { x1: 740, y1: 680, x2: 1110, y2: 820 };
    const quitBox     = { x1: 1140, y1: 680, x2: 1495, y2: 820 };

    addHitBox(this, continueBox, () => {
      resumeFromCheckpoint(this);
    });

    addHitBox(this, quitBox, () => {
      this.scene.start("QuitConfirmScene");
    });
  }
}

// =====================================================
// ✅ 그만두기(2단계): 진짜 그만둘거야? (네 / 아니요)
// - 네: 진짜 종료 시도
// - 아니요: 이어하기와 동일(체크포인트로)
// =====================================================
class QuitConfirmScene extends Phaser.Scene {
  constructor() {
    super("QuitConfirmScene");
  }

  preload() {
    if (!this.textures.exists("quit_confirm")) {
      this.load.image("quit_confirm", "images/천사 다음에 그만둘건지 선택.png");
    }
  }

  create() {
    addFullImage(this, "quit_confirm");

    // ✅ 두 번째 이미지의 버튼 박스(네가 네모 박스 만들어둔 위치)
    // 여기 기본값은 "왼쪽=네 / 오른쪽=아니요"로 잡아둠.
    // (안 맞으면 여기만 조절)
    const yesBox = { x1: 160, y1: 560, x2: 420, y2: 840 };     // "네"
    const noBox  = { x1: 820, y1: 560, x2: 1460, y2: 840 };    // "아니요"

    addHitBox(this, yesBox, () => {
      // 진짜 종료 시도
      tryExitGame();

      // 대부분 브라우저에서 탭 종료가 막히니까,
      // 게임 안에서는 "시작화면으로" fallback 처리
      this.scene.start("StartScene");
    });

    addHitBox(this, noBox, () => {
      // 아니요 = 이어하기 버튼과 동일
      resumeFromCheckpoint(this);
    });
  }
}

// =====================================================
// ✅ 최종 클리어: “게임 클리어.png” 사용 + 박스 클릭(처음으로)
// =====================================================
class FinalClearScene extends Phaser.Scene {
  constructor() {
    super("FinalClearScene");
  }

  preload() {
    if (!this.textures.exists("final_clear")) {
      this.load.image("final_clear", "images/게임 클리어.png");
    }
  }

  create() {
    addFullImage(this, "final_clear");

    // “처음으로 돌아가기” 박스(기본값)
    // (안 맞으면 여기만 조절)
    const homeBox = { x1: 430, y1: 680, x2: 1105, y2: 835 };

    addHitBox(this, homeBox, () => {
      this.scene.start("StartScene");
    });
  }
}

// =====================================================
// Phaser 설정
// =====================================================
const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1536,
    height: 864
  },
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: [
    StartScene,
    VideoScene,
    RunnerScene,
    RunnerGameOverScene,
    StoryScene,
    ShowResultScene,
    ShowTextScene,
    GameOverScene,
    QuitAngelScene,
    QuitConfirmScene,
    FinalClearScene
  ]
};

new Phaser.Game(config);
