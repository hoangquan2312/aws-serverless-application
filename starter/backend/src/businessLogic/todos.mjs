import { TodosAccess } from '../dataLayer/todosAccess.mjs'
import { AttachmentUtils } from '../fileStorage/attachmentUtils.mjs'
import { createLogger } from '../utils/logger.mjs'
import * as uuid from 'uuid'

const logger = createLogger('TodosAccess')
const attatchmentUtils = new AttachmentUtils()
const todosAccess = new TodosAccess()

export async function CreateTodo(newItem, userId) {
  logger.info('Call function create todos')
  const todoId = uuid.v4()
  const createdAt = new Date().toISOString()
  const s3AttachUrl = attatchmentUtils.getAttachmentUrl(userId)
  const _newItem = {
    userId,
    todoId,
    createdAt,
    done: false,
    attachmentUrl: s3AttachUrl,
    ...newItem
  }
  return await todosAccess.create(_newItem)
}

export async function getTodosForUser(userId) {
  logger.info('Call function getall todos')
  return await todosAccess.getAll(userId)
}

export async function UpdateTodo(userId, todoId, updatedTodo) {
  logger.info('Call function update todos')
  return await todosAccess.update(userId, todoId, updatedTodo)
}

export async function DeleteTodo(userId, todoId) {
  logger.info('Call function delete todos')
  return await todosAccess.delete(userId, todoId)
}

export async function createAttachmentPresignedUrl(userId, todoId) {
  logger.info('Call function createAttachmentPresignedUrl todos by' + userId)
  const uploadUrl = todosAccess.getUploadUrl(todoId, userId)
  return uploadUrl
}
