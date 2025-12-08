import fs from "fs";
import path from "path";

const convertTxtToJson = (txtFile, jsonFile) => {
  const text = fs.readFileSync(txtFile, "utf8");
  const words = text
    .split("\n")
    .map(w => w.trim().toUpperCase())
    .filter(Boolean);

  fs.writeFileSync(jsonFile, JSON.stringify(words, null, 2));
  console.log(`✅ Converted ${txtFile} → ${jsonFile} (${words.length} words)`);
};

// Adjust paths as needed
const answersTxt = path.resolve("./data/answers.txt");
const validTxt = path.resolve("./data/valid.txt");
const answersJson = path.resolve("./data/answers.json");
const validJson = path.resolve("./data/valid.json");

convertTxtToJson(answersTxt, answersJson);
convertTxtToJson(validTxt, validJson);
