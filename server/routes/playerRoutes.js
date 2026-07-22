const express=require('express');
const router=express.Router();
const {getPlayers,createPlayer,updatePlayer,bulkCreatePlayers}=require('../controllers/playerController');
const {protect,authorize}=require('../middleware/authMiddleware');

router.get('/',protect,getPlayers);
router.post('/',protect,authorize('admin'),createPlayer);
router.post('/bulk',protect,authorize('admin'),bulkCreatePlayers);
router.patch('/:id',protect,authorize('admin'),updatePlayer);
module.exports=router;