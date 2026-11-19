const express=require('express');
const router=express.Router();
const {createRoom,joinRoom,getMyRooms,getRoom,updateRoomSettings}=require('../controllers/roomController');
const {protect}=require('../middleware/authMiddleware');
const {loadRoomMember,requireHost}=require('../middleware/roomMiddleware');

router.get('/',protect,getMyRooms);
router.post('/',protect,createRoom);
//registered before /:roomId so "join" isn't read as a room id
router.post('/join',protect,joinRoom);
router.get('/:roomId',protect,loadRoomMember,getRoom);
router.patch('/:roomId/settings',protect,loadRoomMember,requireHost,updateRoomSettings);

module.exports=router;
