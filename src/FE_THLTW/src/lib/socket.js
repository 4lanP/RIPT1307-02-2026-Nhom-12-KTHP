import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let customerSocket = null
let kitchenSocket = null
let staffSocket = null

export const getCustomerSocket = (sessionId) => {
  if (!customerSocket) {
    customerSocket = io(`${SOCKET_URL}/customer`, {
      transports: ['websocket', 'polling'],
    })
    customerSocket.on('connect', () => {
      if (sessionId) {
        customerSocket.emit('join_session', { session_id: sessionId })
      }
    })
  }
  return customerSocket
}

export const getKitchenSocket = (accessToken) => {
  if (!kitchenSocket) {
    kitchenSocket = io(`${SOCKET_URL}/kitchen`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    })
  }
  return kitchenSocket
}

export const getStaffSocket = (accessToken) => {
  if (!staffSocket) {
    staffSocket = io(`${SOCKET_URL}/staff`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
    })
  }
  return staffSocket
}

export const disconnectAll = () => {
  if (customerSocket) { customerSocket.disconnect(); customerSocket = null }
  if (kitchenSocket) { kitchenSocket.disconnect(); kitchenSocket = null }
  if (staffSocket) { staffSocket.disconnect(); staffSocket = null }
}
