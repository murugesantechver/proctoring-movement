const AWS = require("aws-sdk");
const fs = require("fs");
const path = require("path");

async function issueCloudFrontCookies(
  pathPattern = "/*",
  durationSeconds = 600
) {
  // Load private key from file
  const privateKeyPath = path.join(
    __dirname,
    "../../../cloudfront-private-key.pem"
  );
  const privateKey = fs.readFileSync(privateKeyPath, "utf8");

  const signer = new AWS.CloudFront.Signer(
    process.env.CLOUDFRONT_KEY_PAIR_ID,
    privateKey
  );

  // Compute expiry timestamp slightly in the future to avoid clock drift issues
  const expires = Math.floor(Date.now() / 1000) + durationSeconds + 5;

  // Generate signed cookies (returns synchronously)
  const cookies = signer.getSignedCookie({
    url: `${process.env.CLOUDFRONT_URL}${pathPattern}`,
    expires: expires,
  });

  return cookies;
}

module.exports = { issueCloudFrontCookies };
