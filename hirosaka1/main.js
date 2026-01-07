(async function() {
  const canvas = document.getElementById('display');
  
  if (!canvas) {
    console.error('Canvas要素が見つかりません');
    return;
  }
  
  function parseNumberText(upper, middle, lower) {
    // 三段対応: upper, middle, lower
    // 後方互換性のため、middleがない場合は二段表示
    // 注: スペースは空行ではない。純粋な空文字列のみ空行とみなす
    const parts = [upper, middle, lower].filter(p => p !== '' && p !== undefined && p !== null);
    if (parts.length === 0) return '';
    return parts.join('<br>');
  }
  
  function parseDestinationText(upper, lower) {
    if (!upper && !lower) return '';
    if (!upper) return lower;
    if (!lower) return upper;
    return upper + '<br>' + lower;
  }
  
  // クエリパラメータのキー定義（短縮形）
  // stopInfo: snu=nameUpper, snl=nameLower, sn=number, spn=platformName, se=english
  // routes[i]: r{i}nu, r{i}nm, r{i}nl, r{i}du, r{i}dl, r{i}sd, r{i}af, r{i}an, r{i}ob, r{i}em(empty)
  // 注: nmはnumberMiddle（三段対応で追加）。後方互換性のため、nmがない場合は従来通り二段表示
  
  // クエリパラメータから状態を読み取る
  function getStateFromQuery() {
    const params = new URLSearchParams(window.location.search);
    
    // パラメータが一つもなければnull
    if (params.toString() === '') return null;
    
    const state = {
      stopInfo: {},
      routes: []
    };
    
    // stopInfo
    if (params.has('snu')) state.stopInfo.nameUpper = params.get('snu');
    if (params.has('snl')) state.stopInfo.nameLower = params.get('snl');
    if (params.has('sn')) state.stopInfo.number = params.get('sn');
    if (params.has('spn')) state.stopInfo.platformName = params.get('spn');
    if (params.has('se')) state.stopInfo.english = params.get('se');
    
    // routes（最大20路線まで対応）
    for (let i = 0; i < 20; i++) {
      const prefix = `r${i}`;
      // このインデックスのパラメータが一つでもあるか確認（nmも追加）
      const hasAny = ['nu', 'nm', 'nl', 'du', 'dl', 'sd', 'af', 'an', 'ob', 'em'].some(k => params.has(prefix + k));
      if (!hasAny) continue;
      
      const route = {};
      if (params.has(prefix + 'nu')) route.numberUpper = params.get(prefix + 'nu');
      if (params.has(prefix + 'nm')) route.numberMiddle = params.get(prefix + 'nm');
      if (params.has(prefix + 'nl')) route.numberLower = params.get(prefix + 'nl');
      if (params.has(prefix + 'du')) route.destinationUpper = params.get(prefix + 'du');
      if (params.has(prefix + 'dl')) route.destinationLower = params.get(prefix + 'dl');
      if (params.has(prefix + 'sd')) route.subDestination = params.get(prefix + 'sd');
      // booleanはパラメータがあれば1、なければfalse（デフォルト）
      route.approachFarBlink = params.get(prefix + 'af') === '1';
      route.approachNearBlink = params.get(prefix + 'an') === '1';
      route.obstacle = params.get(prefix + 'ob') === '1';
      route.empty = params.get(prefix + 'em') === '1';
      
      // インデックス位置に配置
      state.routes[i] = route;
    }
    
    return state;
  }
  
  // シェア用URLを生成
  function generateShareUrl(data) {
    const baseUrl = window.location.href.split('?')[0].split('#')[0];
    const params = new URLSearchParams();
    
    // undefinedでなければセット（空文字列もセットする）
    const setIfDefined = (key, value) => {
      if (value !== undefined) params.set(key, value);
    };
    
    // stopInfo
    if (data.stopInfo) {
      setIfDefined('snu', data.stopInfo.nameUpper);
      setIfDefined('snl', data.stopInfo.nameLower);
      setIfDefined('sn', data.stopInfo.number);
      setIfDefined('spn', data.stopInfo.platformName);
      setIfDefined('se', data.stopInfo.english);
    }
    
    // routes
    if (data.routes) {
      data.routes.forEach((route, i) => {
        const prefix = `r${i}`;
        setIfDefined(prefix + 'nu', route.numberUpper);
        setIfDefined(prefix + 'nm', route.numberMiddle);
        setIfDefined(prefix + 'nl', route.numberLower);
        setIfDefined(prefix + 'du', route.destinationUpper);
        setIfDefined(prefix + 'dl', route.destinationLower);
        setIfDefined(prefix + 'sd', route.subDestination);
        // booleanはtrueの時だけセット（デフォルトfalse扱い）
        if (route.approachFarBlink) params.set(prefix + 'af', '1');
        if (route.approachNearBlink) params.set(prefix + 'an', '1');
        if (route.obstacle) params.set(prefix + 'ob', '1');
        if (route.empty) params.set(prefix + 'em', '1');
      });
    }
    
    return `${baseUrl}?${params.toString()}`;
  }
  
  // 値がundefinedならwarn出して初期値を返す
  function getValueOrDefault(value, defaultValue, fieldName) {
    if (value === undefined) {
      console.warn(`"${fieldName}" がundefinedのため初期値を使用: ${defaultValue}`);
      return defaultValue;
    }
    return value;
  }
  
  // クエリパラメータの状態を初期データにマージ
  function mergeQueryState(defaultData, queryState) {
    if (!queryState) return defaultData;
    
    const merged = JSON.parse(JSON.stringify(defaultData));
    
    // stopInfoのマージ
    if (queryState.stopInfo) {
      merged.stopInfo = merged.stopInfo || {};
      merged.stopInfo.nameUpper = getValueOrDefault(queryState.stopInfo.nameUpper, merged.stopInfo.nameUpper || '', 'stopInfo.nameUpper');
      merged.stopInfo.nameLower = getValueOrDefault(queryState.stopInfo.nameLower, merged.stopInfo.nameLower || '', 'stopInfo.nameLower');
      merged.stopInfo.number = getValueOrDefault(queryState.stopInfo.number, merged.stopInfo.number || '', 'stopInfo.number');
      merged.stopInfo.platformName = getValueOrDefault(queryState.stopInfo.platformName, merged.stopInfo.platformName || '', 'stopInfo.platformName');
      merged.stopInfo.english = getValueOrDefault(queryState.stopInfo.english, merged.stopInfo.english || '', 'stopInfo.english');
    }
    
    // routesのマージ
    if (queryState.routes && Array.isArray(queryState.routes)) {
      queryState.routes.forEach((qRoute, i) => {
        if (i < merged.routes.length) {
          const defaultRoute = merged.routes[i];
          merged.routes[i].numberUpper = getValueOrDefault(qRoute.numberUpper, defaultRoute.numberUpper || '', `routes[${i}].numberUpper`);
          merged.routes[i].numberMiddle = getValueOrDefault(qRoute.numberMiddle, defaultRoute.numberMiddle || '', `routes[${i}].numberMiddle`);
          merged.routes[i].numberLower = getValueOrDefault(qRoute.numberLower, defaultRoute.numberLower || '', `routes[${i}].numberLower`);
          merged.routes[i].destinationUpper = getValueOrDefault(qRoute.destinationUpper, defaultRoute.destinationUpper || '', `routes[${i}].destinationUpper`);
          merged.routes[i].destinationLower = getValueOrDefault(qRoute.destinationLower, defaultRoute.destinationLower || '', `routes[${i}].destinationLower`);
          merged.routes[i].subDestination = getValueOrDefault(qRoute.subDestination, defaultRoute.subDestination || '', `routes[${i}].subDestination`);
          merged.routes[i].approachFarBlink = getValueOrDefault(qRoute.approachFarBlink, defaultRoute.approachFarBlink ?? true, `routes[${i}].approachFarBlink`);
          merged.routes[i].approachNearBlink = getValueOrDefault(qRoute.approachNearBlink, defaultRoute.approachNearBlink ?? false, `routes[${i}].approachNearBlink`);
          merged.routes[i].obstacle = getValueOrDefault(qRoute.obstacle, defaultRoute.obstacle ?? false, `routes[${i}].obstacle`);
          merged.routes[i].empty = getValueOrDefault(qRoute.empty, defaultRoute.empty ?? false, `routes[${i}].empty`);
        }
      });
    }
    
    return merged;
  }
  
  let displayData, layoutData;
  try {
    const [dataResponse, layoutResponse] = await Promise.all([
      fetch('data.json'),
      fetch('layout.json')
    ]);
    const defaultData = await dataResponse.json();
    layoutData = await layoutResponse.json();
    
    // クエリパラメータから状態を読み込み、マージ
    const queryState = getStateFromQuery();
    displayData = mergeQueryState(defaultData, queryState);
  } catch (e) {
    console.error('データの読み込みに失敗しました:', e);
    return;
  }
  
  // 新しいデータ構造から従来の構造に変換
  displayData.routes = displayData.routes.map(route => {
    const number = parseNumberText(route.numberUpper || '', route.numberMiddle || '', route.numberLower || '');
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
      // テキストとハッシュタグを設定
      const text = '#新バスシステムシミュレータ 広坂１で遊んでいます！';
      const hashtags = 'ありがとう新バスシステム';
      
      // シェアURL生成（現在の編集状態を含む）
      const shareUrl = generateShareUrl(displayData);
      
      // Twitter Web Intent URLを作成
      const tweetText = encodeURIComponent(`${text}\n\n#${hashtags.split(',').join(' #')}`);
      const tweetUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${tweetText}`;
      
      // 新しいウィンドウで開く
      window.open(tweetUrl, '_blank', 'width=550,height=420');
    });
  }
  
  // シェアURLコピーボタン
  const copyUrlBtn = document.getElementById('copy-url-btn');
  if (copyUrlBtn) {
    copyUrlBtn.addEventListener('click', async () => {
      const shareUrl = generateShareUrl(displayData);
      try {
        await navigator.clipboard.writeText(shareUrl);
        // ボタンのテキストを一時的に変更
        const originalText = copyUrlBtn.textContent;
        copyUrlBtn.textContent = 'コピー完了';
        setTimeout(() => {
          copyUrlBtn.textContent = originalText;
        }, 1500);
      } catch (e) {
        console.error('クリップボードへのコピーに失敗:', e);
        // フォールバック: プロンプトで表示
        prompt('シェアURL:', shareUrl);
      }
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
      routeDiv.dataset.index = index;
      const isEmpty = route.empty || false;
      routeDiv.innerHTML = `
        <h3>路線 ${index + 1} <label style="margin-left: 16px; font-weight: normal; font-size: 14px;">空きコマ: <input type="checkbox" class="empty-slot" data-index="${index}" ${isEmpty ? 'checked' : ''}></label></h3>
        <div class="route-fields" ${isEmpty ? 'style="opacity: 0.5; pointer-events: none;"' : ''}>
          <div>
            <label>接近(遠): <input type="checkbox" class="approach-blink" data-index="${index}" ${approachFarBlink[index] ? 'checked' : ''} ${isEmpty ? 'disabled' : ''}></label>
            <label>接近(近): <input type="checkbox" class="led-blink" data-index="${index}" ${approachNearBlink[index] ? 'checked' : ''} ${isEmpty ? 'disabled' : ''}></label>
            <label>障害: <input type="checkbox" class="obstacle" data-index="${index}" ${obstacleStates[index] ? 'checked' : ''} ${isEmpty ? 'disabled' : ''}></label>
          </div>
          <div>
            <label>路線番号(上): <input type="text" class="number-upper" data-index="${index}" value="${route.numberUpper || ''}" ${isEmpty ? 'disabled' : ''}></label>
            <label>路線番号(中): <input type="text" class="number-middle" data-index="${index}" value="${route.numberMiddle || ''}" ${isEmpty ? 'disabled' : ''}></label>
            <label>路線番号(下): <input type="text" class="number-lower" data-index="${index}" value="${route.numberLower || ''}" ${isEmpty ? 'disabled' : ''}></label>
          </div>
          <div>
            <label>行き先(上): <input type="text" class="destination-upper" data-index="${index}" value="${route.destinationUpper || ''}" ${isEmpty ? 'disabled' : ''}></label>
            <label>行き先(下): <input type="text" class="destination-lower" data-index="${index}" value="${route.destinationLower || ''}" ${isEmpty ? 'disabled' : ''}></label>
          </div>
          <div>
            <label>経由: <input type="text" class="sub-destination" data-index="${index}" value="${route.subDestination || ''}" ${isEmpty ? 'disabled' : ''}></label>
          </div>
        </div>
      `;
      editorDiv.appendChild(routeDiv);
    });
    
    // イベントリスナーを設定
    
    // 空きコマチェックボックス
    document.querySelectorAll('.empty-slot').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        const isEmpty = e.target.checked;
        displayData.routes[index].empty = isEmpty;
        
        // 該当路線の入力欄をグレーアウト/有効化
        const routeDiv = document.querySelector(`.route-editor[data-index="${index}"]`);
        const fieldsDiv = routeDiv.querySelector('.route-fields');
        if (fieldsDiv) {
          fieldsDiv.style.opacity = isEmpty ? '0.5' : '1';
          fieldsDiv.style.pointerEvents = isEmpty ? 'none' : 'auto';
          fieldsDiv.querySelectorAll('input').forEach(input => {
            input.disabled = isEmpty;
          });
        }
        
        render();
      });
    });
    
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
    
    document.querySelectorAll('.number-upper, .number-middle, .number-lower').forEach(input => {
      input.addEventListener('input', (e) => {
        const index = parseInt(e.target.dataset.index);
        const upper = document.querySelector(`.number-upper[data-index="${index}"]`).value;
        const middle = document.querySelector(`.number-middle[data-index="${index}"]`).value;
        const lower = document.querySelector(`.number-lower[data-index="${index}"]`).value;
        displayData.routes[index].numberUpper = upper;
        displayData.routes[index].numberMiddle = middle;
        displayData.routes[index].numberLower = lower;
        displayData.routes[index].number = parseNumberText(upper, middle, lower);
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
