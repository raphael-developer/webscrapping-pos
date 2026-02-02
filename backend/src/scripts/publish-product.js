/**
 * Script para publicar um produto no WooCommerce
 * Uso: node src/scripts/publish-product.js <product_id>
 */

require("dotenv").config();
const https = require("https");

const WOOCOMMERCE_URL = process.env.WOOCOMMERCE_URL;
const CONSUMER_KEY = process.env.WOOCOMMERCE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.WOOCOMMERCE_CONSUMER_SECRET;

const productId = process.argv[2] || 15181;

console.log(`Atualizando produto ${productId} para status "publish"...`);

const url = new URL(`${WOOCOMMERCE_URL}/wp-json/wc/v3/products/${productId}`);
url.searchParams.append("consumer_key", CONSUMER_KEY);
url.searchParams.append("consumer_secret", CONSUMER_SECRET);

const data = JSON.stringify({ status: "publish" });

const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname + url.search,
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    Accept: "application/json",
  },
};

const req = https.request(options, res => {
  let body = "";

  res.on("data", chunk => {
    body += chunk;
  });

  res.on("end", () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const product = JSON.parse(body);
      console.log(`✅ Produto atualizado com sucesso!`);
      console.log(`   ID: ${product.id}`);
      console.log(`   Nome: ${product.name}`);
      console.log(`   Status: ${product.status}`);
      console.log(`   Link: ${product.permalink}`);
    } else {
      console.log(`❌ Erro ${res.statusCode}:`);
      console.log(body);
    }
  });
});

req.on("error", error => {
  console.error("Erro na requisição:", error.message);
});

req.write(data);
req.end();
