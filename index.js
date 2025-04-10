const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

// Warna ANSI
const reset = "\x1b[0m";
const bold = "\x1b[1m";
const dim = "\x1b[2m";
const fgCyan = "\x1b[36m";
const fgGreen = "\x1b[32m";
const fgYellow = "\x1b[33m";
const fgBlue = "\x1b[34m";
const fgMagenta = "\x1b[35m";
const fgWhite = "\x1b[37m";
const fgGray = "\x1b[90m";
const fgRed = "\x1b[31m";
const underline = "\x1b[4m";

const topBorder = fgMagenta + "╔" + "═".repeat(50) + "╗" + reset;
const bottomBorder = fgMagenta + "╚" + "═".repeat(50) + "╝" + reset;
const date = new Date().toLocaleString("id-ID", {
  dateStyle: "full",
  timeStyle: "medium",
  timeZone: "Asia/Singapore"
});

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

const searchSessions = new Map();
const MAX_DURATION_SECONDS = 300;

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
  console.log("Scan QR untuk login WhatsApp:");
});

client.on("ready", () => {
  console.log("");
  console.log(" " + topBorder);
  console.log(fgBlue + bold + " ║" + reset + " ".repeat(18) + underline + bold + "Groofy System" + reset.padEnd(23) + fgBlue + bold + "║" + reset);
  console.log(fgBlue + bold + " ║" + reset + " " + fgCyan + "Tanggal".padEnd(10) + fgWhite + ": " + fgGray + date.padEnd(37) + fgBlue + bold + "║" + reset);
  console.log(fgBlue + bold + " ║" + reset + " " + fgYellow + "Status".padEnd(10) + fgWhite + ": " + fgGreen + bold + "ONLINE - SIAP DIGUNAKAN".padEnd(37) + fgBlue + bold + "║" + reset);
  console.log(fgBlue + bold + " ║" + reset + " " + fgMagenta + "Made by".padEnd(10) + fgWhite + ": " + fgCyan + "Syafiq Alfayad".padEnd(37) + fgBlue + bold + "║" + reset);
  console.log(fgBlue + bold + " ║" + reset + " ".repeat(50) + fgBlue + bold + "║" + reset);
  console.log(fgBlue + bold + " ║" + reset + " " + fgWhite + bold + "Ketik perintah melalui WhatsApp untuk mulai." + " ".repeat(5) + fgBlue + bold + "║" + reset);
  console.log(" " + bottomBorder);
});

client.on("message", async (msg) => {
  const chat = msg.body.toLowerCase();
  const user = msg.from;

  if (chat.startsWith("putar ")) {
    const query = msg.body.slice(6).trim();
    console.log(`\n${" ".repeat(3)}╚══ ${fgMagenta}Perintah diterima${reset}\n${" ".repeat(7)}Mencari : ${fgYellow}${query}${reset}`);
    await client.sendMessage(user, `🎶 *Memutar:* *${query}*\n⏳ Mohon tunggu sebentar...`);
    return downloadAndSendVoice(query, msg);
  }

  if (chat.startsWith("cari ")) {
    const query = msg.body.slice(5).trim();
    console.log(`\n${" ".repeat(3)}╚══ ${fgMagenta}Perintah diterima${reset}\n${" ".repeat(7)}Mencari : ${fgYellow}${query}${reset}`);
    await client.sendMessage(user, "🔎 Sedang mencari...\n🎧 Maks. durasi: 5 menit.");

    const command = `yt-dlp "ytsearch20:${query}" --print-json --flat-playlist`;

    exec(command, async (err, stdout) => {
      if (err) {
        console.error(`${" ".repeat(7)}${fgRed}ERROR cari lagu: ${err.message}${reset}`);
        return client.sendMessage(user, `❌ Gagal mencari: ${err.message}`);
      }

      const results = stdout.trim().split("\n")
        .map(line => { try { return JSON.parse(line); } catch { return null; } })
        .filter(item => item && item.duration && item.duration <= MAX_DURATION_SECONDS);

      if (results.length === 0) {
        console.log(`${" ".repeat(7)}${fgRed}Lagu melewati batas maksimum durasi${reset}`);
        return client.sendMessage(user, "❌ Mohon maaf \nBatas maksimal durasi lagu yang dapat dicari 5 menit");
      }

      console.log(`${" ".repeat(7)}${fgBlue}Berhasil mendapatkan beberapa sound${reset}`);
      const list = results.slice(0, 7).map((res, i) => {
        const title = res.title.length > 60 ? res.title.slice(0, 57) + "..." : res.title;
        const mins = Math.floor(res.duration / 60);
        const secs = (res.duration % 60).toString().padStart(2, "0");
        return `*${i + 1}.* ${title} \n⏱ ${mins}:${secs}`;
      }).join("\n\n");

      const outputMsg = `🔍 *Hasil pencarian untuk :* \n${query}\n\n${list}\n\n> *Pilih dengan angka 1-7*\n> *Hanya dapat digunakan satu kali*`;

      searchSessions.set(user, { used: false, results, query });
      await client.sendMessage(user, outputMsg);
    });

    return;
  }

  if (/^[1-7]$/.test(chat)) {
    const session = searchSessions.get(user);
    const index = parseInt(chat) - 1;

    if (!session) {
      console.log(`${" ".repeat(7)}${fgGray}User belum terdaftar${reset}`);
      return client.sendMessage(user, "⚠️ Ketik *cari (judul)* untuk memulai.");
    }
    if (session.used) {
      console.log(`${" ".repeat(7)}${fgGray}User ingin memakai lebih dari 1 kali${reset}`);
      return client.sendMessage(user, "⚠️ Sudah digunakan. Ketik *cari (judul)* untuk memulai ulang.");
    }

    const selected = session.results[index];
    if (!selected) return client.sendMessage(user, "❌ Nomor tidak valid.");

    session.used = true;
    await client.sendMessage(user, `🎶 Mengambil: \n*${selected.title}*...`);
    console.log(`${" ".repeat(7)}User mengambil : ${fgYellow}${selected.title}${reset}`);
    return downloadAndSendVoice(selected.url, msg, selected.title);
  }

  if (!msg.from.includes("@g.us")) {
    return client.sendMessage(user, `🙏 *Mohon maaf.*\n\nSilakan gunakan format perintah:\n• *Putar (judul)*\n• *Cari (judul)*`);
  }
});

