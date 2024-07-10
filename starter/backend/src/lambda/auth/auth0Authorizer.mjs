import Axios from 'axios'
import jsonwebtoken from 'jsonwebtoken'
import { createLogger } from '../../utils/logger.mjs'

const logger = createLogger('auth')

const jwksUrl = 'https://dev-zl2357u4e8tqaqf5.us.auth0.com/.well-known/jwks.json'

export async function handler(event) {
  try {
    const jwtToken = await verifyToken(event.authorizationToken)

    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    }
  } catch (e) {
    logger.error('User not authorized', { error: e.message })

    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    }
  }
}

async function verifyToken(authHeader) {
  const token = getToken(authHeader)
  const jwt = jsonwebtoken.decode(token, { complete: true })

  const jwks = await Axios.get(jwksUrl);
  const keys = jwks.data.keys;
  const signingKey = keys.find(key => key.kid === jwt.header.kid);

  if (!signingKey) {
    throw new Error("Key not found");
  };

  const pemDT = signingKey.x5c[0];
  const secret = `-----BEGIN CERTIFICATE-----\n${pemDT}\n-----END CERTIFICATE-----\n`;;
  const isTokenValid = jsonwebtoken.verify(token, secret, {algorithms: ['RS256']});
  logger.info('Verify token', isTokenValid);
  return isTokenValid;
} 

function getToken(authHeader) {
  if (!authHeader) {
    throw new Error('Authentication header not found');
  }

  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    throw new Error('Invalid authentication header')
  }

  return authHeader.split(' ')[1];
}
