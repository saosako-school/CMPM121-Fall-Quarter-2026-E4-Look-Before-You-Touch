import Phaser from "phaser";
import { Actor, type Arena, WIDTH } from "./actors.ts";

export function aim(from: { x: number; y: number }, arena: Arena): number {
  return Math.atan2(arena.player.y - from.y, arena.player.x - from.x);
}

export interface EnemyInfo {
  hp: number;
  score: number;
  radius: number;
  dropChance: number;
  moveFunction: (enemy: ShmupEnemy, arena: Arena) => void;
  fireFunction: (enemy: ShmupEnemy, arena: Arena) => void;
}

/**
 * Base class for everything the player can shoot or pick up: enemies, the
 * boss and power-ups. kind is the prefab's name and also its texture key.
 */
class ShmupSprite extends Actor {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public kind: string,
    radius: number,
  ) {
    super(scene, x, y, kind, radius);
  }
  step(_arena: Arena): void {
    console.error("define method step() in subclass");
  }
}

export class ShmupPowerUp extends ShmupSprite {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: string,
    radius: number,
  ) {
    super(scene, x, y, kind, radius);
  }
  override step(_arena?: Arena): void {
    this.age++;
    this.y += 1.1;
    this.rotation += 0.04;
    this.setScale(1 + 0.12 * Math.sin(this.age * 0.15));
  }
}

export class ShmupEnemy extends ShmupSprite {
  maxHp: number;
  enemyRecord: EnemyInfo;
  public hp: number;
  public dropChance: number;
  public score: number;
  flash = 0;
  heading = 0;
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyInfo: EnemyInfo,
    kind: string,
    public homeX: number,
    public side: number,
  ) {
    super(scene, x, y, kind, enemyInfo.radius);
    this.enemyRecord = enemyInfo;
    this.maxHp = enemyInfo.hp;
    this.hp = enemyInfo.hp;
    this.dropChance = enemyInfo.dropChance;
    this.score = enemyInfo.score;
  }
  override step(arena: Arena): void {
    this.age++;
    const { x, y } = this;
    this.move(arena);
    this.vx = this.x - x;
    this.vy = this.y - y;
    this.fireWeapon(arena);
    this.flash = Math.max(0, this.flash - 1);
    if (this.flash > 0) {
      this.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    } else this.clearTint();
  }
  move(arena: Arena) {
    this.enemyRecord.moveFunction(this, arena);
  }
  fireWeapon(arena: Arena) {
    this.enemyRecord.fireFunction(this, arena);
  }
  get fraction(): number {
    return this.hp / this.maxHp;
  }
  takeDamage(amount: number) {
    this.hp -= amount;
    this.flash = 3;
    return this.hp <= 0;
  }
}
export class ShmupBoss extends ShmupEnemy {
  spin = 0;
  readonly core: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    super(
      scene,
      WIDTH / 2,
      -90,
      {
        hp: 900,
        score: 10000,
        radius: 46,
        dropChance: 0,
        moveFunction: () => {},
        fireFunction: () => {},
      },
      "boss",
      WIDTH / 2,
      1,
    );
    this.core = scene.add.image(this.x, this.y, "boss-core").setBlendMode(
      Phaser.BlendModes.ADD,
    );
  }

  phase(): number {
    return this.fraction > 2 / 3 ? 1 : this.fraction > 1 / 3 ? 2 : 3;
  }

  get arrived(): boolean {
    return this.age > 150;
  }

  override takeDamage(amount: number): boolean {
    return this.arrived ? super.takeDamage(amount) : false;
  }

  override step(arena: Arena): void {
    super.step(arena);
    if (!this.arrived) {
      this.y += 1.4;
    } else {
      const sway = this.phase() === 3 ? 0.012 : 0.008;
      this.x = WIDTH / 2 + Math.sin((this.age - 150) * sway) * 140;
      this.attack(arena, this.age - 150);
    }
    this.core.setPosition(this.x, this.y + 6);
    this.core.setScale(1 + 0.15 * Math.sin(this.age * (0.08 * this.phase())));
  }

  private attack(arena: Arena, t: number): void {
    if (this.phase() === 1 && t % 55 === 0) this.fan(arena, 9, 1.1, 2.8);
    if (this.phase() === 2) {
      if (t % 80 === 0) this.fan(arena, 9, 1.2, 3);
      if (t % 80 === 40) {
        for (const d of [-0.12, 0, 0.12]) {
          arena.fire(this.x, this.y + 30, aim(this, arena) + d, 4.2, true);
        }
      }
      if (t % 360 === 180) {
        arena.summon("drone", this.x - 70, this.y);
        arena.summon("drone", this.x + 70, this.y);
      }
    }
    if (this.phase() === 3 && t % 6 === 0) {
      this.spin += 0.23;
      for (let arm = 0; arm < 4; arm++) {
        arena.fire(this.x, this.y + 6, this.spin + (arm * Math.PI) / 2, 2.6);
      }
      if (t % 48 === 0) {
        arena.fire(this.x, this.y + 30, aim(this, arena), 4.6, true);
      }
    }
  }

  private fan(arena: Arena, count: number, width: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.PI / 2 + (i / (count - 1) - 0.5) * width;
      arena.fire(this.x, this.y + 40, angle, speed);
    }
  }

  override destroy(fromScene?: boolean): void {
    this.core.destroy(fromScene);
    super.destroy(fromScene);
  }
}
