import fs from "fs";

const buildHashDir = "dist/temp";
const buildHashFile = `${buildHashDir}/build-hashes.json`;

if (fs.existsSync(buildHashFile)) {
  fs.unlinkSync(buildHashFile);
  console.log("build-hashes.json を削除しました。");
} else {
  console.log("build-hashes.json は存在しません。");
}

if (fs.existsSync(buildHashDir) && fs.readdirSync(buildHashDir).length === 0) {
  fs.rmdirSync(buildHashDir);
  console.log("dist/temp を削除しました。");
}
