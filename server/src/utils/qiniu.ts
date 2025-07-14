import qiniu from 'qiniu'

export function uploadQiniuToken(scope: 'mainmooc') {
  return new Promise((reslove) => {
    const assessKey = process.env.QINNIU_ASSESSKEY
    const secretKey = process.env.QINNIU_SECRETKEY
    const url = process.env.QINIU_URL
    const returnBody = '{"name": "$(key)", "hash":"$(etag)","imgUrl":"'+ url +'/$(key)"}';
    const options = {
      scope: scope,
      expires: 3600,
      returnBody: returnBody
    }
    const mac = new qiniu.auth.digest.Mac(assessKey, secretKey);
    const putPolicy = new qiniu.rs.PutPolicy(options);
    const uploadToken = putPolicy.uploadToken(mac);
    reslove(uploadToken);
  })
}