async function downloadAndSendVoice(urlOrQuery, msg, manualTitle = null) {
  const fileID = Date.now();
  const oggPath = path.join(__dirname, "downloads", `${fileID}.ogg`);
  const finalPath = `${oggPath}.opus`;

  const isUrl = urlOrQuery.startsWith("http");
  const searchQuery = isUrl ? urlOrQuery : `ytsearch1:${urlOrQuery}`;
  const infoCommand = `yt-dlp -j "${searchQuery}"`;
  const downloadCommand = `yt-dlp -f bestaudio --extract-audio --audio-format opus --audio-quality 5 -o "${oggPath}" "${searchQuery}"`;

  const wait = await safeReply(msg, "📥 Proses...");

  exec(infoCommand, (err, stdout) => {
    if (err) {
      console.error(`${" ".repeat(7)}${fgRed}Info error${reset} :`, err);
      return client.sendMessage(msg.from, "❌ Gagal ambil info lagu.");
    }

    let info;
    try {
      info = JSON.parse(stdout);
    } catch {
      console.log(`${" ".repeat(7)}${fgRed}Lagu tidak ditemukan${reset}`);
      return client.sendMessage(msg.from, "❌ Error 404 | Tidak ditemukan");
    }

    if (info.duration > MAX_DURATION_SECONDS) {
      return client.sendMessage(msg.from, "⚠️ Lagu terlalu panjang. Maks. 5 menit.");
    }

    const title = manualTitle || info.title;

    exec(downloadCommand, (error) => {
      if (error) {
        console.error(`${" ".repeat(7)}${fgRed}Download error${reset} :`, error.message);
        return client.sendMessage(msg.from, `❌ Gagal download: ${error.message}`);
      }

      fs.access(finalPath, fs.constants.F_OK, async (err) => {
        if (err) {
          console.error(`${" ".repeat(7)}${fgRed}File hilang${reset} :`, finalPath);
          return client.sendMessage(msg.from, "❌ File tidak ditemukan.");
        }

        const media = MessageMedia.fromFilePath(finalPath);
        console.log(`${" ".repeat(7)}Judul : ${fgYellow}${title}${reset}`);
        await client.sendMessage(msg.from, `🎧 Lagu: *${title}*`);
        await client.sendMessage(msg.from, media, { sendAudioAsVoice: true });
        await client.sendMessage(msg.from, "✅ Berhasil dikirim!");
        console.log(" ".repeat(7) + fgGreen + "Berhasil dikirim : " + `${title}` + reset);
        fs.unlink(finalPath, () => {});
      });
    });
  });
}

async function safeReply(msg, text) {
  try {
    return await msg.reply(text);
  } catch (err) {
    console.error(`${" ".repeat(6)}${fgRed}Reply error${reset} :`, err.message);
    return null;
  }
}

client.initialize();
