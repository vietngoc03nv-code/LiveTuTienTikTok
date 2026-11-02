const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const { TikTokLiveConnection, WebcastEvent, ControlEvent, SignConfig } = require('tiktok-live-connector');

// Đọc file .env thủ công đơn giản & an toàn
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        process.env[key] = val.trim();
      }
    }
  }
}
loadEnv();

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'data');
const TTS_CACHE_DIR = path.join(DATA_DIR, 'tts-cache');
const STATE_FILE = path.join(DATA_DIR, 'tuvi-state.json');

fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

// ============================================================================
// 1. HỆ THỐNG CẢNH GIỚI TU TIÊN (CULTIVATION REALMS SYSTEM)
// ============================================================================
const REALMS = [
  { level: 0,  name: 'Phàm Nhân',                minExp: 0,        breakChance: 1.0,  title: 'Phàm Cốt Chưa Thức Tỉnh' },
  { level: 1,  name: 'Luyện Khí Tầng 1',         minExp: 100,      breakChance: 0.95, title: 'Linh Khí Nhập Thể' },
  { level: 2,  name: 'Luyện Khí Tầng 2',         minExp: 300,      breakChance: 0.92, title: 'Khai Thông Kinh Mạch' },
  { level: 3,  name: 'Luyện Khí Tầng 3',         minExp: 600,      breakChance: 0.90, title: 'Khí Hải Dần Mở' },
  { level: 4,  name: 'Luyện Khí Tầng 4',         minExp: 1000,     breakChance: 0.88, title: 'Luyện Cốt Hoàn Mỹ' },
  { level: 5,  name: 'Luyện Khí Tầng 5',         minExp: 1600,     breakChance: 0.85, title: 'Ngự Kiếm Sơ Thành' },
  { level: 6,  name: 'Luyện Khí Tầng 6',         minExp: 2400,     breakChance: 0.82, title: 'Chân Hỏa Xuất Thế' },
  { level: 7,  name: 'Luyện Khí Tầng 7',         minExp: 3400,     breakChance: 0.80, title: 'Bách Mạch Câu Thông' },
  { level: 8,  name: 'Luyện Khí Tầng 8',         minExp: 4800,     breakChance: 0.78, title: 'Thiên Địa Cảm Ứng' },
  { level: 9,  name: 'Luyện Khí Đại Viên Mãn',   minExp: 6600,     breakChance: 0.75, title: 'Chờ Đợi Trúc Cơ' },
  { level: 10, name: 'Trúc Cơ Sơ Kỳ',            minExp: 10000,    breakChance: 0.70, title: 'Đúc Thành Đạo Cơ' },
  { level: 11, name: 'Trúc Cơ Trung Kỳ',         minExp: 15000,    breakChance: 0.68, title: 'Thọ Mệnh Ba Trăm Năm' },
  { level: 12, name: 'Trúc Cơ Hậu Kỳ',           minExp: 22000,    breakChance: 0.65, title: 'Linh Áp Bàng Bạc' },
  { level: 13, name: 'Trúc Cơ Đại Viên Mãn',     minExp: 32000,    breakChance: 0.60, title: 'Chuẩn Bị Kết Đan' },
  { level: 14, name: 'Kim Đan Sơ Kỳ',            minExp: 48000,    breakChance: 0.55, title: 'Kim Đan Bất Hủ' },
  { level: 15, name: 'Kim Đan Trung Kỳ',         minExp: 70000,    breakChance: 0.52, title: 'Đan Khí Xung Thiên' },
  { level: 16, name: 'Kim Đan Hậu Kỳ',           minExp: 100000,   breakChance: 0.50, title: 'Ngưng Tụ Chân Đan' },
  { level: 17, name: 'Cửu Chuyển Kim Đan',       minExp: 140000,   breakChance: 0.45, title: 'Phá Đan Hóa Anh' },
  { level: 18, name: 'Nguyên Anh Sơ Kỳ',         minExp: 200000,   breakChance: 0.40, title: 'Nguyên Thần Xuất Khiếu' },
  { level: 19, name: 'Nguyên Anh Hậu Kỳ',        minExp: 300000,   breakChance: 0.38, title: 'Thần Thông Quảng Đại' },
  { level: 20, name: 'Hóa Thần Đại Năng',        minExp: 450000,   breakChance: 0.35, title: 'Dung Nhập Thiên Địa' },
  { level: 21, name: 'Luyện Hư Chân Nhân',       minExp: 700000,   breakChance: 0.30, title: 'Phá Toái Hư Không' },
  { level: 22, name: 'Hợp Thể Tiên Tôn',         minExp: 1100000,  breakChance: 0.28, title: 'Đồng Thọ Cùng Trời Đất' },
  { level: 23, name: 'Đại Thừa Thánh Giả',       minExp: 1800000,  breakChance: 0.25, title: 'Chân Tiên Hạ Giới' },
  { level: 24, name: 'Cửu Trọng Lôi Kiếp',       minExp: 3000000,  breakChance: 0.20, title: 'Độ Kiếp Phi Thăng' },
  { level: 25, name: 'Chân Tiên Giáng Thế',      minExp: 5000000,  breakChance: 0.00, title: 'Bất Tử Bất Diệt' }
];

