# NEON OVERDRIVE

空飛ぶスポーツカーでネオン都市を駆け抜ける、オリジナル3Dレールシューティング。Three.js 0.180.0。

## 遊び方

- Android / iPhone: 画面をドラッグして移動。射撃は自動。右下の BOOST で1.8秒の無敵・連射強化。
- PC: WASD / 矢印で移動、Space で BOOST、P / Esc で一時停止。
- 35秒×3セクターを生き延び、最後の SENTINEL を撃破するとクリア。
- 命中でコンボが増え、最大5倍スコア。被弾でコンボが切れる。
- ハイスコア・直近20ラン・音声/軽量設定をlocalStorageに保存。データは端末・ブラウザーごと。
- タブを離れると自動停止。音は最初の操作から有効。軽量エフェクトで描画負荷を軽減。

## 開発

```sh
npm ci --ignore-scripts
npm test
npm run build
npm start
```

http://localhost:4173/ で開く。ビルド先は `dist/`。Three.jsを同梱し、外部CDNやフォントへの通信は不要。

## GitHub Pages

Settings → Pages → Deploy from a branch → main / (root) → Save で配信。`dist/` を配信ルートに配置することも可能。すべて相対パスのため `/space-carrier/` で動作する。

## 構成

`src/game.js`: 純粋なルール / `storage.js`: 保存 / `view.js`: Three.jsワールドと衝突 / `main.js`: UI・入力 / `audio.js`: Web Audio合成音。

全ての車・敵・背景・エフェクト・音声はコードによるオリジナル生成。既存ゲームの名称・キャラクター・画像・音源は使用していません。Three.js は MIT (vendor/THREE-LICENSE.txt)。タイトルはオリジナルで、SpaceX との関連・提携はありません。

### Stage identity & boss encounters

Five worlds now replace their foreground geometry: alien canopy, canyon columns,
crystal arches, floating ruins, orbital machinery. Each has its own enemy mesh
and movement motif. World geometry stays outside the playable corridor.

After each 11-second wave a 3-second protected boss entrance clears ALL regular
enemies, obstacles and projectiles. A portal, cinematic border and rising audio
cue announce the boss without strobing; reduced effects keep the telegraph.
Bosses then follow five different bounded paths (sweep, ram, orbit, serpent,
solar weave), with aimed shots emitted from their visible locations. The player
can dodge the locked direction. No regular enemies spawn during either entrance
or combat. Existing 5-hit health, local-only history, mobile controls and laser
visibility remain.

Inspiration (original procedural art, no reused SEGA assets):
- https://archives.sega.jp/segaages/sh/ — fantastical creatures and mechanical enemies
- https://segaages.sega.com/project/space-harrier/index.htm — forward movement and obstacle dodging
- https://faq.sega.jp/hc/ja/articles/360025470534 — movement avoids aimed enemy attacks
