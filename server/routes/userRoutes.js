const express=require('express');
const router=express.Router();
const {getMyProfile}=require('../controllers/userController');
const {protect}=require('../middleware/authMiddleware');

//team lists and purse edits moved to /api/rooms/:roomId/members (purses live on room membership now)
router.get('/me',protect,getMyProfile);

module.exports=router;
