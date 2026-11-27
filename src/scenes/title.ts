import Phaser from "phaser";
import { type BootData } from "./boot.ts";
import { type Hud } from "../hud.ts";
import { type LaunchOptions } from "../main.ts";
import { Backdrop } from "./backdrop.ts";
import { HEIGHT, WIDTH } from "../actors.ts";
import { gameLevels } from "./play.ts";
import { switchScene } from "./switch scene module.ts";

const IDLE_SECONDS = 8;

export interface TitleData {
  hud: Hud;
  options: LaunchOptions;
  selfPlay: boolean;
}

export class Title extends Phaser.Scene {
  private countdown!: Phaser.GameObjects.Text;
  private backdrop!: Backdrop;
  private idle: number = 0;
  private titleData!: TitleData;
  private leaving: boolean = false;
  constructor() {
    super("Title");
  }

  init(data: BootData) {
    this.titleData = {
      hud: data.hud,
      options: data.options,
      selfPlay: false,
    };
    this.idle = 0;
    this.leaving = false;
  }

  private gameLevelNames(): string[] {
    const names: string[] = [];
    for (let i = 0; i < gameLevels.length; ++i) {
      names.push(gameLevels[i].name);
    }
    names.push("The Warden");
    return names;
  }

  create() {
    this.backdrop = new Backdrop(this);
    this.input.keyboard?.on(
      "keydown-SPACE",
      () => {
        if (this.leaving) return;
        this.leaving = true;
        this.titleData.selfPlay = false;
        switchScene(this, "Play", this.titleData);
      },
    );

    this.titleData.hud.setMode("title");
    this.titleData.hud.setRoute(this.gameLevelNames());
    this.titleData.hud.setSector(-1);
    this.titleData.hud.setBoss(null);
    this.titleData.hud.say("");

    const title = this.add.text(WIDTH / 2, HEIGHT * 0.34, "NEON\nWARDEN", {
      fontFamily: "Orbitron, Trebuchet MS, sans-serif",
      fontSize: "64px",
      fontStyle: "bold",
      align: "center",
      color: "#e8fdff",
    }).setOrigin(0.5).setLineSpacing(-6);
    title.enableFilters();
    title.filters?.internal.addGlow(0x5ef2ff, 6, 0, 1);
    this.tweens.add({
      targets: title,
      scale: 1.04,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });

    this.add.text(WIDTH / 2, HEIGHT * 0.62, "SPACE  launch", {
      fontFamily: "monospace",
      fontSize: "20px",
      color: "#ffe066",
    }).setOrigin(0.5);
    this.countdown = this.add.text(WIDTH / 2, HEIGHT * 0.68, "", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#8aa4c8",
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(400, 4, 2, 12);
    if (this.titleData.options.attract) {
      if (this.leaving) return;
      this.leaving = true;
      switchScene(this, "Play", this.titleData);
    }
  }
  override update(_time: number, delta: number) {
    this.backdrop.scroll(delta);
    this.idle += delta / 1000;
    const left = Math.ceil(IDLE_SECONDS - this.idle);
    this.countdown.setText(`self-play demo in ${left}`);
    if (left <= 0) {
      if (this.leaving) return;
      this.leaving = true;
      this.titleData.selfPlay = true;
      switchScene(this, "Play", this.titleData);
    }
  }
}
