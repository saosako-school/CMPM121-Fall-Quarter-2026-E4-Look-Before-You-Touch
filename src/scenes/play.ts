import Phaser from "phaser";
import { Backdrop } from "./backdrop.ts";
import { Actor, type Arena, Bullet, Player, WIDTH } from "../actors.ts";
import { TINTS } from "../textures.ts";
import { Rng } from "../rng.ts";
import { AutoPilot, KeyboardPilot, type Pilot } from "../pilots.ts";
import {
  aim,
  EnemyInfo,
  ShmupBoss,
  ShmupEnemy,
  ShmupPowerUp,
} from "../prefab.ts";
import { play } from "../sounds.ts";
import { type TitleData } from "./title.ts";
import { type Hud } from "../hud.ts";
import { type LaunchOptions } from "../main.ts";
import { switchScene } from "./switch scene module.ts";

const BOSS_WARNING_TICKS = 200;
const TICK_MS = 1000 / 60;
const VICTORY_TICKS = 180;
const START_LIVES = 3;

export interface PlayData {
  hud: Hud;
  options: LaunchOptions;
  selfPlay: boolean;
  run: RunData;
}
interface RunData {
  score: number;
  lives: number;
  kills: number;
  hits: number;
  continues: number;
  bossDefeated: boolean;
}
type EnemyRecord = Record<string, EnemyInfo>;
interface WaveInfo {
  baseSpawnTime: number;
  numEnemies: number;
  enemyType: string;
  formation: string;
  position: number;
}
interface Level {
  name: string;
  subtitle: string;
  length: number;
  waves: WaveInfo[];
}

export const enemyRecord: EnemyRecord = {
  "drone": {
    hp: 2,
    score: 100,
    radius: 13,
    dropChance: 0.015,
    moveFunction: (enemy, _arena) => {
      enemy.y += 1.5;
      enemy.x = enemy.homeX + Math.sin(enemy.age * 0.045) * 46 * enemy.side;
    },
    fireFunction: (enemy, arena) => {
      if (enemy.age % 100 !== 60 || !arena.rng.chance(0.35)) return;
      arena.fire(enemy.x, enemy.y, aim(enemy, arena), 2.4);
    },
  },
  "dart": {
    hp: 1,
    score: 150,
    radius: 12,
    dropChance: 0.015,
    moveFunction: (enemy, arena) => {
      if (enemy.age < 50) {
        enemy.y += 1.2;
      } else {
        if (enemy.age === 50) {
          enemy.heading = Math.sign(arena.player.x - enemy.x) * 1.4;
        }
        enemy.y += 5.2;
        enemy.x += enemy.heading;
      }
    },
    fireFunction: (_enemy, _arena) => {},
  },
  "turret": {
    hp: 12,
    score: 400,
    radius: 19,
    dropChance: 0.3,
    moveFunction: (enemy, _arena) => {
      if (enemy.age < 70) enemy.y += 1.6;
      else if (enemy.age > 420) enemy.y += 1.2;
      enemy.rotation += 0.02;
    },
    fireFunction: (enemy, arena) => {
      const t = enemy.age - 80;
      if (t < 0 || enemy.age > 420 || t % 100 > 40 || t % 8 !== 0) return;
      arena.fire(enemy.x, enemy.y, aim(enemy, arena), 3.4);
    },
  },
  "lancer": {
    hp: 4,
    score: 250,
    radius: 15,
    dropChance: 0.06,
    moveFunction: (enemy, _arena) => {
      enemy.x += 2.4 * enemy.side;
      enemy.y += 0.35;
    },
    fireFunction: (enemy, arena) => {
      if (enemy.age % 40 !== 20 || enemy.x < 20 || enemy.x > WIDTH - 20) return;
      for (const spread of [-0.25, 0, 0.25]) {
        arena.fire(enemy.x, enemy.y + 8, Math.PI / 2 + spread, 2.6);
      }
    },
  },
};

