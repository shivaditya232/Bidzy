//What a player's photo may be. Pure functions, so they're easy to test.
//   - nothing ('' or missing): the app shows initials
//   - a link: http(s)://...
//   - an uploaded photo: the browser crops it to a 320px square and shrinks it to a webp/jpeg data URL,
//     which we store with the player. No file storage service needed; a cap keeps documents small.

const MAX_PHOTO_KB=60;
const DATA_URL=/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/;
const LINK=/^https?:\/\/\S+$/i;

//returns an error message, or null when the photo is fine
const checkImage=(image)=>{
    if(image===undefined||image===null||image==='') return null;
    if(typeof image!=='string') return 'Photo must be a link or an uploaded image';
    if(image.startsWith('data:')){
        if(!DATA_URL.test(image)) return 'Photo must be a webp, jpeg or png image';
        //base64 is 4 characters for every 3 bytes
        const kb=Math.round((image.length-image.indexOf(',')-1)*3/4/1024);
        if(kb>MAX_PHOTO_KB) return `Photo is ${kb} KB. Keep it under ${MAX_PHOTO_KB} KB`;
        return null;
    }
    if(image.length>2000||!LINK.test(image)) return 'Photo link must start with http:// or https://';
    return null;
};

//keep only the credit fields we know, trimmed and short. empty -> undefined (no credit)
const cleanCredit=(credit)=>{
    if(!credit||typeof credit!=='object') return undefined;
    const out={};
    for(const key of ['author','license','licenseUrl','page']){
        const value=typeof credit[key]==='string' ? credit[key].trim().slice(0,key==='author'||key==='license' ? 160 : 500) : '';
        if(value) out[key]=value;
    }
    //links in a credit must be real links (they're rendered as <a href>)
    for(const key of ['licenseUrl','page']){
        if(out[key]&&!LINK.test(out[key])) delete out[key];
    }
    return Object.keys(out).length ? out : undefined;
};

module.exports={checkImage,cleanCredit,MAX_PHOTO_KB};
