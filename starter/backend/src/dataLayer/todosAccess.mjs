import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'
import AWSXRay from 'aws-xray-sdk-core'
import { createLogger } from '../utils/logger.mjs'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const logger = createLogger('TodoAccess')

export class TodosAccess {
  constructor(
    dynamoDbXRay = AWSXRay.captureAWSv3Client(new DynamoDB()),
    todosTable = process.env.TODOS_TABLE,
    s3Client = new S3Client()
  ) {
    this.dynamoDbClient = DynamoDBDocument.from(dynamoDbXRay)
    this.todosTable = todosTable;
    this.s3Client = s3Client;
  }

  async getAll(userId) {
    logger.info('Call function getall')
    const resuslt = await this.dynamoDbClient.query({
      TableName: this.todosTable,
      IndexName: process.env.TODOS_CREATED_AT_INDEX,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })
    return resuslt.Items
  }

  async create(item) {
    logger.info('Call function create')
    await this.dynamoDbClient.put({
      TableName: this.todosTable,
      Item: item
    })
    return { ...item }
  }

  async update(userId, todoId, todoUpdate) {
    logger.info(`Updating todo item ${todoId} in ${this.todosTable}`)
    await this.dynamoDbClient.update({
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      },
      UpdateExpression: 'set #name = :name, #dueDate = :dueDate, #done = :done',
      ExpressionAttributeNames: {
        '#name': 'name',
        '#dueDate': 'dueDate',
        '#done': 'done'
      },
      ExpressionAttributeValues: {
        ':name': todoUpdate.name,
        ':dueDate': todoUpdate.dueDate,
        ':done': todoUpdate.done
      },
      ReturnValues: 'UPDATED_NEW'
    })

    return todoUpdate
  }
  async delete(userId, todoId) {
    logger.info(`Deleting todo item ${todoId} from ${this.todosTable}`)
    await this.dynamoDbClient.delete({
      TableName: this.todosTable,
      Key: {
        userId,
        todoId
      }
    })
    return 'success'
  }
  async getUploadUrl(todoId, userId) {
    const command = new PutObjectCommand({
        Bucket: process.env.ATTACHMENT_S3_BUCKET,
        Key: todoId
      })
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
    expiresIn: process.env.SIGNED_URL_EXPIRATION
    })

    await this.dynamoDbClient
      .update({
        TableName: this.todosTable,
        Key: {
          userId,
          todoId
        },
        UpdateExpression: 'set attachmentUrl = :URL',
        ExpressionAttributeValues: {
          ':URL': uploadUrl.split('?')[0]
        },
        ReturnValues: 'UPDATED_NEW'
      })
    return uploadUrl
  }
}
