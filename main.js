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
  renderer.init();
  renderer.updateScale();
  
  window.addEventListener('resize', () => {
    renderer.updateScale();
  });
  
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
})();
