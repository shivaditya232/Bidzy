import { useCallback, useEffect, useRef, useState } from 'react'
import { PHOTO_SIZE, MAX_PHOTO_KB, coverScale, clampOffset, dataUrlKb } from '../../utils/pack'
import './photo.css'

const readFile=(file)=>new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onload=()=>resolve(reader.result)
    reader.onerror=()=>reject(reader.error)
    reader.readAsDataURL(file)
})

const loadImage=(src)=>new Promise((resolve,reject)=>{
    const img=new Image()
    img.onload=()=>resolve(img)
    img.onerror=()=>reject(new Error('Could not open that image'))
    img.src=src
})

// draw what the square shows onto a 320px canvas and shrink it: webp if the browser can, else jpeg.
// quality steps down until it fits under the server's limit.
const encode=(crop,box)=>{
    const canvas=document.createElement('canvas')
    canvas.width=canvas.height=PHOTO_SIZE
    const g=canvas.getContext('2d')
    const scale=crop.base*crop.zoom
    const w=crop.img.naturalWidth*scale
    const h=crop.img.naturalHeight*scale
    const k=PHOTO_SIZE/box
    g.fillStyle='#0D1117'
    g.fillRect(0,0,PHOTO_SIZE,PHOTO_SIZE)
    g.drawImage(crop.img,((box-w)/2+crop.x)*k,((box-h)/2+crop.y)*k,w*k,h*k)
    for(const quality of [.82,.7,.55,.4]){
        let url=canvas.toDataURL('image/webp',quality)
        if(!url.startsWith('data:image/webp')) url=canvas.toDataURL('image/jpeg',quality)
        if(dataUrlKb(url)<=MAX_PHOTO_KB) return url
    }
    return null
}

