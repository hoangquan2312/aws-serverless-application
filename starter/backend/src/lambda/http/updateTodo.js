import middy from '@middy/core'
import cors from '@middy/http-cors'
import httpErrorHandler from '@middy/http-error-handler'
import { UpdateTodo } from '../../businessLogic/todos.mjs'
import { getUserId } from '../utils.mjs'

export const handler = middy()
  .use(httpErrorHandler())
  .use(
    cors({
      credentials: true
    })
  )
  .handler(async (event) => {
    const todoId = event.pathParameters.todoId
    const updatedTodo = JSON.parse(event.body)
    const userId = getUserId(event)
    await UpdateTodo(userId, todoId, updatedTodo)
    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true
      },
      statusCode: 204,
      body: JSON.stringify({ item: updatedTodo })
    }
  })
