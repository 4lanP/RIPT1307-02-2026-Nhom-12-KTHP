import React from 'react'
import { createPortal } from 'react-dom'

interface ModalPortalProps {
  children: React.ReactNode
}

const ModalPortal = ({ children }: ModalPortalProps) => createPortal(children, document.body)

export default ModalPortal
