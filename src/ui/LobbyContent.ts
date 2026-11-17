import Phaser from 'phaser';
import { contains, fitTexture, inset, type ContentRect } from './lobbyContentLayout';

interface FieldStyle {
  size?: number; minSize?: number; padding?: number; align?: 'left' | 'center';
  color?: string; bold?: boolean; wrap?: boolean; maxLines?: number;
  stroke?: string;
  fontFamily?: string;
}
interface FieldRecord {
  id: string; fullValue: string; text: Phaser.GameObjects.Text;
  region: Phaser.GameObjects.Zone; safe: Phaser.GameObjects.Zone; debug: Phaser.GameObjects.Graphics;
}

/** Lobby-only typography. Geometry comes from texture metadata, never a PNG's outer center. */
export class LobbyContent {
  readonly fields: FieldRecord[] = [];
  readonly regions: { id: string; zone: Phaser.GameObjects.Zone }[] = [];
  private drawings: Phaser.GameObjects.Graphics[] = [];
  private debug = new URLSearchParams(location.search).get('lobbyDebug') === '1';

  constructor(private scene: Phaser.Scene, private rendering: { fastFit?: boolean; fontFamily?: string; resolution?: number; textPaddingY?: number } = {}) {
    const toggle = () => this.setDebug(!this.debug);
    scene.input.keyboard?.on('keydown-F8', toggle);
    scene.events.once('shutdown', () => scene.input.keyboard?.off('keydown-F8', toggle));
  }

  setDebug(enabled: boolean) { this.debug = enabled; this.drawings.forEach(g => g.setVisible(enabled)); }

  /** Drop records after the owning scene destroys its view during a responsive rebuild. */
  reset() { this.fields.length = 0; this.regions.length = 0; this.drawings.length = 0; }

  region(id: string, box: ContentRect) {
    const zone = this.scene.add.zone(box.x + box.width / 2, box.y + box.height / 2, box.width, box.height)
      .setName(`lobby.content.${id}`);
    this.regions.push({ id, zone });
    return zone;
  }

  outline(box: ContentRect, color = 0x32e2c0) {
    const g = this.scene.add.graphics().lineStyle(1, color, 0.9).strokeRect(box.x, box.y, box.width, box.height)
      .setVisible(this.debug);
    this.drawings.push(g);
    return g;
  }

  frame(id: string, key: string, slot: ContentRect, frame?: string) {
    const image = this.scene.add.image(0, 0, key, frame).setName(`lobby.frame.${id}`);
    const geometry = fitTexture(image.frame, slot);
    image.setPosition(geometry.bounds.x + geometry.bounds.width / 2, geometry.bounds.y + geometry.bounds.height / 2)
      .setScale(geometry.scale);
    this.region(id, geometry.bounds);
    return { image, ...geometry };
  }

  field(id: string, box: ContentRect, value: string, style: FieldStyle = {}) {
    const safe = inset(box, style.padding ?? 2);
    const maxSize = style.size ?? 18, minSize = Math.min(maxSize, style.minSize ?? 12);
    const family = style.fontFamily ?? this.rendering.fontFamily ?? 'Arial, sans-serif';
    const text = this.scene.add.text(0, 0, value.normalize('NFC'), { fontFamily: family,
      fontSize: this.rendering.fastFit ? minSize : maxSize, color: style.color ?? '#fff0c6', fontStyle: style.bold === false ? 'normal' : 'bold',
      align: style.align ?? 'left', padding: { x: 0, y: safe.height < 20 ? 0 : this.rendering.textPaddingY ?? 0 },
      resolution: this.rendering.resolution ?? 0,
      ...(style.stroke ? { stroke: style.stroke, strokeThickness: 2 } : {}),
      ...(style.wrap ? { wordWrap: { width: safe.width, useAdvancedWrap: true } } : {}),
    }).setName(`lobby.text.${id}`);
    const fits = () => text.width <= safe.width && text.height <= safe.height &&
      (!style.wrap || text.getWrappedText().length <= (style.maxLines ?? 2));
    text.setFontSize(minSize);
    if (this.rendering.fastFit && fits()) {
      // Measure candidate sizes without repainting/uploading a text texture on every binary step.
      // The final Phaser bounds remain authoritative, including stroke and Vietnamese accents.
      const measures = (size: number) => {
        const context = text.context;
        context.save();
        context.font = `${style.bold === false ? '' : 'bold '}${size}px ${family}`;
        const rows: string[] = [];
        for (const paragraph of value.normalize('NFC').split('\n')) {
          let line = '';
          for (const word of paragraph.split(/\s+/)) {
            const next = line ? `${line} ${word}` : word;
            if (style.wrap && line && context.measureText(next).width > safe.width - 4) { rows.push(line); line = word; }
            else line = next;
          }
          rows.push(line);
        }
        const fits = Math.max(...rows.map(row => context.measureText(row).width)) + (style.stroke ? 4 : 0) <= safe.width &&
          rows.length * size * 1.25 + (style.stroke ? 4 : 0) <= safe.height &&
          (!style.wrap || rows.length <= (style.maxLines ?? 2));
        context.restore();
        return fits;
      };
      let low = minSize, high = maxSize;
      for (let i = 0; i < 9; i++) { const mid = (low + high) / 2; if (measures(mid)) low = mid; else high = mid; }
      let size = Math.floor(low * 10) / 10;
      text.setFontSize(size);
      while (!fits() && size > minSize) { size = Math.max(minSize, size - .5); text.setFontSize(size); }
    } else if (fits()) {
      let low = minSize, high = maxSize;
      for (let i = 0; i < 9; i++) {
        const size = (low + high) / 2; text.setFontSize(size);
        if (fits()) low = size; else high = size;
      }
      text.setFontSize(Math.floor(low * 10) / 10);
    } else {
      const letters = Array.from(value.normalize('NFC'));
      while (letters.length && !fits()) { letters.pop(); text.setText(letters.join('') + '…'); }
      if (!fits()) throw new Error(`Lobby contentRect too small for ${id}`);
    }
    text.setOrigin(style.align === 'center' ? 0.5 : 0, 0.5)
      .setPosition(style.align === 'center' ? safe.x + safe.width / 2 : safe.x, safe.y + safe.height / 2);
    const region = this.region(`${id}.field`, box), safeZone = this.region(`${id}.safe`, safe);
    const debug = this.outline(safe);
    debug.lineStyle(1, 0xff69cf, 1).strokeRect(text.x - text.displayOriginX, text.y - text.displayOriginY, text.width, text.height);
    this.fields.push({ id, fullValue: value, text, region, safe: safeZone, debug });
    return text;
  }

  audit() {
    const fields = this.fields.map(field => ({ id: field.id, fullValue: field.fullValue, displayed: field.text.text,
      rect: field.region.getBounds(), contentRect: field.safe.getBounds(), textBounds: field.text.getBounds(),
      fontSize: field.text.style.fontSize, fits: contains(field.safe.getBounds(), field.text.getBounds(), 0.25) }));
    return { fields, regions: this.regions.filter(r => !r.id.endsWith('.safe') && !r.id.endsWith('.field'))
      .map(r => ({ id: r.id, bounds: r.zone.getBounds() })),
    };
  }
}
