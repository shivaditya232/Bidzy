import { useState } from 'react'
import Popup from '../ui/Popup'
import Field from '../ui/Field'
import Button from '../ui/Button'
import { updateSettings } from '../../api/rooms'
import { errorMessage } from '../../api/axios'
import { hasErrors } from '../../utils/validate'
import { settingsToForm, validateSettings, settingsPayload } from '../../utils/host'

const unit=(text)=><span className="pr-2.5 text-sm text-fg-3">{text}</span>

// The room's money, timer, size and squad rules. Only while the room is in the lobby.
//   onSaved(room): the updated room
function SettingsPopup({ roomId, room, teamCount, onSaved, onClose }) {
    const [form,setForm]=useState(()=>settingsToForm(room.settings))
    const [submitted,setSubmitted]=useState(false)
    const [busy,setBusy]=useState(false)
    const [serverError,setServerError]=useState('')
    const errors=validateSettings(form,{type:room.type,teamCount,minPlayerPrice:room.settings.rules?.minPlayerPrice??20})
    const errorFor=(field)=>submitted ? errors[field] : undefined
    const set=(field)=>(e)=>{ setForm(prev=>({...prev,[field]:e.target.value})); setServerError('') }

    const save=async(e)=>{
        e.preventDefault()
        setSubmitted(true)
        if(hasErrors(errors)) return
        setBusy(true)
        try{
            const updated=await updateSettings(roomId,settingsPayload(form))
            onSaved(updated)
            onClose()
        }
        catch(err){
            setServerError(errorMessage(err))
            setBusy(false)
        }
    }

    return (
        <Popup open onClose={onClose} title="Room settings" wide>
            <p className="m-0 mb-4">These lock once the auction starts. A new purse applies to every team.</p>
            <form className="grid gap-3.5 text-fg" onSubmit={save} noValidate>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    <Field id="settings-purse" label="Purse per team" inputMode="decimal" value={form.purseCr} onChange={set('purseCr')} error={errorFor('purse')} after={unit('Cr')} className="col-span-2 sm:col-span-1" />
                    <Field id="settings-timer" label="Bid timer" inputMode="numeric" value={form.timerSeconds} onChange={set('timerSeconds')} error={errorFor('timer')} after={unit('sec')} />
                    <Field id="settings-max" label="Max teams" inputMode="numeric" value={form.maxTeams} onChange={set('maxTeams')} error={errorFor('maxTeams')} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                    <Field id="settings-squad-min" label="Squad min" inputMode="numeric" value={form.squadMin} onChange={set('squadMin')} error={errorFor('squad')} />
                    <Field id="settings-squad-max" label="Squad max" inputMode="numeric" value={form.squadMax} onChange={set('squadMax')} />
                    <Field id="settings-os-min" label="Overseas min" inputMode="numeric" value={form.overseasMin} onChange={set('overseasMin')} error={errorFor('overseas')} />
                    <Field id="settings-os-max" label="Overseas max" inputMode="numeric" value={form.overseasMax} onChange={set('overseasMax')} />
                </div>
                {serverError && <p role="alert" className="m-0 rounded-xl bg-alert/10 px-3.5 py-2.5 text-sm text-alert">{serverError}</p>}
                <div className="flex justify-end gap-2">
                    <Button kind="secondary" size="sm" onClick={onClose}>Cancel</Button>
                    <Button kind="primary" size="sm" type="submit" aria-busy={busy}>{busy ? 'Saving…' : 'Save'}</Button>
                </div>
            </form>
        </Popup>
    )
}

export default SettingsPopup
