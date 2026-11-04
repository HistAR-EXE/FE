import {ApiError} from '../api/contracts'
// A failed profile read is not proof that a stored session was revoked.
// Server authorization remains mandatory for every protected action.
export function invalidatesStoredSession(error:unknown){
 return error instanceof ApiError&&(error.status===401||error.status===403)
}
