function getLambdaConfig(proctoring_type) {
  console.log('getLambdaConfig > proctoring_type : admin', proctoring_type);
  
  const defaultType = "AWS Rekognition";
  const type = proctoring_type ?? defaultType;
  const lambdaMap = {
    "AWS Rekognition": process.env.LAMBDA_UPLOAD_URL,
    "BIS Virtual Proctor": process.env.OPEN_SOURCE_LAMBDA_UPLOAD_URL
  };

  return {
    virtual_proctor_type: type,
    lambdaUploadUrl: lambdaMap[type] ?? process.env.LAMBDA_UPLOAD_URL
  };
}

module.exports = {
  getLambdaConfig
};
