import express from "express";
import reviewController from '../controller/ReviewController';

const router = express.Router();

router.post('/', reviewController.createReview.bind(reviewController));
router.post('/create', reviewController.createReview.bind(reviewController));
router.get('/', reviewController.getReviewsForUser.bind(reviewController));
router.get('/author', reviewController.getReviewsByAuthor.bind(reviewController));
router.delete('/:review_id', reviewController.deleteReview.bind(reviewController));

export default router;
