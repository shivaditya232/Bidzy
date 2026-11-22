// The small Show / Hide button inside a password field
function PasswordToggle({ shown, onToggle }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            className="cursor-pointer rounded-lg border-0 bg-transparent px-2.5 py-1.5 font-text text-[13px] font-semibold text-fg-2 hover:bg-white/[.06] hover:text-fg
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg"
        >
            {shown ? 'Hide' : 'Show'}
        </button>
    )
}

export default PasswordToggle