export const gameLevels: Level[] = [
  {
    name: "Outer Drift",
    subtitle: "Scouts ahead",
    length: 1560,
    waves: [{
      baseSpawnTime: 60,
      numEnemies: 4,
      enemyType: "drone",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 360,
      numEnemies: 5,
      enemyType: "drone",
      formation: "vee",
      position: 168,
    }, {
      baseSpawnTime: 660,
      numEnemies: 5,
      enemyType: "drone",
      formation: "vee",
      position: 312,
    }, {
      baseSpawnTime: 960,
      numEnemies: 6,
      enemyType: "drone",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 1200,
      numEnemies: 4,
      enemyType: "drone",
      formation: "column",
      position: 120,
    }, {
      baseSpawnTime: 1260,
      numEnemies: 4,
      enemyType: "drone",
      formation: "column",
      position: 360,
    }],
  },
  {
    name: "Shatter Belt",
    subtitle: "Divers incoming",
    length: 1800,
    waves: [{
      baseSpawnTime: 60,
      numEnemies: 6,
      enemyType: "drone",
      formation: "vee",
      position: 240,
    }, {
      baseSpawnTime: 300,
      numEnemies: 4,
      enemyType: "dart",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 600,
      numEnemies: 5,
      enemyType: "dart",
      formation: "column",
      position: 144,
    }, {
      baseSpawnTime: 720,
      numEnemies: 5,
      enemyType: "dart",
      formation: "column",
      position: 336,
    }, {
      baseSpawnTime: 1020,
      numEnemies: 7,
      enemyType: "drone",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 1140,
      numEnemies: 5,
      enemyType: "dart",
      formation: "vee",
      position: 240,
    }, {
      baseSpawnTime: 1440,
      numEnemies: 6,
      enemyType: "dart",
      formation: "line",
      position: 240,
    }],
  },
  {
    name: "Gun Lanes",
    subtitle: "Turrets online",
    length: 1920,
    waves: [{
      baseSpawnTime: 60,
      numEnemies: 1,
      enemyType: "turret",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 240,
      numEnemies: 6,
      enemyType: "drone",
      formation: "vee",
      position: 240,
    }, {
      baseSpawnTime: 540,
      numEnemies: 2,
      enemyType: "turret",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 840,
      numEnemies: 6,
      enemyType: "dart",
      formation: "column",
      position: 240,
    }, {
      baseSpawnTime: 1080,
      numEnemies: 2,
      enemyType: "turret",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 1140,
      numEnemies: 6,
      enemyType: "drone",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 1500,
      numEnemies: 3,
      enemyType: "turret",
      formation: "line",
      position: 240,
    }],
  },
  {
    name: "Lancer Gate",
    subtitle: "Crossfire",
    length: 1920,
    waves: [{
      baseSpawnTime: 60,
      numEnemies: 4,
      enemyType: "lancer",
      formation: "pincer",
      position: 0,
    }, {
      baseSpawnTime: 360,
      numEnemies: 6,
      enemyType: "dart",
      formation: "vee",
      position: 240,
    }, {
      baseSpawnTime: 600,
      numEnemies: 6,
      enemyType: "lancer",
      formation: "pincer",
      position: 0,
    }, {
      baseSpawnTime: 780,
      numEnemies: 2,
      enemyType: "turret",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 1140,
      numEnemies: 6,
      enemyType: "lancer",
      formation: "pincer",
      position: 0,
    }, {
      baseSpawnTime: 1260,
      numEnemies: 8,
      enemyType: "drone",
      formation: "vee",
      position: 240,
    }, {
      baseSpawnTime: 1560,
      numEnemies: 8,
      enemyType: "dart",
      formation: "line",
      position: 240,
    }],
  },
  {
    name: "Last Approach",
    subtitle: "Everything they have",
    length: 2040,
    waves: [{
      baseSpawnTime: 60,
      numEnemies: 3,
      enemyType: "turret",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 180,
      numEnemies: 6,
      enemyType: "lancer",
      formation: "pincer",
      position: 0,
    }, {
      baseSpawnTime: 540,
      numEnemies: 6,
      enemyType: "dart",
      formation: "column",
      position: 120,
    }, {
      baseSpawnTime: 540,
      numEnemies: 6,
      enemyType: "dart",
      formation: "column",
      position: 360,
    }, {
      baseSpawnTime: 900,
      numEnemies: 9,
      enemyType: "drone",
      formation: "vee",
      position: 240,
    }, {
      baseSpawnTime: 1020,
      numEnemies: 2,
      enemyType: "turret",
      formation: "line",
      position: 240,
    }, {
      baseSpawnTime: 1320,
      numEnemies: 8,
      enemyType: "lancer",
      formation: "pincer",
      position: 0,
    }, {
      baseSpawnTime: 1560,
      numEnemies: 8,
      enemyType: "dart",
      formation: "vee",
      position: 240,
    }],
  },
];

