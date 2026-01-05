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

    // ヘッダーの背景色を描画
    const headerBgColor = cfg.backgroundColor !== null && cfg.backgroundColor !== undefined 
      ? cfg.backgroundColor 
      : this.layout.canvas.backgroundColor;
    ctx.fillStyle = headerBgColor;
    ctx.fillRect(0, 0, this.canvas.width - this.layout.sidePanel.width, cfg.height);

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
    const squareColor = isOn ? (cfg.description.squareOnColor || '#4d984d') : '#2d4d2d';
    // アイコンの色（アイコンと同じ色にする）
    const iconColor = isOn ? (cfg.description.squareOnIconColor || '#4B4B4B') : '#ffffff';
    const edgeColor = isOn ? (cfg.description.squareOnEdgeColor || '#4B4B4B') : '#ffffff';
    
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
    
    // エッジを描画
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // バスアイコンを描画（アイコンの色を適用）
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
    const rowCfg = this.layout.row;
    const horizontalGap = rowCfg.horizontalGap || 0;
    const ledCfg = this.layout.columns.led;
    // 短冊と同じロジックで中央揃え位置を計算
    const contentWidth = positions.totalWidth - ledCfg.paddingRight;
    const stripWidth = contentWidth + horizontalGap * 2;
    const rowAreaWidth = this.canvas.width - this.layout.sidePanel.width;
    const stripX = (rowAreaWidth - stripWidth) / 2;
    // 短冊内のコンテンツは stripX + horizontalGap から始まる
    const contentStartX = stripX + horizontalGap;
    
    // 接近の見出しの上に横線を引く（短冊の幅全体に合わせて自動計算）
    if (cfg.columnHeaders.topLine) {
      const topLine = cfg.columnHeaders.topLine;
      ctx.strokeStyle = topLine.color;
      ctx.lineWidth = topLine.lineWidth;
      ctx.beginPath();
      ctx.moveTo(stripX, topLine.y);
      ctx.lineTo(stripX + stripWidth, topLine.y);
      ctx.stroke();
    }

    // 見出し列の位置を短冊内のコンテンツ位置に合わせる
    const colSquaresX = contentStartX + positions.approach.center;
    const colNumberX = contentStartX + positions.number.center;
    const colViaX = contentStartX + positions.via.center;
    const colDestX = contentStartX + positions.destination.center;
    const colLedX = contentStartX + positions.led.center;

    const columnLabels = headerData.columnHeaders;
    
    ctx.font = `bold ${cfg.columnHeaders.fontSize * 1.4}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(columnLabels[0], colSquaresX, headerY);
    
    ctx.font = `bold ${cfg.columnHeaders.smallFontSize * 1.4}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.fillText(columnLabels[1], colNumberX, headerY);
    ctx.fillText(columnLabels[2], colViaX, headerY);
    
    ctx.font = `bold ${cfg.columnHeaders.fontSize * 1.4}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.fillText(columnLabels[3], colDestX, headerY);
    
    ctx.font = `bold ${cfg.columnHeaders.smallFontSize * 1.4}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.fillText(columnLabels[4], colLedX, headerY);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  drawRow(route, index, ledState, approachState, obstacleState, isActive) {
    const ctx = this.ctx;
    const rowCfg = this.layout.row;
    const headerHeight = this.layout.header.height;
    const horizontalGap = rowCfg.horizontalGap || 0;
    // gapは行間のみに影響。行の位置はヘッダーの下 + gap + 前の行の下端 + gap
    const y = headerHeight + rowCfg.gap + index * rowCfg.height + (index > 0 ? index * rowCfg.gap : 0);

    // 短冊の中身の幅を取得
    const positions = this.getColumnPositions();
    const ledCfg = this.layout.columns.led;
    // LED列のpaddingRightは短冊の外側に出すため、除外する
    const contentWidth = positions.totalWidth - ledCfg.paddingRight;
    // 短冊の幅 = 中身の幅 + 左右のgap
    const stripWidth = contentWidth + horizontalGap * 2;
    const rowAreaWidth = this.canvas.width - this.layout.sidePanel.width;
    // 短冊を中央揃えで配置
    const stripX = (rowAreaWidth - stripWidth) / 2;

    ctx.save();

    // 短冊の背景を描画
    ctx.fillStyle = isActive ? rowCfg.activeBackgroundColor : rowCfg.backgroundColor;
    ctx.fillRect(stripX, y, stripWidth, rowCfg.height);

    // 短冊の境界線を描画
    ctx.strokeStyle = rowCfg.borderColor;
    ctx.lineWidth = rowCfg.borderWidth;
    ctx.beginPath();
    // 上端の線
    ctx.moveTo(stripX, y);
    ctx.lineTo(stripX + stripWidth, y);
    // 下端の線
    ctx.moveTo(stripX, y + rowCfg.height);
    ctx.lineTo(stripX + stripWidth, y + rowCfg.height);
    ctx.stroke();

    // 短冊内の要素を描画するために、短冊の範囲に制限
    ctx.save();
    ctx.beginPath();
    ctx.rect(stripX, y, stripWidth, rowCfg.height);
    ctx.clip();
    
    // 短冊内の要素を描画（短冊の左端 + horizontalGapを基準にする）
    ctx.translate(stripX + horizontalGap, 0);
    this.drawRowGreenSquares(y, approachState, ledState, obstacleState);
    this.drawRowNumber(route, y);
    this.drawRowVia(route, y);
    this.drawRowDestination(route, y);
    this.drawRowLED(y, obstacleState);
    ctx.translate(-(stripX + horizontalGap), 0);
    
    ctx.restore();

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
      const squareColor = isOn ? (cfg.onFillColor || cfg.color) : '#2d4d2d';
      const iconColor = isOn ? (cfg.onIconColor || '#888888') : '#ffffff';
      const edgeColor = isOn ? (cfg.onEdgeColor || '#888888') : '#ffffff';
      
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
      
      // エッジを描画
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 3;
      ctx.stroke();

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

    // 凡例を描画
    this.drawSidePanelLegend(panelX, cfg);

    ctx.restore();
  }

  drawSidePanelLegend(panelX, cfg) {
    const ctx = this.ctx;
    const legendCfg = cfg.legend;
    let currentY = cfg.padding + legendCfg.marginTop;

    const squareSize = legendCfg.squareSize;
    const padding = squareSize * 0.1;
    const innerSize = squareSize - padding * 2;
    const cornerRadius = innerSize * 0.1;

    // 凡例アイテムの定義
    const legendItems = [
      {
        leftState: { fill: true, edge: true },  // 常時点灯角丸
        rightState: { fill: false, edge: true }, // エッジだけの角丸
        text: "２つ前の停留所を出ました。"
      },
      {
        leftState: { fill: false, edge: true }, // エッジだけの角丸
        rightState: { fill: true, edge: true },  // 常時点灯角丸
        text: "１つ前の停留所を出ました。"
      },
      {
        leftState: { fill: true, edge: true },   // 常時点灯角丸
        rightState: { fill: true, edge: true },  // 常時点灯角丸
        text: "続いてバスがきます。"
      },
      {
        leftState: null, // 空欄
        rightState: { fill: true, edge: false, isObstacle: true }, // 障害の赤カプセル発光状態
        text: "障害のため、運休または<br>大幅な乱れが生じています。"
      }
    ];

    legendItems.forEach((item, index) => {
      // 「続いてバスがきます」と「障害のため...」の間は独立した間隔を使用
      let itemY = currentY;
      for (let i = 0; i < index; i++) {
        if (i === 2) {
          // 「続いてバスがきます」（index 2）の後は独立した間隔
          itemY += legendCfg.itemHeight + legendCfg.gapBeforeObstacle;
        } else {
          itemY += legendCfg.itemHeight + legendCfg.itemGap;
        }
      }
      const squareY = itemY + (legendCfg.itemHeight - squareSize) / 2;
      const leftSquareX = panelX + cfg.padding;
      const rightSquareX = leftSquareX + squareSize + legendCfg.squareGap;

      // 左側の角丸（または空欄）
      if (item.leftState) {
        this.drawLegendSquare(ctx, leftSquareX, squareY, squareSize, padding, innerSize, cornerRadius, item.leftState, legendCfg);
      }

      // 右側の角丸（または障害カプセル）
      if (item.rightState.isObstacle) {
        // 障害の赤カプセル
        this.drawLegendObstacleCapsule(ctx, rightSquareX, squareY, squareSize, legendCfg.obstacleCapsule);
      } else {
        this.drawLegendSquare(ctx, rightSquareX, squareY, squareSize, padding, innerSize, cornerRadius, item.rightState, legendCfg);
      }

      // テキストを描画
      ctx.fillStyle = legendCfg.textColor;
      ctx.font = `${legendCfg.textFontSize}px 'M PLUS Rounded 1c', sans-serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      
      const textX = rightSquareX + squareSize + legendCfg.textMarginLeft;
      const textY = itemY + legendCfg.itemHeight / 2;

      if (item.text.includes('<br>')) {
        // <br>で分割して2行に表示
        const lines = item.text.split('<br>');
        const lineHeight = legendCfg.textFontSize * 1.2;
        const totalHeight = lineHeight * lines.length;
        const startY = textY - totalHeight / 2 + lineHeight / 2;
        
        lines.forEach((line, lineIndex) => {
          this.drawTextWithKerning(ctx, line, textX, startY + lineIndex * lineHeight, legendCfg.textFontSize, legendCfg.textKerning || 0);
        });
      } else {
        this.drawTextWithKerning(ctx, item.text, textX, textY, legendCfg.textFontSize, legendCfg.textKerning || 0);
      }
    });

    // 最後のアイテムの位置を計算（「続いてバスがきます」と「障害のため...」の間隔を考慮）
    let lastItemY = currentY;
    for (let i = 0; i < legendItems.length; i++) {
      if (i === 2) {
        lastItemY += legendCfg.itemHeight + legendCfg.gapBeforeObstacle;
      } else {
        lastItemY += legendCfg.itemHeight + legendCfg.itemGap;
      }
    }

    // 停留所情報を描画
    this.drawSidePanelStopInfo(panelX, cfg, lastItemY);
  }

  drawTextWithKerning(ctx, text, x, y, fontSize, kerningRatio) {
    ctx.font = `${fontSize}px 'M PLUS Rounded 1c', sans-serif`;
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
    
    // カーニングを適用
    const kerning = fontSize * kerningRatio;
    const totalWidth = totalCharWidth + kerning * (chars.length - 1);
    
    // 文字を1文字ずつ描画（カーニング適用）
    let currentX = x;
    chars.forEach((char, index) => {
      ctx.fillText(char, currentX, y);
      currentX += charWidths[index] + kerning;
    });
  }

  drawSidePanelStopInfo(panelX, cfg, startY) {
    const ctx = this.ctx;
    const stopInfoCfg = cfg.legend.stopInfo;
    let currentY = startY + stopInfoCfg.marginTop;

    ctx.save();
    ctx.fillStyle = stopInfoCfg.textColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const x = panelX + cfg.padding;
    const availableWidth = cfg.width - cfg.padding * 2;
    const leftWidth = availableWidth * 0.7;
    const rightWidth = availableWidth * 0.3;
    const leftX = x;
    const rightX = x + leftWidth;

    // 左側7割：停留所名を2段で表示（均等割つけ&圧縮）
    const line1Text = " 広 坂• ";
    const line2Text = "21世紀美術館";
    const lineFontSize = stopInfoCfg.nameFontSize;
    const gap = stopInfoCfg.nameLineGap;
    const totalTextHeight = lineFontSize * 2 + gap;
    const nameAreaCenterY = currentY + totalTextHeight / 2;
    const topCenterY = nameAreaCenterY - lineFontSize / 2 - gap / 2;
    const bottomCenterY = nameAreaCenterY + lineFontSize / 2 + gap / 2;

    ctx.font = `bold ${lineFontSize}px 'Noto Sans JP', sans-serif`;
    ctx.textBaseline = 'middle';
    
    // 上段「広坂・」
    this.drawStopNameLine(ctx, line1Text, leftX, leftX + leftWidth, leftWidth, leftX + leftWidth / 2, topCenterY, lineFontSize);
    
    // 下段「21世紀美術館」
    this.drawStopNameLine(ctx, line2Text, leftX, leftX + leftWidth, leftWidth, leftX + leftWidth / 2, bottomCenterY, lineFontSize);

    // 右側3割：①を中央揃え（上下左右）
    ctx.font = `bold ${stopInfoCfg.numberFontSize}px 'Noto Sans JP', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const numberCenterX = rightX + rightWidth / 2;
    ctx.fillText("①", numberCenterX, nameAreaCenterY);
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // 「(しいのき迎賓館前)」を描画（全幅で均等割つけ&圧縮）
    currentY = currentY + totalTextHeight + stopInfoCfg.platformMarginTop;
    ctx.font = `bold ${stopInfoCfg.platformFontSize}px 'M PLUS Rounded 1c', sans-serif`;
    ctx.textBaseline = 'middle';
    const platformCenterY = currentY + stopInfoCfg.platformFontSize / 2;
    this.drawStopNameLineWithFont(ctx, "(しいのき迎賓館前)", x, x + availableWidth, availableWidth, x + availableWidth / 2, platformCenterY, stopInfoCfg.platformFontSize, `bold ${stopInfoCfg.platformFontSize}px 'M PLUS Rounded 1c', sans-serif`);

    // 「Hirosaka•21 Century Museum」を描画（全幅で均等割つけ&圧縮）
    currentY += stopInfoCfg.platformFontSize + stopInfoCfg.englishMarginTop;
    ctx.font = `bold ${stopInfoCfg.englishFontSize}px 'M PLUS Rounded 1c', sans-serif`;
    const englishCenterY = currentY + stopInfoCfg.englishFontSize / 2;
    this.drawStopNameLineWithFont(ctx, "Hirosaka•21st Century Museum", x, x + availableWidth, availableWidth, x + availableWidth / 2, englishCenterY, stopInfoCfg.englishFontSize, `bold ${stopInfoCfg.englishFontSize}px 'M PLUS Rounded 1c', sans-serif`);
    ctx.textBaseline = 'top';

    // 「左記以外の路線は表示してありません」を描画（「広坂・」の真上）
    const legendCfg = cfg.legend;
    const stopNameStartY = startY + stopInfoCfg.marginTop;
    const otherRoutesY = stopNameStartY - legendCfg.otherRoutesMessage.marginTop - legendCfg.otherRoutesMessage.fontSize;
    ctx.fillStyle = legendCfg.otherRoutesMessage.color;
    ctx.font = `${legendCfg.otherRoutesMessage.fontSize}px 'M PLUS Rounded 1c', sans-serif`;
    // drawTextWithKerningはtextBaseline='middle'を使用するため、Y位置を調整
    const otherRoutesYMiddle = otherRoutesY + legendCfg.otherRoutesMessage.fontSize / 2;
    this.drawTextWithKerning(ctx, "左記以外の路線は表示してありません", x, otherRoutesYMiddle, legendCfg.otherRoutesMessage.fontSize, legendCfg.textKerning || 0);

    ctx.restore();
  }

  drawStopNameLine(ctx, text, startX, endX, areaWidth, centerX, centerY, fontSize) {
    this.drawStopNameLineWithFont(ctx, text, startX, endX, areaWidth, centerX, centerY, fontSize, `bold ${fontSize}px 'Noto Sans JP', sans-serif`);
  }

  drawStopNameLineWithFont(ctx, text, startX, endX, areaWidth, centerX, centerY, fontSize, fontString) {
    const chars = text.split('');
    if (chars.length > 0) {
      ctx.font = fontString;
      const charWidths = chars.map(char => {
        const metrics = ctx.measureText(char);
        return metrics.width;
      });
      const totalCharWidth = charWidths.reduce((sum, width) => sum + width, 0);
      
      if (totalCharWidth > areaWidth) {
        // 圧縮
        const scaleX = areaWidth / totalCharWidth;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scaleX, 1);
        ctx.translate(-centerX, -centerY);
        
        let currentX = centerX - totalCharWidth / 2;
        chars.forEach((char, index) => {
          ctx.fillText(char, currentX, centerY);
          currentX += charWidths[index];
        });
        ctx.restore();
      } else {
        // 均等割つけ
        const spacing = chars.length > 1 ? (areaWidth - totalCharWidth) / (chars.length - 1) : 0;
        const totalWidthWithSpacing = totalCharWidth + spacing * (chars.length - 1);
        const textStartX = centerX - totalWidthWithSpacing / 2;
        let currentX = textStartX;
        chars.forEach((char, index) => {
          ctx.fillText(char, currentX, centerY);
          currentX += charWidths[index] + spacing;
        });
      }
    }
  }

  drawLegendSquare(ctx, x, y, squareSize, padding, innerSize, cornerRadius, state, legendCfg) {
    const innerX = x + padding;
    const innerY = y + padding;

    ctx.save();

    // 角丸四角形を描画
    if (state.fill) {
      ctx.fillStyle = legendCfg.onFillColor || '#90ee90'; // 常時点灯の緑
    } else {
      ctx.fillStyle = '#0f0f0f'; // 背景色と同じ（エッジだけ）
    }

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

    // エッジを描画
    if (state.edge) {
      const iconColor = state.fill ? (legendCfg.onIconColor || '#888888') : '#ffffff';
      const edgeColor = state.fill ? (legendCfg.onEdgeColor || '#888888') : '#ffffff';
      ctx.strokeStyle = edgeColor;
      ctx.lineWidth = 3;
      ctx.stroke();

      // バスアイコンを描画
      const busIcon = state.fill ? this.busIconOn : this.busIconOff;
      if (busIcon) {
        const iconSize = innerSize * 0.85;
        const iconX = innerX + (innerSize - iconSize) / 2;
        const iconY = innerY + (innerSize - iconSize) / 2;
        
        ctx.save();
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = iconSize;
        tempCanvas.height = iconSize;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(busIcon, 0, 0, iconSize, iconSize);
        
        tempCtx.globalCompositeOperation = 'source-in';
        tempCtx.fillStyle = iconColor;
        tempCtx.fillRect(0, 0, iconSize, iconSize);
        
        ctx.drawImage(tempCanvas, iconX, iconY);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  drawLegendObstacleCapsule(ctx, x, y, squareSize, obstacleCapsuleCfg) {
    ctx.save();

    const widthRatio = obstacleCapsuleCfg?.widthRatio ?? 0.75;
    const heightRatio = obstacleCapsuleCfg?.heightRatio ?? 0.9;
    const capsuleWidth = squareSize * widthRatio;
    const capsuleHeight = squareSize * heightRatio;
    const radius = capsuleWidth / 2;
    const centerX = x + squareSize / 2;
    const centerY = y + squareSize / 2;
    const leftX = centerX - radius;
    const rightX = centerX + radius;
    const topY = centerY - capsuleHeight / 2;
    const bottomY = centerY + capsuleHeight / 2;
    const topCircleCenterY = topY + radius;
    const bottomCircleCenterY = bottomY - radius;

    // 赤いカプセルを描画（発光状態）
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(centerX, topCircleCenterY, radius, Math.PI, 0, false);
    ctx.lineTo(rightX, bottomCircleCenterY);
    ctx.arc(centerX, bottomCircleCenterY, radius, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  render(displayData, ledStates, approachStates, obstacleStates, approachFarBlink) {
    this.clear();
    // 最初のルートの接近(遠)の点滅設定をヘッダーに渡す（点滅させず、点灯状態だけ表示）
    const headerApproachFarBlinkEnabled = approachFarBlink && approachFarBlink.length > 0 ? approachFarBlink[0] : false;
    this.drawHeader(displayData.header, headerApproachFarBlinkEnabled);
    this.drawSidePanel(displayData.stopInfo);

    const rowCfg = this.layout.row;
    const headerHeight = this.layout.header.height;
    const horizontalGap = rowCfg.horizontalGap || 0;
    const mainAreaWidth = this.canvas.width - this.layout.sidePanel.width;

    // 短冊間の隙間の背景色を描画
    const ctx = this.ctx;
    ctx.save();
    const gapBgColor = rowCfg.gapBackgroundColor !== null && rowCfg.gapBackgroundColor !== undefined
      ? rowCfg.gapBackgroundColor
      : this.layout.canvas.backgroundColor;
    ctx.fillStyle = gapBgColor;
    
    // ヘッダーと最初の短冊の間のgap
    const firstGapY = headerHeight;
    ctx.fillRect(0, firstGapY, mainAreaWidth, rowCfg.gap);
    
    // 短冊間のgap
    displayData.routes.forEach((route, index) => {
      if (index > 0) {
        // 前の行の下端から現在の行の上端までの隙間を描画
        const gapY = headerHeight + rowCfg.gap + (index - 1) * rowCfg.height + (index - 1) * rowCfg.gap + rowCfg.height;
        ctx.fillRect(0, gapY, mainAreaWidth, rowCfg.gap);
      }
    });
    
    // 最後の短冊の後のgapは描画しない（無地の短冊っぽい図形が表示されないように）
    
    // 短冊エリアの左右のgap
    const routesAreaStartY = headerHeight + rowCfg.gap;
    const routesAreaHeight = displayData.routes.length * rowCfg.height + (displayData.routes.length > 0 ? (displayData.routes.length - 1) * rowCfg.gap : 0);
    // 左側のgap
    ctx.fillRect(0, routesAreaStartY, horizontalGap, routesAreaHeight);
    // 右側のgap
    ctx.fillRect(mainAreaWidth - horizontalGap, routesAreaStartY, horizontalGap, routesAreaHeight);
    
    // 短冊エリアの下の余白をgapBackgroundColorで塗りつぶす
    const routesAreaEndY = routesAreaStartY + routesAreaHeight;
    const remainingHeight = this.canvas.height - routesAreaEndY;
    if (remainingHeight > 0) {
      ctx.fillRect(0, routesAreaEndY, mainAreaWidth, remainingHeight);
    }
    
    ctx.restore();

    displayData.routes.forEach((route, index) => {
      this.drawRow(route, index, ledStates[index], approachStates[index], obstacleStates[index], false);
    });
  }
}
