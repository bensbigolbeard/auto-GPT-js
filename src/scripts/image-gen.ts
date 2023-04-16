import { OpenAIApi, Configuration } from "openai";
import fs from "node:fs";
import { v4 as uuidv4 } from "uuid";
import { createCanvas, loadImage } from "canvas"; // TODO: verify if this dep is node 18 compatible
import { Config } from "./config";

const cfg = new Config();
const getOpenai = (apiKey = cfg.openaiApiKey) => new OpenAIApi(new Configuration({ apiKey }));

const working_directory = "auto-gpt-workspace";

async function generateImage(prompt) {
  const filename = `${uuidv4()}.jpg`;

  // DALL-E
  if (cfg.imageProvider === "dalle") {
    const openai = getOpenai();

    const { data } = await openai.createImage({
      prompt,
      n: 1,
      size: "256x256",
      response_format: "b64_json",
    });

    console.log(`Image Generated for prompt: ${prompt}`);

    const image_data = new Uint8Array(data[0].b64_json);
    const image_buffer = Buffer.from(image_data.buffer);

    fs.writeFileSync(`${working_directory}/${filename}`, image_buffer);

    return `Saved to disk: ${filename}`;

    // STABLE DIFFUSION
  } else if (cfg.imageProvider === "sd") {
    if (!cfg.huggingfaceApiToken)
      throw new Error("Huggingface API Token not found. Please add it to your config.js file.");

    const API_URL = "https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4";

    const headers = {
      Authorization: `Bearer ${cfg.huggingfaceApiToken}`,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({ inputs: prompt }),
      headers: headers,
    });

    const canvas = createCanvas(256, 256);
    const context = canvas.getContext("2d");
    let image;
    try {
      image = await loadImage(Buffer.from(await response.arrayBuffer()));
    } catch (e) {
      console.log("Error: loading image buffer failed", e);
      throw e;
    }
    context.drawImage(image, 0, 0);

    console.log(`Image Generated for prompt: ${prompt}`);

    const out = fs.createWriteStream(`${working_directory}/${filename}`);
    const stream = canvas.createJPEGStream({
      quality: 0.95,
      chromaSubsampling: false,
    });

    stream.pipe(out);

    return `Saved to disk: ${filename}`;
  } else {
    return "No Image Provider Set";
  }
}

export { generateImage };
