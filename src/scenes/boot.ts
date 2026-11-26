import Phaser from "phaser";
import { loadSounds } from "../sounds.ts";
import { makeTextures } from "../textures.ts";
import { type Hud } from "../hud.ts";
import { type LaunchOptions } from "../main.ts";

export interface BootData {
  hud: Hud;
  options: LaunchOptions;
}

export class Boot extends Phaser.Scene {
  private bootData: BootData;
  constructor(
    private readonly hud: Hud,
    private readonly options: LaunchOptions,
  ) {
    super("Boot");
    this.bootData = {
      hud: this.hud,
      options: this.options,
    };
  }

  create() {
    makeTextures(this);
    loadSounds(this);
    this.scene.start("Title", this.bootData);
  }
}
