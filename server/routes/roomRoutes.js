const express=require('express');
const router=express.Router();
const {createRoom,joinRoom,getMyRooms,getRoom,updateRoomSettings,getMyMember,getMembers,updateMember}=require('../controllers/roomController');
const {protect}=require('../middleware/authMiddleware');
const {loadRoomMember,requireHost}=require('../middleware/roomMiddleware');
const playerRoutes=require('./playerRoutes');
const setRoutes=require('./setRoutes');
const auctionRoutes=require('./auctionRoutes');

router.get('/',protect,getMyRooms);
router.post('/',protect,createRoom);
//registered before /:roomId so "join" isn't read as a room id
router.post('/join',protect,joinRoom);
router.get('/:roomId',protect,loadRoomMember,getRoom);
router.patch('/:roomId/settings',protect,loadRoomMember,requireHost,updateRoomSettings);

router.get('/:roomId/members',protect,loadRoomMember,getMembers);
router.get('/:roomId/members/me',protect,loadRoomMember,getMyMember);
router.patch('/:roomId/members/:memberId',protect,loadRoomMember,requireHost,updateMember);

//everything inside a room: check login + membership once here, then hand over to the sub-router
router.use('/:roomId/players',protect,loadRoomMember,playerRoutes);
router.use('/:roomId/sets',protect,loadRoomMember,setRoutes);
router.use('/:roomId/auction',protect,loadRoomMember,auctionRoutes);

module.exports=router;
