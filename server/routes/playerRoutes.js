const express=require('express');
const router=express.Router();
const {getPlayers,createPlayer,updatePlayer,bulkCreatePlayers,deletePlayer}=require('../controllers/playerController');
const {requireHost}=require('../middleware/roomMiddleware');

//mounted at /api/rooms/:roomId/players. protect + loadRoomMember already ran, so req.room and req.member exist.
router.get('/',getPlayers);
router.post('/',requireHost,createPlayer);
router.post('/bulk',requireHost,bulkCreatePlayers);
router.patch('/:id',requireHost,updatePlayer);
router.delete('/:id',requireHost,deletePlayer);
module.exports=router;
