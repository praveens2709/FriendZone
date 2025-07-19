const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const knockController = require('../controllers/knockController');

const router = express.Router();

module.exports = (io, userSocketMap) => {
  router.post('/', protect, (req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    knockController.knockUser(req, res, next);
  });
  
  router.put('/:id/accept', protect, (req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    knockController.acceptKnock(req, res, next);
  });

  router.put('/:id/knockback', protect, (req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    knockController.knockBack(req, res, next);
  });

  router.put('/:id/decline', protect, (req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    knockController.declineKnock(req, res, next);
  });

  router.get('/knockers', protect, knockController.getKnockers);
  router.get('/knocked', protect, knockController.getKnocked);

  router.get('/pending', protect, knockController.getPendingKnockRequests);
  router.get('/search', protect, knockController.searchUsers);

  return router;
};