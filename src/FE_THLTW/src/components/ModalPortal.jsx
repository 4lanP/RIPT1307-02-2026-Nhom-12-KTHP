import { createPortal } from 'react-dom'

const ModalPortal = ({ children }) => createPortal(children, document.body)

export default ModalPortal