// The photo square: drop or choose a picture, drag it to frame the face, zoom with the slider (or the wheel).
// The browser crops it to a 320px square and shrinks it to ~20 KB, and that small image is what gets saved.
// A photo that's already a link (e.g. from Wikimedia Commons) just shows; choosing a new one replaces it.
//   image: the current photo ('' for none)
//   onChange(image, {fresh}): a new data URL ('' when removed). fresh = true for a newly chosen photo.
//   pass a stable onChange (useCallback): it's a dependency of the save effect
function PhotoCrop({ image, onChange, label }) {
    const stageRef=useRef(null)
    const fileRef=useRef(null)
    const dragRef=useRef(null)
    const renderTimer=useRef(null)
    const freshRef=useRef(false)                 // true until the first save of a newly chosen photo
    const [crop,setCrop]=useState(null)        // {img, base, zoom, x, y} while cropping an upload
    const [note,setNote]=useState('')
    const [error,setError]=useState('')
    const [over,setOver]=useState(false)
    const [dragging,setDragging]=useState(false)

    const boxSize=()=>stageRef.current?.clientWidth||300

    const place=useCallback((next)=>{
        const box=boxSize()
        const offset=clampOffset(next,{box,width:next.img.naturalWidth,height:next.img.naturalHeight,scale:next.base*next.zoom})
        return {...next,...offset}
    },[])

    // re-encode a moment after the last move, not on every pointer event
    useEffect(()=>{
        if(!crop) return
        clearTimeout(renderTimer.current)
        renderTimer.current=setTimeout(()=>{
            const url=encode(crop,boxSize())
            if(!url){
                setError(`That photo won't shrink under ${MAX_PHOTO_KB} KB. Try another one.`)
                return
            }
            setError('')
            setNote(`Cropped to ${PHOTO_SIZE}×${PHOTO_SIZE} · shrunk to ${dataUrlKb(url)} KB`)
            const fresh=freshRef.current
            freshRef.current=false
            onChange(url,{fresh})
        },120)
        return ()=>clearTimeout(renderTimer.current)
    },[crop,onChange])

    const open=async(file)=>{
        if(!file) return
        if(!file.type.startsWith('image/')){
            setError('Pick an image file')
            return
        }
        try{
            const img=await loadImage(await readFile(file))
            const box=boxSize()
            setError('')
            freshRef.current=true
            setCrop(place({img,base:coverScale(box,img.naturalWidth,img.naturalHeight),zoom:1,x:0,y:0}))
        }
        catch(err){
            setError(err.message)
        }
    }

    const remove=()=>{
        setCrop(null)
        setNote('')
        setError('')
        onChange('',{fresh:true})
    }

    const nudge=(dx,dy)=>setCrop(prev=>prev&&place({...prev,x:prev.x+dx,y:prev.y+dy}))
    const zoomTo=(zoom)=>setCrop(prev=>prev&&place({...prev,zoom:Math.max(1,Math.min(3,zoom))}))

    // the wheel zooms; it has to be a non-passive listener to stop the popup scrolling
    const cropping=crop!==null
    useEffect(()=>{
        const stage=stageRef.current
        if(!stage||!cropping) return
        const onWheel=(e)=>{
            e.preventDefault()
            setCrop(prev=>prev&&place({...prev,zoom:Math.max(1,Math.min(3,prev.zoom-e.deltaY*.002))}))
        }
        stage.addEventListener('wheel',onWheel,{passive:false})
        return ()=>stage.removeEventListener('wheel',onWheel)
    },[cropping,place])

    const onPointerDown=(e)=>{
        if(!crop){
            fileRef.current?.click()
            return
        }
        dragRef.current={x:e.clientX,y:e.clientY,cx:crop.x,cy:crop.y}
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
    }
    const onPointerMove=(e)=>{
        const start=dragRef.current
        if(!start) return
        setCrop(prev=>prev&&place({...prev,x:start.cx+e.clientX-start.x,y:start.cy+e.clientY-start.y}))
    }
    const endDrag=()=>{
        dragRef.current=null
        setDragging(false)
    }
    const onKeyDown=(e)=>{
        const step={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]}[e.key]
        if(step&&crop){
            e.preventDefault()
            nudge(...step)
        }
        else if((e.key==='Enter'||e.key===' ')&&!crop){
            e.preventDefault()
            fileRef.current?.click()
        }
    }

    const shown=crop ? crop.base*crop.zoom : 0
    const hasPhoto=Boolean(crop||image)

    return (
        <div className="grid justify-items-center gap-2.5">
            <div
                ref={stageRef}
                className={`bz-stage ${hasPhoto ? 'bz-stage-has' : ''} ${over ? 'bz-stage-over' : ''} ${dragging ? 'bz-stage-drag' : ''} ${crop ? 'bz-stage-crop cursor-grab' : 'cursor-pointer'}`}
                tabIndex={0}
                role="group"
                aria-label={crop ? `Photo of ${label}. Drag or use the arrow keys to move it, the slider to zoom.` : `Photo of ${label}. Press Enter to choose one.`}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={onKeyDown}
                onDragEnter={(e)=>{ e.preventDefault(); setOver(true) }}
                onDragOver={(e)=>{ e.preventDefault(); setOver(true) }}
                onDragLeave={()=>setOver(false)}
                onDrop={(e)=>{ e.preventDefault(); setOver(false); open(e.dataTransfer.files[0]) }}
            >
                {crop
                    ? <img src={crop.img.src} alt="" draggable={false}
                        style={{width:crop.img.naturalWidth*shown,height:crop.img.naturalHeight*shown,transform:`translate(calc(-50% + ${crop.x}px),calc(-50% + ${crop.y}px))`}}
                        className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none" />
                    : image
                        ? <img src={image} alt="" draggable={false} className="pointer-events-none absolute inset-0 size-full object-cover object-[50%_15%]" />
                        : (
                            <span className="absolute inset-0 grid place-content-center gap-1.5 p-[18px] text-center text-sm text-fg-2">
                                <i className="text-[34px] leading-none not-italic" aria-hidden="true">＋</i>
                                <b className="font-num text-2xl font-black text-fg uppercase">Add a photo</b>
                                Drop it here, or choose one. We crop it square and shrink it.
                            </span>
                        )}
                <span className="bz-stage-grid" aria-hidden="true" />
            </div>

            <label className={`flex w-full max-w-[300px] items-center gap-2.5 text-[13px] ${crop ? 'text-fg-2' : 'text-fg-3'}`}>
                <span aria-hidden="true">−</span>
                <input type="range" min="1" max="3" step="0.01" value={crop?.zoom??1} disabled={!crop} aria-label="Zoom"
                    onChange={(e)=>zoomTo(Number(e.target.value))} className="flex-1 accent-floodlight" />
                <span aria-hidden="true">+</span>
            </label>

            <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={()=>fileRef.current?.click()}
                    className="bz-btn bz-secondary bz-sm">{hasPhoto ? 'Choose another' : 'Choose a photo'}</button>
                {hasPhoto && <button type="button" onClick={remove} className="bz-quiet">Remove photo</button>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e)=>{ open(e.target.files[0]); e.target.value='' }} />

            <p className={`m-0 min-h-[18px] text-center text-xs font-semibold ${error ? 'text-alert' : 'text-sold'}`} aria-live="polite">
                {error||note}
            </p>
        </div>
    )
}

export default PhotoCrop
