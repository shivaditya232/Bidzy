import { useId } from 'react'

// A labelled input with an optional hint and error, used by every Bidzy form.
// The error is tied to the input (aria-describedby) so screen readers read it out.
//
//   <Field label="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)}
//          error={errors.email} autoComplete="email" />
//   after: an element shown inside the right edge of the input (e.g. a show/hide button)
function Field({ label, hint, error, after, id, className='', ...inputProps }) {
    const autoId=useId()
    const inputId=id||autoId
    const hintId=`${inputId}-hint`
    const errorId=`${inputId}-error`
    const describedBy=[hint&&hintId,error&&errorId].filter(Boolean).join(' ')||undefined

    return (
        <div className={`grid gap-1.5 ${className}`}>
            <label htmlFor={inputId} className="text-sm font-semibold text-fg">{label}</label>
            <div className="relative">
                <input
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={`h-12 w-full rounded-xl border bg-white/[.04] px-3.5 font-text text-[16px] text-fg outline-none transition-[border-color,background-color] duration-150
                        placeholder:text-fg-3 focus:bg-white/[.07]
                        ${error ? 'border-alert/70 focus:border-alert' : 'border-line focus:border-white/35'} ${after ? 'pr-20' : ''}`}
                    {...inputProps}
                />
                {after && <div className="absolute inset-y-0 right-1.5 flex items-center">{after}</div>}
            </div>
            {hint&&!error && <span id={hintId} className="text-[13px] text-fg-3">{hint}</span>}
            {error && <span id={errorId} className="text-[13px] text-alert">{error}</span>}
        </div>
    )
}

export default Field
