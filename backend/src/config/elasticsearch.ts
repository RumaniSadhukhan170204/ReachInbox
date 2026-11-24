
import { Client } from "@elastic/elasticsearch";
import { readFileSync } from "node:fs";
import { env } from "./env";

export const elasticsearch = new Client({
  node: env.ELASTICSEARCH_NODE,

  auth: {
    username: env.ELASTICSEARCH_USERNAME,
    password: env.ELASTICSEARCH_PASSWORD
  },

  tls: {
    ca: readFileSync(env.ELASTICSEARCH_CA_PATH),
    rejectUnauthorized: true
  }
});