function getRealmByExp(exp) {
  let matched = REALMS[0];
  for (const r of REALMS) {
    if (exp >= r.minExp) {
      matched = r;
    } else {
      break;
    }
  }
  return matched;
}

function getNextRealm(currentLevel) {
  return REALMS.find(r => r.level === currentLevel + 1) || null;
}

// ============================================================================
// 2. YÊU THÚ THẾ GIỚI (WORLD BOSS SYSTEM)
// ============================================================================
const BOSS_ROSTER = [
  { id: 'fox',    name: 'Cửu Vĩ Hỏa Hồ',      maxHp: 5000,   avatar: '🦊', desc: 'Hồ yêu ngàn năm nơi U Minh cốc' },
  { id: 'snake',  name: 'Thôn Thiên Cự Mãng',  maxHp: 15000,  avatar: '🐍', desc: 'Mãng xà khổng lồ nuốt chửng linh mạch' },
  { id: 'dragon', name: 'Hắc Ám Ma Long',     maxHp: 40000,  avatar: '🐉', desc: 'Ác long thức tỉnh từ thời Thái Cổ' },
  { id: 'qilin',  name: 'Huyết Kỳ Lân',       maxHp: 100000, avatar: '🦁', desc: 'Thần thú đọa ma gây họa nhân gian' }
];

// ============================================================================
// 3. PERSISTENT STATE MANAGEMENT
// ============================================================================
const DEFAULT_STATE = {
  totalQi: 0,
  totalPrayers: 0,
  totalBreakthroughs: 0,
  boss: {
    rosterIndex: 0,
    name: BOSS_ROSTER[0].name,
    maxHp: BOSS_ROSTER[0].maxHp,
    hp: BOSS_ROSTER[0].maxHp,
    avatar: BOSS_ROSTER[0].avatar,
    defeatedCount: 0
  },
  cultivators: {},
  recentEvents: [],
  settings: {
    ttsEnabled: true,
    ttsVoice: 'google',
    ttsVolume: 1.0,
    bgMusicEnabled: true,
    sfxEnabled: true,
    autoSim: false,
    autoSimIntervalMs: 8500,
    signApiKey: process.env.SIGN_API_KEY || 'euler_NWE2ODQ0NDdiNWQ3NGI0OTRhNDVkMTViYzRjMjIxZjAzYTQxYWIyMDUyODkxZDQ3ZDdjNDQw'
  },
  tiktok: {
    connected: false,
    connecting: false,
    username: process.env.TIKTOK_USER || 'ngoc03nv',
    roomId: null,
    viewerCount: 0,
    lastError: null
  }
};

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      return {
        ...DEFAULT_STATE,
        ...saved,
        boss: { ...DEFAULT_STATE.boss, ...(saved.boss || {}) },
        cultivators: saved.cultivators || {},
        settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
        tiktok: { ...DEFAULT_STATE.tiktok, ...(saved.tiktok || {}) }
      };
    }
  } catch (e) {
    console.warn('[State] Không đọc được tuvi-state.json, dùng mặc định:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

let state = loadState();

// Tự động khởi tạo SignConfig key
const initialApiKey = (state.settings?.signApiKey || process.env.SIGN_API_KEY || '').trim();
if (initialApiKey) {
  SignConfig.apiKey = initialApiKey;
  console.log(`[EulerStream] Đã nạp API Key xác thực: ${initialApiKey.slice(0, 12)}...`);
}

let saveTimer = null;
function saveState() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    } catch (e) {
      console.error('[State Save Error]', e.message);
    }
  }, 400);
}

function sanitizeUserName(name) {
  if (!name) return 'Vô Danh Đạo Hữu';
  return String(name).replace(/[<>]/g, '').slice(0, 32).trim() || 'Vô Danh Đạo Hữu';
}

