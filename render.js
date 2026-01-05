class Renderer {
  constructor(canvas, layout) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.layout = layout;
    this.busIconOn = null;
    this.busIconOff = null;
    this.loadBusIcons();
  }

  async loadBusIcons() {
    try {
      const response = await fetch('bus.svg');
      const svgText = await response.text();
      
      const svgTextOn = svgText.replace(/fill:#4B4B4B/g, 'fill:#4B4B4B').replace(/fill: rgb\(75, 75, 75\)/g, 'fill:#4B4B4B');
      const svgTextOff = svgText.replace(/fill:#4B4B4B/g, 'fill:#ffffff').replace(/fill: rgb\(75, 75, 75\)/g, 'fill:#ffffff');
      
      this.busIconOn = await this.createImageFromSvg(svgTextOn);
      this.busIconOff = await this.createImageFromSvg(svgTextOff);
    } catch (e) {
      console.error('バスアイコンの読み込みに失敗しました:', e);
    }
  }

  createImageFromSvg(svgText) {
    return new Promise((resolve) => {
      const img = new Image();
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.src = url;
    });
  }

  init() {
    const cfg = this.layout.canvas;
    const positions = this.getColumnPositions();
    // 全体の横幅 = 列の合計幅 + サイドパネルの幅
    const calculatedWidth = positions.totalWidth + this.layout.sidePanel.width;
    this.baseWidth = calculatedWidth;
    this.baseHeight = cfg.height;
    this.canvas.width = calculatedWidth;
    this.canvas.height = cfg.height;
    this.clear();
  }

  updateScale() {
    const maxWidth = window.innerWidth * 0.95;
    const maxHeight = window.innerHeight * 0.95;
    
    const scaleX = maxWidth / this.baseWidth;
    const scaleY = maxHeight / this.baseHeight;
    const scale = Math.min(scaleX, scaleY, 1);
    
    this.canvas.style.width = `${this.baseWidth * scale}px`;
    this.canvas.style.height = `${this.baseHeight * scale}px`;
  }

  clear() {
    const ctx = this.ctx;
    ctx.fillStyle = this.layout.canvas.backgroundColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getColumnPositions() {
    const widths = this.layout.columns.widths;
    const spacing = this.layout.columns.spacing;
    const ledCfg = this.layout.columns.led;
    
    // 各列の開始位置を計算
    let currentX = 0;
    const positions = {
      approach: { start: currentX, width: widths.approach, center: currentX + widths.approach / 2 }
    };
    
    currentX += widths.approach + spacing.afterApproach;
    positions.number = { start: currentX, width: widths.number, center: currentX + widths.number / 2 };
    
    currentX += widths.number + spacing.afterNumber;
    positions.via = { start: currentX, width: widths.via, center: currentX + widths.via / 2 };
    
    currentX += widths.via + spacing.afterVia;
    positions.destination = { start: currentX, width: widths.destination, center: currentX + widths.destination / 2 };
    
    currentX += widths.destination + spacing.afterDestination;
    positions.led = { start: currentX, width: widths.led, center: currentX + widths.led / 2 };
    
    // 全体の横幅を計算
    positions.totalWidth = currentX + widths.led + ledCfg.paddingRight;
    
    return positions;
  }

  drawHeader(headerData, approachFarBlinkEnabled = false) {
    const ctx = this.ctx;
    const cfg = this.layout.header;
    const y = 0;

    ctx.save();

    const labelX = 20;
    const labelY = 20;

    ctx.font = `900 ${cfg.label.fontSize}px 'Noto Sans JP', sans-serif`;
    const labelWidth = ctx.measureText(headerData.label).width;

    const labelRectWidth = labelWidth + cfg.label.paddingX * 2;
    const labelRectHeight = cfg.label.fontSize + cfg.label.paddingY * 2;

    // 黒背景
    ctx.fillStyle = cfg.label.backgroundColor;
    ctx.fillRect(
      labelX,
      labelY,
      labelRectWidth,
      labelRectHeight
    );

    // 黄色枠
    ctx.strokeStyle = cfg.label.borderColor || cfg.label.textColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(
      labelX,
      labelY,
      labelRectWidth,
      labelRectHeight
    );

    // 黄色文字
    ctx.fillStyle = cfg.label.textColor;
    ctx.textBaseline = 'top';
    ctx.fillText(
      headerData.label,
      labelX + cfg.label.paddingX,
      labelY + cfg.label.paddingY
    );

    ctx.fillStyle = '#ffffff'; // 説明文の文字色を白に
    ctx.font = `${cfg.description.fontSize * 1.5}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.textBaseline = 'top';
    const descriptionY = labelY + cfg.label.fontSize + cfg.label.paddingY * 2 + cfg.description.marginTop + 14;
    const descriptionX = 200; // 説明文の開始位置
    
    // 説明文の左に接近表示と同じ角丸四角形を配置
    const squareWidth = this.layout.row.height; // 既存の四角と同じサイズ
    const descriptionFontSize = cfg.description.fontSize * 1.4;
    // 角丸の最下部に説明文の最下部を合わせる
    const descriptionBottom = descriptionY + descriptionFontSize + 15;
    const squareY = descriptionBottom - squareWidth;
    const padding = squareWidth * 0.1;
    const innerSize = squareWidth - padding * 2;
    const cornerRadius = innerSize * 0.1;
    const squareX = descriptionX - squareWidth - 8; // 説明文の左側に8pxの余白
    const innerX = squareX + padding;
    const innerY = squareY + padding;
    
    // 点灯状態（接近(遠)の点滅設定が有効な場合は点灯、無効な場合は消灯）
    const isOn = approachFarBlinkEnabled;
    // ヘッダーは点滅しないので暗めの緑を使用
    const squareColor = isOn ? '#4d984d' : '#2d4d2d';
    
    ctx.fillStyle = squareColor;
    ctx.beginPath();
    ctx.moveTo(innerX + cornerRadius, innerY);
    ctx.lineTo(innerX + innerSize - cornerRadius, innerY);
    ctx.quadraticCurveTo(innerX + innerSize, innerY, innerX + innerSize, innerY + cornerRadius);
    ctx.lineTo(innerX + innerSize, innerY + innerSize - cornerRadius);
    ctx.quadraticCurveTo(innerX + innerSize, innerY + innerSize, innerX + innerSize - cornerRadius, innerY + innerSize);
    ctx.lineTo(innerX + cornerRadius, innerY + innerSize);
    ctx.quadraticCurveTo(innerX, innerY + innerSize, innerX, innerY + innerSize - cornerRadius);
    ctx.lineTo(innerX, innerY + cornerRadius);
    ctx.quadraticCurveTo(innerX, innerY, innerX + cornerRadius, innerY);
    ctx.closePath();
    ctx.fill();
    
    // バスアイコンを描画（アイコンの色を白に）
    const busIcon = isOn ? this.busIconOn : this.busIconOff;
    if (busIcon) {
      const iconSize = innerSize * 0.85;
      const iconX = innerX + (innerSize - iconSize) / 2;
      const iconY = innerY + (innerSize - iconSize) / 2;
      
      // アイコンの色を白にする
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = 'brightness(0) invert(1)';
      ctx.drawImage(busIcon, iconX, iconY, iconSize, iconSize);
      ctx.filter = 'none';
      ctx.restore();
    }
    
    // 説明文の文字色を白に設定（角丸四角形の描画後に再設定）
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      headerData.description,
      descriptionX,
      descriptionY
    );

    const headerY = descriptionY + descriptionFontSize + cfg.columnHeaders.marginTop;
    
    ctx.fillStyle = cfg.columnHeaders.color;
    ctx.textBaseline = 'middle';
    
    const positions = this.getColumnPositions();
    
    // 接近の見出しの上に横線を引く（カラム幅の合計に合わせて自動計算）
    if (cfg.columnHeaders.topLine) {
      const topLine = cfg.columnHeaders.topLine;
      ctx.strokeStyle = topLine.color;
      ctx.lineWidth = topLine.lineWidth;
      ctx.beginPath();
      ctx.moveTo(0, topLine.y);
      ctx.lineTo(positions.totalWidth, topLine.y);
      ctx.stroke();
    }

    const colSquaresX = positions.approach.center;
    const colNumberX = positions.number.center;
    const colViaX = positions.via.center;
    const colDestX = positions.destination.center;
    const colLedX = positions.led.center;

    const columnLabels = headerData.columnHeaders;
    
    ctx.font = `${cfg.columnHeaders.fontSize * 1.4}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(columnLabels[0], colSquaresX, headerY);
    
    ctx.font = `${cfg.columnHeaders.smallFontSize * 1.4}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.fillText(columnLabels[1], colNumberX, headerY);
    ctx.fillText(columnLabels[2], colViaX, headerY);
    
    ctx.font = `${cfg.columnHeaders.fontSize * 1.4}px 'Noto Sans JP', sans-serif`;
    ctx.fillText(columnLabels[3], colDestX, headerY);
    
    ctx.font = `${cfg.columnHeaders.smallFontSize * 1.4}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.fillText(columnLabels[4], colLedX, headerY);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  drawRow(route, index, ledState, approachState, obstacleState, isActive) {
    const ctx = this.ctx;
    const rowCfg = this.layout.row;
    const headerHeight = this.layout.header.height;
    // gapは行間のみに影響。行の位置は前の行の下端 + gap
    const y = headerHeight + index * rowCfg.height + (index > 0 ? index * rowCfg.gap : 0);

    ctx.save();

    ctx.fillStyle = isActive ? rowCfg.activeBackgroundColor : rowCfg.backgroundColor;
    ctx.fillRect(0, y, this.canvas.width - this.layout.sidePanel.width, rowCfg.height);

    ctx.strokeStyle = rowCfg.borderColor;
    ctx.lineWidth = rowCfg.borderWidth;
    ctx.beginPath();
    ctx.moveTo(0, y + rowCfg.height);
    ctx.lineTo(this.canvas.width - this.layout.sidePanel.width, y + rowCfg.height);
    ctx.stroke();

    this.drawRowGreenSquares(y, approachState, ledState, obstacleState);
    this.drawRowNumber(route, y);
    this.drawRowVia(route, y);
    this.drawRowDestination(route, y);
    this.drawRowLED(y, obstacleState);

    ctx.restore();
  }
  
  drawDebugLines(y) {
    const ctx = this.ctx;
    const rowCfg = this.layout.row;
    
    const mainAreaWidth = this.canvas.width - this.layout.sidePanel.width;
    const positions = this.getColumnPositions();
    
    const squaresEndX = positions.approach.start + positions.approach.width;
    const numberStartX = positions.number.start;
    const numberEndX = positions.number.start + positions.number.width;
    const viaStartX = positions.via.start;
    const viaEndX = positions.via.start + positions.via.width;
    const destStartX = positions.destination.start;
    const destEndX = positions.destination.start + positions.destination.width;
    const ledStartX = positions.led.start;
    const ledEndX = positions.led.start + positions.led.width + this.layout.columns.led.paddingRight;
    
    ctx.save();
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    ctx.moveTo(0, y);
    ctx.lineTo(0, y + rowCfg.height);
    ctx.moveTo(squaresEndX, y);
    ctx.lineTo(squaresEndX, y + rowCfg.height);
    ctx.moveTo(numberEndX, y);
    ctx.lineTo(numberEndX, y + rowCfg.height);
    ctx.moveTo(viaStartX, y);
    ctx.lineTo(viaStartX, y + rowCfg.height);
    ctx.moveTo(viaEndX, y);
    ctx.lineTo(viaEndX, y + rowCfg.height);
    ctx.moveTo(destStartX, y);
    ctx.lineTo(destStartX, y + rowCfg.height);
    ctx.moveTo(destEndX, y);
    ctx.lineTo(destEndX, y + rowCfg.height);
    ctx.moveTo(ledStartX, y);
    ctx.lineTo(ledStartX, y + rowCfg.height);
    ctx.moveTo(ledEndX, y);
    ctx.lineTo(ledEndX, y + rowCfg.height);
    ctx.moveTo(mainAreaWidth, y);
    ctx.lineTo(mainAreaWidth, y + rowCfg.height);
    
    ctx.moveTo(0, y);
    ctx.lineTo(mainAreaWidth, y);
    ctx.moveTo(0, y + rowCfg.height);
    ctx.lineTo(mainAreaWidth, y + rowCfg.height);
    
    ctx.stroke();
    ctx.restore();
  }

  drawRowGreenSquares(y, approachState, ledState, obstacleState) {
    const ctx = this.ctx;
    const cfg = this.layout.columns.greenSquares;
    const approachWidth = this.layout.columns.widths.approach;
    const centerY = y + this.layout.row.height / 2;
    const squareWidth = this.layout.row.height;
    const squareSpacing = (approachWidth - squareWidth * 2) / 3;
    const startX = squareSpacing;
    const squareY = centerY - squareWidth / 2;
    const padding = squareWidth * 0.1;
    const innerSize = squareWidth - padding * 2;
    const cornerRadius = innerSize * 0.1;

    ctx.save();

    // 左側: 接近(遠), 右側: 接近(近)
    const states = [approachState, ledState];

    for (let i = 0; i < 2; i++) {
      const isOn = states[i];
      const squareColor = isOn ? '#90ee90' : '#2d4d2d';
      const iconColor = isOn ? '#888888' : '#ffffff';
      
      const x = startX + i * (squareWidth + squareSpacing);
      const innerX = x + padding;
      const innerY = squareY + padding;
      
      ctx.fillStyle = squareColor;
      ctx.beginPath();
      ctx.moveTo(innerX + cornerRadius, innerY);
      ctx.lineTo(innerX + innerSize - cornerRadius, innerY);
      ctx.quadraticCurveTo(innerX + innerSize, innerY, innerX + innerSize, innerY + cornerRadius);
      ctx.lineTo(innerX + innerSize, innerY + innerSize - cornerRadius);
      ctx.quadraticCurveTo(innerX + innerSize, innerY + innerSize, innerX + innerSize - cornerRadius, innerY + innerSize);
      ctx.lineTo(innerX + cornerRadius, innerY + innerSize);
      ctx.quadraticCurveTo(innerX, innerY + innerSize, innerX, innerY + innerSize - cornerRadius);
      ctx.lineTo(innerX, innerY + cornerRadius);
      ctx.quadraticCurveTo(innerX, innerY, innerX + cornerRadius, innerY);
      ctx.closePath();
      ctx.fill();

      const busIcon = isOn ? this.busIconOn : this.busIconOff;
      if (busIcon) {
        const iconSize = innerSize * 0.85;
        const iconX = innerX + (innerSize - iconSize) / 2;
        const iconY = innerY + (innerSize - iconSize) / 2;
        
        // アイコンの色を適用
        ctx.save();
        
        // 一時的なcanvasにアイコンを描画
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = iconSize;
        tempCanvas.height = iconSize;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(busIcon, 0, 0, iconSize, iconSize);
        
        // アイコンの形状に色を適用
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = iconColor;
        tempCtx.fillRect(0, 0, iconSize, iconSize);
        
        // メインcanvasに描画
        ctx.drawImage(tempCanvas, iconX, iconY);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  drawRowNumber(route, y) {
    const ctx = this.ctx;
    const cfg = this.layout.columns.number;
    const rowHeight = this.layout.row.height;
    
    const positions = this.getColumnPositions();
    const numberStartX = positions.number.start;
    const numberEndX = numberStartX + positions.number.width;
    const numberCenterX = positions.number.center;
    
    const maxWidth = positions.number.width * 0.9;

    ctx.save();

    ctx.fillStyle = cfg.color;
    ctx.font = `bold ${rowHeight * 0.9}px 'Noto Sans JP', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    
    const text = route.number || '';
    const hasBr = text.includes('<br>');
    
    if (hasBr) {
      // <br>で分割して2行に表示
      const lines = text.split('<br>');
      // 二段の時はフォントサイズを大きくして、縦方向だけ縮小
      const baseFontSize = rowHeight * 0.65; // フォントサイズを大きく
      const verticalScale = 0.75; // 縦方向のスケール
      const lineFontSize = baseFontSize * verticalScale; // 実際の高さ
      const gap = -rowHeight * 0.075; // 負の値で行を重ねて詰める
      const totalTextHeight = lineFontSize * 2 + gap;
      const startY = y + (rowHeight - totalTextHeight) / 2;
      const topCenterY = startY + lineFontSize / 2;
      const bottomCenterY = startY + lineFontSize + gap + lineFontSize / 2;
      
      // 上段
      if (lines[0]) {
        this.drawNumberLineScaled(ctx, lines[0], numberCenterX, topCenterY, baseFontSize, verticalScale, maxWidth);
      }
      
      // 下段
      if (lines[1]) {
        this.drawNumberLineScaled(ctx, lines[1], numberCenterX, bottomCenterY, baseFontSize, verticalScale, maxWidth);
      }
    } else {
      // 従来通り1行で表示（上下5%パディング）
      const padding = rowHeight * 0.05;
      const actualHeight = rowHeight - padding * 2;
      const actualFontSize = actualHeight * 0.9;
      const centerY = y + padding + actualHeight / 2;
      this.drawNumberLine(ctx, text, numberCenterX, centerY, actualFontSize, maxWidth);
    }

    ctx.restore();
  }

  drawNumberLine(ctx, text, centerX, centerY, fontSize, maxWidth) {
    ctx.font = `bold ${fontSize}px 'Noto Sans JP', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    
    const chars = text.split('');
    if (chars.length === 0) return;
    
    // 各文字の幅を測定
    const charWidths = chars.map(char => {
      const metrics = ctx.measureText(char);
      return metrics.width;
    });
    const totalCharWidth = charWidths.reduce((sum, width) => sum + width, 0);
    
    // カーニングを狭くする（文字間隔を負の値にする）
    const kerning = -fontSize * 0.08; // フォントサイズの8%分狭く
    const totalWidth = totalCharWidth + kerning * (chars.length - 1);
    
    if (totalWidth > maxWidth) {
      const scaleX = maxWidth / totalWidth;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(scaleX, 1);
      ctx.translate(-centerX, -centerY);
      
      // 文字を1文字ずつ描画（カーニング適用）
      let currentX = centerX - totalWidth / 2;
      chars.forEach((char, index) => {
        ctx.fillText(char, currentX, centerY);
        currentX += charWidths[index] + kerning;
      });
      
      ctx.restore();
    } else {
      // 文字を1文字ずつ描画（カーニング適用）
      let currentX = centerX - totalWidth / 2;
      chars.forEach((char, index) => {
        ctx.fillText(char, currentX, centerY);
        currentX += charWidths[index] + kerning;
      });
    }
  }

  drawNumberLineScaled(ctx, text, centerX, centerY, fontSize, verticalScale, maxWidth) {
    ctx.font = `bold ${fontSize}px 'Noto Sans JP', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    
    const chars = text.split('');
    if (chars.length === 0) return;
    
    // 各文字の幅を測定
    const charWidths = chars.map(char => {
      const metrics = ctx.measureText(char);
      return metrics.width;
    });
    const totalCharWidth = charWidths.reduce((sum, width) => sum + width, 0);
    
    // カーニングを狭くする（文字間隔を負の値にする）
    const kerning = -fontSize * 0.08; // フォントサイズの8%分狭く
    const totalWidth = totalCharWidth + kerning * (chars.length - 1);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    
    // 横方向のスケール（必要に応じて）
    let scaleX = 1;
    if (totalWidth > maxWidth) {
      scaleX = maxWidth / totalWidth;
    }
    
    // 縦方向だけ縮小、横方向もスケール適用
    ctx.scale(scaleX, verticalScale);
    ctx.translate(-centerX, -centerY);
    
    // 文字を1文字ずつ描画（カーニング適用）
    let currentX = centerX - totalWidth / 2;
    chars.forEach((char, index) => {
      ctx.fillText(char, currentX, centerY);
      currentX += charWidths[index] + kerning;
    });
    
    ctx.restore();
  }

  drawRowVia(route, y) {
    const ctx = this.ctx;
    const cfg = this.layout.columns.via;
    const centerY = y + this.layout.row.height / 2;
    
    const positions = this.getColumnPositions();
    const viaStartX = positions.via.start + cfg.paddingLeft;
    const viaEndX = positions.via.start + positions.via.width - cfg.paddingLeft;
    const viaAreaWidth = viaEndX - viaStartX;
    const viaCenterX = positions.via.center;

    ctx.save();

    const fontSize = this.layout.row.height * 0.45;
    ctx.fillStyle = cfg.color;
    ctx.font = `bold ${fontSize}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    
    if (route.subDestination) {
      const text = route.subDestination;
      const chars = text.split('');
      if (chars.length > 0) {
        const charWidths = chars.map(char => {
          ctx.font = `bold ${fontSize}px 'M PLUS Rounded 1c', sans-serif`;
          const metrics = ctx.measureText(char);
          return metrics.width;
        });
        const totalCharWidth = charWidths.reduce((sum, width) => sum + width, 0);
        
        if (totalCharWidth > viaAreaWidth) {
          const scaleX = viaAreaWidth / totalCharWidth;
          const scaledTotalWidth = totalCharWidth * scaleX;
          
          ctx.save();
          ctx.translate(viaCenterX, centerY);
          ctx.scale(scaleX, 1);
          ctx.translate(-viaCenterX, -centerY);
          
          let currentX = viaCenterX - totalCharWidth / 2;
          chars.forEach((char, index) => {
            ctx.fillText(char, currentX, centerY);
            currentX += charWidths[index];
          });
          ctx.restore();
        } else {
          const spacing = chars.length > 1 ? (viaAreaWidth - totalCharWidth) / (chars.length - 1) : 0;
          const totalWidthWithSpacing = totalCharWidth + spacing * (chars.length - 1);
          const textStartX = viaCenterX - totalWidthWithSpacing / 2;
          let currentX = textStartX;
          chars.forEach((char, index) => {
            ctx.fillText(char, currentX, centerY);
            currentX += charWidths[index] + spacing;
          });
        }
      }
    }

    ctx.restore();
  }

  drawRowDestination(route, y) {
    const ctx = this.ctx;
    const cfg = this.layout.columns.destination;
    const rowHeight = this.layout.row.height;
    
    const positions = this.getColumnPositions();
    const destStartX = positions.destination.start + cfg.paddingLeft;
    const destEndX = positions.destination.start + positions.destination.width - cfg.paddingLeft;
    const destAreaWidth = destEndX - destStartX;
    const destCenterX = positions.destination.center;

    ctx.save();

    const fontSize = rowHeight * 0.9;
    ctx.fillStyle = cfg.color;
    ctx.font = `900 ${fontSize}px 'Noto Sans JP', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    
    const text = route.destination;
    const hasBr = text.includes('<br>');
    
    if (hasBr) {
      // <br>で分割して2行に表示
      const lines = text.split('<br>');
      const lineFontSize = rowHeight * 0.45;
      const gap = -rowHeight * 0.02; // 負の値で行を重ねて詰める
      const totalTextHeight = lineFontSize * 2 + gap;
      const startY = y + (rowHeight - totalTextHeight) / 2;
      const topCenterY = startY + lineFontSize / 2;
      const bottomCenterY = startY + lineFontSize + gap + lineFontSize / 2;
      
      // 上段
      if (lines[0]) {
        this.drawDestinationLine(ctx, lines[0], destStartX, destEndX, destAreaWidth, destCenterX, topCenterY, lineFontSize);
      }
      
      // 下段
      if (lines[1]) {
        this.drawDestinationLine(ctx, lines[1], destStartX, destEndX, destAreaWidth, destCenterX, bottomCenterY, lineFontSize);
      }
    } else {
      // 従来通り1行で表示（上下5%パディング）
      const padding = rowHeight * 0.05;
      const actualHeight = rowHeight - padding * 2;
      const actualFontSize = actualHeight * 0.9;
      const centerY = y + padding + actualHeight / 2;
      this.drawDestinationLine(ctx, text, destStartX, destEndX, destAreaWidth, destCenterX, centerY, actualFontSize);
    }

    ctx.restore();
  }

  drawDestinationLine(ctx, text, destStartX, destEndX, destAreaWidth, destCenterX, centerY, fontSize) {
    const chars = text.split('');
    if (chars.length > 0) {
      const charWidths = chars.map(char => {
        ctx.font = `900 ${fontSize}px 'Noto Sans JP', sans-serif`;
        const metrics = ctx.measureText(char);
        return metrics.width;
      });
      const totalCharWidth = charWidths.reduce((sum, width) => sum + width, 0);
      
      if (totalCharWidth > destAreaWidth) {
        const scaleX = destAreaWidth / totalCharWidth;
        
        ctx.save();
        ctx.translate(destCenterX, centerY);
        ctx.scale(scaleX, 1);
        ctx.translate(-destCenterX, -centerY);
        
        let currentX = destCenterX - totalCharWidth / 2;
        chars.forEach((char, index) => {
          ctx.fillText(char, currentX, centerY);
          currentX += charWidths[index];
        });
        ctx.restore();
      } else {
        const spacing = chars.length > 1 ? (destAreaWidth - totalCharWidth) / (chars.length - 1) : 0;
        const totalWidthWithSpacing = totalCharWidth + spacing * (chars.length - 1);
        const textStartX = destCenterX - totalWidthWithSpacing / 2;
        let currentX = textStartX;
        chars.forEach((char, index) => {
          ctx.fillText(char, currentX, centerY);
          currentX += charWidths[index] + spacing;
        });
      }
    }
  }

  drawRowLED(y, isOn) {
    const ctx = this.ctx;
    const cfg = this.layout.columns.led;
    const centerY = y + this.layout.row.height / 2;
    const positions = this.getColumnPositions();
    const ledCenterX = positions.led.center;
    const ledCenterY = centerY;

    ctx.save();

    const capsuleWidth = cfg.ellipseWidth * 0.75;
    const capsuleHeight = cfg.ellipseHeight * 0.75;
    const radius = capsuleWidth / 2;
    const leftX = ledCenterX - radius;
    const rightX = ledCenterX + radius;
    const topY = ledCenterY - capsuleHeight / 2;
    const bottomY = ledCenterY + capsuleHeight / 2;
    const topCircleCenterY = topY + radius;
    const bottomCircleCenterY = bottomY - radius;

    ctx.fillStyle = isOn ? '#ff4444' : cfg.color;
    ctx.beginPath();
    // 上側の半円（左から右へ）
    ctx.arc(ledCenterX, topCircleCenterY, radius, Math.PI, 0, false);
    // 右側の直線（上から下へ）
    ctx.lineTo(rightX, bottomCircleCenterY);
    // 下側の半円（右から左へ）
    ctx.arc(ledCenterX, bottomCircleCenterY, radius, 0, Math.PI, false);
    // 左側の直線（下から上へ）で閉じる
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = cfg.borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  drawSidePanel(stopInfo) {
    const ctx = this.ctx;
    const cfg = this.layout.sidePanel;
    const panelX = this.canvas.width - cfg.width;

    ctx.save();

    ctx.fillStyle = cfg.backgroundColor;
    ctx.fillRect(panelX, 0, cfg.width, this.canvas.height);

    ctx.fillStyle = cfg.textColor;
    ctx.font = `bold ${cfg.stopNameFontSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(stopInfo.name, panelX + cfg.padding, cfg.padding);

    ctx.font = `${cfg.stopNumberFontSize}px sans-serif`;
    ctx.fillText(stopInfo.number, panelX + cfg.padding, cfg.padding + cfg.stopNameFontSize + 10);

    ctx.font = `${cfg.englishFontSize}px sans-serif`;
    ctx.fillText(stopInfo.english, panelX + cfg.padding, cfg.padding + cfg.stopNameFontSize + cfg.stopNumberFontSize + 20);

    ctx.restore();
  }

  render(displayData, ledStates, approachStates, obstacleStates, approachFarBlink) {
    this.clear();
    // 最初のルートの接近(遠)の点滅設定をヘッダーに渡す（点滅させず、点灯状態だけ表示）
    const headerApproachFarBlinkEnabled = approachFarBlink && approachFarBlink.length > 0 ? approachFarBlink[0] : false;
    this.drawHeader(displayData.header, headerApproachFarBlinkEnabled);
    this.drawSidePanel(displayData.stopInfo);

    displayData.routes.forEach((route, index) => {
      this.drawRow(route, index, ledStates[index], approachStates[index], obstacleStates[index], false);
    });
  }
}
