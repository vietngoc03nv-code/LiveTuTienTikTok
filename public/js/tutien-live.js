// ============================================================================
// CLIENT TƯƠNG TÁC TU TIÊN TIKTOK LIVE (WEBSOCKET & UI LOGIC)
// ============================================================================

(function () {
  let ws = null;
  let particles = null;
  let audio = null;
  let state = null;
  let modalTimer = null;
  const processedEventIds = new Set();

  function init() {
    particles = new window.TuTienParticleEngine();
    audio = new window.TuTienAudioEngine();

    setupWebSocket();
    setupCanvasInteractivity();
  }

  function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[TuTiên Live] WebSocket đã kết nối!');
      updateLiveBadge(true);
    };

    ws.onclose = () => {
      console.warn('[TuTiên Live] WebSocket ngắt kết nối, thử lại sau 3s...');
      updateLiveBadge(false);
      setTimeout(setupWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error('[TuTiên Live] Lỗi WebSocket:', err);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleWsMessage(msg);
      } catch (err) {
        console.warn('[TuTiên Live] JSON Parse error:', err);
      }
    };
  }

  function handleWsMessage(msg) {
    if (!msg) return;

    if (msg.method === 'tutien.state') {
      state = msg.params;
      renderAll(state);
    } else if (msg.method === 'tutien.viewerCount') {
      updateViewerCount(msg.params.viewerCount);
    } else if (msg.method === 'tutien.event') {
      const { event, state: newState } = msg.params || {};
      if (newState) {
        state = newState;
        renderAll(state);
      }
      if (event) {
        handleIncomingEvent(event);
      }
    } else if (msg.method === 'tts.play') {
      if (audio && msg.params?.text) {
        audio.speak(msg.params.text);
      }
    }
  }

  // Xử lý sự kiện nhận từ server
  function handleIncomingEvent(evt) {
    if (!evt || !evt.id) return;
    if (processedEventIds.has(evt.id)) return;
    processedEventIds.add(evt.id);
    if (processedEventIds.size > 200) {
      const first = processedEventIds.values().next().value;
      processedEventIds.delete(first);
    }

    // 1. Thả tim hấp thu linh khí
    if (evt.type === 'absorbQi') {
      audio.playQiChime();
      particles.burstQi(undefined, undefined, Math.min(25, evt.count * 2), '#38ef7d');
      particles.showFloatingText(`+${evt.expGain} Linh Khí`, undefined, undefined, '#38ef7d');
    }

    // 2. Ngồi thiền tu luyện
    else if (evt.type === 'meditate') {
      audio.playZenGong();
      particles.burstQi(undefined, undefined, 35, '#f6c85f');
      particles.showFloatingText(`+${evt.expGain} Tu Vi`, undefined, undefined, '#f6c85f');
      if (evt.ttsText && audio) audio.speak(evt.ttsText);
    }

    // 3. Đột phá / Vượt lôi kiếp
    else if (evt.type === 'breakthrough') {
      triggerLightningAnimation();
      audio.playThunder();

      if (evt.success) {
        setTimeout(() => {
          audio.playBreakthroughSound();
          particles.burstQi(undefined, undefined, 60, '#ffd700');
          showCelestialModal('⚡ ĐỘT PHÁ THÀNH CÔNG! ⚡', `Đạo hữu ${evt.user} đã phá cảnh giới, đắc đạo thăng cấp ${evt.realm}!`, '🌟');
        }, 400);
      } else {
        setTimeout(() => {
          showCelestialModal('⚡ ĐỘT PHÁ THẤT BẠI ⚡', `Đạo hữu ${evt.user} bị tâm ma quấy nhiễu tại ${evt.nextRealm}. Hãy tiếp tục tích lũy!`, '⛈️');
        }, 400);
      }

      if (evt.ttsText && audio) audio.speak(evt.ttsText);
    } else if (evt.type === 'breakthroughPending') {
      particles.showFloatingText(`Còn thiếu ${evt.remaining} Tu Vi!`, undefined, undefined, '#f87171');
      if (evt.ttsText && audio) audio.speak(evt.ttsText);
    }

    // 4. Săn boss yêu thú
    else if (evt.type === 'attackBoss') {
      audio.playSwordSlash();
      particles.triggerSwordSlash();
      particles.showFloatingText(`-${evt.damage} HP`, undefined, undefined, '#ff4757');

      if (evt.bossDefeated) {
        audio.playThunder();
        showCelestialModal('🐉 TRẢM YÊU ĐOẠT BẢO! 🐉', `Đạo hữu ${evt.user} đã hạ gục Boss, thiên địa chấn động, nhận 1500 Tu Vi!`, '⚔️');
      }

      if (evt.ttsText && audio) audio.speak(evt.ttsText);
    }

    // 5. Tặng quà / Tiên Dược
    else if (evt.type === 'offerGift' || evt.type === 'grandCelestialOffering') {
      audio.playBreakthroughSound();
      particles.burstQi(undefined, undefined, 50, '#c084fc');
      particles.showFloatingText(`+${evt.expGain} Tu Vi Bảo Dược`, undefined, undefined, '#c084fc');

      if (evt.type === 'grandCelestialOffering') {
        showCelestialModal('💎 ĐẠI LỄ TIÊN GIA 💎', `Đạo hữu ${evt.user} dâng tặng ${evt.giftName}! Tăng vọt ${evt.expGain} Tu Vi!`, '✨');
      }

      if (evt.ttsText && audio) audio.speak(evt.ttsText);
    }

    // 6. Bình luận thông thường
    else if (evt.type === 'viewerChat') {
      if (evt.ttsText && audio) {
        audio.speak(evt.ttsText);
      }
    }
  }

  // Kích hoạt chớp sáng lôi đình
  function triggerLightningAnimation() {
    const flash = document.getElementById('lightningFlash');
    if (flash) {
      flash.classList.remove('flash-active');
      void flash.offsetWidth; // trigger reflow
      flash.classList.add('flash-active');
    }
    if (particles) {
      particles.triggerLightning();
      setTimeout(() => particles.triggerLightning(), 150);
    }
  }

  // Hiển thị thông báo bách bảo / đột phá
  function showCelestialModal(title, desc, icon = '✨') {
    const modal = document.getElementById('celestialModal');
    if (!modal) return;

    document.getElementById('modalIcon').textContent = icon;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalDesc').textContent = desc;

    modal.classList.add('active');
    clearTimeout(modalTimer);
    modalTimer = setTimeout(() => {
      modal.classList.remove('active');
    }, 4500);
  }

  // Cập nhật toàn bộ UI từ state
  function renderAll(s) {
    if (!s) return;

    // 1. TikTok Live info
    if (s.tiktok) {
      updateLiveBadge(s.tiktok.connected, s.tiktok.username);
      updateViewerCount(s.tiktok.viewerCount || 0);
    }

    // 2. Boss
    if (s.boss) {
      const bossImg = document.getElementById('bossAvatarImg');
      if (bossImg && s.boss.image) {
        bossImg.src = s.boss.image;
      }
      const oldAvatar = document.getElementById('bossAvatar');
      if (oldAvatar) oldAvatar.textContent = s.boss.avatar || '🦊';

      document.getElementById('bossName').textContent = s.boss.name || 'Yêu Thú';
      document.getElementById('bossDefeatedCount').textContent = `Đã trảm: ${s.boss.defeatedCount || 0}`;

      const maxHp = s.boss.maxHp || 5000;
      const curHp = Math.max(0, s.boss.hp || 0);
      const pct = Math.min(100, Math.max(0, (curHp / maxHp) * 100));

      const fill = document.getElementById('bossBarFill');
      if (fill) fill.style.width = `${pct}%`;

      const txt = document.getElementById('bossBarText');
      if (txt) txt.textContent = `${curHp.toLocaleString()} / ${maxHp.toLocaleString()} HP (${pct.toFixed(1)}%)`;
    }

    // 3. Cultivator Realm (Dựa trên top 1 hoặc trạng thái chung)
    const topLeader = (s.leaderboard && s.leaderboard.length > 0) ? s.leaderboard[0] : null;
    const currentRealm = topLeader ? topLeader.realm : 'Phàm Nhân';
    const currentName = topLeader ? topLeader.name : 'Vô Danh Tu Sĩ';

    const realmBadge = document.getElementById('currentRealmText');
    if (realmBadge) realmBadge.textContent = currentRealm;

    const realmQuote = document.getElementById('currentRealmQuote');
    if (realmQuote) {
      realmQuote.textContent = topLeader ? `Đạo tông quy tụ: ${currentName}` : 'Hấp thu thiên địa linh khí để đắc đạo';
    }

    // 4. Metrics
    const qiVal = document.getElementById('metricTotalQi');
    if (qiVal) qiVal.textContent = (s.totalQi || 0).toLocaleString();

    const prayVal = document.getElementById('metricTotalPrayers');
    if (prayVal) prayVal.textContent = (s.totalPrayers || 0).toLocaleString();

    const breakVal = document.getElementById('metricTotalBreakthroughs');
    if (breakVal) breakVal.textContent = (s.totalBreakthroughs || 0).toLocaleString();

    // 5. Leaderboard (Thiên Kiêu Bảng)
    renderLeaderboard(s.leaderboard || []);

    // 6. Truyền Âm Động Phủ (Recent Events)
    renderEventFeed(s.recentEvents || []);
  }

  function updateLiveBadge(connected, username) {
    const pill = document.getElementById('liveStatusPill');
    const text = document.getElementById('liveStatusText');
    if (!pill || !text) return;

    if (connected) {
      pill.style.borderColor = 'rgba(56, 239, 125, 0.5)';
      pill.style.background = 'rgba(56, 239, 125, 0.2)';
      text.style.color = '#38ef7d';
      text.textContent = username ? `@${username} TRỰC TIẾP` : 'KẾT NỐI LIVE';
    } else {
      pill.style.borderColor = 'rgba(239, 68, 68, 0.5)';
      pill.style.background = 'rgba(239, 68, 68, 0.2)';
      text.style.color = '#ff6b6b';
      text.textContent = 'CHỜ LIVE';
    }
  }

  function updateViewerCount(count) {
    const val = document.getElementById('viewerCountVal');
    if (val) val.textContent = Number(count || 0).toLocaleString();
  }

  function renderLeaderboard(list) {
    const container = document.getElementById('leaderboardList');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `<div style="font-size:11px; color:#64748b; padding:10px; text-align:center;">Chưa có đạo hữu nào ghi danh</div>`;
      return;
    }

    let html = '';
    const topList = list.slice(0, 5);
    topList.forEach((c) => {
      const rankClass = c.rank <= 3 ? `rank-${c.rank}` : '';
      const crown = c.rank === 1 ? '👑 ' : (c.rank === 2 ? '🥈 ' : (c.rank === 3 ? '🥉 ' : ''));
      html += `
        <div class="leader-item ${rankClass}">
          <div class="leader-user">
            <span class="leader-rank">${crown}#${c.rank}</span>
            <span class="leader-name" title="${c.name}">${c.name}</span>
          </div>
          <span class="leader-exp">${(c.exp || 0).toLocaleString()} <span style="font-size:9px; color:#94a3b8;">${c.realm.split(' ')[0]}</span></span>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  function renderEventFeed(events) {
    const container = document.getElementById('eventsList');
    if (!container) return;

    if (!events || events.length === 0) {
      container.innerHTML = `<div style="font-size:11px; color:#64748b; padding:10px; text-align:center;">Linh khí yên ả, chưa có truyền âm</div>`;
      return;
    }

    let html = '';
    const slice = events.slice(0, 4);
    slice.forEach((e) => {
      let icon = '💬';
      let typeClass = '';
      let desc = e.comment || '';

      if (e.type === 'absorbQi') {
        icon = '✨';
        desc = `Hấp thu ${e.expGain} Linh Khí`;
      } else if (e.type === 'meditate') {
        icon = '🧘';
        desc = `Nhập định tu luyện (+${e.expGain} Tu Vi)`;
      } else if (e.type === 'breakthrough') {
        icon = '⚡';
        typeClass = 'breakthrough';
        desc = e.success ? `Đột phá thành công ${e.realm}!` : `Độ kiếp chưa thành (${e.nextRealm})`;
      } else if (e.type === 'attackBoss') {
        icon = '⚔️';
        typeClass = 'attackBoss';
        desc = `Chém boss gây -${e.damage} sát thương`;
      } else if (e.type === 'offerGift' || e.type === 'grandCelestialOffering') {
        icon = '🎁';
        typeClass = 'gift';
        desc = `Dâng tặng ${e.giftName} (+${e.expGain} Tu Vi)`;
      }

      html += `
        <div class="event-item ${typeClass}">
          <div class="event-header">
            <span>${icon} ${e.user || 'Đạo Hữu'}</span>
            <span style="font-size:9px; color:#94a3b8;">${e.realm || ''}</span>
          </div>
          <div class="event-content">${desc}</div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  // Tương tác trực tiếp trên màn hình: click vào đài sen hoặc boss để test
  function setupCanvasInteractivity() {
    const shrine = document.getElementById('cultivationShrine');
    if (shrine) {
      shrine.addEventListener('click', (e) => {
        // Gửi lệnh thiền test
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tutien.meditate',
            params: { user: 'Streamer Đạo Trưởng' },
            id: Date.now()
          }));
        }
      });
    }

    const bossBanner = document.getElementById('bossBanner');
    if (bossBanner) {
      bossBanner.addEventListener('click', (e) => {
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            method: 'tutien.attackBoss',
            params: { user: 'Streamer Đạo Trưởng' },
            id: Date.now()
          }));
        }
      });
    }
  }

  window.addEventListener('DOMContentLoaded', init);
})();