function recordCultivator(user, uniqueId, avatar, expDelta, bossDmg = 0, lastAction = '') {
  const displayName = sanitizeUserName(user || uniqueId);
  const key = (uniqueId || displayName).toLowerCase().replace(/\s+/g, '').slice(0, 40);

  if (!state.cultivators[key]) {
    state.cultivators[key] = {
      name: displayName,
      uniqueId: uniqueId || key,
      avatar: avatar || '',
      exp: 0,
      level: 0,
      realm: REALMS[0].name,
      bossDamage: 0,
      lastAction: ''
    };
  }

  const cult = state.cultivators[key];
  cult.name = displayName;
  if (avatar) cult.avatar = avatar;
  cult.exp += expDelta;
  cult.bossDamage += bossDmg;
  if (lastAction) cult.lastAction = lastAction;

  // Cập nhật cảnh giới dựa trên Exp
  const r = getRealmByExp(cult.exp);
  cult.level = r.level;
  cult.realm = r.name;

  state.totalQi += expDelta;
  return cult;
}

function pushEventLog(evt) {
  const entry = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...evt
  };
  state.recentEvents.unshift(entry);
  if (state.recentEvents.length > 35) {
    state.recentEvents.length = 35;
  }
  return entry;
}

function getLeaderboard(limit = 20) {
  return Object.values(state.cultivators)
    .sort((a, b) => b.exp - a.exp)
    .slice(0, limit)
    .map((c, i) => ({
      rank: i + 1,
      name: c.name,
      uniqueId: c.uniqueId,
      avatar: c.avatar,
      exp: c.exp,
      level: c.level,
      realm: c.realm,
      bossDamage: c.bossDamage,
      lastAction: c.lastAction
    }));
}

function getPublicState() {
  return {
    totalQi: state.totalQi,
    totalPrayers: state.totalPrayers,
    totalBreakthroughs: state.totalBreakthroughs,
    boss: state.boss,
    leaderboard: getLeaderboard(20),
    recentEvents: state.recentEvents.slice(0, 15),
    settings: state.settings,
    tiktok: state.tiktok,
    tts: ttsManager ? ttsManager.getStatus() : { ready: false, status: 'init' }
  };
}

// ============================================================================
// 4. PYTHON UTF-8 TTS WORKER DAEMON (GOOGLE TIẾNG VIỆT)
// ============================================================================
class TuTienTTSManager {
  constructor() {
    this.proc = null;
    this.ready = false;
    this.status = 'starting';
    this.voice = 'google';
    this.pending = new Map();
    this.inflight = new Map();
    this.reqCounter = 0;
    this.buffer = '';
    this.startWorker();
  }

  resolvePythonBin() {
    return 'python';
  }

  startWorker() {
    const pyBin = this.resolvePythonBin();
    const scriptPath = path.join(__dirname, 'tts_worker.py');
    console.log(`[TuTiên TTS] Khởi chạy worker tiếng Việt...`);

    this.status = 'loading';
    const pyArgs = process.platform === 'win32' ? ['-X', 'utf8', scriptPath] : [scriptPath];
    this.proc = spawn(pyBin, pyArgs, {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1'
      }
    });

    this.proc.stdout.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      let lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        this.handleWorkerLine(line.trim());
      }
    });

    this.proc.stderr.on('data', (chunk) => {
      const msg = chunk.toString('utf8').trim();
      if (msg) console.log(`[TuTiên TTS stderr] ${msg}`);
    });

    this.proc.on('exit', (code) => {
      console.warn(`[TuTiên TTS] Worker thoát với mã ${code}`);
      this.ready = false;
      this.status = 'stopped';
      for (const [, item] of this.pending) {
        clearTimeout(item.timer);
        item.resolve({ ok: false, error: 'TTS worker exited' });
      }
      this.pending.clear();
    });
  }

  handleWorkerLine(line) {
    try {
      const msg = JSON.parse(line);
      if (msg.type === 'ready') {
        this.ready = true;
        this.status = 'ready';
        console.log(`[TuTiên TTS] Sẵn sàng sau ${msg.loadSec}s! Giọng: ${msg.voice}`);
        broadcastNotification('tts.status', this.getStatus());
      } else if (msg.type === 'result' && msg.id != null) {
        const entry = this.pending.get(msg.id);
        if (entry) {
          clearTimeout(entry.timer);
          this.pending.delete(msg.id);
          entry.resolve(msg);
        }
      }
    } catch (_) {}
  }

  getStatus() {
    return {
      ready: this.ready,
      status: this.status,
      engine: 'Google Tiếng Việt (Chị Google)',
      voice: 'google'
    };
  }

  synthesize(text) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return Promise.resolve({ ok: false, error: 'Empty text' });
    const dedupKey = `google::${cleanText}`;

    if (this.inflight.has(dedupKey)) {
      return this.inflight.get(dedupKey);
    }

    const promise = new Promise((resolve) => {
      if (!this.proc || !this.ready) {
        return resolve({ ok: false, error: `TTS chưa sẵn sàng: ${this.status}` });
      }
      const id = ++this.reqCounter;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        resolve({ ok: false, error: 'TTS timeout' });
      }, 15000);

      this.pending.set(id, { resolve, timer });
      const payload = JSON.stringify({ id, text: cleanText, voice: 'google' }) + '\n';
      this.proc.stdin.write(payload, 'utf8');
    }).finally(() => {
      this.inflight.delete(dedupKey);
    });

    this.inflight.set(dedupKey, promise);
    return promise;
  }
}

