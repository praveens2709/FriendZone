import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import * as knockController from '../controllers/knockController.js';

const router = Router();

export default (io, userSocketMap) => {
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

  router.delete('/:id/unknock', protect, (req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    knockController.unknockUser(req, res, next);
  });
  
  router.post('/break-lock', protect, (req, res, next) => {
    req.io = io;
    req.userSocketMap = userSocketMap;
    knockController.breakLock(req, res, next);
  });

  router.get('/knockers', protect, knockController.getKnockers);
  router.get('/knocked', protect, knockController.getKnocked);

  router.get('/knockers-for-user/:userId', protect, knockController.getKnockersForUser);
  
  router.get('/counts/:userId', protect, knockController.getCountsForUser); 

  router.get('/pending', protect, knockController.getPendingKnockRequests);
  router.get('/search', protect, knockController.searchUsers);

  return router;
};