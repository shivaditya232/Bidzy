import { Link } from 'react-router-dom'
import Aura from './ui/Aura'

// The frame for sign-up, login and other "outside a room" moments:
// Bidzy's pitch-green house glow, the wordmark, and one calm card in the middle.
function AuthLayout({ title, subtitle, children }) {
    return (
        <Aura variant="page" as="main" className="min-h-screen bg-night font-text text-fg antialiased">
            <div className="mx-auto flex min-h-screen max-w-[1080px] flex-col px-5 pt-6 pb-10">
                <Link to="/login" className="w-max font-num text-[22px] font-black tracking-[.06em] text-fg no-underline">BIDZY</Link>
                <div className="grid flex-1 place-items-center py-10">
                    <div className="grid w-full max-w-[420px] gap-5 rounded-3xl border border-line bg-platter p-7 sm:p-8">
                        <div className="grid gap-2">
                            <h1 className="font-num text-[40px] leading-[.95] font-black uppercase">{title}</h1>
                            {subtitle && <p className="m-0 text-fg-2">{subtitle}</p>}
                        </div>
                        {children}
                    </div>
                </div>
            </div>
        </Aura>
    )
}

export default AuthLayout