function sweep<T extends Actor>(
  actors: T[],
  gone: (actor: Actor) => boolean,
): T[] {
  return actors.filter((actor) => {
    if (!gone(actor)) return true;
    actor.destroy();
    return false;
  });
}

export class Play extends Phaser.Scene implements Arena {
  rng!: Rng;
  player!: Player;
  now: number;
  private playData: PlayData;
  private carry: number;
  private backdrop: Backdrop;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private pilot: Pilot;
  private shots: Bullet[];
  private bullets: Bullet[];
  private pickups: ShmupPowerUp[];
  private gameOver: boolean;
  private victoryAt: number;
  private boss: ShmupBoss | null;
  private enemies: ShmupEnemy[];
  private speed: number;
  private sector: number;
  private sectorStart: number;
  private bossDueAt: number;
  private leaving: boolean;
  constructor() {
    super("Play");
  }

  init(data: TitleData) {
    this.playData = {
      hud: data.hud,
      options: data.options,
      selfPlay: data.selfPlay,
      run: {
        score: 0,
        lives: START_LIVES,
        kills: 0,
        hits: 0,
        continues: 0,
        bossDefeated: false,
      },
    };
    this.leaving = false;
    this.shots = [];
    this.bullets = [];
    this.pickups = [];
    this.enemies = [];
    this.now = 0;
    this.carry = 0;
    this.gameOver = false;
    this.victoryAt = 0;
    this.boss = null;
    this.sector = -1;
    this.sectorStart = 0;
    this.bossDueAt = 0;
    this.rng = new Rng(this.playData.options.seed);
    if (this.playData.selfPlay) {
      this.pilot = new AutoPilot();
      this.playData.hud.setMode("attract");
      this.speed = this.playData.options.speed;
    } else {
      this.pilot = new KeyboardPilot(this.input.keyboard!);
      this.playData.hud.setMode("play");
      this.speed = 1;
    }
  }

  create() {
    this.input.keyboard?.on(
      "keydown-SPACE",
      () => {
        if (this.playData.selfPlay) {
          if (this.leaving) return;
          this.leaving = true;
          switchScene(this, "Title", this.playData);
        }
      },
    );
    this.backdrop = new Backdrop(this);
    this.player = new Player(this);
    this.player.enableFilters();
    this.player.filters?.internal.addGlow(TINTS.player, 4, 0, 1);
    this.add.particles(0, 0, "spark", {
      speedY: { min: 80, max: 160 },
      speedX: { min: -20, max: 20 },
      lifespan: 260,
      scale: { start: 0.9, end: 0 },
      tint: TINTS.player,
      blendMode: "ADD",
      frequency: 30,
    }).startFollow(this.player, 0, 18);
    this.sparks = this.add.particles(0, 0, "spark", {
      speed: { min: 60, max: 260 },
      lifespan: { min: 250, max: 600 },
      scale: { start: 1.4, end: 0 },
      blendMode: "ADD",
      emitting: false,
    });
    this.cameras.main.fadeIn(400, 4, 2, 12);
    this.startSector(0);
  }

