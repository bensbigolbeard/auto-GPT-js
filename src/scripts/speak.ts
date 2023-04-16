import os from "os";
import childProcess from "child_process";
import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { pipeline } from "stream";
import gtts from "gtts";
import { Mutex, Semaphore } from "async-mutex";

const cfg = require("./config.js");

// Default voice IDs
const defaultVoices = ["ErXwobaYiN019PkySvjV", "EXAVITQu4vr4xnSDxMaL"];

// Retrieve custom voice IDs from the Config class
const customVoice1 = cfg.elevenlabs_voice_1_id;
const customVoice2 = cfg.elevenlabs_voice_2_id;

// Placeholder values that should be treated as empty
const placeholders = ["your-voice-id"];

// Use custom voice IDs if provided and not placeholders, otherwise use default voice IDs
const voices = [
  customVoice1 && !placeholders.includes(customVoice1) ? customVoice1 : defaultVoices[0],
  customVoice2 && !placeholders.includes(customVoice2) ? customVoice2 : defaultVoices[1],
];

const ttsHeaders = {
  "Content-Type": "application/json",
  "xi-api-key": cfg.elevenlabs_api_key,
};

const mutexLock = new Mutex(); // Ensure only one sound is played at a time
const queueSemaphore = new Semaphore(1); // The amount of sounds to queue before blocking the main thread

async function elevenLabsSpeech(text, voiceIndex = 0) {
  /* Speak text using elevenlabs.io's API */

  const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voices[voiceIndex]}`;
  const formattedMessage = { text };

  try {
    const response = await fetch(ttsUrl, {
      method: "POST",
      headers: ttsHeaders,
      body: JSON.stringify(formattedMessage),
    });

    if (response.status === 200) {
      const filename = `${uuidv4()}.mpeg`;
      const filePath = path.join(os.tmpdir(), filename);

      await pipeline(Buffer.from(await response.arrayBuffer()), fs.createWriteStream(filePath));
      await mutexLock.runExclusive(() => {
        const child = childProcess.spawn("ffplay", ["-autoexit", "-nodisp", filePath], {
          detached: true,
          stdio: ["ignore", "ignore", "ignore"],
        });
        child.unref();
      });
      fs.unlinkSync(filePath);

      return true;
    } else {
      console.log("Request failed with status code:", response.status);
      console.log("Response content:", await response.json());
      return false;
    }
  } catch (e) {
    console.error("An error occurred while calling the Eleven Labs TTS API:", e);
    return false;
  }
}

async function gttsSpeech(text) {
  const tts = new gtts(text, cfg.gttsLang || "en");
  const filename = `${uuidv4()}.mp3`;
  const filePath = path.join(os.tmpdir(), filename);

  await new Promise((resolve, reject) => {
    tts.stream().on("error", reject).pipe(fs.createWriteStream(filePath)).on("error", reject).on("finish", resolve);
  });

  await mutexLock.runExclusive(() => {
    const child = childProcess.spawn("ffplay", ["-autoexit", "-nodisp", filePath], {
      detached: true,
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.unref();
  });

  fs.unlinkSync(filePath);
}

function macosTTSSpeech(text, voiceIndex = 0) {
  if (voiceIndex === 0) {
    childProcess
      .spawn("say", [text], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      })
      .unref();
  } else if (voiceIndex === 1) {
    childProcess
      .spawn("say", ["-v", "Ava (Premium)", text], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      })
      .unref();
  } else {
    childProcess
      .spawn("say", ["-v", "Samantha", text], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      })
      .unref();
  }
}

function sayText(text, voiceIndex = 0) {
  async function speak() {
    if (!cfg.elevenlabs_api_key) {
      if (cfg.use_mac_os_tts === "True") {
        macosTTSSpeech(text, voiceIndex);
      } else {
        await gttsSpeech(text);
      }
    } else {
      const success = await elevenLabsSpeech(text, voiceIndex);
      if (!success) {
        await gttsSpeech(text);
      }
    }

    queueSemaphore.release();
  }

  queueSemaphore.acquire();
  speak();
}

export { sayText };
