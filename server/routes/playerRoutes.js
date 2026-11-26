const express=require('express');
const router=express.Router();
const {getPlayers,createPlayer,updatePlayer,bulkCreatePlayers,deletePlayer}=require('../controllers/playerController');
const {getPack,loadPack}=require('../controllers/packController');
const {requireHost}=require('../middleware/roomMiddleware');

//mounted at /api/rooms/:roomId/players. protect + loadRoomMember already ran, so req.room and req.member exist.
router.get('/',getPlayers);
router.post('/',requireHost,createPlayer);
router.post('/bulk',requireHost,bulkCreatePlayers);
//the ready-made IPL 2026 pack. registered before /:id so "pack" isn't read as a player id
router.get('/pack',requireHost,getPack);
router.post('/pack',requireHost,loadPack);
router.patch('/:id',requireHost,updatePlayer);
router.delete('/:id',requireHost,deletePlayer);
module.exports=router;
