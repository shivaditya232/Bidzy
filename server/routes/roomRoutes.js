const express=require('express');
const router=express.Router();
const {createRoom,joinRoom,getMyRooms,getRoom,updateRoomSettings,getMyMember,getMembers,updateMember,getFranchises,previewRoom}=require('../controllers/roomController');
const {getMyLineup,saveLineup,getAllLineups}=require('../controllers/lineupController');
const {protect}=require('../middleware/authMiddleware');
const {loadRoomMember,requireHost,requireTeam}=require('../middleware/roomMiddleware');
const playerRoutes=require('./playerRoutes');
const setRoutes=require('./setRoutes');
const auctionRoutes=require('./auctionRoutes');

router.get('/',protect,getMyRooms);
router.post('/',protect,createRoom);
//registered before /:roomId so these words aren't read as a room id
router.post('/join',protect,joinRoom);
router.get('/franchises',protect,getFranchises);
router.get('/preview/:inviteCode',protect,previewRoom);
router.get('/:roomId',protect,loadRoomMember,getRoom);
router.patch('/:roomId/settings',protect,loadRoomMember,requireHost,updateRoomSettings);

router.get('/:roomId/members',protect,loadRoomMember,getMembers);
router.get('/:roomId/members/me',protect,loadRoomMember,getMyMember);
router.patch('/:roomId/members/:memberId',protect,loadRoomMember,requireHost,updateMember);

//your XI (private), and everyone's XI once the auction ends
router.get('/:roomId/lineup',protect,loadRoomMember,requireTeam,getMyLineup);
router.patch('/:roomId/lineup',protect,loadRoomMember,requireTeam,saveLineup);
router.get('/:roomId/lineups',protect,loadRoomMember,getAllLineups);

//everything inside a room: check login + membership once here, then hand over to the sub-router
router.use('/:roomId/players',protect,loadRoomMember,playerRoutes);
router.use('/:roomId/sets',protect,loadRoomMember,setRoutes);
router.use('/:roomId/auction',protect,loadRoomMember,auctionRoutes);

module.exports=router;
