import { resolve } from "path";
import axios from "axios";
const fs = require("fs");
const https = require("https");

const HOME_DIR = require("os").homedir();
export const P0X_DIR = resolve(HOME_DIR, "./.poseidon-zkp/pomp");
export const P0X_AWS_URL = "https://p0x-labs.s3.amazonaws.com/pomp/";
export function dnld_aws(file_name: string) {
  fs.mkdir(resolve(HOME_DIR, "./.poseidon-zkp"), () => {});
  fs.mkdir(P0X_DIR, () => {});
  fs.mkdir(resolve(P0X_DIR, "./wasm"), () => {});
  fs.mkdir(resolve(P0X_DIR, "./zkey"), () => {});
  return new Promise((reslv) => {
    if (!fs.existsSync(resolve(P0X_DIR, file_name))) {
      const file = fs.createWriteStream(resolve(P0X_DIR, file_name));

      https.get(P0X_AWS_URL + file_name, (resp: any) => {
        file.on("finish", () => {
          file.close();
          reslv(0);
        });
        resp.pipe(file);
      });
    } else {
      reslv(0);
    }
  });
}

export async function dnld_file(path: string) {
  const res = await axios.get(P0X_AWS_URL + path, {
    responseType: "arraybuffer",
  });
  return res.data;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
