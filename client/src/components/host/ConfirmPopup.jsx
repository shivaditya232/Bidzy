import { useState } from 'react'
import Popup from '../ui/Popup'
import Button from '../ui/Button'
import { errorMessage } from '../../api/axios'

// A one-line "are you sure?" with the action on a button. Shows the server's message if it fails.
//   danger: red light, for things you can't take back
function ConfirmPopup({ title, line, confirmLabel, cancelLabel='Cancel', danger=false, onConfirm, onClose }) {
    const [busy,setBusy]=useState(false)
    const [error,setError]=useState('')
    const go=async()=>{
        setBusy(true)
        setError('')
        try{
            await onConfirm()
            onClose()
        }
        catch(err){
            setError(errorMessage(err))
            setBusy(false)
        }
    }
    return (
        <Popup open onClose={onClose} title={title} actions={
            <>
                <Button kind="secondary" size="sm" onClick={onClose}>{cancelLabel}</Button>
                <Button kind={danger ? 'danger' : 'primary'} size="sm" arrow={!danger&&!busy} aria-busy={busy} onClick={go}>{busy ? 'Working…' : confirmLabel}</Button>
            </>
        }>
            <p className="m-0">{line}</p>
            {error && <p role="alert" className="m-0 mt-3 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{error}</p>}
        </Popup>
    )
}

export default ConfirmPopup
