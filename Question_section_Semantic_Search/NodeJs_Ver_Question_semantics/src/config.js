import dotenv from "dotenv";
dotenv.config();

export const CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME || "semantic_search",
  COLL_1: process.env.COLL_1 || "faqs_primary",
  COLL_2: process.env.COLL_2 || "faqs_recent",
  VECTOR_INDEX_1: process.env.VECTOR_INDEX_1 || "vector_index_1",
  VECTOR_INDEX_2: process.env.VECTOR_INDEX_2 || "vector_index_2",
  MODEL_NAME: process.env.MODEL_NAME || "Xenova/all-MiniLM-L6-v2",
  SIM_THRESHOLD: parseFloat(process.env.SIM_THRESHOLD || "0.75"),
  LAST_7_DAYS: parseInt(process.env.LAST_7_DAYS || "7", 10),
  DATA_PATH: "data/faqdataset_complete.json"
};