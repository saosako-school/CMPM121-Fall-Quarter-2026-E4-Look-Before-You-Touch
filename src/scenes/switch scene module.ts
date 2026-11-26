import { type TitleData } from "./title.ts";
import { type PlayData } from "./play.ts";

export function switchScene(
  currentScene: Phaser.Scene,
  nextScene: string,
  data: TitleData | PlayData,
) {
  currentScene.cameras.main.fadeOut(450, 4, 2, 12);
  currentScene.cameras.main.once("camerafadeoutcomplete", () => {
    currentScene.scene.start(nextScene, data);
  });
}
