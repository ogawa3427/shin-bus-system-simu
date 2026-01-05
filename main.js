(async function() {
  const canvas = document.getElementById('display');
  
  if (!canvas) {
    console.error('Canvas要素が見つかりません');
    return;
  }
  
  function parseNumberText(upper, lower) {
    if (!upper && !lower) return '';
    if (!upper) return lower;
    if (!lower) return upper;
    return upper + '<br>' + lower;
  }
  
  function parseDestinationText(upper, lower) {
    if (!upper && !lower) return '';
    if (!upper) return lower;
    if (!lower) return upper;
    return upper + '<br>' + lower;
  }
  
  let displayData, layoutData;
  try {
    const [dataResponse, layoutResponse] = await Promise.all([
      fetch('data.json'),
      fetch('layout.json')
    ]);
    displayData = await dataResponse.json();
    layoutData = await layoutResponse.json();
  } catch (e) {
    console.error('データの読み込みに失敗しました:', e);
    return;
  }
  
  // 新しいデータ構造から従来の構造に変換
  displayData.routes = displayData.routes.map(route => {
    const number = parseNumberText(route.numberUpper || '', route.numberLower || '');
    const destination = parseDestinationText(route.destinationUpper || '', route.destinationLower || '');
    return {
      ...route,
      number: number,
      destination: destination
    };
  });
  
  const renderer = new Renderer(canvas, layoutData);
  renderer.init(displayData.routes.length);
  // localStorageから読み込んだスケール率がある場合は適用
  if (renderer.manualScaleRatio !== null) {
    renderer.updateScale();
  } else {
    renderer.updateScale();
  }
  
  window.addEventListener('resize', () => {
    renderer.updateScale();
  });
  
  // ズームコントロール
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      renderer.adjustScale(0.1);
    });
  }
  
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      renderer.adjustScale(-0.1);
    });
  }
  
  // canvas保存ボタン
  const saveCanvasBtn = document.getElementById('save-canvas');
  if (saveCanvasBtn) {
    saveCanvasBtn.addEventListener('click', () => {
      // 日時を取得してファイル名を生成
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const filename = `hirosaka_${year}${month}${day}-${hours}${minutes}${seconds}.png`;
      
      // canvasを画像としてダウンロード
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    });
  }
  
  // ツイートボタン
  const tweetBtn = document.getElementById('tweet-btn');
  if (tweetBtn) {
    tweetBtn.addEventListener('click', () => {
      // canvasを画像として取得
      canvas.toBlob((blob) => {
        // 画像をFileReaderで読み込んでbase64に変換
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Image = reader.result;
          
          // テキストとハッシュタグを設定
          const text = '新バスシステムシミュレータ';
          const hashtags = '新バスシステム,バス,金沢';
          
          // Twitter Web Intent URLを作成
          // 画像は直接添付できないので、テキストとハッシュタグのみ
          const tweetText = encodeURIComponent(`${text}\n\n#${hashtags.split(',').join(' #')}`);
          const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
          
          // 新しいウィンドウで開く
          window.open(tweetUrl, '_blank', 'width=550,height=420');
          
          // 画像をクリップボードにコピー（ユーザーが手動で添付できるように）
          // ただし、クリップボードAPIはHTTPS環境でしか動作しない
          if (navigator.clipboard && navigator.clipboard.write) {
            blob.name = 'bus-system.png';
            navigator.clipboard.write([
              new ClipboardItem({
                'image/png': blob
              })
            ]).then(() => {
              console.log('画像をクリップボードにコピーしました');
            }).catch(() => {
              console.log('クリップボードへのコピーに失敗しました');
            });
          }
        };
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
  }
  
  const approachFarBlink = displayData.routes.map((route, index) => route.approachFarBlink !== undefined ? route.approachFarBlink : true);
  const approachNearBlink = displayData.routes.map((route, index) => route.approachNearBlink !== undefined ? route.approachNearBlink : true);
  const approachStates = displayData.routes.map((route, index) => approachFarBlink[index] ? true : false);
  const ledStates = displayData.routes.map((route, index) => approachNearBlink[index] ? false : false);
  const obstacleStates = displayData.routes.map((route, index) => route.obstacle || false);
  const ledIntervals = displayData.routes.map(() => 
    Math.random() * 800 + 500
  );
  const approachIntervals = displayData.routes.map(() => 
    Math.random() * 1000 + 600
  );
  const lastToggleTime = displayData.routes.map(() => Date.now());
  const lastApproachToggleTime = displayData.routes.map(() => Date.now());
  
  function updateLEDStates() {
    const now = Date.now();
    for (let i = 0; i < ledStates.length; i++) {
      if (approachNearBlink[i]) {
        if (now - lastToggleTime[i] >= ledIntervals[i]) {
          ledStates[i] = !ledStates[i];
          lastToggleTime[i] = now;
        }
      } else {
        ledStates[i] = false;
      }
      if (approachFarBlink[i]) {
        if (now - lastApproachToggleTime[i] >= approachIntervals[i]) {
          approachStates[i] = !approachStates[i];
          lastApproachToggleTime[i] = now;
        }
      } else {
        approachStates[i] = false;
      }
    }
  }
  
  function render() {
    renderer.render(
      displayData,
      ledStates,
      approachStates,
      obstacleStates,
      approachFarBlink
    );
  }
  
  function createEditor() {
    const editorDiv = document.getElementById('editor');
    if (!editorDiv) return;
    
    // 停留所情報の編集フォーム
    const stopInfoDiv = document.createElement('div');
    stopInfoDiv.className = 'stop-info-editor';
    stopInfoDiv.innerHTML = `
      <h3>停留所情報</h3>
      <div>
        <label>日本語一段目: <input type="text" class="stop-name-upper" value="${displayData.stopInfo?.nameUpper || ''}"></label>
        <label>日本語二段目: <input type="text" class="stop-name-lower" value="${displayData.stopInfo?.nameLower || ''}"></label>
      </div>
      <div>
        <label>乗り場番号: <input type="text" class="stop-number" value="${displayData.stopInfo?.number || ''}"></label>
        <label>乗り場名: <input type="text" class="stop-platform-name" value="${displayData.stopInfo?.platformName || ''}"></label>
      </div>
      <div>
        <label>英語: <input type="text" class="stop-english" value="${displayData.stopInfo?.english || ''}" style="width: 400px;"></label>
      </div>
    `;
    editorDiv.appendChild(stopInfoDiv);
    
    // 停留所情報のイベントリスナー
    document.querySelector('.stop-name-upper')?.addEventListener('input', (e) => {
      if (!displayData.stopInfo) displayData.stopInfo = {};
      displayData.stopInfo.nameUpper = e.target.value;
      render();
    });
    
    document.querySelector('.stop-name-lower')?.addEventListener('input', (e) => {
      if (!displayData.stopInfo) displayData.stopInfo = {};
      displayData.stopInfo.nameLower = e.target.value;
      render();
    });
    
    document.querySelector('.stop-number')?.addEventListener('input', (e) => {
      if (!displayData.stopInfo) displayData.stopInfo = {};
      displayData.stopInfo.number = e.target.value;
      render();
    });
    
    document.querySelector('.stop-platform-name')?.addEventListener('input', (e) => {
      if (!displayData.stopInfo) displayData.stopInfo = {};
      displayData.stopInfo.platformName = e.target.value;
      render();
    });
    
    document.querySelector('.stop-english')?.addEventListener('input', (e) => {
      if (!displayData.stopInfo) displayData.stopInfo = {};
      displayData.stopInfo.english = e.target.value;
      render();
    });
    
    displayData.routes.forEach((route, index) => {
      const routeDiv = document.createElement('div');
      routeDiv.className = 'route-editor';
      routeDiv.innerHTML = `
        <h3>路線 ${index + 1}</h3>
        <div>
          <label>接近(遠): <input type="checkbox" class="approach-blink" data-index="${index}" ${approachFarBlink[index] ? 'checked' : ''}></label>
          <label>接近(近): <input type="checkbox" class="led-blink" data-index="${index}" ${approachNearBlink[index] ? 'checked' : ''}></label>
          <label>障害: <input type="checkbox" class="obstacle" data-index="${index}" ${obstacleStates[index] ? 'checked' : ''}></label>
        </div>
        <div>
          <label>路線番号(上): <input type="text" class="number-upper" data-index="${index}" value="${route.numberUpper || ''}"></label>
          <label>路線番号(下): <input type="text" class="number-lower" data-index="${index}" value="${route.numberLower || ''}"></label>
        </div>
        <div>
          <label>行き先(上): <input type="text" class="destination-upper" data-index="${index}" value="${route.destinationUpper || ''}"></label>
          <label>行き先(下): <input type="text" class="destination-lower" data-index="${index}" value="${route.destinationLower || ''}"></label>
        </div>
        <div>
          <label>経由: <input type="text" class="sub-destination" data-index="${index}" value="${route.subDestination || ''}"></label>
        </div>
      `;
      editorDiv.appendChild(routeDiv);
    });
    
    // イベントリスナーを設定
    document.querySelectorAll('.approach-blink').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        approachFarBlink[index] = e.target.checked;
        displayData.routes[index].approachFarBlink = e.target.checked;
        if (!e.target.checked) {
          approachStates[index] = false;
        } else {
          // チェックを入れた時は現在時刻をリセットして点滅を再開
          lastApproachToggleTime[index] = Date.now();
        }
        render();
      });
    });
    
    document.querySelectorAll('.led-blink').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        approachNearBlink[index] = e.target.checked;
        displayData.routes[index].approachNearBlink = e.target.checked;
        if (!e.target.checked) {
          ledStates[index] = false;
        } else {
          // チェックを入れた時は現在時刻をリセットして点滅を再開
          lastToggleTime[index] = Date.now();
        }
        render();
      });
    });
    
    document.querySelectorAll('.obstacle').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        obstacleStates[index] = e.target.checked;
        displayData.routes[index].obstacle = e.target.checked;
        render();
      });
    });
    
    document.querySelectorAll('.number-upper, .number-lower').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        const upper = document.querySelector(`.number-upper[data-index="${index}"]`).value;
        const lower = document.querySelector(`.number-lower[data-index="${index}"]`).value;
        displayData.routes[index].numberUpper = upper;
        displayData.routes[index].numberLower = lower;
        displayData.routes[index].number = parseNumberText(upper, lower);
        render();
      });
    });
    
    document.querySelectorAll('.destination-upper, .destination-lower').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        const upper = document.querySelector(`.destination-upper[data-index="${index}"]`).value;
        const lower = document.querySelector(`.destination-lower[data-index="${index}"]`).value;
        displayData.routes[index].destinationUpper = upper;
        displayData.routes[index].destinationLower = lower;
        displayData.routes[index].destination = parseDestinationText(upper, lower);
        render();
      });
    });
    
    document.querySelectorAll('.sub-destination').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        displayData.routes[index].subDestination = e.target.value;
        render();
      });
    });
  }
  
  createEditor();
  
  function animate() {
    updateLEDStates();
    render();
    requestAnimationFrame(animate);
  }
  
  animate();
  
  // コンパネのカスタムリサイズハンドル
  const editor = document.getElementById('editor');
  const resizeHandle = document.getElementById('resize-handle');
  if (editor && resizeHandle) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;
    let autoExpandInterval = null;
    const threshold = 50; // 画面下端から50px以内で自動拡張開始
    const expandSpeed = 10; // 自動拡張の速度（px/フレーム）
    const scrollSpeed = 10; // 自動スクロールの速度（px/フレーム）
    
    function startAutoExpand() {
      if (autoExpandInterval) return;
      autoExpandInterval = setInterval(() => {
        // ページをスクロール
        window.scrollBy(0, scrollSpeed);
        // editorの高さを増やす
        const currentHeight = editor.offsetHeight;
        editor.style.height = `${currentHeight + expandSpeed}px`;
        // startHeightとstartYも更新してドラッグ位置を追従
        startHeight = currentHeight + expandSpeed;
        startY += expandSpeed;
      }, 16); // 約60fps
    }
    
    function stopAutoExpand() {
      if (autoExpandInterval) {
        clearInterval(autoExpandInterval);
        autoExpandInterval = null;
      }
    }
    
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startY = e.clientY;
      startHeight = editor.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const deltaY = e.clientY - startY;
      const distanceFromBottom = window.innerHeight - e.clientY;
      
      // 画面下端に近づいたら自動スクロール&拡張開始
      if (distanceFromBottom <= threshold) {
        startAutoExpand();
      } else {
        stopAutoExpand();
        const newHeight = Math.max(100, startHeight + deltaY);
        editor.style.height = `${newHeight}px`;
      }
    });
    
    document.addEventListener('mouseup', () => {
      if (isResizing) {
        isResizing = false;
        stopAutoExpand();
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }
})();