  private startSector(index: number): void {
    this.sector = index;
    this.playData.hud.setSector(index);
    this.sectorStart = this.now;
    if (index < gameLevels.length) {
      this.playData.hud.announce(
        `Sector ${index + 1}: ${gameLevels[index].name}`,
        `${gameLevels[index].subtitle}`,
      );
    } else {
      this.playData.hud.announce("WARNING", "The Warden approaches");
      this.playData.hud.shudder(true);
      play(this, "warn", 0.6);
      this.bossDueAt = this.now + BOSS_WARNING_TICKS;
    }
  }

  private startBoss(): void {
    this.bossDueAt = 0;
    this.boss = new ShmupBoss(this);
    this.boss.enableFilters();
    this.boss.filters?.internal.addGlow(TINTS.boss, 4, 0, 1);
    this.enemies.push(this.boss);
    this.playData.hud.setBoss(1);
  }

  private advanceRoute(): void {
    if (this.gameOver) return;
    if (this.victoryAt > 0) {
      if (this.now === this.victoryAt) {
        if (this.leaving) return;
        this.leaving = true;
        switchScene(this, "Cutscene", this.playData);
      }
      return;
    }
    if (this.bossDueAt > 0) {
      if (this.now === this.bossDueAt) this.startBoss();
      return;
    }
    if (this.boss) return;
    const t = this.now - this.sectorStart;
    if (
      t >= gameLevels[this.sector].length &&
      (this.enemies.length === 0 ||
        t >= (gameLevels[this.sector].length + 240))
    ) {
      this.startSector(this.sector + 1);
    }
  }

  summon(_kind: string, x: number, y: number): void {
    this.enemies.push(
      new ShmupEnemy(
        this,
        x,
        y,
        enemyRecord["drone"],
        "drone",
        x,
        x < WIDTH / 2 ? 1 : -1,
      ),
    );
  }

  fire(
    x: number,
    y: number,
    angle: number,
    speed: number,
    heavy = false,
  ): void {
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    this.bullets.push(
      heavy
        ? new Bullet(this, x, y, "heavy", 8, vx, vy)
        : new Bullet(this, x, y, "bullet", 5, vx, vy),
    );
  }

  private spawnWave(
    time: number,
    wave: WaveInfo,
  ) {
    const baseSpawnTime = wave.baseSpawnTime;
    const numEnemies = wave.numEnemies;
    const enemyType = wave.enemyType;
    const formation = wave.formation;
    const position = wave.position;
    let x: number;
    let spawnTime: number;
    let y: number;
    for (let i = 0; i < numEnemies; ++i) {
      switch (formation) {
        case "line":
          x = position + (i - ((numEnemies - 1) * 0.5)) * 64;
          y = -30;
          spawnTime = baseSpawnTime;
          break;
        case "vee":
          x = position + (i - ((numEnemies - 1) * 0.5)) * 44;
          y = -30;
          spawnTime = baseSpawnTime +
            (Math.abs(i - ((numEnemies - 1) * 0.5)) * 10);
          break;
        case "column":
          x = position;
          y = -30;
          spawnTime = baseSpawnTime + i * 24;
          break;
        case "pincer":
          x = i % 2 === 0 ? -30 : 510;
          y = 70 + Math.floor(i / 2) * 50;
          spawnTime = baseSpawnTime + Math.floor(i / 2) * 30;
          break;
        default:
          throw new Error("spawnWave(): formation not recognized");
      }
      if (time === spawnTime) {
        const enemy = new ShmupEnemy(
          this,
          x,
          y,
          enemyRecord[enemyType],
          enemyType,
          x,
          i % 2 === 0 ? 1 : -1,
        );
        this.enemies.push(enemy);
      }
    }
  }

