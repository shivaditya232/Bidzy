const express=require('express');
const router=express.Router();

const {startAuction,placeBid,getCurrentAuction,resetAuction,getAuctionRounds,getAuctionRoundById}=require('../controllers/auctionController');
const {requireHost,requireTeam}=require('../middleware/roomMiddleware');

//mounted at /api/rooms/:roomId/auction
router.post('/start',requireHost,startAuction);
router.post('/bid',requireTeam,placeBid);
router.post('/reset',requireHost,resetAuction);
router.get('/rounds',getAuctionRounds);
router.get('/rounds/:id',getAuctionRoundById);
router.get('/',getCurrentAuction);

module.exports=router;
