const express=require('express');
const router=express.Router();
const {createSet,reorderSets,getSets}=require('../controllers/setController');
const {protect,authorize}=require('../middleware/authMiddleware');

router.get('/',protect,getSets);
router.post('/',protect,authorize('admin'),createSet);
router.patch('/reorder',protect,authorize('admin'),reorderSets);

module.exports=router;