  private updateProgression(): void {
    const t = this.now - this.sectorStart;
    if (this.sector >= gameLevels.length) {
      return;
    }
    for (let i = 0; i < gameLevels[this.sector].waves.length; ++i) {
      this.spawnWave(t, gameLevels[this.sector].waves[i]);
    }
  }

  private flyPlayer(): void {
    const controls = this.pilot.read({
      player: this.player,
      enemies: this.enemies,
      threats: [...this.bullets, ...this.enemies],
      pickups: this.pickups,
    });
    for (const shot of this.player.step(controls)) {
      this.shots.push(
        new Bullet(this, shot.x, shot.y, "shot", 6, shot.vx, -11),
      );
      if (this.now % 2 === 0) play(this, "shoot", 0.25);
    }
  }

  private burst(x: number, y: number, count: number, tint: number): void {
    this.sparks.particleTint = tint;
    this.sparks.explode(count, x, y);
  }

  private explode(x: number, y: number, size: number): void {
    this.burst(x, y, 18 * size, size > 1 ? TINTS.bossCore : TINTS.spark);
    const ring = this.add.image(x, y, "ring").setBlendMode(
      Phaser.BlendModes.ADD,
    );
    ring.setScale(0.2 * size);
    this.tweens.add({
      targets: ring,
      scale: 1.2 * size,
      alpha: 0,
      duration: 380 + 120 * size,
      ease: "Cubic.out",
      onComplete: () => ring.destroy(),
    });
    this.cameras.main.shake(90 * size, 0.004 * size);
    play(this, size > 1 ? "bigboom" : "boom", 0.5);
  }