// ============================================================================
// 5. CÁC HÀNH ĐỘNG TU TIÊN (CULTIVATION RITUALS & EVENTS)
// ============================================================================
const CultivationActions = {
  // Thả tim: Thu nạp Linh Khí
  absorbQi(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const count = Math.max(1, Math.min(25, Number(params.count) || 1));
    const expGain = count * 10;

    const cult = recordCultivator(user, uniqueId, avatar, expGain, 0, `Hấp thu ${count * 10} Linh Khí`);

    const event = pushEventLog({
      type: 'absorbQi',
      user: cult.name,
      uniqueId: cult.uniqueId,
      avatar: cult.avatar,
      count,
      expGain,
      realm: cult.realm,
      level: cult.level,
      ttsText: '' // Không đọc TTS khi thả tim để tránh dồn dập
    });

    saveState();
    broadcastNotification('tutien.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  // Ngồi thiền / Tu luyện
  meditate(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const expGain = 120;

    state.totalPrayers += 1;
    const cult = recordCultivator(user, uniqueId, avatar, expGain, 0, 'Nhập định tu luyện');

    const ttsText = `Đạo hữu ${cult.name} nhập định tu luyện, linh khí thiên địa hội tụ, tăng một trăm hai mươi điểm tu vi.`;

    const event = pushEventLog({
      type: 'meditate',
      user: cult.name,
      uniqueId: cult.uniqueId,
      avatar: cult.avatar,
      expGain,
      realm: cult.realm,
      level: cult.level,
      ttsText
    });

    saveState();
    broadcastNotification('tutien.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  // Đột phá cảnh giới (Thiên Kiếp Lôi Đình)
  breakthrough(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';

    const cult = recordCultivator(user, uniqueId, avatar, 0, 0);
    const nextRealm = getNextRealm(cult.level);

    if (!nextRealm) {
      const event = pushEventLog({
        type: 'breakthrough',
        user: cult.name,
        success: true,
        realm: cult.realm,
        ttsText: `Đạo hữu ${cult.name} đã đạt cảnh giới tối cao Chân Tiên, thọ cùng trời đất!`
      });
      return { event, state: getPublicState() };
    }

    // Kiểm tra điều kiện exp
    if (cult.exp < nextRealm.minExp) {
      const remaining = nextRealm.minExp - cult.exp;
      const ttsText = `Đạo hữu ${cult.name} còn thiếu ${remaining} điểm linh khí để dẫn động thiên kiếp đột phá ${nextRealm.name}. Hãy tiếp tục ngồi thiền!`;
      const event = pushEventLog({
        type: 'breakthroughPending',
        user: cult.name,
        success: false,
        remaining,
        nextRealm: nextRealm.name,
        ttsText
      });
      broadcastNotification('tutien.event', { event, state: getPublicState() });
      return { event, state: getPublicState() };
    }

    // Thử vận mệnh độ kiếp
    const roll = Math.random();
    const success = roll <= nextRealm.breakChance;

    let ttsText = '';
    if (success) {
      cult.level = nextRealm.level;
      cult.realm = nextRealm.name;
      cult.lastAction = `Độ kiếp thành công ${nextRealm.name}`;
      state.totalBreakthroughs += 1;
      ttsText = `Thiên kiếp giáng lâm! Chúc mừng đạo hữu ${cult.name} độ kiếp thành công, đắc đạo thăng cấp ${nextRealm.name}!`;
    } else {
      cult.lastAction = `Độ kiếp thất bại tại ${nextRealm.name}`;
      ttsText = `Lôi kiếp chấn động! Đạo hữu ${cult.name} độ kiếp chưa thành do tâm ma quấy nhiễu. Hãy tích lũy thêm linh dược để tiếp tục vượt ải!`;
    }

    const event = pushEventLog({
      type: 'breakthrough',
      user: cult.name,
      uniqueId: cult.uniqueId,
      avatar: cult.avatar,
      success,
      realm: cult.realm,
      level: cult.level,
      nextRealm: nextRealm.name,
      ttsText
    });

    saveState();
    broadcastNotification('tutien.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  // Săn Boss Yêu Thú Thế Giới
  attackBoss(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const cult = recordCultivator(user, uniqueId, avatar, 30);

    // Sát thương tính theo cảnh giới tu vi
    const baseDmg = 80 + cult.level * 35 + Math.floor(Math.random() * 40);
    state.boss.hp = Math.max(0, state.boss.hp - baseDmg);
    cult.bossDamage += baseDmg;
    cult.lastAction = `Trảm boss ${baseDmg} sát thương`;

    let bossDefeated = false;
    let ttsText = '';

    if (state.boss.hp <= 0) {
      bossDefeated = true;
      state.boss.defeatedCount += 1;
      const oldBossName = state.boss.name;

      // Đổi sang boss kế tiếp
      state.boss.rosterIndex = (state.boss.rosterIndex + 1) % BOSS_ROSTER.length;
      const nextBoss = BOSS_ROSTER[state.boss.rosterIndex];
      state.boss.name = nextBoss.name;
      state.boss.maxHp = nextBoss.maxHp + (state.boss.defeatedCount * 5000);
      state.boss.hp = state.boss.maxHp;
      state.boss.avatar = nextBoss.avatar;

      // Thưởng lớn cho người kết liễu
      cult.exp += 1500;
      ttsText = `Thiên địa chấn động! Đạo hữu ${cult.name} đã xuất chiêu tuyệt sát, hạ gục Yêu Thú ${oldBossName}, nhận thưởng nghìn năm tu vi!`;
    }

    const event = pushEventLog({
      type: 'attackBoss',
      user: cult.name,
      uniqueId: cult.uniqueId,
      avatar: cult.avatar,
      damage: baseDmg,
      bossHp: state.boss.hp,
      bossMaxHp: state.boss.maxHp,
      bossName: state.boss.name,
      bossDefeated,
      ttsText
    });

    saveState();
    broadcastNotification('tutien.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  // Tặng quà Tiên Dược / Pháp Bảo
  offerGift(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const coins = Math.max(1, Number(params.coins) || 1);
    const giftName = String(params.giftName || 'Linh Đan Diệu Dược').slice(0, 32);

    const expGain = coins * 150;
    const bossDmg = coins * 80;
    state.boss.hp = Math.max(0, state.boss.hp - bossDmg);

    const cult = recordCultivator(user, uniqueId, avatar, expGain, bossDmg, `Dâng cúng ${giftName}`);

    const isGrand = coins >= 100;
    const ttsText = isGrand
      ? `Đại lễ giáng lâm! Đạo hữu ${cult.name} dâng tặng bảo vật ${giftName}, thiên địa mở lối, nhận thưởng ${expGain} điểm tu vi!`
      : `Đạo hữu ${cult.name} dâng tặng ${giftName}, linh khí tăng vọt ${expGain} điểm.`;

    const event = pushEventLog({
      type: isGrand ? 'grandCelestialOffering' : 'offerGift',
      user: cult.name,
      uniqueId: cult.uniqueId,
      avatar: cult.avatar,
      coins,
      giftName,
      expGain,
      bossDmg,
      realm: cult.realm,
      level: cult.level,
      ttsText
    });

    saveState();
    broadcastNotification('tutien.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  },

  // Bình luận tự do của Đạo Hữu
  viewerChat(params = {}) {
    const user = sanitizeUserName(params.user);
    const uniqueId = params.uniqueId || '';
    const avatar = params.avatar || '';
    const comment = String(params.comment || '').trim();
    if (!comment) return null;

    const cult = recordCultivator(user, uniqueId, avatar, 15, 0, comment);

    const ttsText = `Đạo hữu ${cult.name}: ${comment}.`;

    const event = pushEventLog({
      type: 'viewerChat',
      user: cult.name,
      uniqueId: cult.uniqueId,
      avatar: cult.avatar,
      comment,
      realm: cult.realm,
      level: cult.level,
      ttsText
    });

    saveState();
    broadcastNotification('tutien.event', { event, state: getPublicState() });
    return { event, state: getPublicState() };
  }
};

// ============================================================================
// 6. TIKTOK LIVE CHAT ROUTER & ANTI-SPAM
// ============================================================================
let tiktokConn = null;
const userCommentCooldown = new Map();
const processedChatMsgIds = new Set();

function parseTikTokComment(commentText, user, uniqueId, avatar) {
  const raw = String(commentText || '').trim();
  if (!raw) return null;

  const now = Date.now();
  const userKey = uniqueId || user || '';
  if (userKey) {
    const lastTs = userCommentCooldown.get(userKey) || 0;
    if (now - lastTs < 3500) return null;
    userCommentCooldown.set(userKey, now);
    if (userCommentCooldown.size > 500) {
      const oldest = userCommentCooldown.keys().next().value;
      userCommentCooldown.delete(oldest);
    }
  }

  const lower = raw.toLowerCase();

  // 1. Đột phá / Độ kiếp
  if (lower.includes('đột phá') || lower.includes('dot pha') || lower.includes('độ kiếp') || lower.includes('do kiep')) {
    return CultivationActions.breakthrough({ user, uniqueId, avatar });
  }

  // 2. Ngồi thiền / Tu luyện
  if (lower.includes('tu luyện') || lower.includes('tu luyen') || lower.includes('ngồi thiền') || lower.includes('ngoi thien') || lower.includes('hấp thu')) {
    return CultivationActions.meditate({ user, uniqueId, avatar });
  }

  // 3. Săn boss / Đánh quái
  if (lower.includes('săn boss') || lower.includes('san boss') || lower.includes('trảm yêu') || lower.includes('tram yeu') || lower.includes('chém') || lower.includes('chem') || lower.includes('đánh boss') || lower.includes('danh boss')) {
    return CultivationActions.attackBoss({ user, uniqueId, avatar });
  }

  // 4. Bình luận thông thường
  return CultivationActions.viewerChat({ user, uniqueId, avatar, comment: raw });
}

function extractUserFromEvent(data) {
  const u = data?.user || data || {};
  const uniqueId = u.uniqueId || u.displayId || data?.uniqueId || '';
  const user = u.nickname || uniqueId || data?.nickname || 'Vô Danh Đạo Hữu';
  const avatar =
    u.profilePictureUrl ||
    u.avatarLarge?.urlList?.[0] ||
    u.avatarThumb?.urlList?.[0] ||
    u.avatarMedium?.urlList?.[0] ||
    data?.profilePictureUrl ||
    '';
  return { user, uniqueId, avatar };
}

async function connectTikTokLive(channelName) {
  const cleanUser = String(channelName || '').replace(/^@/, '').trim();
  if (!cleanUser) throw new Error('Vui lòng nhập tên tài khoản TikTok Live');

  if (tiktokConn) {
    try {
      tiktokConn.removeAllListeners();
      await tiktokConn.disconnect();
    } catch (_) {}
    tiktokConn = null;
  }

  state.tiktok = {
    connected: false,
    connecting: true,
    username: cleanUser,
    roomId: null,
    viewerCount: 0,
    lastError: null
  };
  broadcastNotification('tutien.state', getPublicState());

  const apiKey = (state.settings?.signApiKey || process.env.SIGN_API_KEY || '').trim();
  if (apiKey) {
    SignConfig.apiKey = apiKey;
  }

  tiktokConn = new TikTokLiveConnection(cleanUser, {
    processInitialData: false,
    fetchRoomInfoOnConnect: false,
    enableExtendedGiftInfo: false,
    signApiKey: apiKey || undefined
  });

  tiktokConn.on(ControlEvent.CONNECTED, (roomState) => {
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || tiktokConn?.roomId || null;
    state.tiktok.lastError = null;
    console.log(`[TikTok Live TuTiên] Đã kết nối phòng @${cleanUser} (roomId: ${state.tiktok.roomId})`);
    broadcastNotification('tutien.state', getPublicState());
  });

  tiktokConn.on(ControlEvent.DISCONNECTED, () => {
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    console.log(`[TikTok Live TuTiên] Đã ngắt kết nối @${cleanUser}`);
    broadcastNotification('tutien.state', getPublicState());
  });

  tiktokConn.on(ControlEvent.ERROR, (err) => {
    state.tiktok.lastError = err?.message || String(err);
    console.warn('[TikTok Live TuTiên Warning]', state.tiktok.lastError);
    broadcastNotification('tutien.state', getPublicState());
  });

  tiktokConn.on(WebcastEvent.ROOM_USER, (data) => {
    const viewerCount = Number(data?.total ?? data?.viewerCount ?? 0);
    if (viewerCount > 0) {
      state.tiktok.viewerCount = viewerCount;
      broadcastNotification('tutien.viewerCount', { viewerCount });
    }
  });

  tiktokConn.on(WebcastEvent.LIKE, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const likeCount = Math.min(15, Math.max(1, Number(data?.count ?? data?.likeCount ?? 1)));
    CultivationActions.absorbQi({ user, uniqueId, avatar, count: likeCount });
  });

  tiktokConn.on(WebcastEvent.CHAT, (data) => {
    const msgId = String(data?.msgId || data?.id || `${data?.user?.uniqueId || ''}_${data?.content || data?.comment || ''}_${data?.createTime || ''}`);
    if (msgId && processedChatMsgIds.has(msgId)) return;
    if (msgId) {
      processedChatMsgIds.add(msgId);
      if (processedChatMsgIds.size > 800) {
        const first = processedChatMsgIds.values().next().value;
        processedChatMsgIds.delete(first);
      }
    }
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const commentText = data?.content || data?.comment || '';
    console.log(`[TikTok Chat] ${user}: ${commentText}`);
    parseTikTokComment(commentText, user, uniqueId, avatar);
  });

  tiktokConn.on(WebcastEvent.GIFT, (data) => {
    const { user, uniqueId, avatar } = extractUserFromEvent(data);
    const giftObj = data?.gift || data?.giftDetails || {};
    const diamondCount = Math.max(1, Number(giftObj?.diamondCount || data?.diamondCount || 1));
    const repeatCount = Math.max(1, Number(data?.repeatCount || data?.comboCount || 1));
    const totalCoins = diamondCount * repeatCount;
    const rawGiftName = giftObj?.name || data?.giftName || 'Linh Đan';

    CultivationActions.offerGift({
      user,
      uniqueId,
      avatar,
      coins: totalCoins,
      giftName: rawGiftName
    });
  });

  try {
    const roomState = await tiktokConn.connect();
    state.tiktok.connected = true;
    state.tiktok.connecting = false;
    state.tiktok.roomId = roomState?.roomId || tiktokConn?.roomId || null;
    broadcastNotification('tutien.state', getPublicState());
    return state.tiktok;
  } catch (err) {
    state.tiktok.connected = false;
    state.tiktok.connecting = false;
    state.tiktok.lastError = err?.message || 'Không thể kết nối phòng Live';
    broadcastNotification('tutien.state', getPublicState());
    throw new Error(state.tiktok.lastError);
  }
}

// ============================================================================
// 7. AUTO-SIMULATION ENGINE (CHẾ ĐỘ TỰ ĐỘNG GIẢ LẬP ĐẠO HỮU VÀO ĐỘNG PHỦ)
// ============================================================================
const SIM_CULTIVATORS = [
  { user: 'Hàn Lập', uniqueId: 'hanlap_phamnhan', comment: 'Tại hạ đến cầu cơ duyên đột phá' },
  { user: 'Bạch Tiểu Thuần', uniqueId: 'bachtieuthuan', comment: 'Sợ chết quá, mau trảm yêu thú thôi' },
  { user: 'Tiêu Viêm', uniqueId: 'tieuviem_viemde', comment: 'Ba mươi năm hà đông, ba mươi năm hà tây' },
  { user: 'Diệp Phàm', uniqueId: 'dieppham_hoangthe', comment: 'Ta vì Thiên Đế, đương trấn áp tất cả thế gian địch' },
  { user: 'Thạch Hạo', uniqueId: 'thachhao_hoang', comment: 'Một hạt bụi lấp biển, một cọng cỏ chém trăng sao' },
  { user: 'Nam Cung Uyển', uniqueId: 'namcunguyen', comment: 'Nguyện cùng đạo hữu kết thành đạo lữ' }
];

let autoSimTimer = null;
function runSingleSimulation() {
  const pick = SIM_CULTIVATORS[Math.floor(Math.random() * SIM_CULTIVATORS.length)];
  const roll = Math.random();
  if (roll < 0.35) {
    CultivationActions.absorbQi({ user: pick.user, uniqueId: pick.uniqueId, count: 5 });
  } else if (roll < 0.60) {
    CultivationActions.meditate({ user: pick.user, uniqueId: pick.uniqueId });
  } else if (roll < 0.80) {
    CultivationActions.attackBoss({ user: pick.user, uniqueId: pick.uniqueId });
  } else if (roll < 0.92) {
    CultivationActions.breakthrough({ user: pick.user, uniqueId: pick.uniqueId });
  } else {
    CultivationActions.viewerChat({ user: pick.user, uniqueId: pick.uniqueId, comment: pick.comment });
  }
}

function configureAutoSim(enabled) {
  state.settings.autoSim = Boolean(enabled);
  if (autoSimTimer) {
    clearInterval(autoSimTimer);
    autoSimTimer = null;
  }
  if (state.settings.autoSim) {
    autoSimTimer = setInterval(runSingleSimulation, state.settings.autoSimIntervalMs || 8500);
  }
}

// ============================================================================
// 8. JSON-RPC 2.0 DISPATCHER & EXPRESS APP
// ============================================================================
async function handleRpcCall(method, params = {}) {
  switch (method) {
    case 'tutien.getState':
      return getPublicState();
    case 'tutien.absorbQi':
      return CultivationActions.absorbQi(params);
    case 'tutien.meditate':
      return CultivationActions.meditate(params);
    case 'tutien.breakthrough':
      return CultivationActions.breakthrough(params);
    case 'tutien.attackBoss':
      return CultivationActions.attackBoss(params);
    case 'tutien.offerGift':
      return CultivationActions.offerGift(params);
    case 'tutien.chat':
      return parseTikTokComment(params.comment, params.user, params.uniqueId, params.avatar);
    case 'tutien.setSignApiKey': {
      state.settings.signApiKey = String(params.apiKey || '').trim();
      if (state.settings.signApiKey) {
        SignConfig.apiKey = state.settings.signApiKey;
      }
      saveState();
      broadcastNotification('tutien.state', getPublicState());
      const user = state.tiktok?.username || 'ngoc03nv';
      return connectTikTokLive(user).catch(err => ({ error: err.message, ...getPublicState() }));
    }
    case 'live.connect':
      return await connectTikTokLive(params.username);
    case 'live.disconnect':
      if (tiktokConn) {
        try {
          tiktokConn.removeAllListeners();
          tiktokConn.disconnect();
        } catch (_) {}
        tiktokConn = null;
      }
      state.tiktok.connected = false;
      state.tiktok.connecting = false;
      broadcastNotification('tutien.state', getPublicState());
      return state.tiktok;
    case 'live.setAutoSim':
      configureAutoSim(Boolean(params.enabled));
      saveState();
      broadcastNotification('tutien.state', getPublicState());
      return getPublicState();
    case 'tutien.speak': {
      const res = await ttsManager.synthesize(params.text);
      if (res.ok && params.broadcast !== false) {
        broadcastNotification('tts.play', { text: params.text, url: res.url });
      }
      return res;
    }
    default:
      throw new Error(`Không tìm thấy phương thức JSON-RPC: ${method}`);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/tts-cache', express.static(TTS_CACHE_DIR, { maxAge: '7d' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/state', (_req, res) => {
  res.json(getPublicState());
});

app.all('/api/tts', async (req, res) => {
  const text = (req.body?.text || req.query?.text || '').trim();
  if (!text) return res.status(400).json({ ok: false, error: 'Thiếu text cần đọc' });
  const result = await ttsManager.synthesize(text);
  res.json(result);
});

app.post('/rpc', async (req, res) => {
  const { jsonrpc, id, method, params } = req.body || {};
  if (!method) return res.status(400).json({ jsonrpc: '2.0', id: id ?? null, error: { code: -32600, message: 'Invalid Request' } });
  try {
    const result = await handleRpcCall(method, params || {});
    res.json({ jsonrpc: jsonrpc || '2.0', id: id ?? null, result });
  } catch (err) {
    res.json({ jsonrpc: jsonrpc || '2.0', id: id ?? null, error: { code: -32000, message: err.message } });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcastNotification(method, params) {
  const payload = JSON.stringify({ jsonrpc: '2.0', method, params });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'tutien.state', params: getPublicState() }));
  ws.on('message', async (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch (_) { return; }
    if (!msg || !msg.method) return;
    try {
      const result = await handleRpcCall(msg.method, msg.params || {});
      if (msg.id !== undefined) {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, result }));
      }
    } catch (err) {
      if (msg.id !== undefined) {
        ws.send(JSON.stringify({ jsonrpc: '2.0', id: msg.id, error: { code: -32000, message: err.message } }));
      }
    }
  });
});

const ttsManager = new TuTienTTSManager();

server.listen(PORT, () => {
  console.log(`============================================================`);
  console.log(`⚔️ TU TIÊN CỬU TRỌNG THIÊN — TIKTOK LIVE RPC ĐÃ KHỞI ĐỘNG`);
  console.log(`📺 Màn hình Tu Tiên (9:16 OBS): http://localhost:${PORT}`);
  console.log(`🎛️ Bảng điều khiển Admin     : http://localhost:${PORT}/admin`);
  console.log(`🔌 JSON-RPC 2.0 Endpoint     : http://localhost:${PORT}/rpc (ws://localhost:${PORT}/ws)`);
  console.log(`============================================================`);

  const defaultChannel = process.env.TIKTOK_USER || state.tiktok?.username || 'ngoc03nv';
  if (defaultChannel) {
    connectTikTokLive(defaultChannel).catch((err) => {
      console.warn(`[Auto-Connect @${defaultChannel}] Chưa kết nối được ngay:`, err.message);
    });
  }

  // Tự động kiểm tra kết nối lại mỗi 90 giây
  setInterval(() => {
    if (!state.tiktok?.connected && !state.tiktok?.connecting) {
      const channel = process.env.TIKTOK_USER || state.tiktok?.username || 'ngoc03nv';
      if (channel) {
        connectTikTokLive(channel).catch(() => {});
      }
    }
  }, 90000);
});
