import * as AWS from 'aws-sdk'
const AWSXRay = require('aws-xray-sdk')
import { createLogger } from '../utils/logger'

const XAWS = AWSXRay.captureAWS(AWS)
const logger = createLogger('TodoAccess')
const url_expiration = process.env.SIGNED_URL_EXPIRATION
const s3_bucket_name = process.env.ATTACHMENT_S3_BUCKET

export class TodosAccess {
  constructor(
    docClient = createDynamoDBClient(),
    todosTable = process.env.TODOS_TABLE,
    todosIndex = process.env.TODOS_CREATED_AT_INDEX,
    S3 = new XAWS.S3({ signatureVersion: 'v4' }),
    bucket_name = s3_bucket_name
  ) {}

  async getAll(userId) {
    logger.info('Call function getall')
    const resuslt = await this.docClient
      .query({
        TableName: this.todosTable,
        IndexName: this.todosIndex,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        }
      })
      .promise()
    return resuslt.Items
  }

  async create(item) {
    logger.info('Call function create')
    await this.docClient
      .put({
        TableName: this.todosTable,
        Item: item
      })
      .promise()
    return item
  }

  async update(userId, todoId, todoUpdate) {
    logger.info(`Updating todo item ${todoId} in ${this.todosTable}`)
    try {
      await this.docClient
        .update({
          TableName: this.todosTable,
          Key: {
            userId,
            todoId
          },
          UpdateExpression:
            'set #name = :name, #dueDate = :dueDate, #done = :done',
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
        .promise()
    } catch (error) {
      logger.error('Error =======> updating Todo.', {
        error: error,
        data: {
          todoId,
          userId,
          todoUpdate
        }
      })
      throw Error(error)
    }
    return todoUpdate
  }
  async delete(userId, todoId) {
    logger.info(`Deleting todo item ${todoId} from ${this.todosTable}`)
    try {
      await this.docClient
        .delete({
          TableName: this.todosTable,
          Key: {
            userId,
            todoId
          }
        })
        .promise()
      return 'success'
    } catch (e) {
      logger.info('Error ==>>', {
        error: e
      })
      return 'Error'
    }
  }
  async getUploadUrl(todoId, userId) {
    const uploadUrl = this.S3.getSignedUrl('putObject', {
      Bucket: this.bucket_name,
      Key: todoId,
      Expires: Number(url_expiration)
    })
    await this.docClient
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
      .promise()
    return uploadUrl
  }
}

function createDynamoDBClient() {
  if (process.env.IS_OFFLINE) {
    console.log('Creating a local DynamoDB instance')
    return new XAWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  }

  return new XAWS.DynamoDB.DocumentClient()
}
