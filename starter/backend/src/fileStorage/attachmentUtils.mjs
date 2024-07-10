export class AttachmentUtils {
  constructor(bucketName = process.env.ATTACHMENT_S3_BUCKET) {}

  getAttachmentUrl(todoId) {
    return 'https://' + this.bucketName + '.s3.amazoneaws.com/' + todoId
  }
}
