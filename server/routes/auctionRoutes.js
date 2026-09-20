const express=require('express');
const router=express.Router();

const {startAuction,placeBid,getCurrentAuction,resetAuction,getAuctionRounds,getAuctionRoundById}=require('../controllers/auctionController');
const {protect,authorize}=require('../middleware/authMiddleware');

router.post('/start',protect,authorize('admin'),startAuction);
router.post('/bid',protect,authorize('team'),placeBid);
router.post('/reset',protect,authorize('admin'),resetAuction);
router.get('/rounds',protect,getAuctionRounds);
router.get('/rounds/:id',protect,getAuctionRoundById);
router.get('/',protect,getCurrentAuction);

module.exports=router;