import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'

let customerSocket: any = null
let kitchenSocket: any = null
let staffSocket: any = null

export const getCustomerSocket = (sessionId: any, sessionToken?: string) => {
  if (!customerSocket) {
    customerSocket = io(`${SOCKET_URL}/customer`, {
      transports: ['websocket', 'polling'],
    })
  }

  const token = sessionToken || sessionStorage.getItem('session_token') || localStorage.getItem('accessToken')

  const join = () => {
    if (sessionId && token) {
      customerSocket.emit('join_session', {
        session_id: sessionId,
        session_token: token
      })
    }
  }

  if (customerSocket.connected) {
    join()
  } else {
    customerSocket.off('connect', join)
    customerSocket.on('connect', join)
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