  private defeatBoss(boss: ShmupBoss): void {
    this.playData.run.bossDefeated = true;
    this.victoryAt = this.now + VICTORY_TICKS;
    this.playData.hud.setBoss(0);
    this.playData.hud.announce("WARDEN DOWN", "The lanes are open");
    console.log(
      "victory lap: ship protected =",
      this.playData.run.bossDefeated,
    );
    // The Warden's fall takes its bullets and escorts with it (no score).
    for (const bullet of this.bullets) {
      this.burst(bullet.x, bullet.y, 2, TINTS.spark);
      bullet.setActive(false);
    }
    for (const escort of this.enemies) {
      if (escort === boss || !escort.active) continue;
      this.explode(escort.x, escort.y, 1);
      escort.setActive(false);
    }
    console.info(
      `[self-play] seed=${this.playData.options.seed} ticks=${this.now} score=${this.playData.run.score}` +
        ` kills=${this.playData.run.kills} hits=${this.playData.run.hits} continues=${this.playData.run.continues}`,
    );
    // A chain of blasts across the hull, then the big one.
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 140, () => {
        this.explode(
          boss.x + Phaser.Math.Between(-80, 80),
          boss.y + Phaser.Math.Between(-40, 40),
          1,
        );
      });
    }
    this.time.delayedCall(1200, () => {
      this.explode(boss.x, boss.y, 3);
      this.cameras.main.flash(400, 255, 230, 160);
      this.playData.hud.shudder(true);
      play(this, "bigboom", 0.9);
      boss.setVisible(false);
      boss.core.setVisible(false);
    });
  }

  private destroyEnemy(enemy: ShmupEnemy): void {
    enemy.setActive(false);
    this.playData.run.score += enemy.score;
    this.playData.run.kills++;
    if (enemy === this.boss) {
      this.defeatBoss(this.boss);
      return;
    }
    this.explode(enemy.x, enemy.y, 1);
    if (this.rng.chance(enemy.dropChance)) {
      const kind = this.player.power < 3 && this.rng.chance(0.5)
        ? "spread"
        : "shield";
      this.pickups.push(new ShmupPowerUp(this, enemy.x, enemy.y, kind, 14));
    }
  }

  private hurtPlayer(): void {
    // After the Warden falls, nothing can hurt the ship during the victory lap.
    if (
      this.playData.run.bossDefeated || this.gameOver || !this.player.vulnerable
    ) {
      return;
    }
    this.playData.run.hits++;
    const lostLife = this.player.takeHit();
    this.playData.hud.shudder(lostLife);
    this.cameras.main.shake(lostLife ? 260 : 120, lostLife ? 0.012 : 0.005);
    play(this, "hurt", 0.7);
    this.burst(this.player.x, this.player.y, 24, TINTS.player);
    if (!lostLife) return;
    this.playData.run.lives--;
    this.cameras.main.flash(180, 255, 80, 120);
    if (this.playData.run.lives > 0) return;
    if (this.playData.selfPlay) {
      // The demo never ends early: self-play buys another ship and keeps going.
      this.playData.run.continues++;
      this.playData.run.lives = START_LIVES;
      return;
    }
    this.playData.hud.announce("GAME OVER", "The lanes stay closed");
    this.gameOver = true;
    this.player.setVisible(false);
    this.player.bubble.setVisible(false);
    this.explode(this.player.x, this.player.y, 2);
    this.time.delayedCall(1800, () => {
      if (this.leaving) return;
      this.leaving = true;
      switchScene(this, "Title", this.playData);
    });
  }

  private resolveHits(): void {
    for (const shot of this.shots) {
      const enemy = this.enemies.find((e) => e.active && e.touches(shot));
      if (!enemy) continue;
      shot.setActive(false);
      this.burst(shot.x, shot.y, 3, TINTS.spark);
      if (enemy.takeDamage(shot.damage)) this.destroyEnemy(enemy);
      else play(this, "hit", 0.3);
    }

    for (const bullet of this.bullets) {
      if (bullet.active && bullet.touches(this.player)) {
        bullet.setActive(false);
        this.hurtPlayer();
      }
    }
    for (const enemy of this.enemies) {
      if (!enemy.active || !enemy.touches(this.player)) continue;
      this.hurtPlayer();
      if (enemy !== this.boss && enemy.takeDamage(3)) this.destroyEnemy(enemy);
    }
    for (const pickup of this.pickups) {
      if (pickup.active && pickup.touches(this.player)) {
        pickup.setActive(false);
        this.player.collect(pickup.kind);
        play(this, "pickup", 0.6);
        this.burst(pickup.x, pickup.y, 14, TINTS.player);
      }
    }
  }

  private cull(): void {
    const spent = (actor: Actor) => !actor.active || actor.isOffscreen();
    this.shots = sweep(this.shots, spent);
    this.bullets = sweep(this.bullets, spent);
    this.pickups = sweep(this.pickups, spent);
    // The defeated Warden stays on screen for its finale: drop it undestroyed.
    this.enemies = this.enemies.filter((e) => e.active || e !== this.boss);
    this.enemies = sweep(
      this.enemies,
      (e) => !e.active || (e.age > 30 && e.isOffscreen()),
    );
  }

  private refreshHud(): void {
    this.playData.hud.setScore(this.playData.run.score);
    this.playData.hud.setLives(this.playData.run.lives);
    this.playData.hud.setPower(this.player.power);
    if (this.boss && !this.playData.run.bossDefeated) {
      this.playData.hud.setBoss(this.boss.fraction);
    }
  }

  private tick(): void {
    this.now++;
    this.advanceRoute();
    this.updateProgression();

    if (!this.gameOver) this.flyPlayer();
    for (const enemy of this.enemies) enemy.step(this);
    for (const actor of [...this.shots, ...this.bullets, ...this.pickups]) {
      actor.step();
    }

    this.resolveHits();
    this.cull();
    this.refreshHud();
  }

  override update(_time: number, delta: number): void {
    this.backdrop.scroll(delta);
    this.carry += Math.min(delta, 250) * this.speed;
    while (this.carry >= TICK_MS && this.scene.isActive()) {
      this.carry -= TICK_MS;
      this.tick();
    }
  }
}
