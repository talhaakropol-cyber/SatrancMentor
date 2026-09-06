const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const LICHESS_TOKEN = process.env.LICHESS_TOKEN || 'lip_QHZL9fkUeC9tvU7Q8nFk';
const LICHESS_API = 'https://lichess.org/api';

// Satranç konseptleri - türkçe açıklamalar
const CHESS_CONCEPTS = {
  'king_safety': 'Kral güvenliği: Kral açıksa taktiksel tehditler artıyor.',
  'center_control': 'Merkez kontrolü: d4, d5, e4, e5 kareleri kontrolü çok önemli.',
  'piece_activity': 'Taş aktivitesi: Taşlar aktif konumlarda olmalı, pasif değil.',
  'pawn_structure': 'Piyade yapısı: Piyade zayıflığı kalıcıdır—dikkat et.',
  'material': 'Materyel: Taş değeri—Vezir=9, Kale=5, Fil/At=3, Piyade=1.',
  'tempo': 'Tempo: Hız çok önemli—rakibi baskı altında tut.',
  'tactic': 'Taktik motif: Pin, çatal, kaymak, açık saldırı gibi kombinasyonlar.',
  'endgame': 'Son oyun: Kral aktif olmalı, piyade ileri gitmelidir.'
};

// Oyun türleri
const OPENINGS = {
  'e2e4': 'İtalyan Açılış',
  'e2e3': 'Réti Açılış',
  'd2d4': 'Vezir Piyade Açılış',
  'c2c4': 'İngiliz Açılış',
  'a2a3': 'Larsen Açılış'
};

// Lichess'ten son oyunları çek
app.get('/api/games', async (req, res) => {
  try {
    const response = await fetch(`${LICHESS_API}/user/TalhaE/games?max=20&pgnInJson=true`, {
      headers: {
        'Authorization': `Bearer ${LICHESS_TOKEN}`
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Lichess API hatası' });
    }

    const games = await response.json();
    const gamesList = Array.isArray(games) ? games : [games];

    // Her oyunu analiz et
    const analyzed = gamesList.slice(0, 15).map(game => ({
      id: game.id,
      date: new Date(game.createdAt).toLocaleDateString('tr-TR'),
      players: {
        white: game.players.white.user?.name || 'Misafir',
        black: game.players.black.user?.name || 'Misafir'
      },
      result: game.status,
      winner: game.winner,
      playerColor: game.players.white.user?.id === 'talhaE' ? 'white' : 'black',
      opponent: game.players.white.user?.id === 'talhaE' 
        ? game.players.black.user?.name || 'Misafir'
        : game.players.white.user?.name || 'Misafir',
      pgn: game.pgn,
      clock: game.clock
    }));

    res.json(analyzed);
  } catch (error) {
    console.error('Oyunları çekerken hata:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Oyun analizi - basit satranç konseptleri
app.post('/api/analyze', (req, res) => {
  const { game } = req.body;

  if (!game) {
    return res.status(400).json({ error: 'Oyun verisi gerekli' });
  }

  const playerColor = game.playerColor === 'white' ? 'Beyaz' : 'Siyah';
  let verdict = '';
  let lesson = '';
  let concepts = [];

  // Sonuca göre analiz
  if (game.status === 'checkmate') {
    if ((game.playerColor === 'white' && game.winner === 'white') ||
        (game.playerColor === 'black' && game.winner === 'black')) {
      verdict = '✓ Kazandın!';
      lesson = 'Şah mat koydun. Rakibinin kral kaçış karesini kontrol ettin ve saldırı başarılı oldu.';
      concepts = ['king_safety', 'tactic'];
    } else {
      verdict = '✗ Kaybettin';
      lesson = 'Şah mat yedin. Kral güvenliğini erken aşamada sağlamak çok önemli. Sonraki oyunda daha dikkatli ol.';
      concepts = ['king_safety'];
    }
  } else if (game.status === 'resign') {
    if ((game.playerColor === 'white' && game.winner === 'white') ||
        (game.playerColor === 'black' && game.winner === 'black')) {
      verdict = '✓ Rakip teslim etti';
      lesson = 'Pozisyon tamamen kazanç haline getirdin. Rakip umutsuz pozisyonda veriyor.';
      concepts = ['piece_activity', 'material'];
    } else {
      verdict = '✗ Sen teslim ettin';
      lesson = '3+0 oyununda erken teslim ettikten sonra geri dönüş fırsatı kaçabilir. Daha sabırlı oynamayı deneyin.';
      concepts = ['tempo'];
    }
  } else if (game.status === 'draw') {
    verdict = '= Berabere';
    lesson = 'Berabere bıraktın. Hızlı oyunda riskli pozisyonlara girmeyi deneyin—kazanma şansını değerlendirin.';
    concepts = ['material', 'endgame'];
  } else if (game.status === 'timeout') {
    if ((game.playerColor === 'white' && game.winner === 'white') ||
        (game.playerColor === 'black' && game.winner === 'black')) {
      verdict = '✓ Zamanı bitti (rakip)';
      lesson = 'Rakip zamanı bitirdi. 3+0\'da zaman yönetimi kritik—hızlı hamle yap ama acele etme.';
      concepts = ['tempo'];
    } else {
      verdict = '✗ Senin zamanı bitti';
      lesson = 'Zamanın bitti. Hızlı oyunlarda her hamleyi 1-2 saniyede yapmalısın. Daha hızlı oynamaya çalış.';
      concepts = ['tempo'];
    }
  } else {
    verdict = 'Oyun devam ediyor';
    lesson = 'Bu oyun halen analiz edilebilir.';
    concepts = ['center_control', 'piece_activity'];
  }

  // Konseptleri aç
  const conceptExplanations = concepts
    .slice(0, 2)
    .map(c => CHESS_CONCEPTS[c] || 'Konsept açıklanamadı')
    .join(' | ');

  res.json({
    playerColor,
    verdict,
    lesson,
    concepts: conceptExplanations,
    date: game.date,
    opponent: game.opponent,
    clock: game.clock ? `${game.clock.initial / 60}+${game.clock.increment}` : '3+0'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Frontend serve etmek için static folder
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Satranç mentor serveri ${PORT} portunda çalışıyor`);
});
