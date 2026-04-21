const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

// Load private key
const privateKeyPath = path.join(
  __dirname,
  "../../../cloudfront-private-key.pem"
);
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

// Create CloudFront signer
const cloudFrontSigner = new AWS.CloudFront.Signer(
  process.env.CLOUDFRONT_KEY_PAIR_ID,
  privateKey
);

function issueCloudFrontSignedUrl(resourcePath, durationSeconds = 600) {
  const url = `${process.env.CLOUDFRONT_URL}${resourcePath}`;
  const expires = Math.floor(Date.now() / 1000) + durationSeconds;

  return cloudFrontSigner.getSignedUrl({
    url,
    expires,
  });
}

module.exports = { issueCloudFrontSignedUrl };
