const express=require('express');
const router=express.Router();

const {startAuction,placeBid,getCurrentAuction}=require('../controllers/auctionController');
const {protect,authorize}=require('../middleware/authMiddleware');

router.post('/start',protect,authorize('admin'),startAuction);
router.post('/bid',protect,authorize('team'),placeBid);
router.get('/',protect,getCurrentAuction);

module.exports=router;