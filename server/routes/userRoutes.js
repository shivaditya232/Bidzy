const express=require('express');
const router=express.Router();
const {getTeams,updateTeam,getMyProfile,getPublicTeams}=require('../controllers/userController');
const {protect,authorize}=require('../middleware/authMiddleware');

router.get('/me',protect,getMyProfile);
router.get('/public-teams',protect,getPublicTeams);
router.get('/teams',protect,authorize('admin'),getTeams);
router.patch('/:id',protect,authorize('admin'),updateTeam);

module.exports=router;
